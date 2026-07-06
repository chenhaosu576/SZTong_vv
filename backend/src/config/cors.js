// config/cors.js
// CORS 中间件工厂。
// 职责:
//   - 默认全开放（保留与原 backend/index.js 同等行为）
//   - P0-2 锁定白名单策略后再加 origin 校验
// 使用方: src/app.js

const cors = require('cors');

module.exports = cors();
