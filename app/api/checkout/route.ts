import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { CheckoutError, priceCart, type CartItem } from "@/lib/checkout";

type CheckoutRequest = { items: CartItem[]; distinctId?: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<CheckoutRequest>;

  if (body.distinctId) {
    Sentry.setUser({ id: body.distinctId });
  }

  const items = (body.items ?? []).filter((i) => i && typeof i.productId === "string");
  try {
    const order = priceCart(items);
    return NextResponse.json({ ok: true, orderId: `ord_${crypto.randomUUID().slice(0, 8)}`, order });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    throw err;
  }
}
