import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-mist px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="card w-full max-w-sm">{children}</div>
    </main>
  );
}
