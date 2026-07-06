// __tests__/integration/teardown.js
// Jest globalTeardown: 关闭 sequelize 连接

const { sequelize } = require('../../src/config/db');

module.exports = async () => {
  await sequelize.close();
};
