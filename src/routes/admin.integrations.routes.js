// src/routes/admin.integrations.routes.js
const express = require("express");
const { requireAuth, requireStoreAccess } = require("../middlewares/auth");
const { getPixgoConfig, updatePixgoConfig } = require("../controllers/adminIntegrations.controller");

const router = express.Router();

router.use(requireAuth);

// ver config (SUPER_ADMIN e STORE_ADMIN com acesso)
router.get("/stores/:storeId/integrations/pixgo", requireStoreAccess("storeId"), getPixgoConfig);

// atualizar (SUPER_ADMIN e STORE_ADMIN com acesso)
router.patch("/stores/:storeId/integrations/pixgo", requireStoreAccess("storeId"), updatePixgoConfig);

module.exports = router;