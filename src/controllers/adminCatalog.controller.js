// src/controllers/adminCatalog.controller.js
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");
const { ApiError } = require("../middlewares/error");

function isValidObjectId(v) {
  return mongoose.Types.ObjectId.isValid(v);
}

// ---------- Categories ----------
async function createCategory(req, res, next) {
  try {
    const { storeId } = req.params;
    const { name, order, active } = req.body || {};

    if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");
    if (!name) throw new ApiError(400, "INVALID_BODY", "name is required");

    const cat = await Category.create({
      storeId,
      name: String(name).trim(),
      order: Number(order || 0),
      active: active !== undefined ? !!active : true
    });

    return res.status(201).json({
      success: true,
      data: { id: String(cat._id), storeId: String(cat.storeId), name: cat.name, order: cat.order, active: cat.active }
    });
  } catch (err) {
    next(err);
  }
}

async function listCategories(req, res, next) {
  try {
    const { storeId } = req.params;
    if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");

    const cats = await Category.find({ storeId }).sort({ order: 1, name: 1 }).lean();
    return res.json({
      success: true,
      data: cats.map(c => ({ id: String(c._id), storeId: String(c.storeId), name: c.name, order: c.order, active: c.active }))
    });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const { storeId, categoryId } = req.params;
    if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");
    if (!isValidObjectId(categoryId)) throw new ApiError(400, "INVALID_CATEGORY_ID", "Invalid categoryId");

    const body = req.body || {};
    const patch = {};
    ["name", "order", "active"].forEach(k => {
      if (body[k] !== undefined) patch[k] = body[k];
    });

    const cat = await Category.findOneAndUpdate({ _id: categoryId, storeId }, patch, { new: true, runValidators: true });
    if (!cat) throw new ApiError(404, "CATEGORY_NOT_FOUND", "Category not found");

    return res.json({
      success: true,
      data: { id: String(cat._id), storeId: String(cat.storeId), name: cat.name, order: cat.order, active: cat.active }
    });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const { storeId, categoryId } = req.params;
    if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");
    if (!isValidObjectId(categoryId)) throw new ApiError(400, "INVALID_CATEGORY_ID", "Invalid categoryId");

    const cat = await Category.findOneAndDelete({ _id: categoryId, storeId });
    if (!cat) throw new ApiError(404, "CATEGORY_NOT_FOUND", "Category not found");

    // opcional: você pode desassociar produtos dessa categoria
    await Product.updateMany({ storeId, categoryId }, { $set: { categoryId: null } });

    return res.json({ success: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
}

async function reorderCategories(req, res, next) {
  try {
    const { storeId } = req.params;
    const { orderedIds } = req.body || {};

    if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new ApiError(400, "INVALID_BODY", "orderedIds[] is required");
    }

    // valida ids
    for (const id of orderedIds) {
      if (!isValidObjectId(id)) throw new ApiError(400, "INVALID_CATEGORY_ID", `Invalid categoryId: ${id}`);
    }

    const ops = orderedIds.map((id, idx) => ({
      updateOne: {
        filter: { _id: id, storeId },
        update: { $set: { order: idx } }
      }
    }));

    await Category.bulkWrite(ops);

    return res.json({ success: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
}

// ---------- Products ----------
async function createProduct(req, res, next) {
  try {
    const { storeId } = req.params;
    const body = req.body || {};

    if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");
    if (!body.name) throw new ApiError(400, "INVALID_BODY", "name is required");
    if (body.priceCents === undefined || body.priceCents === null) throw new ApiError(400, "INVALID_BODY", "priceCents is required");

    if (body.categoryId && !isValidObjectId(body.categoryId)) {
      throw new ApiError(400, "INVALID_CATEGORY_ID", "Invalid categoryId");
    }

    const p = await Product.create({
      storeId,
      categoryId: body.categoryId || null,
      name: String(body.name).trim(),
      description: body.description || "",
      sizeLabel: body.sizeLabel || "",
      priceCents: Number(body.priceCents),
      compareAtCents: body.compareAtCents !== undefined && body.compareAtCents !== null ? Number(body.compareAtCents) : null,
      discountLabel: body.discountLabel || "",
      images: Array.isArray(body.images) ? body.images : [],
      featured: !!body.featured,
      active: body.active !== undefined ? !!body.active : true
    });

    return res.status(201).json({
      success: true,
      data: {
        id: String(p._id),
        storeId: String(p.storeId),
        categoryId: p.categoryId ? String(p.categoryId) : null,
        name: p.name,
        description: p.description,
        sizeLabel: p.sizeLabel,
        priceCents: p.priceCents,
        compareAtCents: p.compareAtCents,
        discountLabel: p.discountLabel,
        images: p.images || [],
        featured: !!p.featured,
        active: !!p.active
      }
    });
  } catch (err) {
    next(err);
  }
}

async function listProducts(req, res, next) {
  try {
    const { storeId } = req.params;
    if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");

    const { q, categoryId, active } = req.query;

    const filter = { storeId };
    if (active !== undefined) filter.active = active === "true";
    if (categoryId) {
      if (!isValidObjectId(categoryId)) throw new ApiError(400, "INVALID_CATEGORY_ID", "Invalid categoryId");
      filter.categoryId = categoryId;
    }

    let query = Product.find(filter);

    if (q && String(q).trim()) {
      const term = String(q).trim();
      query = Product.find({ ...filter, $text: { $search: term } }).sort({ score: { $meta: "textScore" } });
      query = query.select({ score: { $meta: "textScore" } });
    } else {
      query = query.sort({ featured: -1, name: 1 });
    }

    const items = await query.lean();

    return res.json({
      success: true,
      data: items.map(p => ({
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
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { storeId, productId } = req.params;
    if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");
    if (!isValidObjectId(productId)) throw new ApiError(400, "INVALID_PRODUCT_ID", "Invalid productId");

    const body = req.body || {};

    if (body.categoryId && !isValidObjectId(body.categoryId)) {
      throw new ApiError(400, "INVALID_CATEGORY_ID", "Invalid categoryId");
    }

    const patch = {};
    [
      "name",
      "description",
      "sizeLabel",
      "priceCents",
      "compareAtCents",
      "discountLabel",
      "images",
      "featured",
      "active",
      "categoryId"
    ].forEach(k => {
      if (body[k] !== undefined) patch[k] = body[k];
    });

    const p = await Product.findOneAndUpdate({ _id: productId, storeId }, patch, { new: true, runValidators: true });
    if (!p) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");

    return res.json({
      success: true,
      data: {
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
      }
    });
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { storeId, productId } = req.params;
    if (!isValidObjectId(storeId)) throw new ApiError(400, "INVALID_STORE_ID", "Invalid storeId");
    if (!isValidObjectId(productId)) throw new ApiError(400, "INVALID_PRODUCT_ID", "Invalid productId");

    const p = await Product.findOneAndDelete({ _id: productId, storeId });
    if (!p) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");

    return res.json({ success: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCategory,
  listCategories,
  updateCategory,
  deleteCategory,
  reorderCategories,
  createProduct,
  listProducts,
  updateProduct,
  deleteProduct
};