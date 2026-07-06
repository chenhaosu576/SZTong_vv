// jest.config.js
// Jest 配置: 测试用 MySQL test DB(sztong_test)
// 关键点:
//   - setupFiles 在 test file module 加载前注入 .env.test
//   - app.js 顶层的 dotenv.config() 默认 override:false,所以已注入的字段不会被覆盖
//   - 每个 test file 的 beforeAll 调 helpers.setupTestDb() sync + 初始化 sztong_test DB

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 30000,
  // 共享 MySQL test DB + sequelize 单例, 必须串行跑避免 sync({force:true}) drop+recreate 时撞车
  maxWorkers: 1,
  setupFiles: ['<rootDir>/__tests__/setup-env.js'],
};
