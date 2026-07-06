// db/models/admin.js
// 对应 SZTong.sql L103-L123。
// 表名 admins；B 端管理员 / 站长 / 客服。
// 不启用 paranoid：用 status 控制启停。
// FK：role_id → roles.id (RESTRICT), center_id → service_centers.id (SET NULL)。

module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define(
    'Admin',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash',
      },
      realName: {
        type: DataTypes.STRING(60),
        allowNull: false,
        field: 'real_name',
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      roleId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'role_id',
      },
      centerId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'center_id',
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        validate: { isIn: [[0, 1]] },
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_login_at',
      },
    },
    {
      tableName: 'admins',
    }
  );

  return Admin;
};