import test from "node:test";
import assert from "node:assert/strict";
import { priceCart } from "./checkout";

test("single-item cart checks out without crashing (regression for TypeError on lineTotal)", () => {
  const order = priceCart([{ productId: "roar-tee", quantity: 1 }]);

  assert.equal(order.bundleDiscount, 0);
  assert.equal(order.subtotal, 2800);
  assert.equal(order.shipping, 500); // below free-shipping threshold
  assert.equal(order.total, 3300);
});

test("multi-item cart still gets 10% off the second line item", () => {
  const order = priceCart([
    { productId: "roar-tee", quantity: 1 }, // 2800
    { productId: "lion-mug", quantity: 1 }, // 1600
  ]);

  assert.equal(order.subtotal, 4400);
  assert.equal(order.bundleDiscount, 160); // round(1600 * 0.1)
  assert.equal(order.shipping, 500); // 4400 - 160 = 4240, still below threshold
  assert.equal(order.total, 4740);
});
