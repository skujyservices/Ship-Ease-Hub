import "server-only";
import webpush from "web-push";
import { db } from "./db";
import { brandedEmail } from "./email";

/**
 * Sends one message on every channel the user can receive: email, WhatsApp and push.
 * A channel without credentials is skipped, and one failing channel never blocks the others.
 */

type Message = { title: string; body: string; url?: string; cta?: string; lines?: [string, string][] };

/** Branded email to any address (also used for staff invites, before an account is active). */
export async function sendEmail(to: string, msg: Message) {
  if (!process.env.RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject: msg.title,
      html: brandedEmail(msg),
      text: `${msg.title}\n\n${msg.body}${msg.url ? `\n\n${process.env.APP_URL}${msg.url}` : ""}`,
    }),
  });
}

async function sendWhatsApp(phone: string, msg: Message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;
  const link = msg.url ? `${process.env.APP_URL}${msg.url}` : process.env.APP_URL ?? "";
  const template = process.env.WHATSAPP_TEMPLATE;

  // Messages we start only reach customers through a template Meta has approved
  // (README → "WhatsApp template"). Without one, fall back to plain text, which Meta
  // only delivers to people who messaged us in the last 24 hours.
  const message = template
    ? {
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
          components: [{ type: "body", parameters: [msg.title, msg.body, link].map((text) => ({ type: "text", text: templateParam(text) })) }],
        },
      }
    : { type: "text", text: { body: `${msg.title}\n${msg.body}${link ? `\n${link}` : ""}` } };

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone.replace(/[^\d]/g, ""), ...message }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Template parameters can't contain new lines, tabs or 4+ spaces in a row, and are length-capped. */
const templateParam = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, 900) || "-";

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
