// src/models/Product.js
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // ex: "600ml", "G", "2L"
    sizeLabel: { type: String, default: "" },

    // Dinheiro sempre em centavos
    priceCents: { type: Number, required: true, min: 0 },
    compareAtCents: { type: Number, default: null, min: 0 },

    // ex: "20% OFF", "LEVE 3 PAGUE 2"
    discountLabel: { type: String, default: "" },

    images: { type: [String], default: [] },

    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

ProductSchema.index({ storeId: 1, active: 1, categoryId: 1, featured: 1 });

// Busca: dá pra usar $text quando tiver q
ProductSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Product", ProductSchema);