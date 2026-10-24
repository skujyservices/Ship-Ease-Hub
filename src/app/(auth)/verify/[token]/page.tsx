import type { Metadata } from "next";
import { ConfirmEmailForm } from "../../PasswordForms";

export const metadata: Metadata = { title: "Confirm email", robots: { index: false } };

// A button (not an automatic confirm on load), so email link scanners can't use up the link
export default async function VerifyPage({ params }: PageProps<"/verify/[token]">) {
  const { token } = await params;
  return (
    <>
      <h1 className="mb-1 text-2xl font-light text-navy">Confirm your email</h1>
      <p className="mb-6 text-sm text-navy/70">One tap and you&apos;re done.</p>
      <ConfirmEmailForm token={token} />
    </>
  );
}
