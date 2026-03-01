// src/routes/admin.catalog.routes.js
const express = require("express");
const { requireAuth, requireStoreAccess } = require("../middlewares/auth");
const ctrl = require("../controllers/adminCatalog.controller");

const router = express.Router();

router.use(requireAuth);

// Categories
router.post("/stores/:storeId/categories", requireStoreAccess("storeId"), ctrl.createCategory);
router.get("/stores/:storeId/categories", requireStoreAccess("storeId"), ctrl.listCategories);
router.patch("/stores/:storeId/categories/:categoryId", requireStoreAccess("storeId"), ctrl.updateCategory);
router.delete("/stores/:storeId/categories/:categoryId", requireStoreAccess("storeId"), ctrl.deleteCategory);
router.patch("/stores/:storeId/categories/reorder", requireStoreAccess("storeId"), ctrl.reorderCategories);

// Products
router.post("/stores/:storeId/products", requireStoreAccess("storeId"), ctrl.createProduct);
router.get("/stores/:storeId/products", requireStoreAccess("storeId"), ctrl.listProducts);
router.patch("/stores/:storeId/products/:productId", requireStoreAccess("storeId"), ctrl.updateProduct);
router.delete("/stores/:storeId/products/:productId", requireStoreAccess("storeId"), ctrl.deleteProduct);

module.exports = router;