// Central place to catch anything thrown/rejected in a route handler.
// Wrap async route handlers with the `asyncHandler` helper below so errors
// land here instead of crashing the server.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
  }

  // Mongoose duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ message: `That ${field} is already in use.` });
  }

  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || "Something went wrong on our end.",
  });
}

module.exports = { asyncHandler, notFound, errorHandler };
