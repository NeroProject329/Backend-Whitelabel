// src/controllers/adminIntegrations.controller.js
const Store = require("../models/Store");
const { ApiError } = require("../middlewares/error");
const { encryptSecret, maskSecret } = require("../utils/crypto");

async function getPixgoConfig(req, res, next) {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId).select({ "integrations.pixgo": 1, name: 1 }).lean();
    if (!store) throw new ApiError(404, "STORE_NOT_FOUND", "Store not found");

    const pixgo = store.integrations?.pixgo || {};
    return res.json({
      success: true,
      data: {
        storeId,
        isEnabled: !!pixgo.isEnabled,
        baseUrl: pixgo.baseUrl || "https://pixgo.org/api/v1",
        hasApiKey: !!pixgo.apiKeyEnc,
        apiKeyMask: pixgo.apiKeyEnc ? maskSecret("************" + "1234") : null, // não expõe nada real
        apiKeyUpdatedAt: pixgo.apiKeyUpdatedAt || null
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updatePixgoConfig(req, res, next) {
  try {
    const { storeId } = req.params;
    const { apiKey, baseUrl, isEnabled } = req.body || {};

    const store = await Store.findById(storeId);
    if (!store) throw new ApiError(404, "STORE_NOT_FOUND", "Store not found");

    store.integrations = store.integrations || {};
    store.integrations.pixgo = store.integrations.pixgo || {};

    if (typeof isEnabled === "boolean") store.integrations.pixgo.isEnabled = isEnabled;
    if (baseUrl !== undefined) store.integrations.pixgo.baseUrl = String(baseUrl || "https://pixgo.org/api/v1").trim();

    if (apiKey !== undefined) {
      const key = String(apiKey || "").trim();
      if (key.length < 20) throw new ApiError(400, "INVALID_API_KEY", "apiKey looks invalid");
      store.integrations.pixgo.apiKeyEnc = encryptSecret(key);
      store.integrations.pixgo.apiKeyUpdatedAt = new Date();
    }

    await store.save();

    return res.json({
      success: true,
      data: {
        storeId,
        isEnabled: !!store.integrations.pixgo.isEnabled,
        baseUrl: store.integrations.pixgo.baseUrl,
        hasApiKey: !!store.integrations.pixgo.apiKeyEnc,
        apiKeyUpdatedAt: store.integrations.pixgo.apiKeyUpdatedAt || null
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPixgoConfig, updatePixgoConfig };