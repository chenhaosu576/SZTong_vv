// middlewares/logger.js
// 请求日志中间件（morgan 'dev' 格式）。
// 职责:
//   - 输出 METHOD path status time 形式日志（dev 着色）
//   - 仅 dev 使用；生产 P0-2 切 winston
// 使用方: src/app.js

const morgan = require('morgan');

module.exports = morgan('dev');
