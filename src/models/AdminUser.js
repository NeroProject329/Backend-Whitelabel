// src/models/AdminUser.js
const mongoose = require("mongoose");

const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["SUPER_ADMIN", "STORE_ADMIN"],
      default: "STORE_ADMIN",
      index: true
    },

    // Para STORE_ADMIN: lista de stores que ele pode administrar
    storeIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Store", default: [] },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminUser", AdminUserSchema);