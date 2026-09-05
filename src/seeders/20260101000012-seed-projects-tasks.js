'use strict';
module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const users = await queryInterface.sequelize.query('SELECT id, email FROM users;', {
      type: queryInterface.sequelize.QueryTypes.SELECT
    });
    const idOf = (email) => users.find((u) => u.email === email).id;

    await queryInterface.bulkInsert('projects', [
      {
        id: 1,
        name: 'Website Revamp',
        description: 'Redesign the company marketing website.',
        startDate: '2026-01-10',
        endDate: '2026-03-15',
        status: 'In Progress',
        createdBy: idOf('manager@example.com'),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 2,
        name: 'Mobile App Launch',
        description: 'Build and launch v1 of the mobile app.',
        startDate: '2026-02-01',
        endDate: '2026-06-30',
        status: 'Pending',
        createdBy: idOf('admin@example.com'),
        createdAt: now,
        updatedAt: now
      }
    ]);

    await queryInterface.bulkInsert('project_employees', [
      { projectId: 1, userId: idOf('employee1@example.com'), createdAt: now, updatedAt: now },
      { projectId: 1, userId: idOf('employee2@example.com'), createdAt: now, updatedAt: now },
      { projectId: 2, userId: idOf('employee1@example.com'), createdAt: now, updatedAt: now }
    ]);

    await queryInterface.bulkInsert('tasks', [
      {
        title: 'Design homepage mockup',
        description: 'Create Figma mockup for the new homepage.',
        projectId: 1,
        assignedEmployeeId: idOf('employee1@example.com'),
        priority: 'High',
        dueDate: '2026-01-25',
        status: 'In Progress',
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Set up CI pipeline',
        description: 'Configure GitHub Actions for build/test.',
        projectId: 1,
        assignedEmployeeId: idOf('employee2@example.com'),
        priority: 'Medium',
        dueDate: '2026-02-05',
        status: 'Pending',
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Draft app wireframes',
        description: 'Low-fidelity wireframes for core screens.',
        projectId: 2,
        assignedEmployeeId: idOf('employee1@example.com'),
        priority: 'Medium',
        dueDate: '2026-02-20',
        status: 'Pending',
        createdAt: now,
        updatedAt: now
      }
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('tasks', null, {});
    await queryInterface.bulkDelete('project_employees', null, {});
    await queryInterface.bulkDelete('projects', null, {});
  }
};
