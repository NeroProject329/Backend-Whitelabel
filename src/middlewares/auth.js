// src/middlewares/auth.js
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { env } = require("../config/env");
const { ApiError } = require("./error");

function getTokenFromReq(req) {
  const cookieName = process.env.COOKIE_NAME || "wl_token";
  const fromCookie = req.cookies?.[cookieName];

  const authHeader = req.headers.authorization;
  const fromBearer =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  return fromCookie || fromBearer || null;
}

function requireAuth(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) throw new ApiError(401, "UNAUTHORIZED", "Missing auth token");

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: payload.sub,
      role: payload.role,
      storeIds: payload.storeIds || []
    };

    next();
  } catch (err) {
    return next(new ApiError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "UNAUTHORIZED", "Not authenticated"));
    if (req.user.role !== role) return next(new ApiError(403, "FORBIDDEN", "Insufficient role"));
    next();
  };
}

function requireStoreAccess(paramName = "storeId") {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "UNAUTHORIZED", "Not authenticated"));

    const storeId = req.params[paramName] || req.body.storeId || req.query.storeId;
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return next(new ApiError(400, "INVALID_STORE_ID", "Invalid storeId"));
    }

    // SUPER_ADMIN vê tudo
    if (req.user.role === "SUPER_ADMIN") return next();

    // STORE_ADMIN precisa estar listado
    const allowed = (req.user.storeIds || []).map(String).includes(String(storeId));
    if (!allowed) return next(new ApiError(403, "FORBIDDEN", "No access to this store"));

    next();
  };
}

module.exports = { requireAuth, requireRole, requireStoreAccess };