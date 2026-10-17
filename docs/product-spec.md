# Ship Ease Hub: v1 Product Spec

_Draft, 2026-10-17_

## 1. What we sell

| Service | Route | Who runs it | How it's priced |
|---|---|---|---|
| **Shop & Ship** | USA / UK / China → Nigeria (air) | Our consolidator partners | Partner per-kg air rate per origin (set in admin) + SEH markup |
| **Buy for me** (procurement) | USA / UK / China → Nigeria (air) | We buy, then partners ship | Payment 1: item cost + **5% service fee**. Payment 2: Shop & Ship price |
| **Send a parcel** | Nigeria → any country (and within Nigeria) | **Terminal Africa API** | Terminal rate + Terminal duties + insurance (optional) + SEH markup |

- **Air only** in v1. Sea comes later.
- Terminal Africa is used **only for shipments leaving Nigeria** (and domestic, since the same API covers it). Inbound shipments are handled entirely by partners.
- For outbound, **every number comes from Terminal**: carrier rate, duties, insurance premium, pickup fee. SEH adds its markup on top.

Customers: individuals and small online sellers.
Payment: pay per shipment, with no wallet. Paystack handles NGN; Stripe handles GBP/USD.
Platform: web app built as a **PWA** (installable, with push notifications).
Notifications: **email + WhatsApp + push** for every status change.

### Nigeria warehouse pickup rules (inbound)
- Pickup only (no doorstep delivery). Location: **Lawani, off University Road, Yaba, Lagos**.
- When a package arrives at the Nigeria warehouse, the customer is notified to come and collect it.
- Days 1–2 are free. Days 3–7 cost **₦10,000 per day** (maximum ₦50,000).
- After **7 days** uncollected, the package is disposed of, and SEH is not liable.
- There is no storage limit at the foreign warehouses (USA / UK / China).
- The customer must accept these rules (a checkbox at payment, plus the Terms). Reminders go out on arrival, on day 2 (last free day), and on days 3, 5, 6 and 7.
- Any storage fee must be paid before the package is released.

## 2. Navigation

App tabs (light theme). On mobile, **Ship** is the middle button.

1. **Ship**: opens a sheet with 3 choices: _Ship from abroad_, _Buy for me_, _Send a parcel_.
2. **Shipments**: everything in one list. Tabs: _Action needed_ · _At warehouse_ · _On the way_ · _Delivered_. Procurement requests appear here too.
3. **Account**: profile, **My foreign addresses**, saved addresses, payment methods, business details, settings.

Public pages (dark theme): Home (quote and track), Track `/track/:code`, How Shop & Ship works, Buy for me, Pricing, FAQ, Contact, Sign in / up.

## 3. Status model (one timeline, three bars)

| Phase (bar) | Inbound (Shop & Ship / Buy for me) | Outbound (Send a parcel, from Terminal webhooks) |
|---|---|---|
| **1. Origin** | Requested → Quoted → Paid for items → Purchased · Expected → Received at warehouse | Draft → Paid → Pickup scheduled → Picked up |
| **2. In transit** | Awaiting payment → Paid → Shipped → Arrived Nigeria | In transit → Awaiting clearance / Customs event |
| **3. Delivery** | Ready for pickup → Storage fee due → Collected · or Disposed | Delivered · Returned · Cancelled |

---

## 4. Flow A: Ship from abroad (Shop & Ship)

**A1. My foreign addresses**: one card per warehouse (USA · UK · China), each with the customer's **suite ID** (e.g. `SEH-10482`) and Copy buttons.
**A2. Pre-alert** _(optional)_: store, store tracking number, contents, value, warehouse → status **Expected**.
**A3. Package arrives**: SEH staff log weight, dimensions and photos from the partner's confirmation. Customer is notified (email, WhatsApp, push).
**A4. Select packages** at the same warehouse. Toggle **Consolidate into one box**.
**A5. Price**: chargeable weight × partner air rate for that origin + markup, in NGN, with the ETA.
**A6. Pickup point**: Yaba. Shows the address and the rules.
**A7. Review & pay**: breakdown + pickup-rules checkbox → Paystack / Stripe.
**A8. Done**: tracking code, timeline, receipt.
**A9. Ready for pickup**: pickup code (QR), countdown, storage fee with a **Pay fee** button.

