// migrations/20260708000100-add-reserved-lte-capacity-check.js
// 补 migration 002 (20260708000000-create-service-slots.js) 漏掉的第 4 个 CHECK 约束。
// spec docs/superpowers/specs/2026-07-08-service-centers-slots-design.md §3.1 line 52
// 和 SZTong.sql line 174 都列出了 chk_service_slots_reserved_lte_capacity
// (reserved_count <= capacity),但当时 migration 代码块只落了 3 个 CHECK。
//
// 这是 DB 层最关键的不变量 —— 防止 reserved_count 超过 capacity 造成"超预约"。
//
// 执行入口:npm run db:migrate
// 回滚入口:npm run db:migrate:undo(单步)

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint('service_slots', {
      fields: ['reserved_count'],
      type: 'check',
      name: 'chk_service_slots_reserved_lte_capacity',
      where: { reserved_count: { [Sequelize.Op.lte]: Sequelize.col('capacity') } },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('service_slots', 'chk_service_slots_reserved_lte_capacity');
  },
};