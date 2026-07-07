// modules/content/content.service.js
// 静态内容三件套:home / faq / profile-demo。
// 失败抛 ApiError;成功返回 payload 整体。

const { HomeContent, FaqContent, ProfileDemoContent } = require('../../db/models');
const ApiError = require('../../utils/ApiError');

async function getHome() {
  const row = await HomeContent.findByPk(1);
  if (!row) throw new ApiError(40401, '首页内容不存在');
  return row.payload;
}

async function getFaq() {
  const row = await FaqContent.findByPk(1);
  if (!row) throw new ApiError(40401, '常见问题内容不存在');
  return row.payload;
}

async function getProfileDemo() {
  const row = await ProfileDemoContent.findByPk(1);
  if (!row) throw new ApiError(40401, '个人中心示例内容不存在');
  return row.payload;
}

module.exports = { getHome, getFaq, getProfileDemo };