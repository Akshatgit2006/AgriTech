import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
const directory = await mkdtemp(path.join(os.tmpdir(), "fieldwise-test-"));
process.env.DEMO_MODE = "true";
process.env.NODE_ENV = "test";
process.env.DEMO_DATA_FILE = path.join(directory, "data.json");
process.env.JWT_SECRET = "test-only-secret-at-least-32-characters-long";
delete process.env.VERCEL;
const { default: app } = await import("../server/app.js");
const { database } = await import("../server/store.js");
const farmer = request.agent(app);
const stranger = request.agent(app);
const admin = request.agent(app);
let owner, farm, product;
before(async () => {
  const response = await farmer
    .post("/api/auth/register")
    .send({
      name: "Owner",
      email: "owner@example.com",
      password: "StrongPassword123!",
    });
  assert.equal(response.status, 201);
  owner = response.body.user;
  await stranger
    .post("/api/auth/register")
    .send({
      name: "Other farmer",
      email: "other@example.com",
      password: "StrongPassword123!",
    })
    .expect(201);
  await admin
    .post("/api/auth/register")
    .send({
      name: "Admin",
      email: "admin@example.com",
      password: "StrongPassword123!",
    })
    .expect(201);
  await database((col) =>
    col("users").update({ email: "admin@example.com" }, { role: "admin" }),
  );
  const result = await farmer
    .post("/api/farms")
    .send({
      name: "Test Farm",
      location: "Pune",
      latitude: 18.52,
      longitude: 73.85,
      area: 5,
      soilType: "Loamy",
    })
    .expect(201);
  farm = result.body;
  const created = await admin
    .post("/api/admin/products")
    .send({
      name: "Seeds",
      description: "Test seed packet",
      category: "Seeds",
      price: 125.5,
      stock: 5,
      unit: "1 kg",
    })
    .expect(201);
  product = created.body;
});
after(async () => {
  await rm(directory, { recursive: true, force: true });
});
test("authentication, secure cookie attributes and registration role protection", async () => {
  await request(app).get("/api/farms").expect(401);
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Injected",
      email: "injected@example.com",
      password: "StrongPassword123!",
      role: "admin",
    })
    .expect(201);
  assert.equal(response.body.user.role, "farmer");
  assert.match(response.headers["set-cookie"][0], /HttpOnly/);
  assert.match(response.headers["set-cookie"][0], /SameSite=Lax/);
  assert.equal(response.body.user.passwordHash, undefined);
  await farmer.get("/api/admin/users").expect(403);
  await farmer
    .post("/api/auth/login")
    .set("Origin", "https://evil.example")
    .send({ email: "owner@example.com", password: "StrongPassword123!" })
    .expect(403);
});
test("private record isolation and foreign farm validation", async () => {
  const response = await stranger.get("/api/farms").expect(200);
  assert.equal(response.body.total, 0);
  await stranger.delete(`/api/farms/${farm._id}`).expect(404);
  await stranger
    .post("/api/crops")
    .send({
      farmId: farm._id,
      name: "Wheat",
      plantedAt: "2026-01-01",
      harvestAt: "2026-05-01",
      stage: "Growing",
      area: 1,
    })
    .expect(400);
  const mine = await farmer.get("/api/farms").expect(200);
  assert.equal(mine.body.items[0]._id, farm._id);
});
test("date and numeric validation, full CRUD, and farm relationship protection", async () => {
  const crop = {
    farmId: farm._id,
    name: "Wheat",
    plantedAt: "2026-02-30",
    harvestAt: "2026-05-01",
    stage: "Growing",
    area: 1,
  };
  await farmer.post("/api/crops").send(crop).expect(400);
  const response = await farmer
    .post("/api/crops")
    .send({ ...crop, plantedAt: "2026-02-01" })
    .expect(201);
  await farmer.delete(`/api/farms/${farm._id}`).expect(409);
  await farmer
    .patch(`/api/crops/${response.body._id}`)
    .send({ ...crop, plantedAt: "2026-02-01", stage: "Flowering" })
    .expect(200);
  await farmer.delete(`/api/crops/${response.body._id}`).expect(200);
  await farmer
    .post("/api/soil")
    .send({
      farmId: farm._id,
      testedAt: "2026-01-01",
      ph: 15,
      nitrogen: 1,
      phosphorus: 1,
      potassium: 1,
      moisture: 40,
    })
    .expect(400);
});
test("orders calculate trusted prices, reserve stock once and prevent invalid transitions", async () => {
  const body = {
    items: [{ productId: product._id, quantity: 2, price: 0 }],
    address: "Test address, Pune",
    phone: "9999999999",
    idempotencyKey: crypto.randomUUID(),
    total: 0,
  };
  const response = await farmer.post("/api/orders").send(body).expect(201);
  assert.equal(response.body.totalPaise, 25100);
  const repeated = await farmer.post("/api/orders").send(body).expect(201);
  assert.equal(repeated.body._id, response.body._id);
  let inventory = await database((col) =>
    col("products").one({ _id: product._id }),
  );
  assert.equal(inventory.stock, 3);
  await admin
    .patch(`/api/admin/orders/${response.body._id}`)
    .send({ status: "Delivered" })
    .expect(409);
  await admin
    .patch(`/api/admin/orders/${response.body._id}`)
    .send({ status: "Cancelled" })
    .expect(200);
  await admin
    .patch(`/api/admin/orders/${response.body._id}`)
    .send({ status: "Cancelled" })
    .expect(409);
  inventory = await database((col) =>
    col("products").one({ _id: product._id }),
  );
  assert.equal(inventory.stock, 5);
  const theirs = await stranger.get("/api/orders").expect(200);
  assert.equal(theirs.body.total, 0);
});
test("concurrent orders cannot oversell and failed orders roll back stock", async () => {
  const body = {
    items: [{ productId: product._id, quantity: 4 }],
    address: "Pune test address",
    phone: "9999999999",
  };
  const responses = await Promise.all([
    farmer
      .post("/api/orders")
      .send({ ...body, idempotencyKey: crypto.randomUUID() }),
    stranger
      .post("/api/orders")
      .send({ ...body, idempotencyKey: crypto.randomUUID() }),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  const invalid = {
    ...body,
    items: [
      { productId: product._id, quantity: 1 },
      { productId: "missing", quantity: 1 },
    ],
    idempotencyKey: crypto.randomUUID(),
  };
  await farmer.post("/api/orders").send(invalid).expect(409);
  const inventory = await database((col) =>
    col("products").one({ _id: product._id }),
  );
  assert.equal(inventory.stock, 1);
});
test("consultation replies create private notifications", async () => {
  const response = await farmer
    .post("/api/consultations")
    .send({
      subject: "Soil question",
      category: "Soil",
      message: "How should I interpret this report?",
    })
    .expect(201);
  await stranger
    .post(`/api/admin/consultations/${response.body._id}/replies`)
    .send({ body: "Wrong user" })
    .expect(403);
  await admin
    .post(`/api/admin/consultations/${response.body._id}/replies`)
    .send({ body: "Please share the laboratory details." })
    .expect(200);
  const notifications = await farmer.get("/api/notifications").expect(200);
  assert.ok(
    notifications.body.items.some((n) => n.title.includes("consultation")),
  );
  const privateId = notifications.body.items[0]._id;
  await stranger.patch(`/api/notifications/${privateId}`).send({}).expect(404);
});
test("community ownership, reporting and moderation", async () => {
  const response = await farmer
    .post("/api/posts")
    .send({ title: "My crop", category: "General", body: "Learning together." })
    .expect(201);
  await stranger.delete(`/api/posts/${response.body._id}`).expect(404);
  await stranger
    .post(`/api/posts/${response.body._id}/comments`)
    .send({ body: "Great!" })
    .expect(201);
  await stranger
    .post(`/api/posts/${response.body._id}/report`)
    .send({})
    .expect(200);
  await stranger
    .post(`/api/posts/${response.body._id}/report`)
    .send({})
    .expect(200);
  const post = await database((col) =>
    col("posts").one({ _id: response.body._id }),
  );
  assert.equal(post.reports.length, 1);
  await admin.delete(`/api/posts/${response.body._id}`).expect(200);
  await farmer.get(`/api/posts/${response.body._id}/comments`).expect(404);
});
test("logout revokes the session and account disabling takes effect immediately", async () => {
  const temporary = request.agent(app);
  const registered = await temporary
    .post("/api/auth/register")
    .send({
      name: "Temp",
      email: "temp@example.com",
      password: "StrongPassword123!",
    })
    .expect(201);
  const cookie = registered.headers["set-cookie"];
  await temporary.post("/api/auth/logout").send({}).expect(200);
  await request(app).get("/api/auth/me").set("Cookie", cookie).expect(401);
  await admin
    .patch(`/api/admin/users/${owner.id}`)
    .send({ disabled: true })
    .expect(200);
  await farmer.get("/api/auth/me").expect(401);
  await admin
    .patch(`/api/admin/users/${owner.id}`)
    .send({ disabled: false })
    .expect(200);
});
