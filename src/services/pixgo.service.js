// src/services/pixgo.service.js
const { centsToAmount } = require("../utils/money");

async function pixgoRequest({ baseUrl, apiKey, path, method = "GET", body }) {
  const url = `${String(baseUrl).replace(/\/$/, "")}${path}`;

  const resp = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await resp.json().catch(() => null);

  if (!resp.ok) {
    const err = new Error(`PIXGO_HTTP_${resp.status}`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }

  return data;
}

function mapPixgoStatusToPaymentStatus(pixgoStatus) {
  const s = String(pixgoStatus || "").toLowerCase();
  if (s === "completed") return "PAID";
  if (s === "expired") return "EXPIRED";
  if (s === "cancelled") return "FAILED";
  return "PENDING";
}

async function createPixgoPayment({ baseUrl, apiKey, amountCents, externalId, description, customer, customerAddress, webhookUrl }) {
  const amount = centsToAmount(amountCents);

  // doc: mínimo R$10,00 (garantimos pelo lado do app também)
  if (amount < 10) {
    const err = new Error("PIXGO_MIN_AMOUNT");
    err.data = { message: "PixGo minimum is R$ 10,00" };
    throw err;
  }

  const payload = {
    amount,
    description: description || "Pedido",
    external_id: externalId || "",
    customer_name: customer?.name || "",
    customer_cpf: customer?.doc || "",
    customer_phone: customer?.phone || "",
    customer_email: customer?.email || "",
    customer_address: customerAddress || ""
  };

  if (webhookUrl) payload.webhook_url = webhookUrl;

  // doc: POST /payment/create :contentReference[oaicite:4]{index=4}
  return pixgoRequest({
    baseUrl,
    apiKey,
    path: "/payment/create",
    method: "POST",
    body: payload
  });
}

async function getPixgoPaymentStatus({ baseUrl, apiKey, paymentId }) {
  // doc: GET /payment/{id}/status :contentReference[oaicite:5]{index=5}
  return pixgoRequest({
    baseUrl,
    apiKey,
    path: `/payment/${paymentId}/status`,
    method: "GET"
  });
}

module.exports = { createPixgoPayment, getPixgoPaymentStatus, mapPixgoStatusToPaymentStatus };