// src/controllers/publicStore.controller.js
const { sanitizeDomain } = require("../utils/sanitizeDomain");
const { resolveStoreByDomain, toPublicStoreDTO } = require("../services/storeResolver.service");
const { ApiError } = require("../middlewares/error");

async function getByDomain(req, res, next) {
  try {
    const raw = req.query.domain;
    const domain = sanitizeDomain(raw);

    if (!domain) {
      throw new ApiError(400, "INVALID_DOMAIN", "Invalid domain");
    }

    const store = await resolveStoreByDomain(domain);
    return res.json({ success: true, data: toPublicStoreDTO(store) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getByDomain };