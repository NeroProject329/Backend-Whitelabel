// src/models/Order.js
const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

    // Snapshot: o pedido não pode mudar se o produto mudar depois
    nameSnapshot: { type: String, required: true },
    priceCentsSnapshot: { type: Number, required: true, min: 0 },

    qty: { type: Number, required: true, min: 1 },
    notes: { type: String, default: "" }
  },
  { _id: false }
);

const AddressSchema = new mongoose.Schema(
  {
    zip: { type: String, default: "" },
    street: { type: String, default: "" },
    number: { type: String, default: "" },
    district: { type: String, default: "" },
    city: { type: String, default: "" },
    uf: { type: String, default: "" },
    complement: { type: String, default: "" }
  },
  { _id: false }
);

const TotalsSchema = new mongoose.Schema(
  {
    itemsTotalCents: { type: Number, default: 0, min: 0 },
    deliveryFeeCents: { type: Number, default: 0, min: 0 },
    totalCents: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },

    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    customer: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      doc: { type: String, default: "" }
    },

    items: { type: [OrderItemSchema], default: [] },

    totals: { type: TotalsSchema, default: () => ({}) },

    address: { type: AddressSchema, default: () => ({}) },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "AWAITING_PAYMENT",
        "PAYMENT_CONFIRMED",
        "CONFIRMED",
        "PREPARING",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELED"
      ],
      default: "DRAFT",
      index: true
    }
  },
  { timestamps: true }
);

OrderSchema.index({ storeId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);