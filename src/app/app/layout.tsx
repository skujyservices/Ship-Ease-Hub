import Link from "next/link";
import { Logo } from "@/components/Logo";
import { TabBar } from "@/components/TabBar";
import { requireUser } from "@/lib/auth";
import { ServiceWorker } from "@/components/ServiceWorker";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser("/app");
  return (
    <div className="flex min-h-dvh flex-col bg-mist">
      <header className="sticky top-0 z-30 border-b border-silver/60 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo href="/app/shipments" />
          <div className="flex items-center gap-3">
            <TabBar />
            {user.role !== "CUSTOMER" && (
              <Link href="/admin" className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white">Admin</Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:pb-10">{children}</main>
      <ServiceWorker />
    </div>
  );
}
