"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { newSuiteId, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/notify";
import type { ActionResult } from "../actions";

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Enter their name"),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  role: z.enum(["STAFF", "ADMIN"]),
});

/** Invite a team member: creates (or upgrades) the account and sends a set-password link. */
export async function inviteMember(_: ActionResult, form: FormData): Promise<ActionResult & { link?: string }> {
  await requireAdmin();
  const parsed = inviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  const user = existing
    ? await db.user.update({ where: { id: existing.id }, data: { role, disabledAt: null } })
    : await db.user.create({
        data: {
          name,
          email,
          role,
          suiteId: await newSuiteId(),
          // Unusable random password until they set their own via the link
          passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12),
        },
      });

  const token = await createToken(user.id, existing ? "reset" : "invite", 72);
  const link = `${process.env.APP_URL}/reset/${token}`;
  await sendEmail(email, {
    title: "You're invited to the Ship Ease Hub team",
    body: `${name}, you've been given ${role === "ADMIN" ? "admin" : "staff"} access. Set your password to get started. The link works for 3 days.`,
    url: `/reset/${token}`,
    cta: "Set my password",
  }).catch(() => undefined);

  revalidatePath("/admin/team");
  return { ok: `Invited ${email}. If the email doesn't arrive, share this link with them:`, link };
}

export async function setRole(userId: string, role: "STAFF" | "ADMIN" | "CUSTOMER"): Promise<ActionResult> {
  const me = await requireAdmin();
  if (userId === me.id) return { error: "You can't change your own role." };
  if (role !== "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN", disabledAt: null } });
    const target = await db.user.findUnique({ where: { id: userId } });
    if (target?.role === "ADMIN" && admins <= 1) return { error: "Keep at least one admin." };
  }
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/team");
  return { ok: role === "CUSTOMER" ? "Team access removed" : `Now ${role.toLowerCase()}` };
}
