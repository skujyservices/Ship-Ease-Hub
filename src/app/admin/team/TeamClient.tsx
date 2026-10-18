"use client";

import { useActionState } from "react";
import type { ActionResult } from "../actions";
import { inviteMember } from "./actions";
import { CopyButton } from "@/app/app/ship/abroad/AbroadClient";

export function InviteForm() {
  const [state, action, pending] = useActionState<(ActionResult & { link?: string }) | undefined, FormData>(inviteMember, undefined);
  return (
    <form action={action} className="card space-y-3">
      <h2 className="text-lg font-medium text-navy">Invite someone</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem]">
        <input name="name" className="input" placeholder="Full name" required />
        <input name="email" type="email" className="input" placeholder="Email" required />
        <select name="role" className="input" defaultValue="STAFF" aria-label="Role">
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <p className="text-xs text-navy/60">Staff run daily operations (packages, dispatch, pickups, Buy for me). Admins can also change settings, carriers, webhooks and the team.</p>
      <button className="btn-primary" disabled={pending}>{pending ? "Inviting…" : "Send invite"}</button>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && (
        <div className="space-y-2 rounded-2xl bg-success/10 p-3 text-sm text-success">
          <p>{state.ok}</p>
          {state.link && (
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-1 text-xs text-navy">{state.link}</code>
              <CopyButton text={state.link} />
            </div>
          )}
        </div>
      )}
    </form>
  );
}
