import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { randomUUID, createHash } from "node:crypto";
import { database, isConfigured, rateLimit } from "./store.js";
import { schemas, parse } from "./validation.js";
import {
  authenticate,
  admin,
  hashPassword,
  verifyPassword,
  createSession,
  publicUser,
  cookieOptions,
} from "./auth.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const now = () => new Date().toISOString();
const record = (data) => ({ _id: randomUUID(), createdAt: now(), ...data });
const latest = (rows) =>
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
function paginate(rows, query) {
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const limit = Math.max(
    1,
    Math.min(100, Math.floor(Number(query.limit) || 12)),
  );
  const q = String(query.q || "").toLowerCase();
  const filtered = latest(rows).filter(
    (row) =>
      !q ||
      [
        row.name,
        row.title,
        row.subject,
        row.location,
        row.status,
        row.category,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(q),
      ),
  );
  return {
    items: filtered.slice((page - 1) * limit, page * limit),
    total: filtered.length,
    page,
    pages: Math.max(1, Math.ceil(filtered.length / limit)),
  };
}
// Same-origin mutation guard, including login. Non-browser clients omit Origin.
app.use("/api", (req, res, next) => {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    if (req.get("sec-fetch-site") === "cross-site")
      return res
        .status(403)
        .json({ error: "Cross-site requests are not allowed." });
    if (req.get("origin")) {
      try {
        const origin = new URL(req.get("origin"));
        const host = req.get("host");
        const isLocalDev =
          process.env.NODE_ENV !== "production" &&
          ["localhost", "127.0.0.1"].includes(origin.hostname);
        if (origin.host !== host && !isLocalDev)
          return res
            .status(403)
            .json({ error: "Origin does not match this application." });
      } catch {
        return res.status(403).json({ error: "Invalid origin." });
      }
    }
    if (req.method !== "DELETE" && !req.is("application/json"))
      return res.status(415).json({ error: "Send JSON request data." });
  }
  res.set("Cache-Control", "no-store");
  next();
});
app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    configured: isConfigured(),
    name: "Fieldwise",
    paymentMode: "manual",
  }),
);
async function authLimit(req, res, next) {
  const rawIp = process.env.VERCEL
    ? req.get("x-vercel-forwarded-for") || req.socket.remoteAddress
    : req.socket.remoteAddress;
  const ip = createHash("sha256").update(String(rawIp)).digest("hex");
  const email = createHash("sha256")
    .update(String(req.body?.email || "").toLowerCase())
    .digest("hex");
  if (
    !(await rateLimit(`auth:ip:${ip}`, 50, 900000)) ||
    !(await rateLimit(`auth:email:${email}`, 15, 900000))
  )
    return res
      .status(429)
      .json({ error: "Too many attempts. Try again in 15 minutes." });
  next();
}
app.post("/api/auth/register", authLimit, async (req, res) => {
  const input = parse(schemas.register, req.body);
  const passwordHash = await hashPassword(input.password);
  const user = await database(async (col) => {
    if (await col("users").one({ email: input.email }))
      fail(409, "An account already exists with that email.");
    return col("users").insert(
      record({
        name: input.name,
        email: input.email,
        passwordHash,
        role: "farmer",
      }),
    );
  });
  await createSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});
