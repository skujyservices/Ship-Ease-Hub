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
npx prisma db push              # create the tables
npm run dev                     # http://localhost:3000
```

No Postgres installed? `npx prisma dev` starts a local one and prints a `postgres://` URL. Add `&connection_limit=1&pgbouncer=true` to it.

Sign up with the email you set as `ADMIN_EMAIL` to get the admin panel at `/admin`.

## Going live checklist

1. **Terminal Africa:** create an account, copy the secret key from Settings → API into `TERMINAL_SECRET_KEY`. Use `TERMINAL_ENV=sandbox` until test bookings work, then `live`.
2. **Fund the Terminal wallet.** Every booking, duty, insurance and document is charged to it. Admin → Overview warns when it runs low.
3. **Register the webhook:** deploy (https), then Admin → Webhooks → "Register this app with Terminal".
4. **Paystack:** secret key in `PAYSTACK_SECRET_KEY`; set the webhook URL to `https://<your-domain>/api/webhooks/paystack`.
5. **Stripe** (GBP/USD): secret key + webhook secret; webhook URL `https://<your-domain>/api/webhooks/stripe`, event `checkout.session.completed`.
6. **Email:** Resend API key + a verified sender in `EMAIL_FROM`.
7. **WhatsApp:** Meta WhatsApp Cloud API token + phone number ID. Business-initiated messages need approved templates (see `src/lib/notify.ts`).
8. **Push:** `npx web-push generate-vapid-keys` and put the keys in the `VAPID` variables.
9. Set your markup and fees in Admin → Settings.
10. Have a lawyer review `/terms`.

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
