'use strict';
const { User, Project, Task, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.showDashboard = async (req, res) => {
  const { id, role } = req.session.user;
  const stats = {};

  if (role === 'admin' || role === 'manager') {
    stats.totalUsers = await User.count();
    stats.totalProjects = await Project.count();
    stats.activeProjects = await Project.count({ where: { status: 'In Progress' } });
    stats.pendingTasks = await Task.count({ where: { status: 'Pending' } });
    stats.completedTasks = await Task.count({ where: { status: 'Completed' } });
    stats.inProgressTasks = await Task.count({ where: { status: 'In Progress' } });

    // Recent projects (managers see everything; admin too, per requirements admin/manager both view stats)
    stats.recentProjects = await Project.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });
  } else {
    // Employee: only their own assigned tasks/projects
    stats.myTasks = await Task.count({ where: { assignedEmployeeId: id } });
    stats.pendingTasks = await Task.count({ where: { assignedEmployeeId: id, status: 'Pending' } });
    stats.inProgressTasks = await Task.count({
      where: { assignedEmployeeId: id, status: 'In Progress' }
    });
    stats.completedTasks = await Task.count({
      where: { assignedEmployeeId: id, status: 'Completed' }
    });

    const myProjects = await Project.findAll({
      include: [{ model: User, as: 'employees', where: { id }, attributes: [] }]
    });
    stats.myProjectsCount = myProjects.length;
    stats.myProjects = myProjects;
  }

  res.render('dashboard/index', {
    title: 'Dashboard',
    stats
  });
};
