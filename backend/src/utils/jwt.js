// utils/jwt.js
// JWT 签发 / 校验。
// secret 与 expiresIn 来自 process.env(由 config/index.js 透传);缺失时启动期报错。
//
// 使用方:
//   - modules/auth/auth.service.js: 签发登录/注册 token
//   - middlewares/auth.js: 解析 Authorization Bearer

const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('./ApiError');

exports.sign = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

exports.verify = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (e) {
    throw new ApiError(40101, 'token 失效或已过期', 401);
  }
};
