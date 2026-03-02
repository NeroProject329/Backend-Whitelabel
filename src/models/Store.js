// src/models/Store.js
const mongoose = require("mongoose");
const { sanitizeDomain } = require("../utils/sanitizeDomain");

const StoreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Multi-loja por domínio
    domains: {
      type: [String],
      default: [],
      set: (arr) => {
        if (!Array.isArray(arr)) return [];
        // normaliza (remove porta, lowercase) e remove inválidos/duplicados
        const sanitized = arr
          .map((d) => sanitizeDomain(d))
          .filter(Boolean);

        return Array.from(new Set(sanitized));
      }
    },
        integrations: {
        pixgo: {
        isEnabled: { type: Boolean, default: false },
        baseUrl: { type: String, default: "https://pixgo.org/api/v1" },
        apiKeyEnc: { type: String, default: "" },
        apiKeyUpdatedAt: { type: Date, default: null }
      }
    },

    // Config pública da loja
    logoUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },

    deliveryFeeCents: { type: Number, default: 0, min: 0 },
    minOrderCents: { type: Number, default: 0, min: 0 },

    etaMin: { type: Number, default: 30, min: 0 },
    etaMax: { type: Number, default: 60, min: 0 },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Índice em array (multikey) para resolver rápido por domínio
StoreSchema.index({ domains: 1, isActive: 1 });

// Dica: no futuro a gente pode criar validação “domínio não pode existir em 2 lojas” via lógica de serviço.
module.exports = mongoose.model("Store", StoreSchema);