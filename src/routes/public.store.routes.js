// src/routes/public.store.routes.js
const express = require("express");
const { getByDomain } = require("../controllers/publicStore.controller");

const router = express.Router();

// GET /public/store/by-domain?domain=example.com
router.get("/by-domain", getByDomain);

module.exports = router;