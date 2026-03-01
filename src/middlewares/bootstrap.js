// src/middlewares/bootstrap.js
const { env } = require("../config/env");
const { ApiError } = require("./error");

function requireBootstrapEnabled(req, res, next) {
  // “some” o endpoint quando desligado (menos superfície de ataque)
  if (!env.BOOTSTRAP_ENABLED) {
    return next(new ApiError(404, "NOT_FOUND", "Route not found"));
  }
  return next();
}

function requireBootstrapToken(req, res, next) {
  const token = req.headers["x-bootstrap-token"];
  if (!token || token !== env.BOOTSTRAP_TOKEN) {
    return next(new ApiError(401, "UNAUTHORIZED", "Invalid bootstrap token"));
  }
  return next();
}

module.exports = { requireBootstrapEnabled, requireBootstrapToken };