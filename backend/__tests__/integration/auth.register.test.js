// __tests__/integration/auth.register.test.js
// TDD: 先写测试,后看它失败(等 Task 5 实现 register 后通过)

const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/db/models');
const { setupTestDb, closeDb } = require('./helpers');

describe('POST /api/v1/client/auth/register', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await closeDb();
  });
  beforeEach(async () => {
    await User.destroy({ where: {}, force: true });
  });

  test('成功注册 → 201 + 返回 token + user', async () => {
    const res = await request(app)
      .post('/api/v1/client/auth/register')
      .send({
        email: 'newuser@example.com',
        password: '123456',
        displayName: '新用户',
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('newuser@example.com');
    expect(res.body.data.user.displayName).toBe('新用户');
    expect(res.body.data.user.pointsBalance).toBe(0);
  });

  test('email 已注册 → 40901', async () => {
    await User.create({
      email: 'dup@example.com',
      passwordHash: 'placeholder',
      displayName: 'dup',
      status: 1,
      pointsBalance: 0,
    });

    const res = await request(app)
      .post('/api/v1/client/auth/register')
      .send({
        email: 'dup@example.com',
        password: '123456',
        displayName: 'x',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe(40901);
  });

  test('email 格式错 → 40001', async () => {
    const res = await request(app)
      .post('/api/v1/client/auth/register')
      .send({
        email: 'not-an-email',
        password: '123456',
        displayName: 'x',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  test('密码 < 6 位 → 40001', async () => {
    const res = await request(app)
      .post('/api/v1/client/auth/register')
      .send({
        email: 'a@b.com',
        password: '12345',
        displayName: 'x',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });
});