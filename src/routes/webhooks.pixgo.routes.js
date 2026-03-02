// src/routes/webhooks.pixgo.routes.js
const express = require("express");
const { handlePixgoWebhook } = require("../controllers/webhooksPixgo.controller");

const router = express.Router();

// POST /webhooks/pixgo?token=...
router.post("/pixgo", handlePixgoWebhook);

module.exports = router;