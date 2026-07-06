// middlewares/auth.js
// JWT 鉴权 —— 解析 Authorization: Bearer <token>,挂 req.user = {id, email}
// 缺失 / 格式错 / verify 失败 → next(ApiError(40101))
//
// 使用方:需要登录的路由挂载,例如
//   router.get('/me', authMiddleware, asyncHandler(...))
//
// 注意:挂在 /api/v1/* 业务路由上,/api/chat、/api/analyze-image、/api/location 不挂。

const jwtUtil = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') {
    return next(new ApiError(40101, '未登录', 401));
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(40101, 'token 格式错误', 401));
  }

  try {
    const payload = jwtUtil.verify(token);
    req.user = { id: payload.id, email: payload.email };
    return next();
  } catch (err) {
    return next(err);
  }
};