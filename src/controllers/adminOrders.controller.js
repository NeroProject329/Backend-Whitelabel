// src/controllers/adminOrders.controller.js
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const { ApiError } = require("../middlewares/error");

function isValidObjectId(v) {
  return mongoose.Types.ObjectId.isValid(v);
}

async function listOrdersByStore(req, res, next) {
  try {
    const { storeId } = req.params;
    if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");

    const { status } = req.query;

    const filter = { storeId };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // ✅ opcional e útil no painel: trazer payment status (sem peso absurdo)
    const orderIds = orders.map((o) => String(o._id));
    const payments = await Payment.find({ orderId: { $in: orderIds } })
      .sort({ createdAt: -1 })
      .lean();

    const paymentByOrderId = new Map();
    for (const p of payments) {
      const oid = String(p.orderId);
      if (!paymentByOrderId.has(oid)) paymentByOrderId.set(oid, p); // primeiro é o mais recente
    }

    return res.json({
      success: true,
      data: orders.map((o) => {
        const pay = paymentByOrderId.get(String(o._id));
        return {
          id: String(o._id),
          storeId: String(o.storeId),
          status: o.status,
          totals: o.totals,
          customer: o.customer || { name: "", phone: "" },
          createdAt: o.createdAt,
          payment: pay
            ? {
                provider: pay.provider,
                status: pay.status,
                amountCents: pay.amountCents,
                expiresAt: pay.expiresAt || null
              }
            : null
        };
      })
    });
  } catch (err) {
    next(err);
  }
}

async function getOrderAdmin(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "INVALID_ORDER_ID", "Invalid order id");

    const order = await Order.findById(id).lean();
    if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");

    // Se for STORE_ADMIN, precisa ter acesso a essa store
    if (req.user.role !== "SUPER_ADMIN") {
      const allowed = (req.user.storeIds || []).map(String).includes(String(order.storeId));
      if (!allowed) throw new ApiError(403, "FORBIDDEN", "No access to this order");
    }

    // ✅ payment mais recente do pedido
    const pay = await Payment.findOne({ orderId: String(order._id) }).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      data: {
        id: String(order._id),
        storeId: String(order.storeId),
        status: order.status,
        customerId: order.customerId ? String(order.customerId) : null,
        customer: order.customer || { name: "", phone: "", doc: "" },
        address: order.address || {},
        items: (order.items || []).map((it) => ({
          productId: String(it.productId),
          nameSnapshot: it.nameSnapshot,
          priceCentsSnapshot: it.priceCentsSnapshot,
          qty: it.qty,
          notes: it.notes || ""
        })),
        totals: order.totals,
        payment: pay
          ? {
              id: String(pay._id),
              provider: pay.provider,
              status: pay.status,
              amountCents: pay.amountCents,
              qrCode: pay.qrCode || "",
              qrImageUrl: pay.qrImageUrl || "",
              expiresAt: pay.expiresAt || null,
              createdAt: pay.createdAt
            }
          : null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!isValidObjectId(id)) throw new ApiError(400, "INVALID_ORDER_ID", "Invalid order id");

    const allowed = ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"];
    if (!allowed.includes(String(status))) throw new ApiError(400, "INVALID_STATUS", "Invalid status");

    const order = await Order.findById(id);
    if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");

    if (req.user.role !== "SUPER_ADMIN") {
      const ok = (req.user.storeIds || []).map(String).includes(String(order.storeId));
      if (!ok) throw new ApiError(403, "FORBIDDEN", "No access to this order");
    }

    order.status = String(status);
    await order.save();

    return res.json({ success: true, data: { id: String(order._id), status: order.status } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listOrdersByStore, getOrderAdmin, updateOrderStatus };