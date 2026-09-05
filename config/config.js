'use strict';
require('dotenv').config();

// All three environments read from the same set of env vars. Set these in
// your .env file locally, and in your hosting platform's environment
// variables dashboard in production (e.g. Render's "Environment" tab).
const common = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rbac_dashboard',
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  dialectOptions: {
    // Most free/managed MySQL hosts (PlanetScale, Aiven, Railway, etc.)
    // require SSL. Set DB_SSL=true for those; leave unset for plain local MySQL.
    ssl:
      process.env.DB_SSL === 'true'
        ? { require: true, rejectUnauthorized: false }
        : undefined
  }
};

module.exports = {
  development: { ...common, database: process.env.DB_NAME || 'rbac_dashboard' },
  test: { ...common, database: process.env.DB_NAME_TEST || 'rbac_dashboard_test' },
  production: { ...common, database: process.env.DB_NAME || 'rbac_dashboard' }
};
