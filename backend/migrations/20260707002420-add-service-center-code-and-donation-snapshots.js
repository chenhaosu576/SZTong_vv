// migrations/20260707002420-add-service-center-code-and-donation-snapshots.js
// 给 service_centers 加 code 字段（URL slug 用），
// 给 donation_orders 加 project_title / project_location 字段（项目快照，因为本轮不加 charity_projects 表）。
//
// 执行入口：npm run db:migrate
// 回滚入口：npm run db:migrate:undo（单步）
//
// 注意：code 字段最终为 NOT NULL UNIQUE，但已有 seed 数据（深圳市南山区测试站点）无 code 值。
// 分三步：（1）先以 NULL 加列；（2）backfill 已有行；（3）改 NOT NULL + UNIQUE。
// 合并为一次 migration 以便 sequelize-cli 事务回滚干净。

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) 先以 nullable 方式加 code 列（不设 UNIQUE，下面再加）
    await queryInterface.addColumn('service_centers', 'code', {
      type: Sequelize.STRING(60),
      allowNull: true,
      after: 'id',
    });

    // 2) 给已有 service_centers 行 backfill code（基于 id 拼一个稳定的 slug）
    await queryInterface.sequelize.query(
      `UPDATE service_centers
         SET code = CONCAT('legacy-', id)
       WHERE code IS NULL OR code = ''`
    );

    // 3) 改 code 为 NOT NULL + UNIQUE
    //    MySQL 8.0 不支持直接 change to nullable，用 changeColumn 走修改路径
    await queryInterface.changeColumn('service_centers', 'code', {
      type: Sequelize.STRING(60),
      allowNull: false,
      unique: true,
    });

    // 4) 给 donation_orders 加项目快照列（nullable，不影响已有行）
    await queryInterface.addColumn('donation_orders', 'project_title', {
      type: Sequelize.STRING(120),
      allowNull: true,
      after: 'charity_project_id',
    });

    await queryInterface.addColumn('donation_orders', 'project_location', {
      type: Sequelize.STRING(120),
      allowNull: true,
      after: 'project_title',
    });
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.removeColumn('donation_orders', 'project_location');
    await queryInterface.removeColumn('donation_orders', 'project_title');
    await queryInterface.removeColumn('service_centers', 'code');
  },
};
