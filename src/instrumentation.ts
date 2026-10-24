import type { Instrumentation } from "next";

/**
 * Uncaught server errors (pages, server actions, routes) → ErrorLog + email alert.
 * See src/lib/errors.ts. API routes report the errors they catch themselves (lib/http.ts).
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null;
  const { reportError } = await import("@/lib/errors");
  await reportError(err, { path: request.path, routeType: context.routeType, digest });
};