app.post("/api/auth/login", authLimit, async (req, res) => {
  const input = parse(schemas.login, req.body);
  const user = await database((col) =>
    col("users").one({ email: input.email }),
  );
  if (
    !user ||
    user.disabled ||
    !(await verifyPassword(input.password, user.passwordHash))
  )
    fail(401, "Email or password is incorrect.");
  await createSession(res, user);
  res.json({ user: publicUser(user) });
});
app.use("/api", authenticate);
app.get("/api/auth/me", (req, res) =>
  res.json({ user: publicUser(req.user) }),
);
app.post("/api/auth/logout", async (req, res) => {
  await database((col) => col("sessions").remove({ _id: req.sessionId }));
  res.clearCookie("fieldwise_session", cookieOptions());
  res.json({ ok: true });
});
app.patch("/api/account", async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name || name.length > 80)
    fail(400, "Name must be between 1 and 80 characters.");
  const user = await database((col) =>
    col("users").update({ _id: req.user._id }, { name }),
  );
  res.json({ user: publicUser(user) });
});
app.get("/api/dashboard", async (req, res) => {
  const result = await database(async (col) => {
    const own = { ownerId: req.user._id };
    const [farms, crops, soil, activities, orders, consultations, advisories] =
      await Promise.all([
        col("farms").find(own),
        col("crops").find(own),
        col("soil").find(own),
        col("activities").find(own),
        col("orders").find(own),
        col("consultations").find(own),
        col("advisories").find({}),
      ]);
    return {
      farms: latest(farms),
      crops: latest(crops),
      soil: latest(soil).slice(0, 8),
      activities: latest(activities).slice(0, 6),
      orders: latest(orders).slice(0, 5),
      advisories: latest(advisories).slice(0, 4),
      stats: {
        area: farms.reduce((sum, farm) => sum + farm.area, 0),
        activeCrops: crops.filter((crop) => crop.stage !== "Harvested").length,
        pendingOrders: orders.filter(
          (order) => !["Delivered", "Cancelled"].includes(order.status),
        ).length,
        consultations: consultations.filter((c) => c.status !== "Resolved")
          .length,
      },
    };
  });
  res.json(result);
});
async function checkFarm(col, farmId, ownerId) {
  if (!(await col("farms").one({ _id: farmId, ownerId })))
    fail(400, "Select one of your farms.");
}
for (const name of ["farms", "crops", "soil", "activities"]) {
  app.get(`/api/${name}`, async (req, res) =>
    res.json(
      paginate(
        await database((col) => col(name).find({ ownerId: req.user._id })),
        req.query,
      ),
    ),
  );
  app.post(`/api/${name}`, async (req, res) => {
    const input = parse(schemas[name], req.body);
    const row = await database(
      async (col) => {
        if (input.farmId) await checkFarm(col, input.farmId, req.user._id);
        return col(name).insert(record({ ...input, ownerId: req.user._id }));
      },
      { transaction: true },
    );
    res.status(201).json(row);
  });
  app.patch(`/api/${name}/:id`, async (req, res) => {
    const input = parse(schemas[name], req.body);
    const row = await database(
      async (col) => {
        if (input.farmId) await checkFarm(col, input.farmId, req.user._id);
        return col(name).update(
          { _id: req.params.id, ownerId: req.user._id },
          { ...input, updatedAt: now() },
        );
      },
      { transaction: true },
    );
    if (!row) fail(404, "Record not found.");
    res.json(row);
  });
  app.delete(`/api/${name}/:id`, async (req, res) => {
    await database(
      async (col) => {
        if (name === "farms") {
          for (const child of ["crops", "soil", "activities"]) {
            if (
              await col(child).one({
                farmId: req.params.id,
                ownerId: req.user._id,
              })
            )
              fail(
                409,
                "Remove this farm’s crop, soil and activity records before deleting it.",
              );
          }
        }
        if (
          !(await col(name).remove({
            _id: req.params.id,
            ownerId: req.user._id,
          }))
        )
          fail(404, "Record not found.");
      },
      { transaction: true },
    );
    res.json({ ok: true });
  });
}
app.get("/api/weather", async (req, res) => {
  const farm = await database((col) =>
    col("farms").one({
      _id: String(req.query.farmId || ""),
      ownerId: req.user._id,
    }),
  );
  if (!farm) fail(404, "Add or select a farm to see its forecast.");
  const key = `${farm.latitude.toFixed(2)},${farm.longitude.toFixed(2)}`;
  const cache = await database((col) => col("weather").one({ _id: key }));
  if (cache && Date.now() - Date.parse(cache.fetchedAt) < 1800000)
    return res.json({ ...cache, cached: true, stale: false });
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(farm.latitude),
      longitude: String(farm.longitude),
      current:
        "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
      daily:
        "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
      timezone: "auto",
      forecast_days: "7",
    });
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Weather service unavailable");
    const payload = await response.json();
    if (!payload.current || !payload.daily)
      throw new Error("Incomplete forecast");
    const result = {
      _id: key,
      current: payload.current,
      daily: payload.daily,
      timezone: payload.timezone,
      fetchedAt: now(),
      provider: "Open-Meteo",
    };
    await database(async (col) => {
      if (!(await col("weather").update({ _id: key }, result)))
        await col("weather").insert(result);
    });
    res.json({ ...result, cached: false, stale: false });
  } catch {
    if (cache) return res.json({ ...cache, cached: true, stale: true });
    fail(
      503,
      "Weather is temporarily unavailable. Your farm records are still available.",
    );
  }
});
app.get("/api/products", async (req, res) =>
  res.json(
    paginate(
      await database((col) => col("products").find({ archived: false })),
      req.query,
    ),
  ),
);
app.get("/api/orders", async (req, res) =>
  res.json(
    paginate(
      await database((col) => col("orders").find({ ownerId: req.user._id })),
      req.query,
    ),
  ),
);
app.post("/api/orders", async (req, res) => {
  const input = parse(schemas.order, req.body);
  if (new Set(input.items.map((i) => i.productId)).size !== input.items.length)
    fail(400, "Each product should appear only once.");
  const order = await database(
    async (col) => {
      const previous = await col("orders").one({
        ownerId: req.user._id,
        idempotencyKey: input.idempotencyKey,
      });
      if (previous) return previous;
      const items = [];
      for (const requested of input.items) {
        const product = await col("products").one({
          _id: requested.productId,
          archived: false,
        });
        if (!product || product.stock < requested.quantity)
          fail(
            409,
            `${product?.name || "Product"} does not have enough stock.`,
          );
        items.push({
          productId: product._id,
          name: product.name,
          unit: product.unit,
          quantity: requested.quantity,
          price: product.price,
          pricePaise: Math.round(product.price * 100),
        });
        const updated = await col("products").update(
          { _id: product._id, stock: product.stock },
          { stock: product.stock - requested.quantity },
        );
        if (!updated) fail(409, "Stock changed. Please try again.");
      }
      const totalPaise = items.reduce(
        (sum, item) => sum + item.pricePaise * item.quantity,
        0,
      );
      return col("orders").insert(
        record({
          ownerId: req.user._id,
          customerName: req.user.name,
          items,
          totalPaise,
          total: totalPaise / 100,
          address: input.address,
          phone: input.phone,
          idempotencyKey: input.idempotencyKey,
          status: "Placed",
          paymentStatus: "Manual payment pending",
        }),
      );
    },
    { transaction: true },
  );
  res.status(201).json(order);
});
app.get("/api/consultations", async (req, res) =>
  res.json(
    paginate(
      await database((col) =>
        col("consultations").find({ ownerId: req.user._id }),
      ),
      req.query,
    ),
  ),
);
app.post("/api/consultations", async (req, res) => {
  const input = parse(schemas.consultations, req.body);
  res
    .status(201)
    .json(
      await database((col) =>
        col("consultations").insert(
          record({
            ...input,
            ownerId: req.user._id,
            author: req.user.name,
            status: "Open",
            replies: [],
          }),
        ),
      ),
    );
});
app.get("/api/posts", async (req, res) =>
  res.json(
    paginate(
      await database((col) => col("posts").find({ hidden: false })),
      req.query,
    ),
  ),
);
app.post("/api/posts", async (req, res) => {
  const input = parse(schemas.posts, req.body);
  res
    .status(201)
    .json(
      await database((col) =>
        col("posts").insert(
          record({
            ...input,
            ownerId: req.user._id,
            author: req.user.name,
            hidden: false,
            reports: [],
          }),
        ),
      ),
    );
});
app.delete("/api/posts/:id", async (req, res) => {
  const query =
    req.user.role === "admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };
  const post = await database((col) =>
    col("posts").update(query, { hidden: true }),
  );
  if (!post) fail(404, "Post not found.");
  res.json({ ok: true });
});
app.post("/api/posts/:id/report", async (req, res) => {
  await database(
    async (col) => {
      const post = await col("posts").one({
        _id: req.params.id,
        hidden: false,
      });
      if (!post) fail(404, "Post not found.");
      await col("posts").update(
        { _id: post._id },
        { reports: [...new Set([...post.reports, req.user._id])] },
      );
    },
    { transaction: true },
  );
  res.json({ ok: true });
});
app.get("/api/posts/:id/comments", async (req, res) => {
  const comments = await database(async (col) => {
    if (!(await col("posts").one({ _id: req.params.id, hidden: false })))
      fail(404, "Post not found.");
    return col("comments").find({ postId: req.params.id });
  });
  res.json(paginate(comments, req.query));
});
app.post("/api/posts/:id/comments", async (req, res) => {
  const input = parse(schemas.reply, req.body);
  const comment = await database(async (col) => {
    if (!(await col("posts").one({ _id: req.params.id, hidden: false })))
      fail(404, "Post not found.");
    return col("comments").insert(
      record({
        ...input,
        postId: req.params.id,
        ownerId: req.user._id,
        author: req.user.name,
      }),
    );
  });
  res.status(201).json(comment);
});
app.delete("/api/comments/:id", async (req, res) => {
  const query =
    req.user.role === "admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };
  if (!(await database((col) => col("comments").remove(query))))
    fail(404, "Comment not found.");
  res.json({ ok: true });
});
app.get("/api/advisories", async (req, res) =>
  res.json(
    paginate(await database((col) => col("advisories").find({})), req.query),
  ),
);
app.get("/api/notifications", async (req, res) =>
  res.json(
    paginate(
      await database((col) =>
        col("notifications").find({ ownerId: req.user._id }),
      ),
      req.query,
    ),
  ),
);
app.patch("/api/notifications/:id", async (req, res) => {
  const notification = await database((col) =>
    col("notifications").update(
      { _id: req.params.id, ownerId: req.user._id },
      { read: true },
    ),
  );
  if (!notification) fail(404, "Notification not found.");
  res.json(notification);
});
app.use("/api/admin", admin);
app.get("/api/admin/:collection", async (req, res) => {
  const name = req.params.collection;
  if (
    ![
      "users",
      "products",
      "orders",
      "consultations",
      "posts",
      "advisories",
    ].includes(name)
  )
    fail(404, "Resource not found.");
  const rows = await database((col) => col(name).find({}));
  res.json(
    paginate(
      name === "users"
        ? rows.map((user) => ({
            ...publicUser(user),
            _id: user._id,
            createdAt: user.createdAt,
          }))
        : rows,
      req.query,
    ),
  );
});
for (const name of ["products", "advisories"]) {
  app.post(`/api/admin/${name}`, async (req, res) => {
    const input = parse(schemas[name], req.body);
    res
      .status(201)
      .json(
        await database((col) =>
          col(name).insert(
            record({
              ...input,
              ...(name === "products" ? { archived: false } : {}),
            }),
          ),
        ),
      );
  });
  app.patch(`/api/admin/${name}/:id`, async (req, res) => {
    const input = parse(schemas[name], req.body);
    const row = await database((col) =>
      col(name).update({ _id: req.params.id }, input),
    );
    if (!row) fail(404, "Record not found.");
    res.json(row);
  });
  app.delete(`/api/admin/${name}/:id`, async (req, res) => {
    const result = await database((col) =>
      name === "products"
        ? col(name).update({ _id: req.params.id }, { archived: true })
        : col(name).remove({ _id: req.params.id }),
    );
    if (!result) fail(404, "Record not found.");
    res.json({ ok: true });
  });
}
app.patch("/api/admin/users/:id", async (req, res) => {
  if (req.params.id === req.user._id)
    fail(400, "You cannot disable your own account.");
  if (typeof req.body.disabled !== "boolean")
    fail(400, "Specify whether the account is disabled.");
  const user = await database((col) =>
    col("users").update(
      { _id: req.params.id, role: "farmer" },
      { disabled: req.body.disabled },
    ),
  );
  if (!user) fail(404, "Farmer account not found.");
  res.json(publicUser(user));
});
app.patch("/api/admin/orders/:id", async (req, res) => {
  const { status } = parse(schemas.status, req.body);
  const result = await database(
    async (col) => {
      const order = await col("orders").one({ _id: req.params.id });
      if (!order) fail(404, "Order not found.");
      const transitions = {
        Placed: ["Confirmed", "Cancelled"],
        Confirmed: ["Shipped", "Cancelled"],
        Shipped: ["Delivered"],
        Delivered: [],
        Cancelled: [],
      };
      if (!transitions[order.status].includes(status))
        fail(409, `Cannot change ${order.status} to ${status}.`);
      if (status === "Cancelled")
        for (const item of order.items) {
          const product = await col("products").one({ _id: item.productId });
          if (product)
            await col("products").update(
              { _id: product._id },
              { stock: product.stock + item.quantity },
            );
        }
      const updated = await col("orders").update(
        { _id: order._id, status: order.status },
        { status, updatedAt: now() },
      );
      if (!updated) fail(409, "Order changed. Refresh and try again.");
      await col("notifications").insert(
        record({
          ownerId: order.ownerId,
          title: `Order ${status.toLowerCase()}`,
          body: `Order ${order._id.slice(0, 8)} is now ${status.toLowerCase()}.`,
          read: false,
        }),
      );
      return updated;
    },
    { transaction: true },
  );
  res.json(result);
});
app.post("/api/admin/consultations/:id/replies", async (req, res) => {
  const input = parse(schemas.reply, req.body);
  const result = await database(
    async (col) => {
      const consultation = await col("consultations").one({
        _id: req.params.id,
      });
      if (!consultation) fail(404, "Consultation not found.");
      const updated = await col("consultations").update(
        { _id: consultation._id },
        {
          status: "Resolved",
          replies: [
            ...consultation.replies,
            { ...input, author: req.user.name, createdAt: now() },
          ],
        },
      );
      await col("notifications").insert(
        record({
          ownerId: consultation.ownerId,
          title: "Your consultation has a reply",
          body: consultation.subject,
          read: false,
        }),
      );
      return updated;
    },
    { transaction: true },
  );
  res.json(result);
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "API route not found." }),
);
app.use((error, req, res, next) => {
  if (error.code === 11000)
    return res
      .status(409)
      .json({
        error: "This record already exists. Please refresh and try again.",
      });
  if (error.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid JSON request." });
  const status = error.status || 500;
  if (status >= 500)
    console.error(
      JSON.stringify({
        event: "request_failed",
        method: req.method,
        path: req.path,
        name: error.name,
        status,
      }),
    );
  res
    .status(status)
    .json({
      error:
        status === 500
          ? "Something went wrong. Please try again."
          : error.message,
     });
});
export default app;
