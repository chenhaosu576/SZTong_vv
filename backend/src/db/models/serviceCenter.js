// db/models/serviceCenter.js
// 对应 SZTong.sql L57-L76。
// 表名 service_centers；服务站字典，订单可派单到具体站点。
// 不启用 paranoid：用 status 控制上下线。

module.exports = (sequelize, DataTypes) => {
  const ServiceCenter = sequelize.define(
    'ServiceCenter',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      district: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true,
      },
      businessHours: {
        type: DataTypes.STRING(60),
        allowNull: true,
        field: 'business_hours',
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      coverImage: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'cover_image',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        validate: { isIn: [[0, 1]] },
      },
    },
    {
      tableName: 'service_centers',
    }
  );

  return ServiceCenter;
};