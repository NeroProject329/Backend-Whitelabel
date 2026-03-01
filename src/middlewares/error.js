// src/middlewares/rateLimit.js
const rateLimit = require("express-rate-limit");
const { env } = require("../config/env");

function rateLimitMiddleware() {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many requests" }
    }
  });
}

module.exports = { rateLimitMiddleware };