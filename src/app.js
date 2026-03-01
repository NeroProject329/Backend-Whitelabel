// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { env } = require("./config/env");
const { rateLimitMiddleware } = require("./middlewares/rateLimit");
const { notFound, errorHandler } = require("./middlewares/error");

function createApp() {
  const app = express();

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
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };