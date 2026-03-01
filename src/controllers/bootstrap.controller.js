// src/controllers/bootstrap.controller.js
const bcrypt = require("bcryptjs");
const AdminUser = require("../models/AdminUser");
const { ApiError } = require("../middlewares/error");

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

async function createSuperAdmin(req, res, next) {
  try {
    // segurança: só cria se não existir nenhum SUPER_ADMIN
    const existing = await AdminUser.countDocuments({ role: "SUPER_ADMIN" });
    if (existing > 0) {
      throw new ApiError(409, "SUPER_ADMIN_EXISTS", "A SUPER_ADMIN already exists");
    }

    const { email, password } = req.body || {};
    const emailNorm = normalizeEmail(email);

    if (!emailNorm || !emailNorm.includes("@")) {
      throw new ApiError(400, "INVALID_EMAIL", "Valid email is required");
    }
    if (!password || String(password).length < 8) {
      throw new ApiError(400, "WEAK_PASSWORD", "Password must be at least 8 characters");
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    const user = await AdminUser.create({
      email: emailNorm,
      passwordHash,
      role: "SUPER_ADMIN",
      storeIds: [],
      isActive: true
    });

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (err) {
    // erro de email duplicado
    if (err && err.code === 11000) {
      return next(new ApiError(409, "EMAIL_IN_USE", "Email already in use"));
    }
    next(err);
  }
}

module.exports = { createSuperAdmin };