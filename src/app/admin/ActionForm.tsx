"use client";

import { useActionState } from "react";
import type { ActionResult } from "./actions";

/** A <form> bound to a server action `(prev, formData) => ActionResult`, showing the outcome inline. */
export function ActionForm({
  action,
  children,
  submit,
  className = "space-y-3",
  submitClass = "btn-primary",
}: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submit: string;
  className?: string;
  submitClass?: string;
}) {
  const [state, run, pending] = useActionState<ActionResult, FormData>(action, undefined);
  return (
    <form action={run} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button className={submitClass} disabled={pending}>{pending ? "Working…" : submit}</button>
        {state?.ok && <span className="text-sm text-success">{state.ok}</span>}
        {state?.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
