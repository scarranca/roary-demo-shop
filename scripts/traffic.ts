/**
 * Simulates N shoppers visiting the Roary Demo Shop and clicking checkout.
 *
 *   BASE_URL=https://roary-demo-shop.vercel.app npx tsx scripts/traffic.ts 42
 *
 * Env:
 *   BASE_URL                 shop to hit (default http://localhost:3000)
 *   VISITORS                 number of visitors (or pass as first arg; default 42)
 *   NEXT_PUBLIC_POSTHOG_KEY  optional; when set, events go to PostHog too
 *   NEXT_PUBLIC_POSTHOG_HOST optional (default https://us.i.posthog.com)
 *
 * Server-side failures land in Sentry via the app's own instrumentation, tagged
 * with the same distinct id the visitor uses in PostHog.
 */
import { randomUUID } from "node:crypto";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const VISITORS = Number(process.argv[2] ?? process.env.VISITORS ?? 42);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 6);
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.POSTHOG_KEY;
const POSTHOG_HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? process.env.POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");

const PRODUCT_IDS = ["roar-tee", "lion-mug", "mane-cap", "pride-stickers", "deploy-hoodie", "bug-plush"];

type PhEvent = { event: string; distinct_id: string; properties: Record<string, unknown>; timestamp: string };
const events: PhEvent[] = [];

function track(distinctId: string, event: string, properties: Record<string, unknown> = {}) {
  events.push({
    event,
    distinct_id: distinctId,
    timestamp: new Date().toISOString(),
    properties: { $current_url: `${BASE_URL}/`, $host: new URL(BASE_URL).host, $lib: "roary-traffic", ...properties },
  });
}

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function randomCart() {
  // Most shoppers buy a single item; some buy a couple.
  const size = Math.random() < 0.6 ? 1 : Math.random() < 0.7 ? 2 : 3;
  const ids = new Set<string>();
  while (ids.size < size) ids.add(pick(PRODUCT_IDS));
  return [...ids].map((productId) => ({ productId, quantity: Math.random() < 0.8 ? 1 : 2 }));
}

type Result = { distinctId: string; status: number; ok: boolean; error?: string };

async function visit(n: number): Promise<Result> {
  const distinctId = `visitor-${randomUUID()}`;

  const page = await fetch(`${BASE_URL}/`, { headers: { "user-agent": `roary-traffic/1.0 (visitor ${n})` } });
  await page.arrayBuffer();
  track(distinctId, "$pageview");

  const items = randomCart();
  for (const i of items) track(distinctId, "add_to_cart", { product_id: i.productId });
  track(distinctId, "checkout_clicked", { item_count: items.reduce((s, i) => s + i.quantity, 0) });

  const res = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": `roary-traffic/1.0 (visitor ${n})` },
    body: JSON.stringify({ items, distinctId }),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; orderId?: string } | null;
  const ok = res.ok && Boolean(data?.ok);
  track(distinctId, ok ? "checkout_completed" : "checkout_failed", { status: res.status, order_id: data?.orderId });
  return { distinctId, status: res.status, ok, error: data?.error };
}

async function flushPostHog() {
  if (!POSTHOG_KEY) {
    console.log("PostHog: NEXT_PUBLIC_POSTHOG_KEY not set, skipping event upload.");
    return;
  }
  for (let i = 0; i < events.length; i += 200) {
    const res = await fetch(`${POSTHOG_HOST}/batch/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: POSTHOG_KEY, batch: events.slice(i, i + 200) }),
    });
    if (!res.ok) console.error(`PostHog batch failed: ${res.status} ${await res.text()}`);
  }
  console.log(`PostHog: sent ${events.length} events to ${POSTHOG_HOST}`);
}

async function main() {
  console.log(`Sending ${VISITORS} visitors to ${BASE_URL} (concurrency ${CONCURRENCY})`);
  const results: Result[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, VISITORS) }, async () => {
      while (next < VISITORS) {
        const n = next++;
        try {
          const r = await visit(n);
          results.push(r);
          process.stdout.write(r.ok ? "." : "x");
        } catch (err) {
          results.push({ distinctId: `visitor-${n}`, status: 0, ok: false, error: String(err) });
          process.stdout.write("!");
        }
      }
    }),
  );
  process.stdout.write("\n");

  const failed = results.filter((r) => !r.ok);
  const byStatus = failed.reduce<Record<string, number>>((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {});
  console.log(`Checkouts: ${results.length - failed.length} ok, ${failed.length} failed`, failed.length ? byStatus : "");

  await flushPostHog();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
