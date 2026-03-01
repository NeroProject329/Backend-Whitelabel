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
const authRoutes = require("./routes/auth.routes");
const adminStoreRoutes = require("./routes/admin.store.routes");
const adminCatalogRoutes = require("./routes/admin.catalog.routes");
const adminUploadRoutes = require("./routes/admin.upload.routes");
const authBootstrapRoutes = require("./routes/auth.bootstrap.routes");

function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  // Segurança + base
  app.use(helmet());

  // CORS (no MVP: aberto por env; depois a gente coloca allowlist)
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      credentials: true
    })
  );

  // Rate limit
  app.use(rateLimitMiddleware());

  // Logger
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  // Body parsing
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Cookies (vai ser útil no M3 auth)
  app.use(cookieParser());

  // Healthcheck
  app.get("/health", (req, res) => {
    res.status(200).send("ok");
  });

  // (rotas futuras entram aqui)
  // app.use("/public", ...)
  // app.use("/auth", ...)
  // app.use("/admin", ...)
  // app.use("/webhooks", ...)

  // 404 + handler
  app.use("/public/store", publicStoreRoutes);
  app.use("/public", publicCatalogRoutes);

  app.use("/auth", authRoutes);
  app.use("/auth", authRoutes);
  app.use("/auth", authBootstrapRoutes);
  
  app.use("/admin", adminStoreRoutes);
  app.use("/admin", adminCatalogRoutes);
  app.use("/admin", adminUploadRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };