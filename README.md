# Roary Demo Shop

A tiny Next.js shop (product list, cart, checkout) that [Roary](https://github.com/scarranca/roary) watches during the demo. It's instrumented with Sentry and PostHog. A separate branch contains a realistic bug, so we can break checkout live and Roary can triage and fix it.

- `main` is **correct**.
- `demo/break-checkout` has **one commit** that breaks checkout for single-item carts.

## Run locally

```bash
nvm use        # Node 24
npm install
npm run dev    # http://localhost:3000
```

## Environment variables

Every variable is optional. With none set, the app builds and runs, and Sentry and PostHog do nothing.

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | client + server | Sentry DSN (browser errors; also used on the server as a fallback) |
| `SENTRY_DSN` | server | Sentry DSN for route handlers / server errors (can be the same DSN) |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | build | Optional: uploads source maps for readable stack traces |
| `NEXT_PUBLIC_POSTHOG_KEY` | client | PostHog project API key (`phc_...`) |
| `NEXT_PUBLIC_POSTHOG_HOST` | client | `https://us.i.posthog.com` (or `https://eu.i.posthog.com`) |

What gets tracked:
- **PostHog:** `$pageview`, `add_to_cart`, `checkout_clicked`, `checkout_completed`, `checkout_failed`. Each visitor gets PostHog's anonymous distinct id.
- **Sentry:** client errors, plus server errors from `/api/checkout` (via `onRequestError` in `instrumentation.ts`). The Sentry user id is the visitor's PostHog distinct id, so the two tools agree on "affected users".

## Break it (demo)

```bash
git merge demo/break-checkout && git push   # or open a PR from demo/break-checkout and merge it
```

The commit "Add bundle discount for multi-item carts" changes `lib/checkout.ts` so it reads `lines[1]` without checking that it exists:

```ts
const bundleDiscount = Math.round(lines[1].lineTotal * BUNDLE_DISCOUNT_RATE);
```

Any checkout with a single product now throws `TypeError: Cannot read properties of undefined (reading 'lineTotal')` in `POST /api/checkout`. The request returns a 500, Sentry records the error, and PostHog logs `checkout_failed`. Carts with two or more products still work, so the bug looks like a real one.

**Expected fix:** apply the discount only when `lines.length >= 2` (e.g. `lines.length >= 2 ? ... : 0`), and add a test for a single-item cart.

To reset after the demo: `git revert` the merge, or force-reset `main` to the commit before it.

## Generate traffic

```bash
BASE_URL=https://roary-demo-shop.vercel.app \
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com \
npx tsx scripts/traffic.ts 42
```

The script simulates N visitors. Each one loads the page, adds 1 to 3 products to the cart (about 60% add a single product), and clicks checkout. The checkout request hits the real API, so server errors reach Sentry through the app. The script also sends the matching PostHog events, using the same distinct id for each visitor. Without a PostHog key it only generates real HTTP traffic.
