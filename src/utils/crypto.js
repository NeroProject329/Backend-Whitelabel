// src/utils/crypto.js
const crypto = require("crypto");
const { env } = require("../config/env");

function getKey32() {
  const raw = env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY não configurada");

  // aceita 64 hex (32 bytes) ou base64 (32 bytes)
  let key;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) key = Buffer.from(raw, "hex");
  else key = Buffer.from(raw, "base64");

  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY precisa ter 32 bytes (base64) ou 64 chars hex");
  return key;
}

function encryptSecret(plainText) {
  const key = getKey32();
  const iv = crypto.randomBytes(12); // GCM recomendado 12 bytes
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const enc = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

function decryptSecret(token) {
  if (!token) return "";
  const key = getKey32();

  const [v, ivB64, tagB64, dataB64] = String(token).split(":");
  if (v !== "v1" || !ivB64 || !tagB64 || !dataB64) throw new Error("Secret token inválido");

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

function maskSecret(s) {
  const str = String(s || "");
  if (str.length <= 8) return "********";
  return `${str.slice(0, 2)}********${str.slice(-4)}`;
}

module.exports = { encryptSecret, decryptSecret, maskSecret };