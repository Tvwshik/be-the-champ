# Be The Champ — Internet Cafe Website

A full website for the Be The Champ internet cafe with member accounts, station/room bookings, in-seat food ordering paid from member wallet, and a staff admin dashboard.

## Public site (visitors)

- **Home** — hero with cafe name, tagline, photos, opening hours, location card with embedded Google Map (linked to your Maps URL), contact info, "Book now" + "Sign up" CTAs.
- **Stations & Rooms** — visual list of what's available: Standard PCs, VIP PCs, Console seats (PS5/Switch), and Private Rooms (group/VIP). Each shows hourly rate.
- **Menu** — browse ramen, food, drinks with photos and prices (ordering requires login).
- **About / Contact** — story, hours, address, map, phone.
- **Sign up / Log in** — email + password, plus Google sign-in.

## Member area (logged in)

- **Dashboard** — wallet balance, upcoming bookings, recent orders, quick "Top up" and "Book a seat" buttons.
- **Booking flow**
  - Pick type: Station (PC/console) or Private Room
  - Pick date, start time, duration (1h, 2h, 3h, custom)
  - See live availability of seats/rooms for that slot
  - Pick a specific seat or room → confirm → cost deducted from wallet (or pay later at counter, configurable)
  - Manage / cancel upcoming bookings
- **Order food to my seat** (members only, while checked in or with active booking)
  - Browse menu, add to cart, choose delivery seat (auto-filled if checked in)
  - Pay from wallet balance → order goes to kitchen queue in admin
  - Order history with status (received → preparing → delivered)
- **Wallet / Top-up**
  - **Online top-up** with card (Stripe) — instant balance
  - **Request cash top-up** — generates a code; staff confirms in admin and credits balance
  - Transaction history (top-ups, bookings, orders)
- **Profile** — name, phone, password, avatar.

## Staff admin dashboard (role-protected)

- **Overview** — today's bookings, active sessions, pending orders, pending cash top-ups.
- **Bookings** — calendar/list view, check-in / check-out, walk-in booking creation, cancel/refund.
- **Stations & Rooms** — manage inventory: add/edit/remove seats and rooms, set hourly rates, mark out-of-service.
- **Menu** — add/edit/remove items, photos, prices, categories, in-stock toggle.
- **Orders queue** — incoming orders with seat number, mark preparing → delivered, cancel + refund to wallet.
- **Members** — search members, view balance & history, manually credit (cash top-up) or debit, suspend account.
- **Top-up requests** — approve/reject pending cash top-ups.
- **Reports** — daily revenue (bookings, orders, top-ups), most-booked seats, top menu items.

## Roles
- `member` — default for new signups
- `staff` — can use admin dashboard
- `admin` — full access including user role management

Roles stored in a separate `user_roles` table (security best practice).

## Design direction
- Modern gaming-cafe vibe: dark theme, neon accents (cyan/magenta), bold display font for headings, clean sans for body.
- Mobile-first, fully responsive.
- Smooth, gamer-feel hover states and subtle glow effects.

## Technical notes
- React + Vite + Tailwind + shadcn/ui (already set up).
- **Lovable Cloud** for backend: auth (email/password + Google), database, RLS, edge functions.
- Tables: `profiles`, `user_roles`, `stations` (incl. type: pc/console/room), `bookings`, `menu_categories`, `menu_items`, `orders`, `order_items`, `wallet_transactions`, `topup_requests`.
- All tables protected by RLS; `has_role()` security-definer function for admin checks.
- **Stripe** for online top-ups via edge function (`create-topup-checkout` + `stripe-webhook` to credit wallet on successful payment). I'll guide you to add the Stripe secret when we get there.
- Google Maps embed using your provided link.
- All wallet debits/credits go through an edge function with a transactional update to prevent race conditions / double-spend.

## Build order
1. Cloud setup, schema, RLS, roles, seed sample stations/rooms + menu.
2. Auth (signup, login, Google, profile).
3. Public site (home, stations, menu, contact with map).
4. Booking flow + member dashboard.
5. Wallet: cash top-up requests + Stripe online top-up.
6. Food ordering to seat, paid from wallet.
7. Admin dashboard (bookings, menu, orders queue, members, top-up approvals, reports).
8. Polish, responsive QA, empty states.
