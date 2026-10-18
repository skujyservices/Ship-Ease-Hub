import "server-only";
import crypto from "node:crypto";
import { db } from "./db";

/** One-time tokens for staff invites and password resets. Only a SHA-256 hash is stored. */

const hash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export async function createToken(userId: string, purpose: "invite" | "reset", ttlHours: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  await db.passwordToken.create({ data: { userId, purpose, tokenHash: hash(token), expiresAt: new Date(Date.now() + ttlHours * 3600_000) } });
  return token;
}

/** Returns the token row if it is valid (unused, unexpired), without consuming it. */
export async function findToken(token: string) {
  const row = await db.passwordToken.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  return row;
}

/** Marks the token used; false if someone else used it first. */
export async function consumeToken(id: string) {
  const r = await db.passwordToken.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } });
  return r.count === 1;
}
