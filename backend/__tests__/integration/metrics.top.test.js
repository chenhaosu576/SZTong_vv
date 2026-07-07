// __tests__/integration/metrics.top.test.js

const request = require('supertest');
const app = require('../../src/app');
const { SiteStats } = require('../../src/db/models');
const { setupTestDb, closeDb } = require('./helpers');

describe('GET /api/v1/client/metrics/top', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  beforeEach(async () => {
    await SiteStats.destroy({ where: {}, truncate: true, restartIdentity: true });
  });

  test('行不存在 → 40401', async () => {
    const res = await request(app).get('/api/v1/client/metrics/top');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40401);
  });

  test('存在行 → 200 + 4 字段都是 number', async () => {
    await SiteStats.create({
      id: 1,
      processedToday: 421,
      activeSites: 39,
      avgResponseHour: 2.1,
      carbonReducedKg: 1860,
    });

    const res = await request(app).get('/api/v1/client/metrics/top');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(typeof res.body.data.processedToday).toBe('number');
    expect(typeof res.body.data.activeSites).toBe('number');
    expect(typeof res.body.data.avgResponseHour).toBe('number');
    expect(typeof res.body.data.carbonReducedKg).toBe('number');
    expect(res.body.data.processedToday).toBe(421);
  });

  test('公开端点,无 token', async () => {
    await SiteStats.create({
      id: 1,
      processedToday: 1,
      activeSites: 1,
      avgResponseHour: 1.0,
      carbonReducedKg: 1,
    });
    const res = await request(app).get('/api/v1/client/metrics/top');
    expect(res.status).toBe(200);
  });
});
