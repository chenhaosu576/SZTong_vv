// db/models/siteStats.js
// 4 字段列(不是 JSON),将来 B 端可按字段改。
// 角色:TopBar 用的运营数字。

module.exports = (sequelize, DataTypes) => {
  const SiteStats = sequelize.define(
    'SiteStats',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      processedToday: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'processed_today',
      },
      activeSites: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'active_sites',
      },
      avgResponseHour: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0,
        field: 'avg_response_hour',
      },
      carbonReducedKg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'carbon_reduced_kg',
      },
    },
    {
      tableName: 'site_stats',
      timestamps: true,
      updatedAt: 'updated_at',
      createdAt: false,
    }
  );
  return SiteStats;
};