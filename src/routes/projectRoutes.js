'use strict';
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { requireAuth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(requireAuth);

// All 3 roles can VIEW projects (employees only see their own - enforced in controller)
router.get('/', authorize('admin', 'manager', 'employee'), projectController.list);

// Only Admin & Manager can create/edit/delete projects - enforced server-side,
// so an Employee typing the URL directly gets a 403, not just a hidden button.
router.post('/', authorize('admin', 'manager'), projectController.create);
router.put('/:id', authorize('admin', 'manager'), projectController.update);
router.delete('/:id', authorize('admin', 'manager'), projectController.remove);

module.exports = router;
