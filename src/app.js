// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { env } = require("./config/env");
const { rateLimitMiddleware } = require("./middlewares/rateLimit");
const { notFound, errorHandler } = require("./middlewares/error");

const publicStoreRoutes = require("./routes/public.store.routes");
const publicCatalogRoutes = require("./routes/public.catalog.routes");
const publicOrdersRoutes = require("./routes/public.orders.routes");

const authRoutes = require("./routes/auth.routes");
const authBootstrapRoutes = require("./routes/auth.bootstrap.routes");

const adminStoreRoutes = require("./routes/admin.store.routes");
const adminCatalogRoutes = require("./routes/admin.catalog.routes");
const adminUploadRoutes = require("./routes/admin.upload.routes");
const adminOrdersRoutes = require("./routes/admin.orders.routes");
const adminIntegrationsRoutes = require("./routes/admin.integrations.routes");

const pixgoWebhookRoutes = require("./routes/webhooks.pixgo.routes");

function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  // Segurança + base
  app.use(helmet());

  // ---------- CORS allowlist ----------
  const allowedOrigins = Array.isArray(env.CORS_ORIGINS) ? env.CORS_ORIGINS : [];

  const corsOptions = {
    origin: function (origin, cb) {
      // requests server-to-server / curl sem Origin
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error("CORS_NOT_ALLOWED"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Bootstrap-Token"]
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  // -----------------------------------

  // Rate limit
  app.use(rateLimitMiddleware());

  // Logger
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  // Body parsing
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Cookies
  app.use(cookieParser());

  // Healthcheck
  app.get("/health", (req, res) => res.status(200).send("ok"));

  // Público
  app.use("/public/store", publicStoreRoutes);
  app.use("/public", publicCatalogRoutes);
  app.use("/public", publicOrdersRoutes);

  // Auth
  app.use("/auth", authRoutes);
  app.use("/auth", authBootstrapRoutes);

  // Admin
  app.use("/admin", adminStoreRoutes);
  app.use("/admin", adminCatalogRoutes);
  app.use("/admin", adminUploadRoutes);
  app.use("/admin", adminOrdersRoutes);
  app.use("/admin", adminIntegrationsRoutes);

  // Webhooks
  app.use("/webhooks", pixgoWebhookRoutes);

  // 404 + handler
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };