// db/models/profileDemoContent.js
// 单行 JSON 表(始终 id=1)。
// 角色:ProfilePage 的 tracks / weeklyTrend / badges / menu 等静态 demo 数据。

module.exports = (sequelize, DataTypes) => {
  const ProfileDemoContent = sequelize.define(
    'ProfileDemoContent',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      tableName: 'profile_demo_content',
      timestamps: true,
      updatedAt: 'updated_at',
      createdAt: false,
    }
  );
  return ProfileDemoContent;
};