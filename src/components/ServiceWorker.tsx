"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** "Turn on notifications" button for the Account page. */
const noopSubscribe = () => () => {};
const pushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

export function PushToggle() {
  const supported = useSyncExternalStore(noopSubscribe, pushSupported, () => true);
  const [state, setState] = useState<"off" | "on" | "denied" | "working">("off");

  useEffect(() => {
    if (!pushSupported()) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : Notification.permission === "denied" ? "denied" : "off"));
  }, []);

  async function enable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState(res.ok ? "on" : "off");
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "off");
    }
  }

  if (!supported)
    return <p className="text-sm text-navy/60">Push notifications aren&apos;t available on this device. On iPhone, add Ship Ease Hub to your Home Screen first.</p>;
  if (state === "denied") return <p className="text-sm text-navy/60">Notifications are blocked. Allow them in your browser settings.</p>;
  if (state === "on") return <p className="text-sm font-semibold text-success">Push notifications are on for this device.</p>;
  return (
    <button type="button" className="btn-ghost" onClick={enable} disabled={state === "working"}>
      Turn on push notifications
    </button>
  );
}
