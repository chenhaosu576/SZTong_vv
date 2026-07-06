// __tests__/integration/orders.donation.test.js
// Task 11.2: POST /api/v1/client/orders/donation 集成测试(3 个 case)
// 覆盖:成功创建 / 未登录 / 缺 itemName

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { User, Order, RecycleOrder, DonationOrder } = require('../../src/db/models');
const { setupTestDb, closeDb } = require('./helpers');

describe('POST /api/v1/client/orders/donation', () => {
  let token;

  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await closeDb();
  });
  beforeEach(async () => {
    await RecycleOrder.destroy({ where: {}, force: true });
    await DonationOrder.destroy({ where: {}, force: true });
    await Order.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    const passwordHash = await bcrypt.hash('123456', 10);
    await User.create({
      email: 'donor@test.com',
      passwordHash,
      displayName: 'donor',
      status: 1,
      pointsBalance: 0,
    });
    const loginRes = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'donor@test.com', password: '123456' });
    token = loginRes.body.data.token;
  });

  test('成功创建 → 201 + orderNo + status=submitted', async () => {
    const res = await request(app)
      .post('/api/v1/client/orders/donation')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectTitle: '乡村学校暖冬计划',
        projectLocation: '云南·怒江',
        itemType: '纺织旧衣',
        itemName: '秋冬棉服',
        quantityText: '6件',
        weightText: '5kg',
        conditionText: '八成新',
        logisticsType: '顺丰到付',
        contactName: '林岚',
        contactPhone: '13800001111',
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.orderNo).toMatch(/^SZT-D-\d{8}-\d{4}$/);
    expect(res.body.data.status).toBe('submitted');
  });

  test('未登录 → 40101', async () => {
    const res = await request(app)
      .post('/api/v1/client/orders/donation')
      .send({
        itemType: '纺织旧衣',
        itemName: '秋冬棉服',
        contactName: '林岚',
        contactPhone: '13800001111',
      });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(40101);
  });

  test('缺 itemName → 40001', async () => {
    const res = await request(app)
      .post('/api/v1/client/orders/donation')
      .set('Authorization', `Bearer ${token}`)
      .send({
        itemType: '纺织旧衣',
        contactName: '林岚',
        contactPhone: '13800001111',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });
});
