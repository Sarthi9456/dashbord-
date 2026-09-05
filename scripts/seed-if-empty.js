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
const { User, sequelize } = require('../src/models');

(async () => {
  try {
    const { host, port, database, username } = sequelize.config;
    console.log('[bootstrap] DB dialect:', sequelize.getDialect());
    console.log(`[bootstrap] DB target: ${username}@${host}:${port}/${database}`);
    console.log('[bootstrap] Process cwd:', process.cwd());

    await sequelize.authenticate();
    console.log('[bootstrap] DB connection OK.');

    const userCount = await User.count();
    console.log(`[bootstrap] Current user count: ${userCount}`);

    if (userCount === 0) {
      console.log('[bootstrap] No users found — running seeders...');
      execSync('npx sequelize-cli db:seed:all', { stdio: 'inherit' });
      const afterCount = await User.count();
      console.log(`[bootstrap] User count after seeding: ${afterCount}`);
      if (afterCount === 0) {
        throw new Error('Seeders ran but user count is still 0 — seeding did not actually insert data.');
      }
    } else {
      console.log(`[bootstrap] ${userCount} user(s) already present — skipping seeders.`);
    }
    process.exit(0);
  } catch (err) {
    // Fail LOUDLY and stop the boot. A server that starts with a broken/empty
    // database is worse than a deploy that clearly fails with a readable
    // error in the logs.
    console.error('[bootstrap] FATAL: seed/bootstrap step failed.');
    console.error(err);
    process.exit(1);
  }
})();
