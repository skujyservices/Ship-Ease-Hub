"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/http";
import { sendVerification, tooMany } from "@/lib/verify";

export type FormState = { ok?: string; error?: string; values?: Record<string, string> } | undefined;

export async function deleteAddress(id: string) {
  const user = await requireUser();
  await db.savedAddress.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/app/account");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, "Enter your WhatsApp number with country code, e.g. +234 803 123 4567"),
  businessName: z.string().trim().max(120).optional(),
});

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, phone, businessName } = parsed.data;
  await db.user.update({ where: { id: user.id }, data: { name, phone, businessName: businessName || null } });
  revalidatePath("/app/account");
  return { ok: "Profile saved" };
}

async function checkPassword(userId: string, password: string) {
  try {
    await rateLimit(`pwcheck:${userId}`, 10, 15 * 60_000);
  } catch (e) {
    if (tooMany(e)) return "Too many attempts. Please wait a few minutes.";
    throw e;
  }
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  return (await bcrypt.compare(password, u.passwordHash)) ? null : "Your current password is incorrect.";
}

export async function changeEmail(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const typed = String(form.get("email") ?? "");
  const keep = { values: { email: typed } }; // React resets the form after submit; give the email back on errors
  const email = z.email("Enter a valid email").transform((e) => e.toLowerCase()).safeParse(typed);
  if (!email.success) return { error: email.error.issues[0].message, ...keep };
  if (email.data === user.email) return { error: "That's already your email.", ...keep };
  const bad = await checkPassword(user.id, String(form.get("password") ?? ""));
  if (bad) return { error: bad, ...keep };
  if (await db.user.findUnique({ where: { email: email.data } })) return { error: "That email is used by another account.", ...keep };

  await db.user.update({ where: { id: user.id }, data: { pendingEmail: email.data } });
  await sendVerification(user.id, email.data, true);
  revalidatePath("/app/account");
  return { ok: `We sent a link to ${email.data}. Your email changes once you tap it.` };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const next = String(form.get("newPassword") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters" };
  const bad = await checkPassword(user.id, String(form.get("password") ?? ""));
  if (bad) return { error: bad };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: "Password changed" };
}

export async function resendVerification(): Promise<FormState> {
  const user = await requireUser();
  try {
    await rateLimit(`verify-resend:${user.id}`, 3, 3600_000);
  } catch (e) {
    if (tooMany(e)) return { error: "We've sent a few already. Check your spam folder, or try again in an hour." };
    throw e;
  }
  const u = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (u.emailVerifiedAt && !u.pendingEmail) return { ok: "Your email is already confirmed." };
  await sendVerification(u.id, u.pendingEmail ?? u.email, Boolean(u.pendingEmail));
  return { ok: `Sent to ${u.pendingEmail ?? u.email}` };
}
