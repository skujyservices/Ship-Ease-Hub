import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Track a shipment" };

export default async function TrackSearch({ searchParams }: PageProps<"/track">) {
  const { code } = await searchParams;
  if (typeof code === "string" && code.trim()) redirect(`/track/${encodeURIComponent(code.trim().toUpperCase())}`);
  return (
    <>
      <SiteHeader active="Track" />
      <main className="bg-grid flex-1 px-4 py-16">
        <form className="card mx-auto max-w-md">
          <label htmlFor="code" className="label">Tracking code</label>
          <div className="flex gap-2">
            <input id="code" name="code" className="input" placeholder="SEH-7K3M9QX" required />
            <button className="btn-primary">Track</button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}
