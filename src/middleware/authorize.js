'use strict';

// Backend-level RBAC guard. Even if a user manually types a restricted URL,
// this middleware blocks the request with a 403 before any controller logic runs.
function authorize(...allowedRoles) {
  return (req, res, next) => {
    const user = req.session && req.session.user;
    if (!user) {
      req.flash('error', 'Please log in to continue.');
      return res.redirect('/login');
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).render('errors/403', {
        title: 'Access Denied',
        user
      });
    }
    next();
  };
}

module.exports = authorize;
