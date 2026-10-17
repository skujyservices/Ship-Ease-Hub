import { downloadRateCard } from "@/lib/terminal/api";
import { getCurrentUser } from "@/lib/auth";

// Streams a rate card file from Terminal to staff
export async function GET(_req: Request, ctx: RouteContext<"/admin/rate-cards/[id]/[format]">) {
  const user = await getCurrentUser();
  if (!user || user.role === "CUSTOMER") return new Response("Not found", { status: 404 });
  const { id, format } = await ctx.params;
  if (format !== "pdf" && format !== "excel") return new Response("Not found", { status: 404 });
  try {
    const file = await downloadRateCard(id, format);
    return new Response(file.body, {
      headers: {
        "Content-Type": file.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": file.headers.get("content-disposition") ?? `attachment; filename="${id}.${format === "pdf" ? "pdf" : "xlsx"}"`,
      },
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Download failed", { status: 502 });
  }
}
