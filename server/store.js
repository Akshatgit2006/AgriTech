import { MongoClient } from "mongodb";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";

let connection;
let queue = Promise.resolve();
let memory;
const file = path.resolve(process.env.DEMO_DATA_FILE || ".local/data.json");
export function isDemo() {
  return (
    process.env.DEMO_MODE === "true" &&
    !process.env.VERCEL &&
    process.env.NODE_ENV !== "production"
  );
}
export function isConfigured() {
  return !!process.env.MONGODB_URI || isDemo();
}
function matches(row, query) {
  return Object.entries(query).every(([key, value]) => {
    if (value && typeof value === "object") {
      if ("$in" in value) return value.$in.includes(row[key]);
      if ("$gte" in value) return row[key] >= value.$gte;
    }
    return row[key] === value;
  });
}
function localCollection(data, name) {
  const rows = (data[name] ||= []);
  return {
    find: async (query = {}) =>
      structuredClone(rows.filter((row) => matches(row, query))),
    one: async (query) =>
      structuredClone(rows.find((row) => matches(row, query)) || null),
    insert: async (row) => {
      rows.push(structuredClone(row));
      return row;
    },
    update: async (query, changes) => {
      const row = rows.find((row) => matches(row, query));
      if (!row) return null;
      Object.assign(row, structuredClone(changes));
      return structuredClone(row);
    },
    remove: async (query) => {
      const index = rows.findIndex((row) => matches(row, query));
      if (index < 0) return false;
      rows.splice(index, 1);
      return true;
    },
  };
}
async function mongo() {
  if (!connection) {
    connection = (async () => {
      if (!process.env.MONGODB_URI)
        throw Object.assign(
          new Error(
            "Database is not configured. Set MONGODB_URI or enable local demo mode.",
          ),
          { status: 503 },
        );
      const client = new MongoClient(process.env.MONGODB_URI, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 8000,
      });
      await client.connect();
      const db = client.db(process.env.MONGODB_DB || "fieldwise");
      await Promise.all([
        db.collection("users").createIndex({ email: 1 }, { unique: true }),
        ...[
          "farms",
          "crops",
          "soil",
          "activities",
          "orders",
          "consultations",
          "notifications",
        ].map((name) =>
          db.collection(name).createIndex({ ownerId: 1, createdAt: -1 }),
        ),
        db.collection("comments").createIndex({ postId: 1 }),
        db
          .collection("sessions")
          .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db
          .collection("limits")
          .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      ]);
      return { client, db };
    })().catch((error) => {
      connection = undefined;
      throw error;
    });
  }
  return connection;
}
function mongoCollection(db, name, session) {
  const collection = db.collection(name);
  const opts = session ? { session } : {};
  return {
    find: (query) =>
      collection
        .find(query || {}, opts)
        .sort({ createdAt: -1 })
        .limit(1000)
        .toArray(),
    one: (query) => collection.findOne(query, opts),
    insert: async (row) => {
      await collection.insertOne(row, opts);
      return row;
    },
    update: (query, changes) =>
      collection.findOneAndUpdate(
        query,
        { $set: changes },
        { ...opts, returnDocument: "after" },
      ),
    remove: async (query) =>
      (await collection.deleteOne(query, opts)).deletedCount > 0,
  };
}
export async function database(work, { transaction = false } = {}) {
  if (isDemo()) {
    const operation = queue.then(async () => {
      if (!memory) {
        try {
          memory = JSON.parse(await readFile(file, "utf8"));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          memory = {};
        }
      }
      const draft = structuredClone(memory);
      const result = await work((name) => localCollection(draft, name));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(`${file}.tmp`, JSON.stringify(draft), "utf8");
      await rename(`${file}.tmp`, file);
      memory = draft;
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  }
  const { db, client } = await mongo();
  if (!transaction) return work((name) => mongoCollection(db, name));
  const session = client.startSession();
  try {
    return await session.withTransaction(() =>
      work((name) => mongoCollection(db, name, session)),
    );
  } finally {
    await session.endSession();
  }
}
export async function rateLimit(key, maximum, windowMs) {
  const bucket = Math.floor(Date.now() / windowMs);
  const id = `${key}:${bucket}`;
  if (isDemo())
    return database(async (col) => {
      const row = await col("limits").one({ _id: id });
      if (row && row.count >= maximum) return false;
      if (row)
        await col("limits").update({ _id: id }, { count: row.count + 1 });
      else
        await col("limits").insert({
          _id: id,
          count: 1,
          expiresAt: new Date((bucket + 1) * windowMs).toISOString(),
        });
      return true;
    });
  const { db } = await mongo();
  const row = await db
    .collection("limits")
    .findOneAndUpdate(
      { _id: id },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) },
      },
      { upsert: true, returnDocument: "after" },
    );
  return row.count <= maximum;
}
