import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID, randomBytes } from "node:crypto";
import { database, isDemo } from "./store.js";
const localSecret = randomBytes(48).toString("hex");
export const cookieOptions = () => ({
  httpOnly: true,
  secure: !!process.env.VERCEL || process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});
function secret() {
  if (process.env.JWT_SECRET?.length >= 32) return process.env.JWT_SECRET;
  if (isDemo()) return localSecret;
  throw Object.assign(
    new Error(
      "Authentication is not configured. Set JWT_SECRET to at least 32 random characters.",
    ),
    { status: 503 },
  );
}
export function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    disabled: !!user.disabled,
  };
}
export const hashPassword = (password) => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) =>
  bcrypt.compare(password, hash);
export async function createSession(res, user) {
  const id = randomUUID();
  const token = jwt.sign({ sid: id }, secret(), {
    subject: user._id,
    expiresIn: "7d",
    issuer: "fieldwise",
    audience: "fieldwise-web",
    algorithm: "HS256",
  });
  await database((col) =>
    col("sessions").insert({
      _id: id,
      userId: user._id,
      expiresAt: new Date(Date.now() + 604800000),
    }),
  );
  res.cookie("fieldwise_session", token, {
    ...cookieOptions(),
    maxAge: 604800000,
  });
}
export async function authenticate(req, res, next) {
  try {
    const token = req.cookies.fieldwise_session;
    if (!token)
      return res.status(401).json({ error: "Please sign in to continue." });
    let payload;
    try {
      payload = jwt.verify(token, secret(), {
        algorithms: ["HS256"],
        issuer: "fieldwise",
        audience: "fieldwise-web",
      });
    } catch (error) {
      if (error.status) throw error;
      return res
        .status(401)
        .json({ error: "Your session expired. Please sign in again." });
    }
    const result = await database(async (col) => ({
      session: await col("sessions").one({ _id: payload.sid }),
      user: await col("users").one({ _id: payload.sub }),
    }));
    if (
      !result.session ||
      new Date(result.session.expiresAt) <= new Date() ||
      !result.user ||
      result.user.disabled
    )
      return res
        .status(401)
        .json({ error: "Your session is no longer active." });
    req.user = result.user;
    req.sessionId = payload.sid;
    next();
  } catch (error) {
    next(error);
  }
}
export function admin(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Administrator access required." });
  next();
}
