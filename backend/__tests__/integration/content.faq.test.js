// __tests__/integration/content.faq.test.js
// Task 9: GET /api/v1/client/content/faq 集成测试(3 个 case)
// 覆盖:行不存在 → 40401 / 行存在 → 200 + payload 四块(standards/faqs/science/diy)/ 公开端点(不带 token)

const request = require('supertest');
const app = require('../../src/app');
const { FaqContent } = require('../../src/db/models');
const { setupTestDb, closeDb } = require('./helpers');

describe('GET /api/v1/client/content/faq', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  beforeEach(async () => {
    await FaqContent.destroy({ where: {}, truncate: true, restartIdentity: true });
  });

  test('行不存在 → 40401', async () => {
    const res = await request(app).get('/api/v1/client/content/faq');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40401);
  });

  test('存在行 → 200 + payload 字段', async () => {
    await FaqContent.create({
      id: 1,
      payload: {
        standards: [{ name: '可回收物', text: '...' }],
        faqs: [{ category: '塑料类', q: '?', a: '...' }],
        science: ['1 吨废纸回收后...'],
        diy: ['玻璃瓶改造...'],
      },
    });

    const res = await request(app).get('/api/v1/client/content/faq');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.standards).toHaveLength(1);
    expect(res.body.data.faqs[0].category).toBe('塑料类');
    expect(res.body.data.science).toHaveLength(1);
    expect(res.body.data.diy).toHaveLength(1);
  });

  test('公开端点', async () => {
    await FaqContent.create({ id: 1, payload: { standards: [], faqs: [], science: [], diy: [] } });
    const res = await request(app).get('/api/v1/client/content/faq');
    expect(res.status).toBe(200);
  });
});
