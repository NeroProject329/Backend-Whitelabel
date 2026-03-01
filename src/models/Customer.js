// src/models/Customer.js
const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },

    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true }, // depois a gente pode normalizar E.164
    doc: { type: String, default: "", trim: true } // opcional (cpf/cnpj)
  },
  { timestamps: true }
);

CustomerSchema.index({ storeId: 1, phone: 1 });

module.exports = mongoose.model("Customer", CustomerSchema);