'use strict';
/**
 * Safe-seed script for deployment platforms (Render, Railway, etc).
 *
 * Migrations are always safe to re-run (Sequelize tracks what's already
 * applied in the SequelizeMeta table). Seeders are NOT safe to blindly
 * re-run because they'd hit unique-constraint errors on `email` the second
 * time. So on every boot we:
 *   1. Run migrations (no-op if already applied).
 *   2. Only run seeders if the `users` table is currently empty.
 *
 * This means: first deploy -> full demo data. Every redeploy after that ->
 * migrations still apply cleanly, existing data is left untouched.
 */
const { execSync } = require('child_process');
const { User } = require('../src/models');

(async () => {
  try {
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('[bootstrap] No users found — running seeders...');
      execSync('npx sequelize-cli db:seed:all', { stdio: 'inherit' });
    } else {
      console.log(`[bootstrap] ${userCount} user(s) already present — skipping seeders.`);
    }
  } catch (err) {
    console.error('[bootstrap] Seed check failed:', err.message);
    // Don't crash the boot over this — the app can still run against
    // whatever schema/data already exists.
  } finally {
    process.exit(0);
  }
})();
