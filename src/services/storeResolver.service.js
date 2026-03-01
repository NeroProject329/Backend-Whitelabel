// src/services/storeResolver.service.js
const Store = require("../models/Store");
const { ApiError } = require("../middlewares/error");

async function resolveStoreByDomain(domain) {
  if (!domain) {
    throw new ApiError(400, "DOMAIN_REQUIRED", "Domain is required");
  }

  const store = await Store.findOne({
    domains: domain,
    isActive: true
  }).lean();

  if (!store) {
    throw new ApiError(404, "STORE_NOT_FOUND", "Store not found for this domain");
  }

  return store;
}

// DTO público (não vaza campos internos)
function toPublicStoreDTO(store) {
  return {
    storeId: String(store._id),
    name: store.name,
    logoUrl: store.logoUrl,
    bannerUrl: store.bannerUrl,
    deliveryFeeCents: store.deliveryFeeCents,
    minOrderCents: store.minOrderCents,
    etaMin: store.etaMin,
    etaMax: store.etaMax,
    isActive: store.isActive
  };
}

module.exports = { resolveStoreByDomain, toPublicStoreDTO };