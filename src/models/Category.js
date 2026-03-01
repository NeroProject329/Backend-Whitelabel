// src/models/Category.js
const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },

    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },

    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

CategorySchema.index({ storeId: 1, active: 1, order: 1 });

module.exports = mongoose.model("Category", CategorySchema);