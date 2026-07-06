// middlewares/error.js
// 全局错误处理中间件。
// 职责:
//   - 接住 routes/services 抛出的 next(err)
//   - 行为同原 backend/index.js：console.error + 500 JSON { error: msg }
//   - ApIError class 与统一响应包装留到 P0-2
// 使用方: src/app.js 末尾注册

module.exports = function errorMiddleware(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err && err.message ? err.message : err);
  if (res.headersSent) return next(err);
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: (err && err.message) || '服务器内部错误' });
};
