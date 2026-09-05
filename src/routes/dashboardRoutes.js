'use strict';
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

// All authenticated roles can view a dashboard, but the STATS shown differ by role
// (handled inside the controller). This satisfies: Admin & Manager view dashboard
// statistics, Employee views only their own assigned data.
router.get('/dashboard', requireAuth, dashboardController.showDashboard);

module.exports = router;
