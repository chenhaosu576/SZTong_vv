// utils/response.js
// 统一响应包装。
// 业务成功:res.json(ok({...})); 业务失败:throw new ApiError(code, msg);
//   ok() 返回的 code 永远是 0
//   fail() 直接构造 ApiError(throw 后由 error middleware 序列化)

const ApiError = require('./ApiError');

const ok = (data = null) => ({ code: 0, message: 'ok', data });

const fail = (code, message, httpStatus = 400) =>
  new ApiError(code, message, httpStatus);

module.exports = { ok, fail };
