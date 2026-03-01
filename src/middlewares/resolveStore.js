// src/middlewares/resolveStore.js
const { sanitizeDomain } = require("../utils/sanitizeDomain");
const { resolveStoreByDomain, toPublicStoreDTO } = require("../services/storeResolver.service");
const { ApiError } = require("./error");

async function resolveStore(req, res, next) {
  try {
    // prioridade:
    // 1) ?domain= (útil pra testes)
    // 2) x-forwarded-host (Railway / proxies)
    // 3) host padrão
    const rawHost =
      req.query.domain ||
      req.headers["x-forwarded-host"] ||
      req.headers.host;

    const domain = sanitizeDomain(rawHost);

    if (!domain) {
      throw new ApiError(400, "INVALID_HOST", "Could not resolve domain from host");
    }

    const store = await resolveStoreByDomain(domain);

    req.store = {
      storeId: String(store._id),
      domain,
      config: toPublicStoreDTO(store)
    };

    req.storeId = req.store.storeId;

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveStore };