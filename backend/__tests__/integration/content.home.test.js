// __tests__/integration/content.home.test.js
// Task 8: GET /api/v1/client/content/home 集成测试(3 个 case)
// 覆盖:行不存在 → 40401 / 行存在 → 200 + payload 字段 / 公开端点(不带 token)

const request = require('supertest');
const app = require('../../src/app');
const { HomeContent } = require('../../src/db/models');
const { setupTestDb, closeDb } = require('./helpers');

describe('GET /api/v1/client/content/home', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await closeDb();
  });
  beforeEach(async () => {
    await HomeContent.destroy({ where: {}, truncate: true, restartIdentity: true });
  });

  test('行不存在 → 40401', async () => {
    const res = await request(app).get('/api/v1/client/content/home');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40401);
  });

  test('存在行 → 200 + payload 字段', async () => {
    await HomeContent.create({
      id: 1,
      payload: { hero: { primaryCta: { to: '/ai-identify' } }, heroStats: [{ value: '1', label: 'X' }] },
    });

    const res = await request(app).get('/api/v1/client/content/home');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.hero.primaryCta.to).toBe('/ai-identify');
    expect(res.body.data.heroStats).toHaveLength(1);
  });

  test('公开端点,不带 token 也能拿', async () => {
    await HomeContent.create({ id: 1, payload: { heroStats: [] } });
    const res = await request(app).get('/api/v1/client/content/home');
    expect(res.status).toBe(200);
  });
});
