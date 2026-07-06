// config/index.js
// 后端配置中心。
// 职责:
//   - 从 process.env 读取运行参数（PORT / NODE_ENV / AI_KEYS）
//   - 兼容旧 env 变量大小写（Deepseek_API_KEY / Minimax_API_KEY）
//   - API key 无默认值——必须从 .env 提供；缺失时服务调用会 500
//   - 不负责 schema 校验（P0-2 接 joi/zod 后再做）
// 使用方: src/server.js, src/modules/ai/*.service.js

function pickEnv(...keys) {
  for (const key of keys) {
    const val = process.env[key];
    if (val != null && val !== '') return val;
  }
  return '';
}

module.exports = {
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  AI_KEYS: {
    DEEPSEEK_API_KEY: pickEnv('DEEPSEEK_API_KEY', 'Deepseek_API_KEY'),
    MINIMAX_API_KEY: pickEnv('MINIMAX_API_KEY', 'Minimax_API_KEY'),
    BAIDU_MAP_AK: pickEnv('BAIDU_MAP_AK'),
  },
};
