// db/config.js
// sequelize-cli 专用 config（独立进程使用，不走 src/config/index.js）。
// 职责:
//   - 顶部 require('dotenv') 加载 .env（sequelize-cli 不会自动 load）
//   - 从 process.env 直读 DB_*
//   - export { development, test, production } 三块
// 使用方: sequelize-cli db:migrate / db:seed

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

function buildConfig(env) {
  return {
    dialect: process.env.DB_DIALECT || 'mysql',
    host:    process.env.DB_HOST || '127.0.0.1',
    port:    parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'sztong',
    logging:  process.env.DB_LOGGING === 'true' ? console.log : false,
    timezone: process.env.DB_TIMEZONE || '+08:00',
  };
}

module.exports = {
  development: buildConfig('development'),
  test:        buildConfig('test'),
  production:  buildConfig('production'),
};