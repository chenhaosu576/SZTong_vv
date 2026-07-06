// modules/auth/auth.service.js
// 用户注册 / 登录 / 当前用户读取。
// 失败抛 ApiError;成功返回 {token, user}
// 使用方: modules/auth/routes.js

const { User } = require('../../db/models');
const passwordUtil = require('../../utils/password');
const jwtUtil = require('../../utils/jwt');
const ApiError = require('../../utils/ApiError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pickUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    pointsBalance: user.pointsBalance,
  };
}

async function register({ email, password, displayName }) {
  // 1. 校验
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ApiError(40001, '请输入有效邮箱');
  }
  if (!password || password.length < 6) {
    throw new ApiError(40001, '密码至少 6 位');
  }
  if (!displayName || !displayName.trim()) {
    throw new ApiError(40001, '昵称不能为空');
  }

  // 2. 查重
  const exists = await User.findOne({ where: { email } });
  if (exists) {
    throw new ApiError(40901, '该邮箱已注册');
  }

  // 3. 写库
  const passwordHash = await passwordUtil.hash(password);
  const user = await User.create({
    email,
    passwordHash,
    displayName: displayName.trim(),
    status: 1,
    pointsBalance: 0,
    growthValue: 0,
    carbonReductionTotal: 0,
  });

  // 4. 签 token
  const token = jwtUtil.sign({ id: user.id, email: user.email });
  return { token, user: pickUserPayload(user) };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new ApiError(40001, '请输入邮箱和密码');
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new ApiError(40101, '邮箱或密码错误');
  }
  if (user.status !== 1) {
    throw new ApiError(40301, '账号已被禁用');
  }

  const ok = await passwordUtil.compare(password, user.passwordHash);
  if (!ok) {
    throw new ApiError(40101, '邮箱或密码错误');
  }

  // 更新 lastLoginAt(可选,失败不阻塞登录)
  user.lastLoginAt = new Date();
  await user.save({ fields: ['lastLoginAt'] });

  const token = jwtUtil.sign({ id: user.id, email: user.email });
  return { token, user: pickUserPayload(user) };
}

async function fetchMe(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ApiError(40101, '用户不存在');
  }
  if (user.status !== 1) {
    throw new ApiError(40301, '账号已被禁用');
  }
  return pickUserPayload(user);
}

module.exports = { register, login, fetchMe };