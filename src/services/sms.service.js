// src/services/sms.service.js
const { env } = require("../config/env");

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

// padrão BR: "5511999999999" (DDD + número)
function normalizePhoneBR(phone) {
  const d = digitsOnly(phone);
  if (!d) return "";
  // se vier sem 55, tenta adicionar (opcional)
  if (d.length >= 10 && !d.startsWith("55")) return "55" + d;
  return d;
}

function buildCheckoutMessage({ storeName, customerName }) {
  const nome = (customerName || "").trim() || "cliente";
  const loja = (storeName || "").trim() || "Zé Delivery";
  return `${loja} - ${nome} Falta pouco para finalizar sua compra! Sua Gelada ta chegando!`;
}

/**
 * Integração com seu endpoint:
 * POST { name, message, numbers: ["5511..."] }
 * Header Authorization: Bearer <TOKEN>
 */
async function sendCheckoutSms({ storeName, customerName, phone }) {
  const normalized = normalizePhoneBR(phone);
  if (!normalized) {
    return { ok: false, error: "INVALID_PHONE" };
  }

  if (!env.SMS_API_URL || !env.SMS_API_TOKEN) {
    return { ok: false, error: "SMS_NOT_CONFIGURED" };
  }

  if (typeof fetch !== "function") {
    return { ok: false, error: "FETCH_NOT_AVAILABLE" };
  }

  const message = buildCheckoutMessage({ storeName, customerName });

  const payload = {
    name: env.SMS_CAMPAIGN_NAME,
    message,
    numbers: [normalized]
  };

  try {
    const resp = await fetch(env.SMS_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SMS_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return {
        ok: false,
        error: `SMS_HTTP_${resp.status}`,
        response: data
      };
    }

    return { ok: true, message, response: data, phone: normalized };
  } catch (e) {
    return { ok: false, error: e?.message || "SMS_ERROR" };
  }
}

module.exports = { sendCheckoutSms, normalizePhoneBR, buildCheckoutMessage };