// config/db.js
// Sequelize 单例（运行期使用）。
// 职责:
//   - 构造 Sequelize 实例（不立即连接；连接在 authenticate() 时发生）
//   - 与 sequelize-cli 共享 dialect/pool/timezone，但走 config/index.js 而非直读 env
//   - 全局 define 默认：timestamps + underscored + freezeTableName=false
// 使用方:
//   - src/app.js 顶部 require() 触发实例构造
//   - src/server.js 启动期 .authenticate()
//   - src/db/models/*.js 引用 Sequelize.DataTypes

const { Sequelize } = require('sequelize');
const config = require('./index');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.pass, {
  host: config.db.host,
  port: config.db.port,
  dialect: config.db.dialect,
  pool: {
    max: config.db.poolMax,
    min: config.db.poolMin,
  },
  timezone: config.db.timezone,
  logging: config.db.logging ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: false,
    paranoid: false,
  },
});

module.exports = { sequelize, Sequelize };
