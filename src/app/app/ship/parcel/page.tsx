import type { Metadata } from "next";
import { ParcelWizard } from "@/components/parcel/ParcelWizard";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Send a parcel" };

export default async function SendParcelPage({ searchParams }: PageProps<"/app/ship/parcel">) {
  const user = await requireUser("/app/ship/parcel");
  const { q } = await searchParams;
  const saved = await db.savedAddress.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="card mx-auto max-w-2xl sm:p-8">
      <ParcelWizard
        signedIn
        basePath="/app/ship/parcel"
        resumeId={typeof q === "string" ? q : undefined}
        saved={saved.map((a) => ({
          id: a.id,
          label: a.label,
          first_name: a.firstName,
          last_name: a.lastName,
          email: a.email,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2 ?? "",
          city: a.city,
          state: a.state,
          country: a.country,
          zip: a.zip,
        }))}
      />
    </div>
  );
}
