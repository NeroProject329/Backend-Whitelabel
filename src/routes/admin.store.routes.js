// src/routes/admin.store.routes.js
const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { createStore, listStores, updateStore } = require("../controllers/adminStores.controller");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN"));

router.post("/stores", createStore);
router.get("/stores", listStores);
router.patch("/stores/:id", updateStore);

module.exports = router;