// db/models/role.js
// 对应 SZTong.sql L10-L18。
// 表名 roles；主键 id BIGINT UNSIGNED AUTO_INCREMENT。
// 角色字典（C 端用户没有 role，B 端 admins 关联）。
// 不启用 paranoid：字典数据用 status 控制上下线。

module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    'Role',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
    },
    {
      tableName: 'roles',
    }
  );

  return Role;
};