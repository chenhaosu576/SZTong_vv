// db/models/charityProject.js
// 对应 SZTong.sql L78-L101 (charity_projects) + L269-L281 (charity_project_needs)
//
// 字段: id, title, location, region, tag, status,
//       urgentDaysThreshold, currentProgress, targetProgress, progressUnit,
//       beneficiary, coverImage, description, createdAt, updatedAt (Project)
//       id, charityProjectId, title, description, sortOrder (Need)
//
// 关联: Project 1 → N Need (as 'needs'); Need N → 1 Project (as 'project')
// 使用方: modules/charity/charity.service.js; modules/orders/orders.service.js (listOrders nested include)

module.exports = (sequelize, DataTypes) => {
  const CharityProject = sequelize.define(
    'CharityProject',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING(120), allowNull: false },
      location: { type: DataTypes.STRING(120), allowNull: true },
      region: { type: DataTypes.STRING(60), allowNull: true },
      tag: { type: DataTypes.STRING(30), allowNull: true },
      status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
      urgentDaysThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      currentProgress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      targetProgress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      progressUnit: { type: DataTypes.STRING(20), allowNull: true },
      beneficiary: { type: DataTypes.STRING(120), allowNull: true },
      coverImage: { type: DataTypes.STRING(255), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'charity_projects' },
  );

  const CharityProjectNeed = sequelize.define(
    'CharityProjectNeed',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      charityProjectId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      title: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'charity_project_needs' },
  );

  CharityProject.hasMany(CharityProjectNeed, { foreignKey: 'charityProjectId', as: 'needs' });
  CharityProjectNeed.belongsTo(CharityProject, { foreignKey: 'charityProjectId', as: 'project' });

  return { CharityProject, CharityProjectNeed };
};