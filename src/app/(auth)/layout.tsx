import Link from "next/link";
import { LogoStacked } from "@/components/Logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="bg-grid flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8" aria-label="Ship Ease Hub home">
        <LogoStacked className="h-16 w-auto" />
      </Link>
      <div className="card w-full max-w-sm overflow-hidden p-0">
        <div className="stripe h-1" />
        <div className="p-6">{children}</div>
      </div>
    </main>
  );
}
