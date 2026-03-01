// src/routes/auth.bootstrap.routes.js
const express = require("express");
const { createSuperAdmin } = require("../controllers/bootstrap.controller");
const { requireBootstrapEnabled, requireBootstrapToken } = require("../middlewares/bootstrap");

const router = express.Router();

// POST /auth/bootstrap/superadmin
router.post("/bootstrap/superadmin", requireBootstrapEnabled, requireBootstrapToken, createSuperAdmin);

module.exports = router;