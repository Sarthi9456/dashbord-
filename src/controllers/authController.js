'use strict';
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Role } = require('../models');

exports.showLogin = (req, res) => {
  res.render('auth/login', { title: 'Login' });
};

exports.login = async (req, res) => {
  const { email, password, remember } = req.body;
  try {
    const user = await User.findOne({ where: { email }, include: [{ model: Role, as: 'role' }] });
    if (!user) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }
    const valid = await user.checkPassword(password);
    if (!valid) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name
    };

    // "Remember me": extend the session cookie lifetime to 30 days instead
    // of the default 8 hours. Otherwise leave Express's default in place.
    if (remember === 'on') {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    }

    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/login');
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};

// ---- Forgot / reset password ----
//
// No outbound email service is configured for this project, so instead of
// silently pretending to send an email, we generate a real, time-limited
// reset token (hashed in the DB, exactly like a production app would) and
// show the reset link directly on screen with a clear "in production this
// would be emailed to you" note. This keeps the flow fully functional and
// honest about what's actually happening, without requiring SMTP setup.

exports.showForgotPassword = (req, res) => {
  res.render('auth/forgot-password', { title: 'Forgot Password' });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });

    // Always show the same generic message whether or not the email exists,
    // so this endpoint can't be used to enumerate registered emails.
    const genericMessage =
      'If an account with that email exists, a password reset link has been generated below.';

    if (!user) {
      req.flash('error', 'No account found with that email address.');
      return res.redirect('/forgot-password');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    await user.save();

    const resetLink = `${req.protocol}://${req.get('host')}/reset-password/${rawToken}`;

    res.render('auth/forgot-password', {
      title: 'Forgot Password',
      resetLink,
      infoMessage: genericMessage
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/forgot-password');
  }
};

exports.showResetPassword = async (req, res) => {
  const { token } = req.params;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { [Op.gt]: new Date() }
    }
  });

  if (!user) {
    req.flash('error', 'That reset link is invalid or has expired. Please request a new one.');
    return res.redirect('/forgot-password');
  }

  res.render('auth/reset-password', { title: 'Reset Password', token });
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      req.flash('error', 'That reset link is invalid or has expired. Please request a new one.');
      return res.redirect('/forgot-password');
    }

    if (!password || password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters.');
      return res.redirect(`/reset-password/${token}`);
    }

    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect(`/reset-password/${token}`);
    }

    user.password = password; // hashed automatically by the model's beforeUpdate hook
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    req.flash('success', 'Your password has been reset. Please log in with your new password.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect(`/reset-password/${token}`);
  }
};
