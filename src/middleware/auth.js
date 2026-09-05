'use strict';

// Ensures the user is logged in. Applied globally at the backend route level,
// NOT just hidden in the UI - so direct URL access is also blocked.
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error', 'Please log in to continue.');
  return res.redirect('/login');
}

// Redirect already-logged-in users away from the login page.
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = { requireAuth, redirectIfAuthenticated };
