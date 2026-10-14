"use client";

import posthog from "posthog-js";
import { useMemo, useState } from "react";
import { formatPrice, type Product } from "@/lib/catalog";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; orderId: string; total: number }
  | { kind: "error"; message: string };

export default function Shop({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ product: products.find((p) => p.id === id)!, qty })),
    [cart, products],
  );
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  function add(id: string) {
    setStatus({ kind: "idle" });
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    posthog.capture("add_to_cart", { product_id: id });
  }

  function remove(id: string) {
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));
  }

  async function checkout() {
    const items = lines.map((l) => ({ productId: l.product.id, quantity: l.qty }));
    posthog.capture("checkout_clicked", { item_count: count, subtotal_cents: subtotal });
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items, distinctId: posthog.get_distinct_id?.() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        posthog.capture("checkout_failed", { status: res.status, item_count: count });
        setStatus({ kind: "error", message: data?.error ?? "Something went wrong. Please try again." });
        return;
      }
      posthog.capture("checkout_completed", { order_id: data.orderId, total_cents: data.order.total });
      setStatus({ kind: "success", orderId: data.orderId, total: data.order.total });
      setCart({});
    } catch {
      posthog.capture("checkout_failed", { status: 0, item_count: count });
      setStatus({ kind: "error", message: "Network error. Please try again." });
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section aria-label="Products" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <article key={p.id} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-28 items-center justify-center rounded-xl bg-amber-50 text-5xl">{p.emoji}</div>
            <h2 className="font-semibold text-stone-900">{p.name}</h2>
            <p className="mt-1 flex-1 text-sm text-stone-500">{p.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-medium text-stone-900">{formatPrice(p.price)}</span>
              <button
                onClick={() => add(p.id)}
                data-testid={`add-${p.id}`}
                className="rounded-full bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700"
              >
                Add to cart
              </button>
            </div>
          </article>
        ))}
      </section>

      <aside aria-label="Cart" className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
        <h2 className="text-lg font-semibold text-stone-900">Cart ({count})</h2>
        {lines.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">Your cart is empty.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100">
            {lines.map(({ product, qty }) => (
              <li key={product.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-stone-700">
                  {product.emoji} {product.name}
                </span>
                <span className="flex items-center gap-2">
                  <button onClick={() => remove(product.id)} aria-label={`Remove one ${product.name}`} className="h-6 w-6 rounded-full border border-stone-300 text-stone-600">
                    −
                  </button>
                  <span className="w-4 text-center">{qty}</span>
                  <button onClick={() => add(product.id)} aria-label={`Add one ${product.name}`} className="h-6 w-6 rounded-full border border-stone-300 text-stone-600">
                    +
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-between border-t border-stone-100 pt-4 text-sm">
          <span className="text-stone-500">Subtotal</span>
          <span className="font-medium text-stone-900">{formatPrice(subtotal)}</span>
        </div>
        <button
          onClick={checkout}
          disabled={lines.length === 0 || status.kind === "loading"}
          data-testid="checkout"
          className="mt-4 w-full rounded-full bg-amber-500 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status.kind === "loading" ? "Processing…" : "Checkout"}
        </button>
        {status.kind === "success" && (
          <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Order {status.orderId} confirmed. Total {formatPrice(status.total)}.
          </p>
        )}
        {status.kind === "error" && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {status.message}
          </p>
        )}
      </aside>
    </div>
  );
}
