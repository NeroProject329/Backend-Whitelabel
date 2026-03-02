// src/utils/money.js
function centsToAmount(cents) {
  const v = Number(cents);
  if (!Number.isFinite(v)) return 0;
  return Number((Math.round(v) / 100).toFixed(2));
}

module.exports = { centsToAmount };