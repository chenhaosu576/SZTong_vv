// db/models/index.js
// Sequelize Models 入口。
// 职责:
//   - 引入所有 Model（按 FK 依赖顺序）
//   - 注册 Model 间关联关系（hasMany / belongsTo / hasOne）
//   - 导出 { sequelize, Sequelize, <每个 Model> }
// 使用方:
//   - src/modules/* 业务模块直接 require('../db/models').User
//   - seeders 通过此入口拿 Model 做 findOrCreate

const { sequelize, Sequelize } = require('../../config/db');

const Role          = require('./role')(sequelize, Sequelize.DataTypes);
const ServiceCenter = require('./serviceCenter')(sequelize, Sequelize.DataTypes);
const User          = require('./user')(sequelize, Sequelize.DataTypes);
const Admin         = require('./admin')(sequelize, Sequelize.DataTypes);
const Order         = require('./order')(sequelize, Sequelize.DataTypes);
const RecycleOrder  = require('./recycleOrder')(sequelize, Sequelize.DataTypes);
const DonationOrder = require('./donationOrder')(sequelize, Sequelize.DataTypes);
const { CharityProject, CharityProjectNeed } = require('./charityProject')(sequelize, Sequelize.DataTypes);
const HomeContent        = require('./homeContent')(sequelize, Sequelize.DataTypes);
const FaqContent         = require('./faqContent')(sequelize, Sequelize.DataTypes);
const SiteStats          = require('./siteStats')(sequelize, Sequelize.DataTypes);
const ProfileDemoContent = require('./profileDemoContent')(sequelize, Sequelize.DataTypes);

// ============ 关联关系 ============

// User 1 → N Order
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ServiceCenter 1 → N Order
ServiceCenter.hasMany(Order, { foreignKey: 'serviceCenterId', as: 'orders' });
Order.belongsTo(ServiceCenter, { foreignKey: 'serviceCenterId', as: 'serviceCenter' });

// Admin 1 → N Order（as courier）
Admin.hasMany(Order, { foreignKey: 'courierId', as: 'orders' });
Order.belongsTo(Admin, { foreignKey: 'courierId', as: 'courier' });

// Order 1 → 1 RecycleOrder
Order.hasOne(RecycleOrder, { foreignKey: 'orderId', as: 'recycleDetail' });
RecycleOrder.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Order 1 → 1 DonationOrder
Order.hasOne(DonationOrder, { foreignKey: 'orderId', as: 'donationDetail' });
DonationOrder.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Role 1 → N Admin
Role.hasMany(Admin, { foreignKey: 'roleId', as: 'admins' });
Admin.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// Admin N → 1 ServiceCenter（业务侧关联；FK 在 SQL 层已建立）
Admin.belongsTo(ServiceCenter, { foreignKey: 'centerId', as: 'center' });

module.exports = {
  sequelize,
  Sequelize,
  Role,
  ServiceCenter,
  User,
  Admin,
  Order,
  RecycleOrder,
  DonationOrder,
  CharityProject,
  CharityProjectNeed,
    HomeContent,
    FaqContent,
    SiteStats,
    ProfileDemoContent,
};
