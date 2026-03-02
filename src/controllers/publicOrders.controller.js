// src/controllers/publicOrders.controller.js
const mongoose = require("mongoose");
const Store = require("../models/Store");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { ApiError } = require("../middlewares/error");
const { computeOrderTotals } = require("../services/orderTotals.service");
const Customer = require("../models/Customer");
const SmsLog = require("../models/SmsLog");
const { sendCheckoutSms, normalizePhoneBR } = require("../services/sms.service");
const Payment = require("../models/Payment");
const { decryptSecret } = require("../utils/crypto");
const { createPixgoPayment, mapPixgoStatusToPaymentStatus } = require("../services/pixgo.service");
const { env } = require("../config/env");

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

async function advanceCheckout(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "INVALID_ORDER_ID", "Invalid order id");

    const order = await Order.findById(id);
    if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");

    // Se tiver store resolvida por domínio, garante que o pedido é dessa store
    if (req.storeId && String(order.storeId) !== String(req.storeId)) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    const store = await Store.findById(order.storeId).lean();
    if (!store || !store.isActive) throw new ApiError(404, "STORE_NOT_FOUND", "Store not found");

    const { customer, address } = req.body || {};

    // ---------- validações mínimas ----------
    if (!customer?.name || !String(customer.name).trim()) {
      throw new ApiError(400, "INVALID_CUSTOMER", "customer.name is required");
    }
    if (!customer?.phone || !String(customer.phone).trim()) {
      throw new ApiError(400, "INVALID_CUSTOMER", "customer.phone is required");
    }

    const phoneNorm = normalizePhoneBR(customer.phone);
    if (!phoneNorm) throw new ApiError(400, "INVALID_PHONE", "Invalid phone");

    const requiredAddr = ["zip", "street", "number", "district", "city", "uf"];
    for (const f of requiredAddr) {
      if (!address?.[f] || !String(address[f]).trim()) {
        throw new ApiError(400, "INVALID_ADDRESS", `address.${f} is required`);
      }
    }

    // Recalcula totals (seguro pra DRAFT)
    const totals = computeOrderTotals({ items: order.items || [], store });

    if (store.minOrderCents && totals.itemsTotalCents < store.minOrderCents) {
      throw new ApiError(400, "MIN_ORDER", "Order below minimum");
    }

    // ---------- upsert customer ----------
    let customerDoc = await Customer.findOne({ storeId: store._id, phone: phoneNorm });
    if (!customerDoc) {
      customerDoc = await Customer.create({
        storeId: store._id,
        name: String(customer.name).trim(),
        phone: phoneNorm,
        doc: customer.doc ? String(customer.doc).trim() : ""
      });
    } else {
      customerDoc.name = String(customer.name).trim();
      if (customer.doc !== undefined) customerDoc.doc = String(customer.doc || "").trim();
      await customerDoc.save();
    }

    // ---------- salva no pedido ----------
    order.customerId = customerDoc._id;
    order.customer = {
      name: String(customer.name).trim(),
      phone: phoneNorm,
      doc: customer.doc ? String(customer.doc).trim() : ""
    };
    order.address = {
      zip: String(address.zip).trim(),
      street: String(address.street).trim(),
      number: String(address.number).trim(),
      district: String(address.district).trim(),
      city: String(address.city).trim(),
      uf: String(address.uf).trim(),
      complement: address.complement ? String(address.complement).trim() : ""
    };
    order.totals = totals;

    // status: avança para aguardando pagamento (Pix vem no M6)
    if (order.status === "DRAFT") {
      order.status = "AWAITING_PAYMENT";
    }

    await order.save();

     // ---------- PIXGO (se configurado) ----------
    let pix = null;

    const pixgoCfg = store.integrations?.pixgo || {};
    if (pixgoCfg.isEnabled && pixgoCfg.apiKeyEnc) {
      const apiKey = decryptSecret(pixgoCfg.apiKeyEnc);
      const baseUrl = pixgoCfg.baseUrl || "https://pixgo.org/api/v1";


      const addressStr = `${order.address.street}, ${order.address.number}, ${order.address.district}, ${order.address.city}, ${order.address.uf}, ${order.address.zip}` +
        (order.address.complement ? `, ${order.address.complement}` : "");

      const webhookUrl = env.PUBLIC_BASE_URL
        ? `${String(env.PUBLIC_BASE_URL).replace(/\/$/, "")}/webhooks/pixgo${env.PIXGO_WEBHOOK_TOKEN ? `?token=${encodeURIComponent(env.PIXGO_WEBHOOK_TOKEN)}` : ""}`
        : undefined;

      const createResp = await createPixgoPayment({
        baseUrl,
        apiKey,
        amountCents: order.totals.totalCents,
        externalId: String(order._id), // external_id max 50 :contentReference[oaicite:9]{index=9}
        description: `Pedido ${String(order._id)}`,
        customer: { name: order.customer.name, phone: order.customer.phone, doc: order.customer.doc || "" },
        customerAddress: addressStr,
        webhookUrl
      });

      // doc: retorna payment_id, qr_code, qr_image_url, expires_at :contentReference[oaicite:10]{index=10}
      const d = createResp?.data || {};
      const paymentStatus = mapPixgoStatusToPaymentStatus(d.status);

      const payment = await Payment.create({
        storeId: store._id,
        orderId: order._id,
        provider: "PIXGO",
        status: paymentStatus,
        externalId: String(order._id),
        providerPaymentId: d.payment_id || "",
        amountCents: order.totals.totalCents,
        qrCode: d.qr_code || "",
        qrImageUrl: d.qr_image_url || "",
        expiresAt: d.expires_at ? new Date(d.expires_at) : null,
        payload: createResp
      });

      pix = {
        paymentId: String(payment._id),
        providerPaymentId: payment.providerPaymentId,
        status: payment.status,
        qrCode: payment.qrCode,
        qrImageUrl: payment.qrImageUrl,
        expiresAt: payment.expiresAt
      };
    }

    // ---------- dispara SMS (não quebra se falhar) ----------
    const smsResult = await sendCheckoutSms({
      storeName: store.name,
      customerName: order.customer.name,
      phone: phoneNorm
    });

    await SmsLog.create({
      storeId: store._id,
      orderId: order._id,
      customerId: customerDoc._id,
      phone: phoneNorm,
      message: smsResult.ok ? smsResult.message : `${store.name} - ${order.customer.name} Falta pouco para finalizar sua compra! Sua Gelada ta chegando!`,
      provider: "CUSTOM_CAMPAIGN",
      status: smsResult.ok ? "SENT" : "FAILED",
      error: smsResult.ok ? "" : String(smsResult.error || "SMS_FAILED"),
      responsePayload: smsResult.response || null
    });

    return res.json({
      success: true,
      data: {
        orderId: String(order._id),
        status: order.status,
        totals: order.totals,
        sms: { sent: !!smsResult.ok,   error: smsResult.ok ? null : smsResult.error},
        pix
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getOrderPayment(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "INVALID_ORDER_ID", "Invalid order id");

    const payment = await Payment.findOne({ orderId: id, provider: "PIXGO" }).sort({ createdAt: -1 }).lean();
    if (!payment) {
      return res.json({ success: true, data: { hasPayment: false } });
    }

    return res.json({
      success: true,
      data: {
        hasPayment: true,
        status: payment.status,
        qrCode: payment.qrCode || "",
        qrImageUrl: payment.qrImageUrl || "",
        expiresAt: payment.expiresAt || null,
        providerPaymentId: payment.providerPaymentId || ""
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createDraft, getOrder, advanceCheckout, getOrderPayment };