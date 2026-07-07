// __tests__/integration/charity.projects.test.js
// 覆盖: 空库 / region 过滤 / urgency 过滤 / 详情 / 详情 404

const request = require('supertest');
const app = require('../../src/app');
const { CharityProject } = require('../../src/db/models');
const { setupTestDb, closeDb } = require('./helpers');

describe('GET /api/v1/client/charity/projects', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await closeDb();
  });
  beforeEach(async () => {
    await CharityProject.destroy({ where: {}, force: true });
  });

  describe('GET /api/v1/client/charity/projects', () => {
    test('空库 → 200 + list=[] regions=[] total=0', async () => {
      const res = await request(app).get('/api/v1/client/charity/projects');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toEqual({ list: [], regions: [], total: 0 });
    });

    test('3 个 status=1 项目 + 1 个 status=0 → list.length=3', async () => {
      await CharityProject.bulkCreate([
        { title: 'A 计划', region: '西部地区', status: 1, currentProgress: 50, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7 },
        { title: 'B 计划', region: '华东地区', status: 1, currentProgress: 80, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7 },
        { title: 'C 计划', region: '华中地区', status: 1, currentProgress: 30, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7 },
        { title: 'D 草稿', region: '西部地区', status: 0, currentProgress: 0, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7 },
      ]);

      const res = await request(app).get('/api/v1/client/charity/projects');
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.regions.sort()).toEqual(['华东地区', '华中地区', '西部地区']);
    });

    test('?region=西部地区 → 只返回 region 匹配', async () => {
      await CharityProject.bulkCreate([
        { title: 'A', region: '西部地区', status: 1, currentProgress: 50, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7 },
        { title: 'B', region: '华东地区', status: 1, currentProgress: 80, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7 },
      ]);

      const res = await request(app).get('/api/v1/client/charity/projects?region=西部地区');
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.list[0].title).toBe('A');
    });

    test('?urgency=紧急募集中 → 没有 deadline 时全部常态', async () => {
      await CharityProject.bulkCreate([
        { title: '常态', region: 'X', status: 1, currentProgress: 10, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7 },
        { title: '常态2', region: 'X', status: 1, currentProgress: 20, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7 },
      ]);

      const res = await request(app).get('/api/v1/client/charity/projects?urgency=紧急募集中');
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
    });

    test('?urgency=全部 → 不过滤', async () => {
      await CharityProject.bulkCreate([
        { title: '常态', region: 'X', status: 1, currentProgress: 10, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7 },
      ]);
      const res = await request(app).get('/api/v1/client/charity/projects?urgency=全部');
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
    });
  });

  describe('GET /api/v1/client/charity/projects/:id', () => {
    test('存在 → 200 + urgency=常态募集中', async () => {
      const created = await CharityProject.create({
        title: '测试项目', region: 'X', status: 1,
        currentProgress: 10, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7,
      });
      const res = await request(app).get(`/api/v1/client/charity/projects/${created.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(created.id);
      expect(res.body.data.urgency).toBe('常态募集中');
      expect(res.body.data.daysLeft).toBeNull();
      expect(res.body.data.needs).toEqual([]);
    });

    test('不存在 → 40401', async () => {
      const res = await request(app).get('/api/v1/client/charity/projects/99999');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40401);
    });

    test('status=0 → 40401', async () => {
      const created = await CharityProject.create({
        title: '草稿', region: 'X', status: 0,
        currentProgress: 0, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7,
      });
      const res = await request(app).get(`/api/v1/client/charity/projects/${created.id}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(40401);
    });
  });
});