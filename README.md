# Ship Ease Hub

Ship from Nigeria to the world (on the Terminal Africa API), and shop from the USA, UK and China to Nigeria (through SEH's consolidator partners).

Product decisions live in [docs/product-spec.md](docs/product-spec.md).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, installable as a PWA
- PostgreSQL via Prisma
- Terminal Africa (shipping), Paystack (NGN) and Stripe (GBP/USD) (payments), Resend (email), WhatsApp Cloud API, Web Push

## Run it locally

```bash
npm install
cp .env.example .env.local      # then fill it in (see below)
npm run db:deploy               # apply migrations (+ lock tables from Supabase's public API)
npm run dev                     # http://localhost:3000
```

The database is Supabase (Connect → ORMs → Prisma gives `DATABASE_URL` and `DIRECT_URL`). ### Changing the database

Every change is a migration saved in `prisma/migrations` (reviewable, committed, applied in order):

1. Edit `prisma/schema.prisma`.
2. `npm run db:migration -- short_name` writes the SQL for the difference. Read it.
3. `npm run db:deploy` applies it (and keeps Row Level Security on, so Supabase's public Data API can't read the tables).
4. Commit the new migration folder with the code that needs it. `npm run db:status` shows what's applied.

Run `db:deploy` against production before (or right after) deploying code that needs the change.

Sign up with the email you set as `ADMIN_EMAIL` to get the admin panel at `/admin`.

## Going live checklist

1. **Terminal Africa:** create an account, copy the secret key from Settings → API into `TERMINAL_SECRET_KEY`. Use `TERMINAL_ENV=sandbox` until test bookings work, then `live`.
2. **Fund the Terminal wallet.** Every booking, duty, insurance and document is charged to it. Admin → Overview warns when it runs low.
3. **Register the webhook:** deploy (https), then Admin → Webhooks → "Register this app with Terminal".
4. **Paystack:** secret key in `PAYSTACK_SECRET_KEY`; set the webhook URL to `https://<your-domain>/api/webhooks/paystack`.
5. **Stripe** (GBP/USD): secret key + webhook secret; webhook URL `https://<your-domain>/api/webhooks/stripe`, event `checkout.session.completed`.
6. **Email:** Resend API key + a verified sender in `EMAIL_FROM`.
7. **WhatsApp:** Meta WhatsApp Cloud API token + phone number ID, plus one approved template (below).

### WhatsApp template

Meta only delivers messages you start (shipment updates, pickup reminders) through a template it has approved. Create **one** template in WhatsApp Manager → Message templates:

- **Name:** `shipment_update` · **Category:** Utility · **Language:** English (`en`)
- **Body:**
  ```
  Ship Ease Hub: {{1}}

  {{2}}

  Details: {{3}}
  ```
- **Sample values** (Meta asks for them): `SEH-7K3M9QX is ready for pickup` · `Collect it at Lawani, off University Road, Yaba with code A0A00E.` · `https://www.shipeasehub.com/app/shipments`

Once it's approved, set `WHATSAPP_TEMPLATE=shipment_update` (and `WHATSAPP_TEMPLATE_LANG=en`). Every notification then goes out through it: {{1}} is the headline, {{2}} the details, {{3}} the link.
8. **Push:** `npx web-push generate-vapid-keys` and put the keys in the `VAPID` variables.
9. Set your markup and fees in Admin → Settings.
10. Have a lawyer review `/terms`.
11. **Shop & Ship:** fill in the USA / UK / China warehouse addresses and per-kg rates in Admin → Settings.
12. **Package photos:** add `SUPABASE_SECRET_KEY` (Supabase → Project Settings → API Keys → Secret key). The private `package-photos` bucket is created automatically on the first upload.
13. **Error alerts:** server errors are listed in Admin → Overview and emailed to `ADMIN_EMAIL` (needs Resend).
14. **Daily storage job:** set `CRON_SECRET`. On Vercel, `vercel.json` already runs `/api/cron/storage` every morning. Elsewhere, call it daily with `Authorization: Bearer $CRON_SECRET`.

## Features at a glance

- **Send a parcel** (Terminal Africa): guest quotes, duties included, insurance, customs documents, pickup/drop-off, tracking, cancel and refund, claims, weight adjustments, **Ship again**.
- **Send many parcels:** upload a CSV (template at `/templates/bulk-shipments.csv`), auto-pick the cheapest or fastest carrier per row, pay once.
- **Shop & Ship:** USA/UK/China addresses with the customer's suite ID, pre-alerts, staff package intake, combined boxes, pay in ₦/£/$, dispatch, Lagos arrival, pickup code (QR), storage fees (2 free days, then ₦10,000/day, disposed after day 7) with reminders.
- **Buy for me:** product-link requests, staff quotes (items + store delivery + 5% fee, held 48h), payment, purchase, then it flows into Shop & Ship.
- **Accounts:** branded emails, receipts (download as PDF), password reset, NIN identity check, team invites with Staff/Admin roles, insights for customers and the business.

## Brand

Everything follows the Ship Ease Hub Visual Identity guide.

- **Logo:** `src/components/Logo.tsx` draws every variation (`Logo` = mark + SEH, `LogoMark`, `LogoLockup` = SHIP / EASE HUB, `LogoStacked`, `LogoBadge`) from vector outlines taken directly from the guide (`src/components/brand/logoArt.ts`). Pass `tone="dark"` on dark backgrounds.
- **App icon:** Cool Silver tile with the purple mark (`public/icon*.png`, `public/icon.svg`, `public/apple-touch-icon.png`).
- **Colours:** tokens in `src/app/globals.css` (`navy`, `purple`, `cyan`, `silver`, `gold`, `ink`), plus `bg-brand` (navy→purple), `stripe` (purple→gold accent) and `bg-grid`.
- **Shapes:** `bar-cut` gives any bar the logo's angled left end (timeline, stepper); `LineMotif` is the guide's construction-line pattern.

### Brand fonts

Filson Pro (primary) is a paid font, so headings use Outfit until it's licensed. Once you buy a Filson Pro **web** licence:
1. Put the `.woff2` files in `public/fonts/`.
2. Add `@font-face` rules for `"Filson Pro"` at the top of `globals.css`.

Headings switch over automatically because `--font-display` lists Filson first. Body text uses Inter (the secondary font, free).

## Where things are

| Path | What |
|---|---|
| `src/lib/terminal/` | Terminal Africa client: every endpoint, types, webhook signature check, event handling |
| `src/lib/outbound/` | Send-a-parcel: quote → price → book → track → cancel |
| `src/lib/checkout.ts`, `payments.ts` | Paystack / Stripe checkout, verification, refunds |
| `src/lib/notify.ts` | Email + WhatsApp + push |
| `src/components/parcel/` | The Send-a-parcel wizard |
| `src/app/(auth)`, `app/`, `admin/` | Sign-in, customer app, admin panel |
| `src/app/api/` | Route handlers (Terminal lookups, parcel actions, webhooks) |

## Terminal Africa coverage

Addresses (create, validate), countries/states/cities, packaging (default + custom), parcels (multi-parcel), HS code search, shipments (create, track, cancel), rates (single and multi-parcel), duty estimates, insurance (premium, purchase, claims), pickups (pickup, priority, scheduled, drop-off locations), regulatory documents (analyze, purchase), reconciliation (weight adjustments), carriers (enable/disable), rate cards (view/download), wallet balance and transactions, and webhooks (register, enable/disable, delete, deliveries, replay; HMAC-SHA512 verification).
