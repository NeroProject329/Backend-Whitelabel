// src/routes/auth.routes.js
const express = require("express");
const { login, me, logout } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.post("/login", login);
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);

module.exports = router;