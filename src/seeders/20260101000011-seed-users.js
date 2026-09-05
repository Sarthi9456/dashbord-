'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const roles = await queryInterface.sequelize.query('SELECT id, name FROM roles;', {
      type: queryInterface.sequelize.QueryTypes.SELECT
    });
    const roleId = (name) => roles.find((r) => r.name === name).id;

    const hash = (pwd) => bcrypt.hashSync(pwd, 10);

    await queryInterface.bulkInsert('users', [
      {
        name: 'Alice Admin',
        email: 'admin@example.com',
        password: hash('Admin@123'),
        roleId: roleId('admin'),
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Mike Manager',
        email: 'manager@example.com',
        password: hash('Manager@123'),
        roleId: roleId('manager'),
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Emma Employee',
        email: 'employee1@example.com',
        password: hash('Employee@123'),
        roleId: roleId('employee'),
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Ethan Employee',
        email: 'employee2@example.com',
        password: hash('Employee@123'),
        roleId: roleId('employee'),
        createdAt: now,
        updatedAt: now
      }
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};
