// src/controllers/webhooksPixgo.controller.js
const { env } = require("../config/env");
const Store = require("../models/Store");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const { decryptSecret } = require("../utils/crypto");
const { getPixgoPaymentStatus, mapPixgoStatusToPaymentStatus } = require("../services/pixgo.service");

async function handlePixgoWebhook(req, res) {
  // valida token (se configurado)
  if (env.PIXGO_WEBHOOK_TOKEN && String(req.query.token || "") !== env.PIXGO_WEBHOOK_TOKEN) {
    return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
  }

  // responde rápido (PixGo exige 2xx rápido) :contentReference[oaicite:6]{index=6}
  res.status(200).json({ received: true });

  setImmediate(async () => {
    try {
      const payload = req.body || {};
      const event = payload.event;
      const data = payload.data || {};

      const paymentId = data.payment_id;
      const externalId = data.external_id; // vamos usar orderId string :contentReference[oaicite:7]{index=7}

      if (!event || !paymentId || !externalId) return;

      // encontra payment pelo provider id ou externalId
      let payment = await Payment.findOne({
        provider: "PIXGO",
        $or: [{ providerPaymentId: paymentId }, { externalId: String(externalId) }]
      });

      // encontra order (pelo externalId = orderId)
      const order = await Order.findById(String(externalId));
      if (!order) return;

      // pega store e chave
      const store = await Store.findById(order.storeId).lean();
      if (!store) return;

      const pixgoCfg = store.integrations?.pixgo || {};
      if (!pixgoCfg.isEnabled || !pixgoCfg.apiKeyEnc) return;

      const apiKey = decryptSecret(pixgoCfg.apiKeyEnc);
      const baseUrl = pixgoCfg.baseUrl || "https://pixgo.org/api/v1";

      // confirma status via endpoint (extra seguro)
      const confirmed = await getPixgoPaymentStatus({ baseUrl, apiKey, paymentId }).catch(() => null);
      const pixgoStatus = confirmed?.data?.status || data.status;

      const mapped = mapPixgoStatusToPaymentStatus(pixgoStatus);

      // cria payment se ainda não existir
      if (!payment) {
        payment = await Payment.create({
          storeId: store._id,
          orderId: order._id,
          provider: "PIXGO",
          status: mapped,
          externalId: String(externalId),
          providerPaymentId: String(paymentId),
          amountCents: Math.round(Number(order.totals?.totalCents || 0)),
          payload: payload
        });
      } else {
        // idempotência: se já está PAID, não reprocessa
        if (payment.status === "PAID") return;

        payment.status = mapped;
        payment.providerPaymentId = payment.providerPaymentId || String(paymentId);
        payment.payload = payload;
        await payment.save();
      }

      // atualiza order status
      if (mapped === "PAID") {
        order.status = env.AUTO_CONFIRM_AFTER_PAYMENT ? "CONFIRMED" : "PAYMENT_CONFIRMED";
        await order.save();
      } else if (mapped === "EXPIRED") {
        // você pode optar por manter o pedido e só marcar o pagamento como expirado
        // aqui vamos manter order em AWAITING_PAYMENT e o front consulta /payment pra ver EXPIRED
      } else if (mapped === "FAILED") {
        // idem
      }
    } catch (e) {
      console.error("Erro webhook pixgo:", e?.message || e);
    }
  });
}

module.exports = { handlePixgoWebhook };