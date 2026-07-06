// middlewares/error.js
// 全局错误处理中间件。
// 职责:
//   - 接住 routes/services 抛出的 next(err)
//   - ApiError → 序列化为统一响应 {code, message, data: null},httpStatus 用 ApiError.httpStatus
//   - 其他 Error → 500 + {code: 50001, message, data: null}
//   - headers 已发送 → 交给 Express 默认 handler
// 使用方: src/app.js 末尾注册

const ApiError = require('../utils/ApiError');

module.exports = function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err);

  // ApiError 走统一响应
  if (err instanceof ApiError) {
    // eslint-disable-next-line no-console
    if (err.httpStatus >= 500) console.error(err.message);
    return res.status(err.httpStatus).json({
      code: err.code,
      message: err.message,
      data: null,
    });
  }

  // 其他异常 → 50001
  // eslint-disable-next-line no-console
  console.error('[error]', err && err.stack ? err.stack : err);
  return res.status(500).json({
    code: 50001,
    message: (err && err.message) || '服务器内部错误',
    data: null,
  });
};