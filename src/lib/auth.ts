import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { db } from "./db";

const COOKIE = "seh_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type Session = { uid: string; role: Role };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function createSession(user: { id: string; role: Role }) {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub ? { uid: payload.sub, role: payload.role as Role } : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.uid },
    select: { id: true, name: true, email: true, phone: true, role: true, suiteId: true, businessName: true, ninVerifiedAt: true, ninName: true, disabledAt: true },
  }).then((u) => (u && !u.disabledAt ? u : null));
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (user.role === "CUSTOMER") redirect("/app");
  return user;
}

/** Settings, carriers, webhooks and team are for admins only. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireStaff();
  if (user.role !== "ADMIN") redirect("/admin");
  return user;
}

export async function newSuiteId(): Promise<string> {
  for (;;) {
    const id = `SEH-${Math.floor(10000 + Math.random() * 90000)}`;
    if (!(await db.user.findUnique({ where: { suiteId: id } }))) return id;
  }
}
