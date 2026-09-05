'use strict';
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(requireAuth);

// All roles can view tasks (employees only see their own - enforced in controller)
router.get('/', authorize('admin', 'manager', 'employee'), taskController.list);

// Only Admin & Manager can create/fully edit/delete tasks
router.post('/', authorize('admin', 'manager'), taskController.create);
router.put('/:id', authorize('admin', 'manager'), taskController.update);
router.delete('/:id', authorize('admin', 'manager'), taskController.remove);

// All roles can update status, but only on tasks that belong to them if Employee
// (ownership check happens inside the controller, not just the route)
router.patch('/:id/status', authorize('admin', 'manager', 'employee'), taskController.updateStatus);

module.exports = router;
