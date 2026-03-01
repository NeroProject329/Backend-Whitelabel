// src/controllers/publicOrders.controller.js
const mongoose = require("mongoose");
const Store = require("../models/Store");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { ApiError } = require("../middlewares/error");
const { computeOrderTotals } = require("../services/orderTotals.service");

function isValidObjectId(v) {
  return mongoose.Types.ObjectId.isValid(v);
}

async function resolveStoreForOrder(req) {
  // prioridade:
  // 1) resolveStore middleware (req.storeId)
  // 2) body.storeId (teste / admin / integração)
  // 3) query.storeId
  const storeId = req.storeId || req.body?.storeId || req.query?.storeId;

  if (!storeId) throw new ApiError(400, "STORE_ID_REQUIRED", "storeId is required");
  if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");

  const store = await Store.findById(storeId).lean();
  if (!store || !store.isActive) throw new ApiError(404, "STORE_NOT_FOUND", "Store not found");

  return store;
}

async function createDraft(req, res, next) {
  try {
    const store = await resolveStoreForOrder(req);

    const itemsIn = Array.isArray(req.body?.items) ? req.body.items : [];
    if (itemsIn.length === 0) {
      throw new ApiError(400, "EMPTY_ITEMS", "items[] is required");
    }

    // valida e monta snapshot
    const productIds = itemsIn.map((i) => i.productId).filter(Boolean);
    for (const pid of productIds) {
      if (!isValidObjectId(pid)) throw new ApiError(400, "INVALID_PRODUCT_ID", `Invalid productId: ${pid}`);
    }

    const products = await Product.find({
      _id: { $in: productIds },
      storeId: store._id,
      active: true
    }).lean();

    const byId = new Map(products.map((p) => [String(p._id), p]));

    const items = itemsIn.map((i) => {
      const p = byId.get(String(i.productId));
      if (!p) throw new ApiError(400, "PRODUCT_NOT_FOUND", `Product not found in this store: ${i.productId}`);

      const qty = Math.max(1, Math.round(Number(i.qty || 1)));

      return {
        productId: p._id,
        nameSnapshot: p.name,
        priceCentsSnapshot: p.priceCents,
        qty,
        notes: i.notes ? String(i.notes).slice(0, 300) : ""
      };
    });

    const totals = computeOrderTotals({ items, store });

    // regra simples: já impede pedido abaixo do mínimo (se quiser deixar pro /advance, me fala)
    if (store.minOrderCents && totals.itemsTotalCents < store.minOrderCents) {
      throw new ApiError(400, "MIN_ORDER", "Order below minimum");
    }

    const order = await Order.create({
      storeId: store._id,
      items,
      totals,
      status: "DRAFT"
    });

    return res.status(201).json({
      success: true,
      data: {
        orderId: String(order._id),
        status: order.status,
        totals: order.totals
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "INVALID_ORDER_ID", "Invalid order id");

    const order = await Order.findById(id).lean();
    if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");

    // retorno público (não vaza nada interno)
    return res.json({
      success: true,
      data: {
        id: String(order._id),
        storeId: String(order.storeId),
        status: order.status,
        customer: order.customer || { name: "", phone: "", doc: "" },
        address: order.address || {},
        items: (order.items || []).map((it) => ({
          productId: String(it.productId),
          name: it.nameSnapshot,
          priceCents: it.priceCentsSnapshot,
          qty: it.qty,
          notes: it.notes || ""
        })),
        totals: order.totals,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createDraft, getOrder };