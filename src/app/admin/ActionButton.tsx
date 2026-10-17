"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "./actions";

/** Runs a server action and shows its result inline. */
export function ActionButton({
  action,
  children,
  className = "btn-ghost",
  confirmText,
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  confirmText?: string;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>();
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirmText && !confirm(confirmText)) return;
          start(async () => setResult(await action()));
        }}
      >
        {pending ? "Working…" : children}
      </button>
      {result?.ok && <span className="text-xs text-success">{result.ok}</span>}
      {result?.error && <span className="text-xs text-danger">{result.error}</span>}
    </span>
  );
}
