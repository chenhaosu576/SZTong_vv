// utils/asyncHandler.js
// wrap async route handlers so thrown errors propagate to error middleware
//
// 使用方:
//   router.post('/login', asyncHandler(async (req, res) => {
//     await authService.login(...);    // 抛 ApiError 自动 next(err)
//     res.json(ok(data));
//   }));

module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
