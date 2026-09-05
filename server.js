'use strict';
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const flash = require('connect-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const { sequelize } = require('./src/models');

const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const userRoutes = require('./src/routes/userRoutes');
const projectRoutes = require('./src/routes/projectRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const { requireAuth } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Render (and most PaaS providers) terminate HTTPS at a proxy in front of the app.
// This tells Express to trust that proxy's X-Forwarded-Proto header, so secure
// cookies and req.secure work correctly.
app.set('trust proxy', 1);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Body parsing & static files
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Sessions & flash messages
// Store sessions in the same SQLite database instead of Express's default
// in-memory store. This avoids memory leaks under load and means logged-in
// sessions survive an app restart (e.g. Render's free tier spinning down
// after inactivity and waking back up).
const sessionStore = new SequelizeStore({ db: sequelize, tableName: 'sessions' });
sessionStore.sync();

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
      secure: isProd, // only send cookie over HTTPS in production
      sameSite: 'lax'
    }
  })
);
app.use(flash());

// Make current user & flash messages available to all views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Routes
app.get('/', (req, res) => res.redirect(req.session.user ? '/dashboard' : '/login'));
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('errors/500', { title: 'Server Error', message: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
});
