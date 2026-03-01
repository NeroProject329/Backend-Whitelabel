// src/routes/public.catalog.routes.js
const express = require("express");
const { listCategories, listProducts } = require("../controllers/publicCatalog.controller");
const { resolveStore } = require("../middlewares/resolveStore");

const router = express.Router();

// Middleware “inteligente”:
// - Se vier ?storeId=..., não resolve domínio (mais rápido).
// - Se NÃO vier storeId, resolve por host/domínio e injeta req.storeId.
function resolveStoreIfNeeded(req, res, next) {
  if (req.query.storeId) return next();
  return resolveStore(req, res, next);
}

// GET /public/categories?storeId=...
router.get("/categories", resolveStoreIfNeeded, listCategories);

// GET /public/products?storeId=...&categoryId=...&q=...
router.get("/products", resolveStoreIfNeeded, listProducts);

module.exports = router;