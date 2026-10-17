import "server-only";
import webpush from "web-push";
import { db } from "./db";

/**
 * Sends one message on every channel the user can receive: email, WhatsApp and push.
 * A channel without credentials is skipped, and one failing channel never blocks the others.
 */

type Message = { title: string; body: string; url?: string };

async function sendEmail(to: string, msg: Message) {
  if (!process.env.RESEND_API_KEY) return;
  const link = msg.url ? `<p><a href="${process.env.APP_URL}${msg.url}">View in Ship Ease Hub</a></p>` : "";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject: msg.title,
      html: `<p>${msg.body}</p>${link}`,
    }),
  });
}

async function sendWhatsApp(phone: string, msg: Message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;
  // Free-form text only reaches users who messaged us in the last 24h. For everyone
  // else Meta requires an approved template; swap this body for a template message
  // once templates are approved in WhatsApp Manager.
  await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.replace(/[^\d]/g, ""),
      type: "text",
      text: { body: `${msg.title}\n${msg.body}${msg.url ? `\n${process.env.APP_URL}${msg.url}` : ""}` },
    }),
  });
}

async function sendPush(userId: string, msg: Message) {
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env;
  if (!pub || !priv || !subject) return;
  webpush.setVapidDetails(subject, pub, priv);
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg))
        .catch(async (err: { statusCode?: number }) => {
          // Subscription expired or revoked
          if (err.statusCode === 404 || err.statusCode === 410) await db.pushSubscription.delete({ where: { id: s.id } });
        }),
    ),
  );
}

export async function notifyUser(userId: string, msg: Message) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, phone: true } });
  if (!user) return;
  const results = await Promise.allSettled([
    sendEmail(user.email, msg),
    user.phone ? sendWhatsApp(user.phone, msg) : Promise.resolve(),
    sendPush(userId, msg),
  ]);
  results.forEach((r) => r.status === "rejected" && console.error("notify failed", r.reason));
}