## 5. Flow B: Buy for me (procurement)

**B1.** Items: product link, variant, quantity, notes (several rows). Origin warehouse.
**B2.** Submit → **Requested**.
**B3. Quote** (staff): item prices, store tax/shipping to our warehouse, **5% fee**, FX rate, total NGN. Expires in 48h.
**B4.** Approve & pay → **Paid for items**.
**B5.** Staff mark **Purchased** (store order number) → joins Flow A at A3.

## 6. Flow C: Send a parcel (Nigeria → world, fully on Terminal)

| Step | Screen | Terminal API used |
|---|---|---|
| C1 | **From**: Nigerian address (saved or new) | Countries / States / Cities, Validate address, Create address |
| C2 | **To**: any country, form adapts per country | Countries / States / Cities, Validate address (global, ≈$0.02), Create address |
| C3 | **Packaging**: Terminal default boxes or own preset | Terminal default packaging, Create / Get packaging |
| C4 | **What's in it**: one or more parcels; items with description, HS code search, value, qty, weight | Simplified HS codes search, Create parcel (multi-parcel supported) |
| C5 | **Pick a rate**: Cheapest / Fastest; each shows carrier, ETA, price, **duties**, insurance | Create shipment → Get rates for shipment (stream), Estimate duty |
| C6 | **Protect it** _(optional)_: insurance premium on declared value | Get insurance premium, Purchase insurance |
| C7 | **Documents** _(only if required for the route/goods)_ | Analyze / Purchase regulatory documents |
| C8 | **Pickup or drop-off**: pickup, priority pickup (fee), scheduled date, or drop-off point | Rate `pickup_options`, Get pickup dates, Drop-off locations |
| C9 | **Review & pay** (SEH collects payment, then books on Terminal) | Arrange pickup & delivery (charges SEH's Terminal wallet) |
| C10 | **Done**: label, commercial invoice, tracking link | Shipment extras, Track shipment, webhooks |

After booking: **Cancel shipment** (before pickup, with refund), **File a claim** (lost/damaged, if insured), **Weight adjustment** (reconciliation: the customer is asked to pay the difference).

Guest quotes: C1–C5 work **without an account**. Sign-up is asked for at C9.

## 7. Admin app (internal)

**Inbound operations**
- Package intake (from partner confirmations), consolidation & dispatch, Nigeria arrivals, pickup desk (QR scan, storage fee, collected), daily storage-fee/disposal job.
- Procurement queue: quote → purchased.

**Outbound (Terminal)**
- All Terminal shipments with live status; cancel; claims; reconciliations (weight disputes).
- **Terminal wallet balance** with a low-balance alert, plus Terminal transactions.
- Carriers: enable/disable carriers on the account. Rate cards: view/download.
- Webhook delivery log, with replay.

**Settings**
- Markup per service (outbound: % or fixed on the Terminal total; inbound: per-kg partner rate per origin + markup).
- Procurement fee (5%), storage fee (₦10,000/day, 2 free days, 7-day limit), FX rates (USD/GBP/CNY → NGN).
- Roles: Admin, Staff.

## 8. Terminal Africa API

Docs: https://docs.terminal.africa/tship. Live `https://api.terminal.africa/v1`, sandbox `https://sandbox.terminal.africa/v1`. Auth: `Authorization: Bearer <secret key>`, server-side only.

Price shown to the customer = (Terminal rate + priority pickup fee) × (1 + markup %) + fixed fee, then + Terminal duty estimate + insurance premium + documents at cost. Duties are booked with `duty_payer: account_holder`, so the receiver pays nothing on arrival.

**Funding:** Terminal charges SEH's **Terminal wallet** for each booking. Customers pay SEH first (Paystack/Stripe), then SEH books, so the wallet must stay topped up. Admin shows the balance and warns when it is low.

## 9. Open questions

1. **Inbound air rates:** what do the partners charge per kg from USA / UK / China, and does that include Nigerian customs duty?
2. **Volumetric weight (inbound):** do partners bill on actual or volumetric weight (L×W×H ÷ 5000)?
3. **Outbound markup:** what margin do you want on top of Terminal's price (e.g. 10%, or a fixed ₦ amount)?
