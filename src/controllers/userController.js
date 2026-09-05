'use strict';
const { User, Role } = require('../models');
const { Op } = require('sequelize');

exports.list = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  const where = search
    ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      }
    : {};

  const { rows: users, count } = await User.findAndCountAll({
    where,
    include: [{ model: Role, as: 'role' }],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  const roles = await Role.findAll();

  res.render('users/index', {
    title: 'Manage Users',
    users,
    roles,
    search,
    currentPage: page,
    totalPages: Math.ceil(count / limit)
  });
};

exports.create = async (req, res) => {
  const { name, email, password, roleId } = req.body;
  try {
    if (!name || !email || !password || !roleId) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/users');
    }
    await User.create({ name, email, password, roleId });
    req.flash('success', 'User created successfully.');
  } catch (err) {
    req.flash('error', err.errors ? err.errors.map((e) => e.message).join(', ') : 'Could not create user.');
  }
  res.redirect('/users');
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, email, roleId, password } = req.body;
  try {
    const user = await User.findByPk(id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/users');
    }
    user.name = name;
    user.email = email;
    user.roleId = roleId;
    if (password && password.trim() !== '') {
      user.password = password;
    }
    await user.save();
    req.flash('success', 'User updated successfully.');
  } catch (err) {
    req.flash('error', err.errors ? err.errors.map((e) => e.message).join(', ') : 'Could not update user.');
  }
  res.redirect('/users');
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.session.user.id) {
    req.flash('error', 'You cannot delete your own account.');
    return res.redirect('/users');
  }
  try {
    await User.destroy({ where: { id } }); // soft delete (paranoid: true)
    req.flash('success', 'User deleted.');
  } catch (err) {
    req.flash('error', 'Could not delete user.');
  }
  res.redirect('/users');
};
