"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, newSuiteId } from "@/lib/auth";
import { consumeToken, createToken, findToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/notify";
import { limitByIp, sendVerification, tooMany } from "@/lib/verify";

export type AuthState = { error?: string; ok?: string } | undefined;

const safeNext = (next: FormDataEntryValue | null) => {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/app";
};

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  phone: z.string().trim().min(7, "Enter your WhatsApp number with country code, e.g. +234…"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const TOO_MANY = { error: "Too many attempts. Please wait a few minutes and try again." };

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  try {
    await limitByIp("signup", 10, 3600_000);
  } catch (e) {
    if (tooMany(e)) return TOO_MANY;
    throw e;
  }
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, phone, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) return { error: "An account with this email already exists. Sign in instead." };

  // The account whose email matches ADMIN_EMAIL becomes the admin, so the business can set itself up.
  const isAdmin = Boolean(process.env.ADMIN_EMAIL) && email === process.env.ADMIN_EMAIL!.toLowerCase();
  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash: await bcrypt.hash(password, 12),
      suiteId: await newSuiteId(),
      role: isAdmin ? "ADMIN" : "CUSTOMER",
    },
  });
  await sendVerification(user.id, user.email).catch((e) => console.error("verification email failed", e));
  await createSession(user);
  redirect(safeNext(form.get("next")));
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  try {
    // Slow down password guessing: per IP and per account
    await limitByIp("login", 30, 15 * 60_000);
    await limitByIp(`login:${email}`, 10, 15 * 60_000);
  } catch (e) {
    if (tooMany(e)) return TOO_MANY;
    throw e;
  }
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Email or password is incorrect." };
  if (user.disabledAt) return { error: "This account has been deactivated. Please contact us." };
  await createSession(user);
  redirect(safeNext(form.get("next")) === "/app" && user.role !== "CUSTOMER" ? "/admin" : safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function requestReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  try {
    await limitByIp("reset", 5, 3600_000);
  } catch (e) {
    if (tooMany(e)) return TOO_MANY;
    throw e;
  }
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.disabledAt) {
    const token = await createToken(user.id, "reset", 1);
    await sendEmail(user.email, {
      title: "Reset your Ship Ease Hub password",
      body: "Tap the button below to choose a new password. The link works for 1 hour. If you didn't ask for this, you can ignore this email.",
      url: `/reset/${token}`,
      cta: "Choose a new password",
    });
  }
  // Same answer either way, so the form can't be used to find out who has an account
  return { ok: "If that email has an account, we've sent a reset link. Check your inbox." };
}

export async function setPassword(token: string, _: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  const row = await findToken(token);
  if (!row || !(await consumeToken(row.id))) return { error: "This link has expired or was already used. Ask for a new one." };
  // Using an emailed link proves they own the address
  const user = await db.user.update({
    where: { id: row.userId },
    data: { passwordHash: await bcrypt.hash(password, 12), emailVerifiedAt: row.user.emailVerifiedAt ?? new Date() },
  });
  await createSession(user);
  redirect(user.role === "CUSTOMER" ? "/app" : "/admin");
}

/** Confirms an emailed verification link: marks the email verified, or switches to the new address. */
export async function confirmEmail(token: string): Promise<AuthState> {
  const row = await findToken(token);
  if (!row || row.purpose !== "verify" || !(await consumeToken(row.id))) return { error: "This link has expired or was already used. Sign in and resend it." };
  const u = row.user;
  if (u.pendingEmail) {
    if (await db.user.findUnique({ where: { email: u.pendingEmail } })) {
      await db.user.update({ where: { id: u.id }, data: { pendingEmail: null } });
      return { error: "That email address is already used by another account." };
    }
    await db.user.update({ where: { id: u.id }, data: { email: u.pendingEmail, pendingEmail: null, emailVerifiedAt: new Date() } });
    return { ok: `Your email is now ${u.pendingEmail}.` };
  }
  await db.user.update({ where: { id: u.id }, data: { emailVerifiedAt: new Date() } });
  return { ok: "Thanks, your email is confirmed." };
}
