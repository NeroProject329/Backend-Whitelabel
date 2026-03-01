// src/services/orderTotals.service.js

function toIntCents(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.round(v));
}

function calcItemsTotal(items) {
  let sum = 0;
  for (const it of items) {
    const price = toIntCents(it.priceCentsSnapshot);
    const qty = Math.max(1, Math.round(Number(it.qty || 1)));
    sum += price * qty;
  }
  return sum;
}

/**
 * store: Store doc (lean ok) com deliveryFeeCents/minOrderCents
 */
function computeOrderTotals({ items, store }) {
  const itemsTotalCents = calcItemsTotal(items);
  const deliveryFeeCents = toIntCents(store?.deliveryFeeCents || 0);
  const totalCents = itemsTotalCents + deliveryFeeCents;

  return {
    itemsTotalCents,
    deliveryFeeCents,
    totalCents
  };
}

module.exports = { computeOrderTotals, toIntCents };