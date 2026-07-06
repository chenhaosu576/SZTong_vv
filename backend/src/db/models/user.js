// db/models/user.js
// 对应 SZTong.sql L30-L55。
// 表名 users；C 端用户主表。
// 启用 paranoid（deleted_at）：保留订单/积分流水对账可追溯。

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash',
      },
      displayName: {
        type: DataTypes.STRING(60),
        allowNull: false,
        field: 'display_name',
      },
      avatarUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'avatar_url',
      },
      city: {
        type: DataTypes.STRING(60),
        allowNull: true,
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        validate: { isIn: [[0, 1]] },
      },
      pointsBalance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'points_balance',
        validate: { min: 0 },
      },
      growthValue: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'growth_value',
        validate: { min: 0 },
      },
      carbonReductionTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'carbon_reduction_total',
        validate: { min: 0 },
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_login_at',
      },
    },
    {
      tableName: 'users',
      paranoid: true, // 启用软删，deleted_at 自动维护
    }
  );

  return User;
};