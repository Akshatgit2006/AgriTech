import { randomUUID } from "node:crypto";
import { database, closeDatabase } from "../server/store.js";
import { hashPassword } from "../server/auth.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!process.env.MONGODB_URI) {
  throw new Error("Set MONGODB_URI to your MongoDB Atlas connection string.");
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("Set ADMIN_EMAIL to the real administrator email address.");
}
if (!password || password.length < 12) {
  throw new Error("Set ADMIN_PASSWORD to a unique password of at least 12 characters.");
}

const passwordHash = await hashPassword(password);
let created;
try {
  created = await database(async (col) => {
    if (await col("users").one({ email })) return false;
    await col("users").insert({
      _id: randomUUID(),
      createdAt: new Date().toISOString(),
      name: "Fieldwise Administrator",
      email,
      passwordHash,
      role: "admin",
    });
    return true;
  });
} finally {
  await closeDatabase();
}

console.log(created ? "Administrator account created." : "Administrator account already exists.");
