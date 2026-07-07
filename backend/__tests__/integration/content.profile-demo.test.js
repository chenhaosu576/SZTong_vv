// __tests__/integration/content.profile-demo.test.js
// Task 10: GET /api/v1/client/content/profile-demo 集成测试(3 个 case)
// 覆盖:未登录 → 40101 / 已登录但行不存在 → 40401 / 已登录且行存在 → 200 + payload 字段

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { ProfileDemoContent, User } = require('../../src/db/models');
const { setupTestDb, closeDb } = require('./helpers');

describe('GET /api/v1/client/content/profile-demo', () => {
  let token;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  beforeEach(async () => {
    await ProfileDemoContent.destroy({ where: {}, truncate: true, restartIdentity: true });
    // User 表启用了 paranoid(truncate 在 InnoDB + 软删表上不能截断 FK 边),用 force: true 清干净
    await User.destroy({ where: {}, force: true });

    const hash = await bcrypt.hash('123456', 10);
    await User.create({
      email: 'demo@test.com',
      passwordHash: hash,
      displayName: 'demo',
      status: 1,
      pointsBalance: 0,
    });
    const loginRes = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'demo@test.com', password: '123456' });
    token = loginRes.body.data.token;
  });

  test('未登录 → 40101', async () => {
    const res = await request(app).get('/api/v1/client/content/profile-demo');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(40101);
  });

  test('行不存在 → 40401', async () => {
    const res = await request(app)
      .get('/api/v1/client/content/profile-demo')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40401);
  });

  test('存在行 → 200 + payload', async () => {
    await ProfileDemoContent.create({
      id: 1,
      payload: {
        tracks: [{ name: '回收活跃度', value: 82 }],
        weeklyTrend: [42, 54, 61, 48, 68, 72, 77],
        badges: ['连续 4 周回收'],
        menu: ['地址管理', '回收偏好', '积分兑换', '隐私设置'],
      },
    });

    const res = await request(app)
      .get('/api/v1/client/content/profile-demo')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.tracks).toHaveLength(1);
    expect(res.body.data.weeklyTrend).toHaveLength(7);
    expect(res.body.data.menu).toHaveLength(4);
  });
});
