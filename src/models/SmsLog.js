// src/models/SmsLog.js
const mongoose = require("mongoose");

const SmsLogSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },

    phone: { type: String, required: true },
    message: { type: String, required: true },

    provider: { type: String, default: "CUSTOM_CAMPAIGN" },
    status: { type: String, enum: ["SENT", "FAILED"], required: true },

    error: { type: String, default: "" },
    responsePayload: { type: Object, default: null }
  },
  { timestamps: true }
);

SmsLogSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model("SmsLog", SmsLogSchema);