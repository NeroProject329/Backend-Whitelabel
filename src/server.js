// src/server.js
const { env } = require("./config/env");
const { connectDb } = require("./config/db");
const { createApp } = require("./app");

async function bootstrap() {
  await connectDb();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`API running on port ${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

// Segurança extra (evita crash silencioso)
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});