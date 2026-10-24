"use client";

import { useActionState, useState } from "react";
import { changeEmail, changePassword, resendVerification, updateProfile, type FormState } from "./actions";

function Result({ state }: { state: FormState }) {
  if (state?.ok) return <p className="text-sm text-success">{state.ok}</p>;
  if (state?.error) return <p className="text-sm text-danger">{state.error}</p>;
  return null;
}

export function ProfileForm({ name, phone, businessName }: { name: string; phone: string; businessName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pf-name">Full name</label>
          <input id="pf-name" name="name" className="input" defaultValue={name} autoComplete="name" required />
        </div>
        <div>
          <label className="label" htmlFor="pf-phone">WhatsApp number</label>
          <input id="pf-phone" name="phone" type="tel" className="input" defaultValue={phone} autoComplete="tel" required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pf-biz">Business name (optional)</label>
          <input id="pf-biz" name="businessName" className="input" defaultValue={businessName} autoComplete="organization" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <Result state={state} />
      </div>
    </form>
  );
}

/** Email and password changes, each behind its own "Change" toggle. */
export function SecurityForms({ email, pendingEmail }: { email: string; pendingEmail: string | null }) {
  const [open, setOpen] = useState<"email" | "password" | null>(null);
  const [emailState, emailAction, emailPending] = useActionState<FormState, FormData>(changeEmail, undefined);
  const [pwState, pwAction, pwPending] = useActionState<FormState, FormData>(changePassword, undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-navy/60">Email</p>
          <p className="font-medium text-navy">{email}</p>
          {pendingEmail && <p className="text-xs text-navy/60">Waiting for you to confirm {pendingEmail}</p>}
        </div>
        <button type="button" className="btn-ghost px-4 py-2" onClick={() => setOpen(open === "email" ? null : "email")}>Change email</button>
      </div>
      {open === "email" && (
        <form action={emailAction} className="space-y-3 rounded-2xl bg-mist p-4">
          <input key={emailState?.values?.email ?? ""} name="email" type="email" className="input" placeholder="New email" aria-label="New email" autoComplete="email" defaultValue={emailState?.values?.email} required />
          <input name="password" type="password" className="input" placeholder="Current password" aria-label="Current password" autoComplete="current-password" required />
          <div className="flex items-center gap-3">
            <button className="btn-primary" disabled={emailPending}>{emailPending ? "Sending…" : "Send confirmation link"}</button>
            <Result state={emailState} />
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-silver/60 pt-4">
        <p className="font-medium text-navy">Password</p>
        <button type="button" className="btn-ghost px-4 py-2" onClick={() => setOpen(open === "password" ? null : "password")}>Change password</button>
      </div>
      {open === "password" && (
        <form action={pwAction} className="space-y-3 rounded-2xl bg-mist p-4">
          <input name="password" type="password" className="input" placeholder="Current password" aria-label="Current password" autoComplete="current-password" required />
          <input name="newPassword" type="password" minLength={8} className="input" placeholder="New password (8+ characters)" aria-label="New password" autoComplete="new-password" required />
          <div className="flex items-center gap-3">
            <button className="btn-primary" disabled={pwPending}>{pwPending ? "Saving…" : "Change password"}</button>
            <Result state={pwState} />
          </div>
        </form>
      )}
    </div>
  );
}

/** Shown across the app until the email is confirmed. */
export function VerifyBanner({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(() => resendVerification(), undefined);
  return (
    <form action={action} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-gold/20 px-4 py-2.5 text-center text-sm text-navy print:hidden">
      <span>Please confirm your email. We sent a link to <b>{email}</b>.</span>
      <button className="font-semibold text-purple underline-offset-4 hover:underline" disabled={pending}>{pending ? "Sending…" : "Resend link"}</button>
      {state && <span className={state.error ? "text-danger" : "text-success"}>{state.ok ?? state.error}</span>}
    </form>
  );
}
