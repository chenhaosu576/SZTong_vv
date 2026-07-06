// __tests__/integration/orders.recycle.test.js
// Task 11.1: POST /api/v1/client/orders/recycle 集成测试(4 个 case)
// 覆盖:成功创建 / 未登录 / category 不合法 / 手机号格式错

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { User, Order, RecycleOrder, DonationOrder } = require('../../src/db/models');
const { setupTestDb, closeDb } = require('./helpers');

describe('POST /api/v1/client/orders/recycle', () => {
  let token;

  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await closeDb();
  });
  beforeEach(async () => {
    // 清干净: 关联表先(无 FK cascade),再 Order,再 User
    await RecycleOrder.destroy({ where: {}, force: true });
    await DonationOrder.destroy({ where: {}, force: true });
    // Order 不是 paranoid;子表已空,直接 force DELETE 即可
    // (MySQL 不允许 TRUNCATE 被 FK 引用的表,即便是空子表)
    await Order.destroy({ where: {}, force: true });
    // User 是 paranoid,必须 force: true
    await User.destroy({ where: {}, force: true });

    const passwordHash = await bcrypt.hash('123456', 10);
    await User.create({
      email: 'order@test.com',
      passwordHash,
      displayName: 'order-test',
      status: 1,
      pointsBalance: 0,
    });
    const loginRes = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'order@test.com', password: '123456' });
    token = loginRes.body.data.token;
  });

  test('成功创建 → 201 + 返回 orderNo + pickupCode + estimatedPoints', async () => {
    const res = await request(app)
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
        note: '门口有纸箱',
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.orderNo).toMatch(/^SZT-\d{8}-\d{4}$/);
    expect(res.body.data.pickupCode).toMatch(/^P\d{4}$/);
    expect(res.body.data.estimatedPoints).toBe(45);   // 5-10kg 对应 45 分
    expect(res.body.data.status).toBe('pending_review');
  });

  test('未登录 → 40101', async () => {
    const res = await request(app)
      .post('/api/v1/client/orders/recycle')
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

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(40101);
  });

  test('category 不合法 → 40001', async () => {
    const res = await request(app)
      .post('/api/v1/client/orders/recycle')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: '未知分类',
        weightBand: '5-10kg',
        estimatedWeight: 6.5,
        scheduledDate: '2026-12-01',
        scheduledPeriod: '09:00-12:00',
        contactName: '张三',
        contactPhone: '13800001111',
        addressSnapshot: '上海市徐汇区宜山路 501 号',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  test('手机号格式错 → 40001', async () => {
    const res = await request(app)
      .post('/api/v1/client/orders/recycle')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: '小家电',
        weightBand: '5-10kg',
        estimatedWeight: 6.5,
        scheduledDate: '2026-12-01',
        scheduledPeriod: '09:00-12:00',
        contactName: '张三',
        contactPhone: '1380000000',    // 10 位,不符合 /^1[3-9]\d{9}$/
        addressSnapshot: '上海市徐汇区宜山路 501 号',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });
});
