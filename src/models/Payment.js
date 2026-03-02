// src/models/Payment.js
const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },

    provider: { type: String, enum: ["PIXGO"], required: true, default: "PIXGO" },

    status: { type: String, enum: ["PENDING", "PAID", "FAILED", "EXPIRED"], required: true, default: "PENDING", index: true },

    // PixGo ids
    externalId: { type: String, default: "", index: true }, // vamos usar orderId string
    providerPaymentId: { type: String, default: "", index: true }, // payment_id

    amountCents: { type: Number, required: true, min: 0 },

    qrCode: { type: String, default: "" },       // copia e cola
    qrImageUrl: { type: String, default: "" },   // imagem
    expiresAt: { type: Date, default: null },

    payload: { type: Object, default: null } // resposta completa / webhook etc
  },
  { timestamps: true }
);

PaymentSchema.index({ orderId: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", PaymentSchema);