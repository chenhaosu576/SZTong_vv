// db/models/donationOrder.js
// 对应 SZTong.sql L233-L251（精简版：去掉 charity_project_id 的 NOT NULL + FK，
// 因 charity_projects 不在 P0 7 张表范围；P1 加表后通过 sequelize-cli migration 补 FK）。
// 表名 donation_orders；捐赠订单子表（与 orders 1:1）。
// 不启用 paranoid。
// FK：order_id → orders.id (CASCADE)。

module.exports = (sequelize, DataTypes) => {
  const DonationOrder = sequelize.define(
    'DonationOrder',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        unique: true,
        field: 'order_id',
      },
      charityProjectId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'charity_project_id',
      },
      itemType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'item_type',
      },
      itemName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'item_name',
      },
      quantityText: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'quantity_text',
      },
      weightText: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'weight_text',
      },
      conditionText: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'condition_text',
      },
      logisticsType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'logistics_type',
      },
    },
    {
      tableName: 'donation_orders',
    }
  );

  return DonationOrder;
};