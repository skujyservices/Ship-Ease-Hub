import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireStaff } from "@/lib/auth";

const NAV = [
  ["/admin", "Overview"],
  ["/admin/shipments", "Shipments"],
  ["/admin/carriers", "Carriers"],
  ["/admin/rate-cards", "Rate cards"],
  ["/admin/reconciliations", "Weight checks"],
  ["/admin/claims", "Claims"],
  ["/admin/transactions", "Terminal wallet"],
  ["/admin/webhooks", "Webhooks"],
  ["/admin/settings", "Settings"],
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaff();
  return (
    <div className="flex min-h-dvh flex-col bg-mist">
      <header className="bg-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo tone="light" href="/admin" />
            <span className="chip bg-gold text-navy">Admin</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <span className="hidden sm:inline">{user.name}</span>
            <Link href="/app" className="font-semibold text-white">Customer app →</Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Admin">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
