// src/controllers/publicCatalog.controller.js
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");
const { ApiError } = require("../middlewares/error");

// --------------------
// DTOs (padronizados)
// --------------------
function toCategoryDTO(cat) {
  return {
    id: String(cat._id),
    storeId: String(cat.storeId),
    name: cat.name,
    order: cat.order,
    active: cat.active
  };
}

function toProductDTO(p) {
  return {
    id: String(p._id),
    storeId: String(p.storeId),
    categoryId: p.categoryId ? String(p.categoryId) : null,

    name: p.name,
    description: p.description,
    sizeLabel: p.sizeLabel,

    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    discountLabel: p.discountLabel,

    images: Array.isArray(p.images) ? p.images : [],

    featured: !!p.featured,
    active: !!p.active
  };
}

function isValidObjectId(v) {
  return mongoose.Types.ObjectId.isValid(v);
}

function getStoreIdFromReq(req) {
  // aceita via query ou via resolveStore middleware (req.storeId)
  const storeId = req.query.storeId || req.storeId;
  if (!storeId) throw new ApiError(400, "STORE_ID_REQUIRED", "storeId is required");
  if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");
  return storeId;
}

// --------------------
// Handlers
// --------------------
async function listCategories(req, res, next) {
  try {
    const storeId = getStoreIdFromReq(req);

    const cats = await Category.find({ storeId, active: true })
      .sort({ order: 1, name: 1 })
      .lean();

    return res.json({ success: true, data: cats.map(toCategoryDTO) });
  } catch (err) {
    next(err);
  }
}

async function listProducts(req, res, next) {
  try {
    const storeId = getStoreIdFromReq(req);

    const { categoryId, q } = req.query;

    const filter = {
      storeId,
      active: true
    };

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        throw new ApiError(400, "INVALID_CATEGORY_ID", "Invalid categoryId");
      }
      filter.categoryId = categoryId;
    }

    // Busca: tenta $text (se tiver índice). Se der ruim, cai pra regex.
    // Obs: $text ignora acentos em muitos casos dependendo do idioma/tokenização.
    let query = Product.find(filter);

    if (q && String(q).trim()) {
      const term = String(q).trim();

      // preferimos $text por performance
      // mas em alguns ambientes pode não existir índice ainda -> fallback no catch
      try {
        query = Product.find({ ...filter, $text: { $search: term } }).sort({ score: { $meta: "textScore" } });
        query = query.select({ score: { $meta: "textScore" } });
      } catch {
        // fallback regex (mais simples, mas menos performático)
        const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        query = Product.find({
          ...filter,
          $or: [{ name: rx }, { description: rx }]
        });
      }
    } else {
      // sem busca: ordena por featured e nome
      query = query.sort({ featured: -1, name: 1 });
    }

    const products = await query.lean();

    return res.json({ success: true, data: products.map(toProductDTO) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCategories, listProducts };