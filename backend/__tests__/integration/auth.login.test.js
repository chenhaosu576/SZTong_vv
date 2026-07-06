// __tests__/integration/auth.login.test.js

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { User } = require('../../src/db/models');
const { setupTestDb, closeDb } = require('./helpers');

describe('POST /api/v1/client/auth/login', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await closeDb();
  });
  beforeEach(async () => {
    await User.destroy({ where: {}, force: true });
  });

  async function seedUser(email = 'login@test.com', password = '123456') {
    const passwordHash = await bcrypt.hash(password, 10);
    return User.create({
      email,
      passwordHash,
      displayName: '登录测试',
      status: 1,
      pointsBalance: 100,
    });
  }

  test('登录成功 → 200 + 返回 token', async () => {
    await seedUser();

    const res = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'login@test.com', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('login@test.com');
  });

  test('密码错误 → 40101', async () => {
    await seedUser();

    const res = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'login@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(40101);
  });

  test('用户不存在 → 40101', async () => {
    const res = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'nobody@test.com', password: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(40101);
  });

  test('用户已禁用 → 40301', async () => {
    const passwordHash = await bcrypt.hash('123456', 10);
    await User.create({
      email: 'disabled@test.com',
      passwordHash,
      displayName: 'x',
      status: 0,
      pointsBalance: 0,
    });

    const res = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'disabled@test.com', password: '123456' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(40301);
  });
});