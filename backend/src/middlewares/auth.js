// middlewares/auth.js
// JWT 校验 —— 【占位】。
// 职责:
//   - 占位文件，导出与未来 auth-service 同形的 verifyJwt(req, res, next)
//   - 实际 JWT 解析（Authorization: Bearer xxx → req.user）推迟到 P0-2
// 使用方: 暂未挂载；P0-2 业务路由引入

module.exports = function verifyJwt(req, res, next) {
  // TODO (P0-2): parse Authorization header, verify jwt, attach req.user
  return next();
};
