// db/models/homeContent.js
// 单行 JSON 表(始终 id=1)。
// 角色:HomePage 的 hero / heroStats / principleRail / cityStages / institutionSteps / contacts。

module.exports = (sequelize, DataTypes) => {
  const HomeContent = sequelize.define(
    'HomeContent',
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
      tableName: 'home_content',
      timestamps: true,
      updatedAt: 'updated_at',
      createdAt: false,
    }
  );
  return HomeContent;
};