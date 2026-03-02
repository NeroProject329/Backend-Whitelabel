// src/routes/public.orders.routes.js
const express = require("express");
const { createDraft, getOrder, advanceCheckout, getOrderPayment } = require("../controllers/publicOrders.controller");
const { resolveStore } = require("../middlewares/resolveStore");


const router = express.Router();

// Mesma lógica do catálogo: se não veio storeId, resolve por domínio/host
function resolveStoreIfNeeded(req, res, next) {
  if (req.body?.storeId || req.query?.storeId) return next();
  return resolveStore(req, res, next);
}

router.post("/orders", resolveStoreIfNeeded, createDraft);
router.get("/orders/:id", getOrder);
router.post("/orders/:id/advance", resolveStoreIfNeeded, advanceCheckout);


// ✅ rota de status do pagamento
router.get("/orders/:id/payment", getOrderPayment);

module.exports = router;