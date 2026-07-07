// migrations/20260707153744-content-and-profile-tables.js
// 把第二批内容/统计/Profile demo 数据落到数据库:
//   - users 加 level_text VARCHAR(60) NULL(由 seeder 002 + 注册默认值 null 兜底)
//   - home_content / faq_content / profile_demo_content: 单行 JSON 表(id=1)
//   - site_stats: 4 字段列(将来 B 端可改)
//
// 全部走标准 Sequelize DataTypes;JSON 列在 MySQL 8.0 上以 JSON 类型落地。

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // users 加 level_text
    await queryInterface.addColumn('users', 'level_text', {
      type: Sequelize.STRING(60),
      allowNull: true,
      after: 'growth_value',
    });

    // home_content:单行 JSON
    await queryInterface.createTable('home_content', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // faq_content
    await queryInterface.createTable('faq_content', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // site_stats:列级字段(等 B 端运营改)
    await queryInterface.createTable('site_stats', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      processed_today: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      active_sites: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      avg_response_hour: {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0,
      },
      carbon_reduced_kg: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // profile_demo_content:单行 JSON
    await queryInterface.createTable('profile_demo_content', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.dropTable('profile_demo_content');
    await queryInterface.dropTable('site_stats');
    await queryInterface.dropTable('faq_content');
    await queryInterface.dropTable('home_content');
    await queryInterface.removeColumn('users', 'level_text');
  },
};
