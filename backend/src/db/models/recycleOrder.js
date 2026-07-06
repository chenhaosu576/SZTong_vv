// db/models/recycleOrder.js
// 对应 SZTong.sql L218-L231。
// 表名 recycle_orders；回收订单子表（与 orders 1:1）。
// 不启用 paranoid。
// FK：order_id → orders.id (CASCADE)。

module.exports = (sequelize, DataTypes) => {
  const RecycleOrder = sequelize.define(
    'RecycleOrder',
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
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      weightBand: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'weight_band',
      },
      itemImages: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'item_images',
      },
      pickupCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'pickup_code',
      },
    },
    {
      tableName: 'recycle_orders',
    }
  );

  return RecycleOrder;
};