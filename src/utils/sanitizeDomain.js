// src/utils/sanitizeDomain.js

function sanitizeDomain(host) {
  if (!host || typeof host !== "string") return null;

  let h = host.trim().toLowerCase();

  // remove header tipo "example.com:3000"
  // também cobre casos com múltiplos hosts (proxy mal configurado)
  if (h.includes(",")) h = h.split(",")[0].trim();

  // se vier "http://example.com:3000" (às vezes acontece), remove protocolo
  h = h.replace(/^https?:\/\//, "");

  // remove path acidental
  h = h.split("/")[0];

  // remove porta
  // ipv6: "[::1]:3000" -> "::1"
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    if (end !== -1) h = h.slice(1, end);
  } else {
    h = h.split(":")[0];
  }

  // valida mínimo (bem simples)
  if (!h || h.length < 3) return null;

  return h;
}

module.exports = { sanitizeDomain };