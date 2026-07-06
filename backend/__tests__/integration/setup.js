// __tests__/integration/setup.js
// Jest globalSetup: 加载 .env.test,跑 migration 建表

require('dotenv').config({ path: '.env.test' });

const { sequelize } = require('../../src/config/db');

module.exports = async () => {
  await sequelize.sync({ force: true });
};
