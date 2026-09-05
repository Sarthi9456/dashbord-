'use strict';
module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define(
    'Project',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      endDate: {
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
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      tableName: 'projects',
      timestamps: true,
      paranoid: true
    }
  );

  Project.associate = (models) => {
    Project.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Project.hasMany(models.Task, { foreignKey: 'projectId', as: 'tasks' });
    Project.belongsToMany(models.User, {
      through: 'project_employees',
      foreignKey: 'projectId',
      otherKey: 'userId',
      as: 'employees'
    });
  };

  return Project;
};
