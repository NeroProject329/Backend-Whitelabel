// src/config/env.js
const dotenv = require("dotenv");

dotenv.config();

function mustGet(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3001),

  MONGO_URI: mustGet("MONGO_URI"),

  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",

  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 300),

  // src/config/env.js (adicione dentro do objeto env)
  BOOTSTRAP_ENABLED: ["true", "1", "yes"].includes(String(process.env.BOOTSTRAP_ENABLED || "").toLowerCase()),
  BOOTSTRAP_TOKEN: process.env.BOOTSTRAP_TOKEN || "",

  SMS_PROVIDER: process.env.SMS_PROVIDER || "CUSTOM_CAMPAIGN",
  SMS_API_URL: process.env.SMS_API_URL || "",
  SMS_API_TOKEN: process.env.SMS_API_TOKEN || "",
  SMS_CAMPAIGN_NAME: process.env.SMS_CAMPAIGN_NAME || "Campanha Checkout",
  
};



module.exports = { env };