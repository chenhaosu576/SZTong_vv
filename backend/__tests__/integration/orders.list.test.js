// __tests__/integration/orders.list.test.js
// Task 11.3: GET /api/v1/client/orders 集成测试(3 个 case)
// 覆盖:未登录 / 空列表 / 已登录且有自己的订单

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { User, Order, RecycleOrder, DonationOrder } = require('../../src/db/models');
const { setupTestDb, closeDb } = require('./helpers');

describe('GET /api/v1/client/orders', () => {
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
      email: 'list@test.com',
      passwordHash,
      displayName: 'list-test',
      status: 1,
      pointsBalance: 0,
    });
    const loginRes = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'list@test.com', password: '123456' });
    token = loginRes.body.data.token;
  });

  test('未登录 → 40101', async () => {
    const res = await request(app).get('/api/v1/client/orders');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(40101);
  });

  test('空列表 → 200 + total=0', async () => {
    const res = await request(app)
      .get('/api/v1/client/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.list).toEqual([]);
  });

  test('已登录 → 200 + 返回自己的订单', async () => {
    // 直接插一条 recycle
    await request(app)
      .post('/api/v1/client/orders/recycle')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: '小家电',
        weightBand: '5-10kg',
        estimatedWeight: 6.5,
        scheduledDate: '2026-12-01',
        scheduledPeriod: '09:00-12:00',
        contactName: '张三',
        contactPhone: '13800001111',
        addressSnapshot: '上海市徐汇区宜山路 501 号',
      });

    const res = await request(app)
      .get('/api/v1/client/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].orderType).toBe('recycle');
    expect(res.body.data.list[0].recycleDetail.category).toBe('小家电');
  });

  test('用户 A 不能看用户 B 的订单 → 40401', async () => {
    // 用户 A 登录下个单
    await request(app)
      .post('/api/v1/client/orders/recycle')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: '小家电',
        weightBand: '5-10kg',
        estimatedWeight: 6.5,
        scheduledDate: '2026-12-01',
        scheduledPeriod: '09:00-12:00',
        contactName: '张三',
        contactPhone: '13800001111',
        addressSnapshot: '上海市徐汇区宜山路 501 号',
      });

    // 取这条订单的 id
    const listRes = await request(app)
      .get('/api/v1/client/orders')
      .set('Authorization', `Bearer ${token}`);
    const orderId = listRes.body.data.list[0].id;

    // 创建用户 B 并登录
    const passwordHash = await bcrypt.hash('123456', 10);
    await User.create({
      email: 'other@test.com',
      passwordHash,
      displayName: 'other-user',
      status: 1,
      pointsBalance: 0,
    });
    const otherLogin = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'other@test.com', password: '123456' });
    const otherToken = otherLogin.body.data.token;

    // B 用自己的 token GET A 的 orderId → 40401
    const res = await request(app)
      .get(`/api/v1/client/orders/${orderId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40401);
  });
});
