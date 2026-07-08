// migrations/20260708000000-create-service-slots.js
// service_slots 表:每个 (service_center, service_date, period) 一行。
// 容量 = capacity;已预约数 = reserved_count;status=1 启用 / 0 下线。
// 唯一键保证 (center, date, period) 不重复,FK ON DELETE CASCADE 跟 service_centers 联动。
//
// 执行入口:npm run db:migrate
// 回滚入口:npm run db:migrate:undo(单步)
//
// 注:本表不在 001-init-core-tables.sql bootstrap 里(那是 7 张核心表的一次性脚本),
// 后续 schema 变更都走 sequelize-cli migration。capacity 默认 3 而不是 SZTong.sql 草稿的 0,
// 是因为 0 容量毫无业务意义;seeder 004 也会显式传 capacity=3,二者一致。

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('service_slots', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      service_center_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      service_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      period: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      reserved_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('service_slots', {
      fields: ['service_center_id', 'service_date', 'period'],
      unique: true,
      name: 'uk_service_slots_center_date_period',
    });
    await queryInterface.addIndex('service_slots', {
      fields: ['service_date', 'status'],
      name: 'idx_service_slots_date_status',
    });

    await queryInterface.addConstraint('service_slots', {
      fields: ['service_center_id'],
      type: 'foreign key',
      name: 'fk_service_slots_center_id',
      references: { table: 'service_centers', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('service_slots', {
      fields: ['capacity'],
      type: 'check',
      name: 'chk_service_slots_capacity',
      where: { capacity: { [Sequelize.Op.gte]: 0 } },
    });
    await queryInterface.addConstraint('service_slots', {
      fields: ['reserved_count'],
      type: 'check',
      name: 'chk_service_slots_reserved_count',
      where: { reserved_count: { [Sequelize.Op.gte]: 0 } },
    });
    await queryInterface.addConstraint('service_slots', {
      fields: ['status'],
      type: 'check',
      name: 'chk_service_slots_status',
      where: { status: { [Sequelize.Op.in]: [0, 1] } },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('service_slots');
  },
};