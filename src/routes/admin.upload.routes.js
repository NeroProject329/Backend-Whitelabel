// src/routes/admin.upload.routes.js
const express = require("express");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();
router.use(requireAuth);

/**
 * POST /admin/uploads/presign
 * body: { filename, contentType, folder }
 * retorno: { uploadUrl, publicUrl, method, headers }
 *
 * Agora: STUB (pra plugar S3/R2 depois)
 */
router.post("/uploads/presign", async (req, res) => {
  const { filename, contentType, folder } = req.body || {};

  // Por enquanto devolve “placeholders”
  // Depois a gente troca isso por S3/R2 e retorna URLs reais.
  return res.json({
    success: true,
    data: {
      method: "PUT",
      uploadUrl: "https://storage-provider/presigned-put-url",
      publicUrl: `https://cdn.suaempresa.com/${folder || "uploads"}/${filename || "file"}`,
      headers: {
        "Content-Type": contentType || "application/octet-stream"
      }
    }
  });
});

module.exports = router;