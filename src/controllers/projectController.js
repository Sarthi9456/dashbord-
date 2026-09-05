'use strict';
const { Project, User, Role, Task } = require('../models');
const { Op } = require('sequelize');

exports.list = async (req, res) => {
  const { role, id } = req.session.user;
  const page = parseInt(req.query.page) || 1;
  const limit = 8;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const statusFilter = req.query.status || '';

  const where = {};
  if (search) where.name = { [Op.like]: `%${search}%` };
  if (statusFilter) where.status = statusFilter;

  let include = [
    { model: User, as: 'creator', attributes: ['id', 'name'] },
    { model: User, as: 'employees', attributes: ['id', 'name'], through: { attributes: [] } }
  ];

  // Employees only ever see projects they're assigned to
  if (role === 'employee') {
    include[1] = {
      model: User,
      as: 'employees',
      attributes: ['id', 'name'],
      through: { attributes: [] },
      where: { id },
      required: true
    };
  }

  const { rows: projects, count } = await Project.findAndCountAll({
    where,
    include,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true
  });

  let employees = [];
  if (role === 'admin' || role === 'manager') {
    const employeeRole = await Role.findOne({ where: { name: 'employee' } });
    employees = await User.findAll({ where: { roleId: employeeRole.id } });
  }

  res.render('projects/index', {
    title: 'Projects',
    projects,
    employees,
    search,
    statusFilter,
    currentPage: page,
    totalPages: Math.ceil(count / limit)
  });
};

exports.create = async (req, res) => {
  const { name, description, startDate, endDate, status, employeeIds } = req.body;
  try {
    if (!name || !startDate) {
      req.flash('error', 'Project name and start date are required.');
      return res.redirect('/projects');
    }
    const project = await Project.create({
      name,
      description,
      startDate,
      endDate: endDate || null,
      status: status || 'Pending',
      createdBy: req.session.user.id
    });
    const ids = [].concat(employeeIds || []).filter(Boolean);
    if (ids.length) await project.setEmployees(ids);
    req.flash('success', 'Project created successfully.');
  } catch (err) {
    req.flash('error', err.errors ? err.errors.map((e) => e.message).join(', ') : 'Could not create project.');
  }
  res.redirect('/projects');
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, description, startDate, endDate, status, employeeIds } = req.body;
  try {
    const project = await Project.findByPk(id);
    if (!project) {
      req.flash('error', 'Project not found.');
      return res.redirect('/projects');
    }
    project.name = name;
    project.description = description;
    project.startDate = startDate;
    project.endDate = endDate || null;
    project.status = status;
    await project.save();
    const ids = [].concat(employeeIds || []).filter(Boolean);
    await project.setEmployees(ids);
    req.flash('success', 'Project updated successfully.');
  } catch (err) {
    req.flash('error', err.errors ? err.errors.map((e) => e.message).join(', ') : 'Could not update project.');
  }
  res.redirect('/projects');
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await Task.destroy({ where: { projectId: id } });
    await Project.destroy({ where: { id } }); // soft delete
    req.flash('success', 'Project deleted.');
  } catch (err) {
    req.flash('error', 'Could not delete project.');
  }
  res.redirect('/projects');
};
