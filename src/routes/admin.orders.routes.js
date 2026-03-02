// src/routes/admin.orders.routes.js
const express = require("express");
const { requireAuth, requireStoreAccess } = require("../middlewares/auth");
const { listOrdersByStore, getOrderAdmin, updateOrderStatus } = require("../controllers/adminOrders.controller");

const router = express.Router();

router.use(requireAuth);

// listar por store (respeita acesso da store)
router.get("/stores/:storeId/orders", requireStoreAccess("storeId"), listOrdersByStore);

// detalhe (checa acesso pela store do pedido no controller)
router.get("/orders/:id", getOrderAdmin);

// ✅ ações de status
router.patch("/orders/:id/status", updateOrderStatus);

module.exports = router;