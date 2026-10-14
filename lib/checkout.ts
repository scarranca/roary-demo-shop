import { CATALOG } from "./catalog";

export type CartItem = { productId: string; quantity: number };

export type OrderLine = { productId: string; name: string; quantity: number; unitPrice: number; lineTotal: number };

export type Order = { lines: OrderLine[]; subtotal: number; bundleDiscount: number; shipping: number; total: number };

export class CheckoutError extends Error {}

const FREE_SHIPPING_OVER = 5000;
const SHIPPING_FLAT = 500;
const BUNDLE_DISCOUNT_RATE = 0.1; // 10% off the second item in the cart

/** Prices a cart against the server-side catalog (never trust client prices). */
export function priceCart(items: CartItem[]): Order {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CheckoutError("Your cart is empty");
  }

  const lines = items.map((item) => {
    const product = CATALOG[item.productId];
    if (!product) throw new CheckoutError(`Unknown product ${item.productId}`);
    const quantity = Math.max(1, Math.floor(item.quantity));
    return {
      productId: item.productId,
      name: product.name,
      quantity,
      unitPrice: product.price,
      lineTotal: product.price * quantity,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const bundleDiscount = Math.round(lines[1].lineTotal * BUNDLE_DISCOUNT_RATE);
  const shipping = subtotal - bundleDiscount >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
  return { lines, subtotal, bundleDiscount, shipping, total: subtotal - bundleDiscount + shipping };
}
