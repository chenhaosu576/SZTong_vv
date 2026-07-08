// db/models/serviceSlot.js
// 对应 SZTong.sql L157-175(走 sequelize migration 002 建表)。
// 表名 service_slots;可预约时段(中心 × 日期 × 时段)字典,订单后续可强引用 (center_id, service_date, period)。
// 不启用 paranoid:用 status 控制上下线,reserved_count 控制容量。

module.exports = (sequelize, DataTypes) => {
  const ServiceSlot = sequelize.define(
    'ServiceSlot',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      serviceCenterId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'service_center_id',
      },
      serviceDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'service_date',
      },
      period: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        validate: { min: 0 },
      },
      reservedCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'reserved_count',
        validate: { min: 0 },
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        validate: { isIn: [[0, 1]] },
      },
    },
    {
      tableName: 'service_slots',
    }
  );

  return ServiceSlot;
};
