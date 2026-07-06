// utils/ApiError.js
// 业务异常类 —— service / middleware 用 throw new ApiError(code, msg, httpStatus?)
// error middleware 会捕获并序列化为统一响应 {code, message, data: null}
//
// httpStatus 默认根据 code 自动派生:
//   40001-40999 → 400
//   40101-40199 → 401
//   40301-40399 → 403
//   40401-40499 → 404
//   40901-40999 → 409
//   50001-50999 → 500
// 显式传 httpStatus 会覆盖派生值。
//
// 使用方:
//   - modules/*/routes.js 抛参数校验错误
//   - modules/*/*.service.js 抛业务错误(用户禁用、邮箱冲突等)
//   - middlewares/auth.js 抛 40101

const CODE_TO_HTTP_STATUS = {
  400: 400,
  401: 401,
  403: 403,
  404: 404,
  409: 409,
  500: 500,
};

function deriveHttpStatus(code) {
  // code 是数字;按 prefix 映射到 HTTP status
  // 40001 → 400,40101 → 401,40302 → 403,40401 → 404,40901 → 409,50001 → 500
  const prefix = Math.floor(code / 100);
  return CODE_TO_HTTP_STATUS[prefix] || 400;
}

class ApiError extends Error {
  constructor(code, message, httpStatus) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus ?? deriveHttpStatus(code);
  }
}

module.exports = ApiError;