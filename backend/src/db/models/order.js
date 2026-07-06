// db/models/order.js
// 对应 SZTong.sql L177-L216。
// 表名 orders；回收 / 捐赠订单主表（按 order_type 区分）。
// 不启用 paranoid：状态机管理生命周期。
// FK：user_id (RESTRICT), service_center_id (SET NULL), courier_id (SET NULL → admins.id)。

module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    'Order',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      orderNo: {
        type: DataTypes.STRING(32),
        allowNull: false,
        unique: true,
        field: 'order_no',
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'user_id',
      },
      orderType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'order_type',
        validate: { isIn: [['recycle', 'donation']] },
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      serviceCenterId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'service_center_id',
      },
      courierId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'courier_id',
      },
      contactName: {
        type: DataTypes.STRING(60),
        allowNull: false,
        field: 'contact_name',
      },
      contactPhone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'contact_phone',
      },
      addressSnapshot: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'address_snapshot',
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true,
      },
      scheduledDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'scheduled_date',
      },
      scheduledPeriod: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: 'scheduled_period',
      },
      estimatedWeight: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        field: 'estimated_weight',
        validate: { min: 0 },
      },
      actualWeight: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        field: 'actual_weight',
        validate: { min: 0 },
      },
      estimatedPoints: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'estimated_points',
        validate: { min: 0 },
      },
      grantedPoints: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'granted_points',
        validate: { min: 0 },
      },
      note: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      cancelReason: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'cancel_reason',
      },
    },
    {
      tableName: 'orders',
    }
  );

  return Order;
};