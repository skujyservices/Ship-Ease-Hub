"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "./actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);
  const nextQs = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      {mode === "signup" && (
        <>
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input className="input" id="name" name="name" autoComplete="name" required />
          </div>
          <div>
            <label className="label" htmlFor="phone">WhatsApp number</label>
            <input className="input" id="phone" name="phone" type="tel" placeholder="+234 801 234 5678" autoComplete="tel" required />
          </div>
        </>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
        />
      </div>
      {mode === "login" && (
        <p className="-mt-2 text-right text-xs"><Link href="/forgot" className="font-semibold text-purple">Forgot password?</Link></p>
      )}
      {state?.error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p>}
      {mode === "signup" && (
        <p className="text-xs text-navy/60">
          By creating an account you agree to our <Link href="/terms" className="font-semibold text-purple">Terms</Link> and{" "}
          <Link href="/privacy" className="font-semibold text-purple">Privacy policy</Link>.
        </p>
      )}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-navy/70">
        {mode === "login" ? (
          <>New here? <Link className="font-semibold text-purple" href={`/signup${nextQs}`}>Create an account</Link></>
        ) : (
          <>Already have an account? <Link className="font-semibold text-purple" href={`/login${nextQs}`}>Sign in</Link></>
        )}
      </p>
    </form>
  );
}
