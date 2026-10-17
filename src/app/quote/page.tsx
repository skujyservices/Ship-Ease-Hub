import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { ParcelWizard } from "@/components/parcel/ParcelWizard";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Get a quote" };

// Guest quote: anyone can see live prices; we only ask for an account at payment.
export default async function QuotePage({ searchParams }: PageProps<"/quote">) {
  const { q } = await searchParams;
  const session = await getSession();
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-mist px-4 py-10">
        <div className="card mx-auto max-w-2xl sm:p-8">
          <ParcelWizard signedIn={Boolean(session)} resumeId={typeof q === "string" ? q : undefined} basePath="/quote" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
