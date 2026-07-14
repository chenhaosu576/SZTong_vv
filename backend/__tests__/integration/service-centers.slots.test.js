// __tests__/integration/service-centers.slots.test.js
// 覆盖 GET /api/v1/client/service-centers/:code/slots 六个场景:
//   1) 默认窗口 (今天 → 今天+13, 共 14 天)
//   2) 自定义 dateFrom / dateTo 范围
//   3) 服务站 code 不存在 → 40401
//   4) 日期格式错 → 40001
//   5) dateFrom > dateTo → 40020
//   6) 范围 > 30 天 → 40020
//
// 实现细节备忘:
//   - serviceCenters.service.listSlots 把 14 天当默认窗口(MAX=30),
//     所以默认测试需要动态算出 today / today+13,再据此刻 seed ServiceSlot 行。
//   - dateFrom/dateTo 校验的是 YYYY-MM-DD 格式(/^\d{4}-\d{2}-\d{2}$/);
//     dateFrom=2024/01/01 走的是 "/" 分隔符 → 40001。

const request = require('supertest');
const app = require('../../src/app');
const { ServiceCenter, ServiceSlot } = require('../../src/db/models');
const { setupTestDb, closeDb } = require('./helpers');

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

async function seedCenter(code = 'sh-xuhui-001') {
  return ServiceCenter.create({
    code,
    name: '徐汇示范站',
    city: '上海',
    district: '徐汇区',
    address: '上海市徐汇区宜山路 501 号',
    businessHours: '09:00-21:00',
    phone: '021-00000000',
    status: 1,
  });
}

describe('GET /api/v1/client/service-centers/:code/slots', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await closeDb();
  });
  beforeEach(async () => {
    // 子表先清 (无 cascade); ServiceCenter 子表只有 ServiceSlot
    await ServiceSlot.destroy({ where: {}, force: true });
    await ServiceCenter.destroy({ where: {}, force: true });
  });

  test('默认窗口: 不传 dateFrom/dateTo → 返回 [今天, 今天+13] 共 14 天 × N 个时段', async () => {
    const center = await seedCenter();
    const today = todayIso();
    const days = Array.from({ length: 14 }, (_, i) => addDaysIso(today, i));
    // 在默认窗口内: 14 天 × 3 时段 = 42 行,全部 status=1
    const inWindow = days.flatMap((date) =>
      ['09:00-12:00', '13:00-16:00', '18:00-21:00'].map((period) => ({
        serviceCenterId: center.id,
        serviceDate: date,
        period,
        capacity: 3,
        reservedCount: 0,
        status: 1,
      })),
    );
    // 在默认窗口外: today-1 / today+14 各一行,确保不会被默认窗口捞回来
    const outOfWindow = [
      addDaysIso(today, -1),
      addDaysIso(today, 14),
    ].flatMap((date) =>
      ['09:00-12:00'].map((period) => ({
        serviceCenterId: center.id,
        serviceDate: date,
        period,
        capacity: 3,
        reservedCount: 0,
        status: 1,
      })),
    );
    // 再加一行 status=0,在窗口内,验证 status 过滤
    inWindow.push({
      serviceCenterId: center.id,
      serviceDate: today,
      period: '20:00-22:00',
      capacity: 3,
      reservedCount: 0,
      status: 0,
    });
    await ServiceSlot.bulkCreate([...inWindow, ...outOfWindow]);

    const res = await request(app).get(`/api/v1/client/service-centers/${center.code}/slots`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.range).toEqual({ dateFrom: today, dateTo: addDaysIso(today, 13) });
    expect(res.body.data.center).toEqual({
      id: center.id,
      code: center.code,
      name: center.name,
    });
    expect(res.body.data.list).toHaveLength(42); // 14 天 × 3 时段,status=0 那条被过滤
  });

  test('自定义 dateFrom / dateTo → range 透传,list 仅命中窗口内行', async () => {
    const center = await seedCenter();
    // 固定日期便于断言,且落在 [dateFrom, dateTo] 内
    const dateFrom = '2026-03-01';
    const dateTo = '2026-03-03';
    const inWindow = [
      { date: '2026-03-01', period: '09:00-12:00' },
      { date: '2026-03-02', period: '13:00-16:00' },
      { date: '2026-03-03', period: '18:00-21:00' },
    ].map((s) => ({
      serviceCenterId: center.id,
      serviceDate: s.date,
      period: s.period,
      capacity: 3,
      reservedCount: 0,
      status: 1,
    }));
    const outOfWindow = [
      { date: '2026-02-28', period: '09:00-12:00' },
      { date: '2026-03-04', period: '09:00-12:00' },
    ].map((s) => ({
      serviceCenterId: center.id,
      serviceDate: s.date,
      period: s.period,
      capacity: 3,
      reservedCount: 0,
      status: 1,
    }));
    await ServiceSlot.bulkCreate([...inWindow, ...outOfWindow]);

    const res = await request(app)
      .get(`/api/v1/client/service-centers/${center.code}/slots`)
      .query({ dateFrom, dateTo });

    expect(res.status).toBe(200);
    expect(res.body.data.range).toEqual({ dateFrom, dateTo });
    expect(res.body.data.list).toHaveLength(3);
    expect(res.body.data.list.map((s) => s.date).sort()).toEqual(
      ['2026-03-01', '2026-03-02', '2026-03-03'],
    );
  });

  test('服务站 code 不存在 → 40401', async () => {
    const res = await request(app).get('/api/v1/client/service-centers/nonexistent-code/slots');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(40401);
    expect(res.body.message).toBe('服务站不存在');
  });

  test('日期格式错 (dateFrom=2024/01/01) → 40001', async () => {
    const center = await seedCenter();
    const res = await request(app)
      .get(`/api/v1/client/service-centers/${center.code}/slots`)
      .query({ dateFrom: '2024/01/01' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  test('dateFrom 晚于 dateTo → 40020', async () => {
    const center = await seedCenter();
    const res = await request(app)
      .get(`/api/v1/client/service-centers/${center.code}/slots`)
      .query({ dateFrom: '2026-12-01', dateTo: '2026-11-01' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40020);
    expect(res.body.message).toBe('日期范围不合法');
  });

  test('查询范围超过 30 天 (45 天跨度) → 40020', async () => {
    const center = await seedCenter();
    const res = await request(app)
      .get(`/api/v1/client/service-centers/${center.code}/slots`)
      .query({ dateFrom: '2026-01-01', dateTo: '2026-02-15' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40020);
    expect(res.body.message).toBe('查询范围不能超过 30 天');
  });
});