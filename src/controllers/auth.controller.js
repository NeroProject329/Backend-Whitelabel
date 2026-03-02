// src/controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");
const Store = require("../models/Store");
const { ApiError } = require("../middlewares/error");

function cookieOptions(req) {
  // com trust proxy ligado, req.secure funciona no Railway
  const isHttps =
    req.secure === true ||
    String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https";

  return {
    httpOnly: true,
    secure: isHttps,                 // ✅ Railway (https): true | local (http): false
    sameSite: isHttps ? "none" : "lax", // ✅ Railway: none (cross-site) | local: lax (same-site)
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

function signToken(user) {
  return jwt.sign(
    {
      role: user.role,
      storeIds: (user.storeIds || []).map(String)
    },
    process.env.JWT_SECRET,
    {
      subject: String(user._id),
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw new ApiError(400, "INVALID_CREDENTIALS", "Email and password are required");

    const user = await AdminUser.findOne({ email: String(email).toLowerCase().trim(), isActive: true });
    if (!user) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid credentials");

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid credentials");

    const token = signToken(user);

    const cookieName = process.env.COOKIE_NAME || "wl_token";
    res.cookie(cookieName, token, cookieOptions(req));

    // retornar stores básicas ajuda o painel
    const stores = user.role === "SUPER_ADMIN"
      ? []
      : await Store.find({ _id: { $in: user.storeIds || [] } }).select({ name: 1 }).lean();

    return res.json({
      success: true,
      data: {
        token, // útil pra debug/manual (mas o painel usa cookie)
        user: {
          id: String(user._id),
          email: user.email,
          role: user.role,
          storeIds: (user.storeIds || []).map(String),
          stores: stores.map(s => ({ id: String(s._id), name: s.name }))
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    // reaproveita a lógica do middleware (cookie/bearer)
    const token = req.cookies?.[process.env.COOKIE_NAME || "wl_token"] ||
      (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);

    if (!token) throw new ApiError(401, "UNAUTHORIZED", "Not authenticated");

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid or expired token");
    }

    const user = await AdminUser.findById(payload.sub).lean();
    if (!user || !user.isActive) throw new ApiError(401, "UNAUTHORIZED", "User not found");

    const stores = user.role === "SUPER_ADMIN"
      ? []
      : await Store.find({ _id: { $in: user.storeIds || [] } }).select({ name: 1 }).lean();

    return res.json({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          role: user.role,
          storeIds: (user.storeIds || []).map(String),
          stores: stores.map(s => ({ id: String(s._id), name: s.name }))
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || "wl_token";
    res.clearCookie(cookieName, { ...cookieOptions(req), maxAge: 0 });
    return res.json({ success: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, logout };