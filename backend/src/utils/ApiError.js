// utils/ApiError.js
// 业务异常类 —— service / middleware 用 throw new ApiError(code, msg, httpStatus)
// error middleware 会捕获并序列化为统一响应 {code, message, data: null}
//
// 使用方:
//   - modules/*/routes.js 抛参数校验错误
//   - modules/*/*.service.js 抛业务错误(用户禁用、邮箱冲突等)
//   - middlewares/auth.js 抛 40101

class ApiError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

module.exports = ApiError;
