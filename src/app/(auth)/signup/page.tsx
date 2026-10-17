import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-navy">Create your account</h1>
      <p className="mb-6 text-sm text-navy/70">We&apos;ll send shipment updates by email, WhatsApp and push.</p>
      <AuthForm mode="signup" next={typeof next === "string" ? next : undefined} />
    </>
  );
}
