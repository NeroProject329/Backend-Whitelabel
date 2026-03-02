// src/routes/admin.store.routes.js
const express = require("express");
const { requireAuth, requireRole, requireStoreAccess } = require("../middlewares/auth");
const ctrl = require("../controllers/adminStores.controller");

const router = express.Router();

router.use(requireAuth);

// SUPER_ADMIN only
router.post("/stores", requireRole("SUPER_ADMIN"), ctrl.createStore);

// SUPER_ADMIN: todas | STORE_ADMIN: somente as suas
router.get("/stores", ctrl.listStores);

// detalhes de uma loja (precisa acesso)
router.get("/stores/:id", requireStoreAccess("id"), ctrl.getStore);

// editar config (precisa acesso)
router.patch("/stores/:id", requireStoreAccess("id"), ctrl.updateStore);

module.exports = router;