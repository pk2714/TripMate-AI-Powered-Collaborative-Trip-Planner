// Protects routes that require a logged-in user.
// Relies on express-session: req.session.userId is set at login (see authController.js).
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "You must be logged in to do that." });
  }
  next();
}

// Restricts a route to admins only. Must run after requireAuth (and after
// attaching req.user, e.g. via a small "load current user" middleware) so
// req.session.role is available. For simplicity we store role in the session too.
function requireAdmin(req, res, next) {
  if (req.session?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
