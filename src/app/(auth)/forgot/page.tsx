import type { Metadata } from "next";
import { ForgotForm } from "../PasswordForms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-light text-navy">Forgot your password?</h1>
      <p className="mb-6 text-sm text-navy/70">We&apos;ll email you a link to choose a new one.</p>
      <ForgotForm />
    </>
  );
}
