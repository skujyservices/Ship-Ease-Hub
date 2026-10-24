import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacy policy" };

// Draft for legal review, written for Nigeria's Data Protection Act 2023 (NDPA) and the UK GDPR.
// Keep it in step with what the app actually collects and who it shares data with.
const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Who we are",
    body: (
      <p>
        {BRAND.name} (&quot;we&quot;) runs this website and app. We are the data controller for the personal data described here. Offices: {BRAND.ukOffice}; {BRAND.lagosDropOff}. Contact us about privacy through {BRAND.website} or {BRAND.phonesNg[0]}.
      </p>
    ),
  },
  {
    title: "What we collect",
    body: (
      <ul>
        <li><b>Account details:</b> name, email, phone/WhatsApp number, business name, and a password (stored only as a secure hash).</li>
        <li><b>Shipping details:</b> sender and receiver names, addresses, phone numbers and emails, parcel contents, values and weights, customs codes, and photos of packages received at our warehouses.</li>
        <li><b>Identity check (optional):</b> your NIN and the name on it, used once to verify your identity. We do not store your NIN; we only record that the check passed and the verified name.</li>
        <li><b>Payments:</b> amounts, currency, references and status. Card and bank details are handled by Paystack or Stripe; we never see or store them.</li>
        <li><b>Usage and device data:</b> sign-in cookies, push-notification subscriptions if you turn them on, and technical logs (such as IP address) used for security and to prevent abuse.</li>
      </ul>
    ),
  },
  {
    title: "Why we use it (and our legal basis)",
    body: (
      <ul>
        <li><b>To provide the service you ask for</b> (contract): quotes, bookings, Shop &amp; Ship, Buy for me, tracking, pickup and receipts.</li>
        <li><b>To meet legal duties</b> (legal obligation): customs declarations, tax and accounting records, and responding to lawful requests.</li>
        <li><b>To keep the service safe</b> (legitimate interests): fraud prevention, rate limits, identity checks for higher-risk shipments, and error monitoring.</li>
        <li><b>To send updates</b> about your shipments by email, WhatsApp and push (contract). We don&apos;t send marketing without your consent.</li>
      </ul>
    ),
  },
  {
    title: "Who we share it with",
    body: (
      <>
        <p>Only what each needs to do their part:</p>
        <ul>
          <li><b>Terminal Africa and the couriers they book</b> (e.g. DHL, UPS, FedEx, Aramex): shipment, address and customs details, and NIN for identity checks.</li>
          <li><b>Our consolidator partners</b> in the USA, UK, China and Nigeria: package and recipient details for Shop &amp; Ship.</li>
          <li><b>Customs authorities</b> at origin and destination, as required by law.</li>
          <li><b>Service providers</b> that run the platform for us: Supabase (database and photo storage, EU), Vercel (hosting), Paystack and Stripe (payments), Resend (email) and Meta (WhatsApp messages).</li>
        </ul>
        <p>We don&apos;t sell your personal data.</p>
      </>
    ),
  },
  {
    title: "International transfers",
    body: <p>Shipping is international by nature, so your data moves between Nigeria, the UK, the EU, the USA, China and destination countries. Where data leaves Nigeria or the UK, we rely on the safeguards the NDPA and UK GDPR allow, such as contracts with our providers and the fact that the transfer is needed to deliver your shipment.</p>,
  },
  {
    title: "How long we keep it",
    body: (
      <ul>
        <li>Shipment, customs and payment records: <b>6 years</b>, for tax and customs purposes.</li>
        <li>Package photos: <b>12 months</b> after delivery or collection.</li>
        <li>Account details: while your account is open, then deleted or anonymised unless the law requires us to keep them.</li>
        <li>Security logs: up to <b>90 days</b>.</li>
      </ul>
    ),
  },
  {
    title: "Your rights",
    body: <p>You can ask to access, correct, delete or move your data, to object to or restrict how we use it, and to withdraw consent where we rely on it. Most details can be changed in your account. For anything else, contact us and we&apos;ll reply within 30 days. You can also complain to the Nigeria Data Protection Commission (NDPC) or, in the UK, the Information Commissioner&apos;s Office (ICO).</p>,
  },
  {
    title: "Security",
    body: <p>We use encrypted connections, hashed passwords, restricted staff access by role, and private storage for package photos. No system is perfectly secure; if a breach affects you, we&apos;ll tell you and the regulator as the law requires.</p>,
  },
  {
    title: "Cookies",
    body: <p>We use one essential cookie to keep you signed in. We don&apos;t use advertising or tracking cookies.</p>,
  },
  {
    title: "Changes",
    body: <p>We&apos;ll post any changes here and, if they&apos;re significant, tell you by email.</p>,
  },
];

export default function Privacy() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 text-navy">
        <h1 className="text-4xl font-light">Privacy policy</h1>
        <p className="mt-2 text-sm text-navy/60">Draft: to be reviewed by a lawyer before launch.</p>
        <div className="mt-8 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-medium">{s.title}</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-navy/80 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">{s.body}</div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
