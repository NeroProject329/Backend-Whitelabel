// src/services/r2.js
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { env } = require("../config/env");

function mustR2(name, val) {
  if (!val) throw new Error(`Missing R2 env var: ${name}`);
  return val;
}

function makeClient() {
  const accountId = mustR2("R2_ACCOUNT_ID", env.R2_ACCOUNT_ID);
  const accessKeyId = mustR2("R2_ACCESS_KEY_ID", env.R2_ACCESS_KEY_ID);
  const secretAccessKey = mustR2("R2_SECRET_ACCESS_KEY", env.R2_SECRET_ACCESS_KEY);

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function publicUrlForKey(key) {
  const base = mustR2("R2_PUBLIC_BASE_URL", env.R2_PUBLIC_BASE_URL).replace(/\/+$/, "");
  return `${base}/${key}`;
}

async function presignPutObject({ key, contentType }) {
  const Bucket = mustR2("R2_BUCKET", env.R2_BUCKET);
  const s3 = makeClient();

  const cmd = new PutObjectCommand({
    Bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });

  const uploadUrl = await getSignedUrl(s3, cmd, {
    expiresIn: env.UPLOADS_PRESIGN_EXPIRES_SEC || 300,
  });

  return {
    method: "PUT",
    uploadUrl,
    publicUrl: publicUrlForKey(key),
    headers: {
      "Content-Type": contentType || "application/octet-stream",
    },
  };
}

module.exports = { presignPutObject };