// jest.config.js
// Jest 配置: 测试用 sqlite 内存库,由各 test file 的 beforeAll 调 helpers.setupTestDb() 初始化
// 不再用 globalSetup —— :memory: 是按 connection 隔离的,放在 globalSetup 里同步无效

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 30000,
};
