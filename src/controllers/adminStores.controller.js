// src/controllers/adminStores.controller.js
const Store = require("../models/Store");
const { ApiError } = require("../middlewares/error");
const { sanitizeDomain } = require("../utils/sanitizeDomain");

function toStoreDTO(s) {
  return {
    id: String(s._id),
    name: s.name,
    domains: s.domains || [],
    logoUrl: s.logoUrl,
    bannerUrl: s.bannerUrl,
    deliveryFeeCents: s.deliveryFeeCents,
    minOrderCents: s.minOrderCents,
    etaMin: s.etaMin,
    etaMax: s.etaMax,
    isActive: s.isActive
  };
}

function sanitizeDomains(domains) {
  if (!Array.isArray(domains)) return [];
  const clean = domains.map(sanitizeDomain).filter(Boolean);
  return Array.from(new Set(clean));
}

async function createStore(req, res, next) {
  try {
    const body = req.body || {};
    if (!body.name) throw new ApiError(400, "INVALID_BODY", "name is required");

    const store = await Store.create({
      name: body.name,
      domains: sanitizeDomains(body.domains || []),
      logoUrl: body.logoUrl || "",
      bannerUrl: body.bannerUrl || "",
      deliveryFeeCents: Number(body.deliveryFeeCents || 0),
      minOrderCents: Number(body.minOrderCents || 0),
      etaMin: Number(body.etaMin || 30),
      etaMax: Number(body.etaMax || 60),
      isActive: body.isActive !== undefined ? !!body.isActive : true
    });

    return res.status(201).json({ success: true, data: toStoreDTO(store) });
  } catch (err) {
    next(err);
  }
}

async function listStores(req, res, next) {
  try {
    const stores = await Store.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: stores.map(toStoreDTO) });
  } catch (err) {
    next(err);
  }
}

async function updateStore(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const patch = {};
    const allowed = [
      "name",
      "logoUrl",
      "bannerUrl",
      "deliveryFeeCents",
      "minOrderCents",
      "etaMin",
      "etaMax",
      "isActive"
    ];
    for (const k of allowed) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    if (body.domains !== undefined) patch.domains = sanitizeDomains(body.domains);

    const store = await Store.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
    if (!store) throw new ApiError(404, "STORE_NOT_FOUND", "Store not found");

    return res.json({ success: true, data: toStoreDTO(store) });
  } catch (err) {
    next(err);
  }
}

module.exports = { createStore, listStores, updateStore };