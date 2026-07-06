// config/index.js
// 后端配置中心。
// 职责:
//   - 从 process.env 读取运行参数（PORT / NODE_ENV / AI_KEYS / DB）
//   - 兼容旧 env 变量大小写（Deepseek_API_KEY / Minimax_API_KEY）
//   - API key 无默认值——必须从 .env 提供；缺失时服务调用会 500
//   - 不负责 schema 校验（P0-2 接 joi/zod 后再做）
// 使用方: src/server.js, src/modules/ai/*.service.js, src/config/db.js

function pickEnv(...keys) {
  for (const key of keys) {
    const val = process.env[key];
    if (val != null && val !== '') return val;
  }
  return '';
}

function intEnv(key, def) {
  const v = process.env[key];
  if (v == null || v === '') return def;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function boolEnv(key, def) {
  const v = process.env[key];
  if (v == null || v === '') return def;
  return v === 'true' || v === '1';
}

module.exports = {
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  AI_KEYS: {
    DEEPSEEK_API_KEY: pickEnv('DEEPSEEK_API_KEY', 'Deepseek_API_KEY'),
    MINIMAX_API_KEY: pickEnv('MINIMAX_API_KEY', 'Minimax_API_KEY'),
    BAIDU_MAP_AK: pickEnv('BAIDU_MAP_AK'),
  },
  db: {
    host:     process.env.DB_HOST || '127.0.0.1',
    port:     intEnv('DB_PORT', 3306),
    name:     process.env.DB_NAME || 'sztong',
    user:     process.env.DB_USER || 'root',
    pass:     process.env.DB_PASS || '',
    dialect:  process.env.DB_DIALECT || 'mysql',
    poolMax:  intEnv('DB_POOL_MAX', 10),
    poolMin:  intEnv('DB_POOL_MIN', 0),
    logging:  boolEnv('DB_LOGGING', false),
    timezone: process.env.DB_TIMEZONE || '+08:00',
  },
};
