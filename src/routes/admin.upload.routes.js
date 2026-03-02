// src/routes/admin.upload.routes.js
const express = require("express");
const crypto = require("crypto");
const { requireAuth } = require("../middlewares/auth");
const { env } = require("../config/env");
const { presignPutObject } = require("../services/r2");

const router = express.Router();
router.use(requireAuth);

function safeFolder(folder) {
  const f = String(folder || "uploads")
    .replace(/\\/g, "/")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  return f || "uploads";
}

function safeFilename(name) {
  const base = String(name || "file")
    .split("/")
    .pop()
    .split("\\")
    .pop()
    .replace(/[^a-zA-Z0-9._-]/g, "");

  return base || "file";
}

router.post("/uploads/presign", async (req, res, next) => {
  try {
    const { filename, contentType, folder } = req.body || {};

    // fallback: mantém comportamento atual se ainda não configurou R2
    if (env.UPLOAD_PROVIDER !== "R2") {
      return res.json({
        success: true,
        data: {
          method: "PUT",
          uploadUrl: "https://storage-provider/presigned-put-url",
          publicUrl: `https://cdn.suaempresa.com/${folder || "uploads"}/${filename || "file"}`,
          headers: { "Content-Type": contentType || "application/octet-stream" },
        },
      });
    }

    const f = safeFolder(folder);
    const name = safeFilename(filename);
    const rand = crypto.randomBytes(8).toString("hex");

    const key = `${f}/${Date.now()}-${rand}-${name}`;

    const signed = await presignPutObject({ key, contentType });

    return res.json({ success: true, data: signed });
  } catch (err) {
    next(err);
  }
});

module.exports = router;