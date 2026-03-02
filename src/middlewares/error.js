// src/middlewares/error.js

class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.statusCode = statusCode || 500;
    this.code = code || "INTERNAL_ERROR";
    this.details = details;
  }
}

function notFound(req, res, next) {
  next(new ApiError(404, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;

  // JSON inválido no body
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "Invalid JSON payload" }
    });
  } 

  if (err && err.message === "CORS_NOT_ALLOWED") {
  return res.status(403).json({
    success: false,
    error: { code: "CORS_NOT_ALLOWED", message: "Origin not allowed" }
     });
  }

  const payload = {
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "Unexpected error",
      details: err.details
    }
  };

  if (process.env.NODE_ENV !== "production") payload.error.stack = err.stack;

  res.status(status).json(payload);
}

module.exports = { ApiError, notFound, errorHandler };