import { MongoClient } from "mongodb";

let connection;
export function isConfigured() {
  return !!process.env.MONGODB_URI;
}
async function mongo() {
  if (!connection) {
    connection = (async () => {
      if (!process.env.MONGODB_URI)
        throw Object.assign(
          new Error(
            "Database is not configured. Set MONGODB_URI to your MongoDB Atlas connection string.",
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
export async function closeDatabase() {
  if (!connection) return;
  const { client } = await connection;
  connection = undefined;
  await client.close();
}
export async function rateLimit(key, maximum, windowMs) {
  const bucket = Math.floor(Date.now() / windowMs);
  const id = `${key}:${bucket}`;
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
