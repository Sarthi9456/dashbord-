'use strict';
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const methodOverride = require('method-override');

router.use(requireAuth);
router.use(authorize('admin')); // Only Admin can create/edit/delete users & assign roles

router.get('/', userController.list);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.remove);

module.exports = router;
