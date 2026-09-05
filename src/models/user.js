'use strict';
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
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
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      tableName: 'users',
      timestamps: true,
      paranoid: true, // soft delete
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        }
      }
    }
  );

  User.prototype.checkPassword = function (plain) {
    return bcrypt.compare(plain, this.password);
  };

  User.associate = (models) => {
    User.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
    User.hasMany(models.Project, { foreignKey: 'createdBy', as: 'createdProjects' });
    User.hasMany(models.Task, { foreignKey: 'assignedEmployeeId', as: 'assignedTasks' });
    User.belongsToMany(models.Project, {
      through: 'project_employees',
      foreignKey: 'userId',
      otherKey: 'projectId',
      as: 'projects'
    });
  };

  return User;
};
