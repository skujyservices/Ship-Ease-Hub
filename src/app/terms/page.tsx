import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Terms" };

// Draft wording for the business to review with a lawyer before launch.
export default function Terms() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 text-navy">
        <h1 className="text-3xl font-bold">Terms of service</h1>
        <p className="mt-2 text-sm text-navy/60">Draft: to be reviewed before launch.</p>

        <h2 className="mt-8 text-xl font-bold">Sending parcels from Nigeria</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-navy/80">
          <li>You must describe the contents and value accurately. Prohibited and restricted items will not be carried.</li>
          <li>Prices include the carrier charge and, for international shipments, the estimated import duties at the destination.</li>
          <li>If the carrier re-weighs the parcel and it is heavier than declared, you agree to pay the difference.</li>
          <li>You can cancel for a full refund until the courier collects the parcel.</li>
          <li>Insurance, if bought, covers loss or damage in transit up to the declared value, subject to the insurer&apos;s claim process.</li>
        </ul>

        <h2 className="mt-8 text-xl font-bold">Collecting packages in Lagos</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-navy/80">
          <li>Packages shipped to Nigeria are collected from our hub at Lawani, off University Road, Yaba, Lagos.</li>
          <li>Collection is free for 2 days after we notify you that your package has arrived.</li>
          <li>From day 3, storage costs ₦10,000 per day, payable before release.</li>
          <li>Packages not collected within 7 days are disposed of, and Ship Ease Hub is not liable for their loss.</li>
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
