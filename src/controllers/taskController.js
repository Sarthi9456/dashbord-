'use strict';
const { Task, Project, User, Role } = require('../models');
const { Op } = require('sequelize');

exports.list = async (req, res) => {
  const { role, id } = req.session.user;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const statusFilter = req.query.status || '';
  const priorityFilter = req.query.priority || '';

  const where = {};
  if (search) where.title = { [Op.like]: `%${search}%` };
  if (statusFilter) where.status = statusFilter;
  if (priorityFilter) where.priority = priorityFilter;

  // Employees only ever see their own assigned tasks - enforced server-side
  if (role === 'employee') {
    where.assignedEmployeeId = id;
  }

  const { rows: tasks, count } = await Task.findAndCountAll({
    where,
    include: [
      { model: Project, as: 'project', attributes: ['id', 'name'] },
      { model: User, as: 'assignee', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  let projects = [];
  let employees = [];
  if (role === 'admin' || role === 'manager') {
    projects = await Project.findAll({ order: [['name', 'ASC']] });
    const employeeRole = await Role.findOne({ where: { name: 'employee' } });
    employees = await User.findAll({ where: { roleId: employeeRole.id } });
  }

  res.render('tasks/index', {
    title: role === 'employee' ? 'My Tasks' : 'Tasks',
    tasks,
    projects,
    employees,
    search,
    statusFilter,
    priorityFilter,
    currentPage: page,
    totalPages: Math.ceil(count / limit)
  });
};

exports.create = async (req, res) => {
  const { title, description, projectId, assignedEmployeeId, priority, dueDate, status } = req.body;
  try {
    if (!title || !projectId) {
      req.flash('error', 'Task title and project are required.');
      return res.redirect('/tasks');
    }
    await Task.create({
      title,
      description,
      projectId,
      assignedEmployeeId: assignedEmployeeId || null,
      priority: priority || 'Medium',
      dueDate: dueDate || null,
      status: status || 'Pending'
    });
    req.flash('success', 'Task created successfully.');
  } catch (err) {
    req.flash('error', err.errors ? err.errors.map((e) => e.message).join(', ') : 'Could not create task.');
  }
  res.redirect('/tasks');
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { title, description, projectId, assignedEmployeeId, priority, dueDate, status } = req.body;
  try {
    const task = await Task.findByPk(id);
    if (!task) {
      req.flash('error', 'Task not found.');
      return res.redirect('/tasks');
    }
    // Admin/Manager can edit everything; employees only reach here via updateStatus below
    task.title = title;
    task.description = description;
    task.projectId = projectId;
    task.assignedEmployeeId = assignedEmployeeId || null;
    task.priority = priority;
    task.dueDate = dueDate || null;
    task.status = status;
    await task.save();
    req.flash('success', 'Task updated successfully.');
  } catch (err) {
    req.flash('error', err.errors ? err.errors.map((e) => e.message).join(', ') : 'Could not update task.');
  }
  res.redirect('/tasks');
};

// Employees can ONLY change status of their own assigned tasks (enforced here, not just in UI)
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const task = await Task.findByPk(id);
    if (!task) {
      req.flash('error', 'Task not found.');
      return res.redirect('/tasks');
    }
    if (req.session.user.role === 'employee' && task.assignedEmployeeId !== req.session.user.id) {
      return res.status(403).render('errors/403', { title: 'Access Denied', user: req.session.user });
    }
    task.status = status;
    await task.save();
    req.flash('success', 'Task status updated.');
  } catch (err) {
    req.flash('error', 'Could not update task status.');
  }
  res.redirect('/tasks');
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await Task.destroy({ where: { id } });
    req.flash('success', 'Task deleted.');
  } catch (err) {
    req.flash('error', 'Could not delete task.');
  }
  res.redirect('/tasks');
};
