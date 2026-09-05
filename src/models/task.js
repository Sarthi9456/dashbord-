'use strict';
module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define(
    'Task',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      projectId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      assignedEmployeeId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      priority: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Medium',
        validate: {
          isIn: [['Low', 'Medium', 'High']]
        }
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Pending',
        validate: {
          isIn: [['Pending', 'In Progress', 'Completed']]
        }
      }
    },
    {
      tableName: 'tasks',
      timestamps: true,
      paranoid: true
    }
  );

  Task.associate = (models) => {
    Task.belongsTo(models.Project, { foreignKey: 'projectId', as: 'project' });
    Task.belongsTo(models.User, { foreignKey: 'assignedEmployeeId', as: 'assignee' });
  };

  return Task;
};
