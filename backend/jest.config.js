// jest.config.js
// Jest 配置: 测试用 sqlite 内存库,跑完清空

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  globalSetup: '<rootDir>/__tests__/integration/setup.js',
  globalTeardown: '<rootDir>/__tests__/integration/teardown.js',
  testTimeout: 30000,
};
