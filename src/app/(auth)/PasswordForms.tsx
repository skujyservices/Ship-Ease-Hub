"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmEmail, requestReset, setPassword, type AuthState } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestReset, undefined);
  if (state?.ok) return <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">{state.ok}</p>;
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
      <p className="text-center text-sm text-navy/70"><Link href="/login" className="font-semibold text-purple">Back to sign in</Link></p>
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(setPassword.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      {state?.error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save and sign in"}</button>
    </form>
  );
}

export function ConfirmEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(() => confirmEmail(token), undefined);
  if (state?.ok)
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">{state.ok}</p>
        <Link href="/app" className="btn-primary w-full">Continue</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Confirming…" : "Confirm my email"}</button>
    </form>
  );
}
