import type { Metadata } from "next";
import Link from "next/link";
import { findToken } from "@/lib/tokens";
import { NewPasswordForm } from "../../PasswordForms";

export const metadata: Metadata = { title: "Choose a password", robots: { index: false } };

export default async function ResetPage({ params }: PageProps<"/reset/[token]">) {
  const { token } = await params;
  const row = await findToken(token);
  if (!row)
    return (
      <>
        <h1 className="mb-2 text-2xl font-light text-navy">This link has expired</h1>
        <p className="mb-6 text-sm text-navy/70">Links work once and only for a limited time.</p>
        <Link href="/forgot" className="btn-primary w-full">Get a new link</Link>
      </>
    );
  return (
    <>
      <h1 className="mb-1 text-2xl font-light text-navy">{row.purpose === "invite" ? `Welcome, ${row.user.name.split(" ")[0]}` : "Choose a new password"}</h1>
      <p className="mb-6 text-sm text-navy/70">
        {row.purpose === "invite" ? "You've been invited to the Ship Ease Hub team. Set a password to get started." : `For ${row.user.email}`}
      </p>
      <NewPasswordForm token={token} />
    </>
  );
}
