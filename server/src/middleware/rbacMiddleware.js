/**
 * Role-Based Access Control (RBAC) middleware generator.
 * @param  {...string} allowedRoles - List of roles permitted to access the route.
 * @returns {Function} Express middleware.
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking role authorization.',
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Your role '${req.user.role}' is not authorized to access this resource. Allowed roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
