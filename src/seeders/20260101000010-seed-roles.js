'use strict';
module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert('roles', [
      { name: 'admin', createdAt: now, updatedAt: now },
      { name: 'manager', createdAt: now, updatedAt: now },
      { name: 'employee', createdAt: now, updatedAt: now }
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('roles', null, {});
  }
};
