# 批次一 — CharityPage 接通 + 收尾清理 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 CharityPage 项目列表切到真实后端 `charity_projects` 表,让捐赠订单写入 `charityProjectId` 外键,顺手清掉 `utils/auth.js` / `mock/clientApi.js` / `App.vue` / `ClientLayout.vue` 的 legacy 路径,并修一个坏掉的 `useOrdersList.test.js`。

**Architecture:**
- 后端: 新增 `charity` 模块(model + service + routes + 公开 GET),复用现有 `donation_orders.charity_project_id` FK 写入 `DonationOrder`,`listOrders` 的 `donationDetail` include 链显式扩层让 `order.donationDetail.charityProject` 联出。
- 前端: CharityPage 由 `useCharityProjects` 单页 composable 拉数据,`useCharityFilters` 改签名为 `{ projects, regions }`,`useDonationSubmit` 透传 `charityProjectId`。`App.vue` / `ClientLayout.vue` 切到 `useAuthStore`。`useImageRecognition` 内联 `analyzeImage` 逻辑。

**Tech Stack:** Vue 3 + Pinia 2 + Vue Router 4 + Axios (frontend, ESM, jsdom 测); Express 5 + Sequelize 6 + MySQL 8 + Jest + supertest (backend, CommonJS); 7-step 状态机 + 4 display stages 已在线。

---

## 文件结构 (新增 / 修改 / 删除 一览)

### 新增 (8 个)

| 路径 | 职责 |
|------|------|
| `backend/src/db/models/charityProject.js` | `charity_projects` + `charity_project_needs` 两表 |
| `backend/src/modules/charity/charity.service.js` | 列表 (region/urgency 过滤) + 详情 (联 needs) |
| `backend/src/modules/charity/routes.js` | GET list / GET :id (公开) |
| `backend/src/db/seeders/003-charity-projects.js` | 8 个项目 + needs, 幂等 findOrCreate |
| `backend/__tests__/integration/charity.projects.test.js` | 5 case: 空 / region / urgency / 详情 / 404 |
| `frontend/src/api/charity.js` | `fetchCharityProjects` / `fetchCharityProjectById` |
| `frontend/src/composables/useCharityProjects.js` | 单页状态机 (projects/regions/loading/errorText/load) |
| `frontend/src/composables/__tests__/useCharityProjects.test.js` | composable 单元测试 |
| `frontend/src/composables/__tests__/useCharityFilters.test.js` | 新签名 {projects, regions} 单元测试 |
| `frontend/src/utils/authConstants.js` | ROLE_CLIENT / MIN_PASSWORD_LENGTH |

### 修改 (13 个)

| 路径 | 改动 |
|------|------|
| `backend/src/db/models/index.js` | 引入 CharityProject / CharityProjectNeed; 注册 `Order.belongsTo(CharityProject)` 关联 |
| `backend/src/modules/orders/orders.service.js` | validateDonationPayload 加 charityProjectId 校验; createDonationOrder 写入; listOrders / getOrderForUser 的 donationDetail include 显式扩层 |
| `backend/src/routes/index.js` | 挂 `/v1/client/charity` |
| `frontend/src/views/client/CharityPage.vue` | 删 projects / regionOptions import; useCharityProjects; useCharityFilters({ projects, regions }); onMounted(load) |
| `frontend/src/composables/useCharityFilters.js` | 改签名 { projects, regions }; 删 getProjectUrgency; matchesUrgency 直接比 project.urgency |
| `frontend/src/composables/useDonationSubmit.js` | payload 多带 `charityProjectId: selectedProject?.id ?? null` |
| `frontend/src/utils/charityConstants.js` | 删 projects + regionOptions; 保留 categories/urgencyOptions/urgentDaysThreshold/processSteps/trustFeatures |
| `frontend/src/views/auth/AuthPage.vue` | import 改 `authConstants` |
| `frontend/src/App.vue` | 切到 useAuthStore; LoginPromptModal 条件改 `!authStore.isAuthed` |
| `frontend/src/layouts/ClientLayout.vue` | 切到 useAuthStore; logout → authStore.logout(); NavBar 接 authStore.user |
| `frontend/src/composables/useImageRecognition.js` | 内联 analyzeImage (File → analyzeImageWithAI, 否则 []) |
| `frontend/src/components/client/charity/CharityProjectFilters.vue` | 暂时移除 categories 行 (后端不返回) |
| `frontend/src/components/client/charity/CharityProjectCard.vue` | `project.urgency` 直接读, `getProjectUrgency` 改用 `project.urgency` |
| `frontend/src/composables/__tests__/useOrdersList.test.js` | 改 mock `@/stores/orders`; 保留所有断言 |

### 删除 (2 个)

| 路径 | 原因 |
|------|------|
| `frontend/src/utils/auth.js` | 10 个函数全部淘汰; 2 个常量迁到 `authConstants.js` |
| `frontend/src/mock/clientApi.js` | 8 个导出中 7 个死代码, analyzeImage 内联到 useImageRecognition |

---

## Phase 1: 后端 charity 模块 (Step 1)

### Task 1: CharityProject / CharityProjectNeed 模型

**Files:**
- Create: `backend/src/db/models/charityProject.js`
- Modify: `backend/src/db/models/index.js`

- [ ] **Step 1: 写新模型文件**

`backend/src/db/models/charityProject.js`:

```js
// db/models/charityProject.js
// 对应 SZTong.sql L78-L101 (charity_projects) + L269-L281 (charity_project_needs)
//
// 字段: id, title, location, region, tag, status,
//       urgentDaysThreshold, currentProgress, targetProgress, progressUnit,
//       beneficiary, coverImage, description, createdAt, updatedAt (Project)
//       id, charityProjectId, title, description, sortOrder (Need)
//
// 关联: Project 1 → N Need (as 'needs'); Need N → 1 Project (as 'project')
// 使用方: modules/charity/charity.service.js; modules/orders/orders.service.js (listOrders nested include)

module.exports = (sequelize, DataTypes) => {
  const CharityProject = sequelize.define(
    'CharityProject',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING(120), allowNull: false },
      location: { type: DataTypes.STRING(120), allowNull: true },
      region: { type: DataTypes.STRING(60), allowNull: true },
      tag: { type: DataTypes.STRING(30), allowNull: true },
      status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
      urgentDaysThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      currentProgress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      targetProgress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      progressUnit: { type: DataTypes.STRING(20), allowNull: true },
      beneficiary: { type: DataTypes.STRING(120), allowNull: true },
      coverImage: { type: DataTypes.STRING(255), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'charity_projects' },
  );

  const CharityProjectNeed = sequelize.define(
    'CharityProjectNeed',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      charityProjectId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      title: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'charity_project_needs' },
  );

  CharityProject.hasMany(CharityProjectNeed, { foreignKey: 'charityProjectId', as: 'needs' });
  CharityProjectNeed.belongsTo(CharityProject, { foreignKey: 'charityProjectId', as: 'project' });

  return { CharityProject, CharityProjectNeed };
};
```

- [ ] **Step 2: 在 models/index.js 注册**

打开 `backend/src/db/models/index.js`,在 `const Order = ...` 之后插入:

```js
const { CharityProject, CharityProjectNeed } = require('./charityProject')(sequelize, Sequelize.DataTypes);
```

在 `module.exports = { ... }` 内 `DonationOrder,` 之后加 `CharityProject,\n  CharityProjectNeed,`。

最终 `module.exports` 看起来像:

```js
module.exports = {
  sequelize,
  Sequelize,
  Role,
  ServiceCenter,
  User,
  Admin,
  Order,
  RecycleOrder,
  DonationOrder,
  CharityProject,
  CharityProjectNeed,
  HomeContent,
  FaqContent,
  SiteStats,
  ProfileDemoContent,
};
```

- [ ] **Step 3: 跑 jest 确认 sync 不抛**

Run: `cd backend && npx jest __tests__/integration/auth.login.test.js --no-coverage 2>&1 | tail -20`
Expected: PASS — sync({force:true}) 不报 Unknown table 或 Unknown column。

- [ ] **Step 4: 提交**

```bash
git add backend/src/db/models/charityProject.js backend/src/db/models/index.js
git commit -m "feat(backend): CharityProject + CharityProjectNeed models"
```

---

### Task 2: DonationOrder.belongsTo(CharityProject) 关联

**Files:**
- Modify: `backend/src/db/models/index.js`

- [ ] **Step 1: 加关联**

打开 `backend/src/db/models/index.js`,在 `// Order 1 → 1 DonationOrder` 块之后插入:

```js
// DonationOrder N → 1 CharityProject
DonationOrder.belongsTo(CharityProject, { foreignKey: 'charityProjectId', as: 'charityProject' });
```

- [ ] **Step 2: 跑现有 orders 测试**

Run: `cd backend && npx jest __tests__/integration/orders.donation.test.js --no-coverage 2>&1 | tail -15`
Expected: PASS — 关联是 declarative,不动数据,不会破坏现有测试。

- [ ] **Step 3: 提交**

```bash
git add backend/src/db/models/index.js
git commit -m "feat(backend): DonationOrder.belongsTo(CharityProject)"
```

---

### Task 3: charity.service (TDD)

**Files:**
- Create: `backend/src/modules/charity/charity.service.js`
- Test: `backend/__tests__/integration/charity.projects.test.js` (下一个 Task 写)

- [ ] **Step 1: 写 service**

`backend/src/modules/charity/charity.service.js`:

```js
// modules/charity/charity.service.js
// 公益项目: 列表 (region/urgency 过滤) + 详情 (联 needs)
//
// 紧急度算法 (实时):
//   daysLeft = (deadline - now) 向上取整
//   urgency  = daysLeft !== null && daysLeft <= urgentDaysThreshold
//              ? '紧急募集中' : '常态募集中'
//
// 使用方: modules/charity/routes.js
// SQL: charity_projects (status=1) + charity_project_needs (1 → N)

const { CharityProject, CharityProjectNeed } = require('../../db/models');
const { Op } = require('sequelize');
const ApiError = require('../../utils/ApiError');

const MS_PER_DAY = 86400000;

function pickNeedPayload(n) {
  return {
    id: n.id,
    title: n.title,
    description: n.description,
    sortOrder: n.sortOrder,
  };
}

function pickProjectPayload(p, needs, daysLeft, urgency) {
  return {
    id: p.id,
    title: p.title,
    location: p.location,
    region: p.region,
    tag: p.tag,
    urgentDaysThreshold: p.urgentDaysThreshold,
    currentProgress: p.currentProgress,
    targetProgress: p.targetProgress,
    progressUnit: p.progressUnit,
    beneficiary: p.beneficiary,
    coverImage: p.coverImage,
    description: p.description,
    daysLeft,
    urgency,
    needs: (needs || []).map(pickNeedPayload),
  };
}

function computeUrgency(project, now) {
  let daysLeft = null;
  if (project.deadline) {
    const ms = new Date(project.deadline).getTime() - now.getTime();
    daysLeft = ms > 0 ? Math.ceil(ms / MS_PER_DAY) : 0;
  }
  const urgency =
    daysLeft !== null && daysLeft <= project.urgentDaysThreshold
      ? '紧急募集中'
      : '常态募集中';
  return { daysLeft, urgency };
}

async function listProjects({ region, urgency } = {}) {
  const where = { status: 1 };
  if (region && region !== '全国') where.region = region;

  const rows = await CharityProject.findAll({
    where,
    include: [{ model: CharityProjectNeed, as: 'needs' }],
    order: [['currentProgress', 'DESC']],
  });

  const now = new Date();
  const decorated = rows.map((p) => {
    const { daysLeft, urgency: u } = computeUrgency(p, now);
    return pickProjectPayload(p, p.needs, daysLeft, u);
  });

  const filtered =
    !urgency || urgency === '全部'
      ? decorated
      : decorated.filter((p) => p.urgency === urgency);

  const regions = [...new Set(decorated.map((p) => p.region).filter(Boolean))];

  return { list: filtered, regions, total: filtered.length };
}

async function getProjectById(id) {
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(40401, '公益项目不存在');
  }
  const p = await CharityProject.findOne({
    where: { id, status: 1 },
    include: [{ model: CharityProjectNeed, as: 'needs' }],
  });
  if (!p) throw new ApiError(40401, '公益项目不存在');
  const { daysLeft, urgency } = computeUrgency(p, new Date());
  return pickProjectPayload(p, p.needs, daysLeft, urgency);
}

module.exports = { listProjects, getProjectById };
```

> 注: SQL 没有 `deadline` 列 (SZTong.sql L78-L101 不含此列),保留 `deadline` 字段引用是为后续 P1 迁移用。当前 `p.deadline` 始终 undefined → `daysLeft = null` → `urgency = '常态募集中'`,seeder 不会写 deadline,行为正确。

- [ ] **Step 2: 验证 service 能 require**

Run: `cd backend && node -e "const s = require('./src/modules/charity/charity.service'); console.log(typeof s.listProjects, typeof s.getProjectById);"`
Expected: 输出 `function function`。无 require 错误。

- [ ] **Step 3: 提交**

```bash
git add backend/src/modules/charity/charity.service.js
git commit -m "feat(backend): charity.service listProjects + getProjectById"
```

---

### Task 4: charity.routes + 挂载 + 集成测试 (TDD)

**Files:**
- Create: `backend/src/modules/charity/routes.js`
- Modify: `backend/src/routes/index.js`
- Create: `backend/__tests__/integration/charity.projects.test.js`

- [ ] **Step 1: 写 routes**

`backend/src/modules/charity/routes.js`:

```js
// modules/charity/routes.js
// GET /api/v1/client/charity/projects
// GET /api/v1/client/charity/projects/:id
// 公开接口, 不挂 authMiddleware (用户未登录也能浏览项目)

const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const service = require('./charity.service');

const router = express.Router();

router.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const data = await service.listProjects({
      region: req.query.region,
      urgency: req.query.urgency,
    });
    res.json(ok(data));
  }),
);

router.get(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const data = await service.getProjectById(Number(req.params.id));
    res.json(ok(data));
  }),
);

module.exports = router;
```

- [ ] **Step 2: 挂载到 routes/index.js**

打开 `backend/src/routes/index.js`,在 `router.use('/v1/client/metrics', ...)` 之后插入:

```js
router.use('/v1/client/charity', require('../modules/charity/routes'));
```

- [ ] **Step 3: 写测试 (空库 case)**

`backend/__tests__/integration/charity.projects.test.js`:

```js
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
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await closeDb();
  });
  beforeEach(async () => {
    await CharityProject.destroy({ where: {}, force: true });
  });

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
```

- [ ] **Step 4: 跑测试**

Run: `cd backend && npx jest __tests__/integration/charity.projects.test.js --no-coverage 2>&1 | tail -20`
Expected: PASS — 8 case 全过。

- [ ] **Step 5: 提交**

```bash
git add backend/src/modules/charity/routes.js backend/src/routes/index.js backend/__tests__/integration/charity.projects.test.js
git commit -m "feat(backend): charity routes + mount + integration tests"
```

---

### Task 5: seeder 003 (自动按字母序跑)

**Files:**
- Create: `backend/src/db/seeders/003-charity-projects.js`

> sequelize-cli `db:seed:all` 按 seeders 文件名字母序自动跑(001 → 002 → 003),无需改 runner。

- [ ] **Step 1: 写 seeder 003**

`backend/src/db/seeders/003-charity-projects.js`:

```js
// db/seeders/003-charity-projects.js
// 公益项目 demo 数据 seeder (幂等)。
// 职责:
//   - 8 个 charity_projects (status=1, region 分布: 西部 3 / 华东 2 / 华中 1 / 华南 1 / 华北 1)
//   - 每个项目 2-4 个 charity_project_needs
// 使用方: npm run db:seed
// 幂等: 全部走 findOrCreate by title, needs 走 findOrCreate by (charityProjectId, title)

const { CharityProject, CharityProjectNeed } = require('../models');

const PROJECT_SEEDS = [
  {
    title: '大凉山冬季暖心计划',
    location: '四川·凉山', region: '西部地区', tag: '紧急项目', status: 1,
    urgentDaysThreshold: 7, currentProgress: 72, targetProgress: 1200,
    progressUnit: '件', beneficiary: '瓦吾小学学生',
    coverImage: 'https://images.pexels.com/photos/15311442/pexels-photo-15311442.jpeg',
    description: '瓦吾小学位于海拔 2700 米的山巅,冬长夏短,温差极大。',
    needs: [
      { title: '儿童冬装外套', description: '标准:8 成新以上,无破损,男女不限', sortOrder: 1 },
      { title: '保暖棉鞋 / 运动鞋', description: '标准:全新或近全新,码数 28-38 码', sortOrder: 2 },
      { title: '加厚袜 / 手套 / 围巾', description: '标准:仅限全新', sortOrder: 3 },
    ],
  },
  {
    title: '乡村阅读角落建设',
    location: '甘肃·定西', region: '西部地区', tag: '教育支持', status: 1,
    urgentDaysThreshold: 7, currentProgress: 45, targetProgress: 5000,
    progressUnit: '本', beneficiary: '定西乡村小学',
    description: '为乡村小学搭建可循环的图书角。',
    needs: [
      { title: '青少年绘本', description: '适合 6-12 岁阅读', sortOrder: 1 },
      { title: '文具盒套装', description: '包含笔/尺/橡皮', sortOrder: 2 },
    ],
  },
  {
    title: '社区闲置循环共享舱',
    location: '上海·普陀', region: '华东地区', tag: '社区帮扶', status: 1,
    urgentDaysThreshold: 7, currentProgress: 91, targetProgress: 200,
    progressUnit: '件', beneficiary: '社区困难家庭',
    description: '在社区建立可借用、可捐赠的共享物品舱。',
    needs: [
      { title: '烧水壶', description: '可正常使用的电热水壶', sortOrder: 1 },
      { title: '电风扇', description: '落地式或台扇', sortOrder: 2 },
      { title: '家用梯子', description: '三步梯,稳固即可', sortOrder: 3 },
    ],
  },
  {
    title: '高校毕业季旧物接力',
    location: '上海·杨浦', region: '华东地区', tag: '校园项目', status: 1,
    urgentDaysThreshold: 7, currentProgress: 60, targetProgress: 800,
    progressUnit: '件', beneficiary: '高校毕业生 / 周边社区',
    description: '毕业季宿舍旧物回收并转赠。',
    needs: [
      { title: '宿舍小家电', description: '电吹风/小台灯/电风扇', sortOrder: 1 },
      { title: '教材书籍', description: '可继续使用的教材', sortOrder: 2 },
    ],
  },
  {
    title: '湖南山区学校图书角扩容',
    location: '湖南·怀化', region: '华中地区', tag: '教育支持', status: 1,
    urgentDaysThreshold: 7, currentProgress: 25, targetProgress: 1500,
    progressUnit: '本', beneficiary: '湖南山区小学',
    description: '为湖南山区小学补充课外读物。',
    needs: [
      { title: '课外读物', description: '小学高年级到初中', sortOrder: 1 },
      { title: '字典', description: '新华字典或同级别', sortOrder: 2 },
    ],
  },
  {
    title: '广州社区旧衣回收计划',
    location: '广东·广州', region: '华南地区', tag: '社区帮扶', status: 1,
    urgentDaysThreshold: 7, currentProgress: 55, targetProgress: 600,
    progressUnit: '件', beneficiary: '广州社区困难家庭',
    description: '回收可穿着的旧衣物并分配到社区。',
    needs: [
      { title: '四季外套', description: '干净无破损,适合日常穿着', sortOrder: 1 },
      { title: '儿童衣物', description: '0-12 岁', sortOrder: 2 },
    ],
  },
  {
    title: '北京高校社区循环市集',
    location: '北京·海淀', region: '华北地区', tag: '校园项目', status: 1,
    urgentDaysThreshold: 7, currentProgress: 70, targetProgress: 500,
    progressUnit: '件', beneficiary: '高校学生 / 周边居民',
    description: '校园闲置物品循环市集。',
    needs: [
      { title: '小型生活电器', description: '可正常使用的宿舍电器', sortOrder: 1 },
      { title: '日用杂货', description: '未拆封的生活用品', sortOrder: 2 },
    ],
  },
  {
    title: '云南怒江山村校服计划',
    location: '云南·怒江', region: '西部地区', tag: '紧急项目', status: 1,
    urgentDaysThreshold: 7, currentProgress: 40, targetProgress: 400,
    progressUnit: '套', beneficiary: '怒江山村小学生',
    description: '为云南怒江山村学生补充校服。',
    needs: [
      { title: '儿童校服', description: '适合小学生,夏季/秋季', sortOrder: 1 },
      { title: '配套书包', description: '全新或近全新', sortOrder: 2 },
    ],
  },
];

module.exports = {
  async up() {
    for (const spec of PROJECT_SEEDS) {
      const { needs = [], ...projectFields } = spec;
      const [project] = await CharityProject.findOrCreate({
        where: { title: spec.title },
        defaults: projectFields,
      });
      for (const need of needs) {
        await CharityProjectNeed.findOrCreate({
          where: { charityProjectId: project.id, title: need.title },
          defaults: { ...need, charityProjectId: project.id },
        });
      }
    }
    console.log('OK: 8 个 charity_projects + 21 个 needs 已就位');
  },

  async down() {
    await CharityProjectNeed.destroy({ where: {}, truncate: true, restartIdentity: true });
    await CharityProject.destroy({ where: {}, truncate: true, restartIdentity: true });
    console.log('OK: charity_projects + needs demo 数据已清理');
  },
};
```

- [ ] **Step 3: 验证 seeder 跑通**

Run: `cd backend && npm run db:migrate:sql && npm run db:seed 2>&1 | tail -10`
Expected: 看到 `OK: 8 个 charity_projects + 21 个 needs 已就位`。

- [ ] **Step 4: 验证 charity 接口**

Run: `cd backend && node -e "
const http = require('http');
http.get('http://localhost:8080/api/v1/client/charity/projects', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => { const j = JSON.parse(data); console.log('total:', j.data.total, 'regions:', j.data.regions); process.exit(0); });
});
" 2>&1 || echo "若 8080 端口未启, 此步骤可后置到 e2e 手测阶段"`

Expected: `total: 8 regions: [ 5 个区域 ]` (或类似)。

- [ ] **Step 5: 提交**

```bash
git add backend/src/db/seeders/003-charity-projects.js
git commit -m "feat(backend): seeder 003 charity projects (8 + 21 needs)"
```

---

## Phase 2: 捐赠订单写 charityProjectId (Step 2)

### Task 6: orders.service — 校验 + 写入 + 嵌套 include (TDD)

**Files:**
- Modify: `backend/src/modules/orders/orders.service.js`
- Test: `backend/__tests__/integration/orders.donation.test.js` (扩)

- [ ] **Step 1: 加 charityProjectId 校验**

打开 `backend/src/modules/orders/orders.service.js`,把 `validateDonationPayload` 改为:

```js
function validateDonationPayload(payload) {
  const { itemType, itemName, contactName, contactPhone, charityProjectId } = payload || {};
  if (!itemType || !itemType.trim()) throw new ApiError(40001, '请选择物品类型');
  if (!itemName || !itemName.trim()) throw new ApiError(40001, '请填写物品名称');
  if (!contactName || !contactName.trim()) throw new ApiError(40001, '请填写联系人');
  if (!contactPhone || !PHONE_REGEX.test(contactPhone)) {
    throw new ApiError(40001, '请输入有效手机号');
  }
  if (charityProjectId != null) {
    if (!Number.isInteger(charityProjectId) || charityProjectId < 1) {
      throw new ApiError(40001, 'charityProjectId 必须是正整数');
    }
  }
}
```

- [ ] **Step 2: 写入 + 扩 include 链**

在 `createDonationOrder` 中,改 DonationOrder.create 调用为:

```js
await DonationOrder.create({
  orderId: order.id,
  charityProjectId: payload.charityProjectId ?? null,
  projectTitle: payload.projectTitle?.trim() || null,
  projectLocation: payload.projectLocation?.trim() || null,
  itemType: payload.itemType.trim(),
  itemName: payload.itemName.trim(),
  quantityText: payload.quantityText?.trim() || null,
  weightText: payload.weightText?.trim() || null,
  conditionText: payload.conditionText?.trim() || null,
  logisticsType: payload.logisticsType?.trim() || null,
});
```

改 `listOrders` 和 `getOrderForUser` 的 include 数组,把 `DonationOrder` 那条改成嵌套 include:

`listOrders`:

```js
const offset = (page - 1) * pageSize;
const { rows, count } = await Order.findAndCountAll({
  where,
  include: [
    { model: RecycleOrder, as: 'recycleDetail' },
    {
      model: DonationOrder,
      as: 'donationDetail',
      include: [{ model: CharityProject, as: 'charityProject' }],
    },
    { model: ServiceCenter, as: 'serviceCenter' },
  ],
  order: [['createdAt', 'DESC']],
  limit: pageSize,
  offset,
});
```

`getOrderForUser` 同样改。

- [ ] **Step 3: 把 CharityProject 加到文件顶 require**

打开文件顶部,改:

```js
const { Order, RecycleOrder, DonationOrder, ServiceCenter, CharityProject } = require('../../db/models');
```

- [ ] **Step 4: 跑现有 orders 测试**

Run: `cd backend && npx jest __tests__/integration/orders.donation.test.js __tests__/integration/orders.list.test.js --no-coverage 2>&1 | tail -10`
Expected: PASS。

- [ ] **Step 5: 扩 orders.donation.test.js (3 个新 case)**

打开 `backend/__tests__/integration/orders.donation.test.js`,在文件顶部 require 里加 `CharityProject`:

```js
const { User, Order, RecycleOrder, DonationOrder, CharityProject } = require('../../src/db/models');
```

在 beforeEach 末尾加 (先清掉慈善项目,避免互相干扰):

```js
await CharityProject.destroy({ where: {}, force: true });
```

在文件末尾 `});` 之前,加 3 个新 test 进同一个 describe:

```js
test('带 charityProjectId → DB orders.charity_project_id 落库', async () => {
  const project = await CharityProject.create({
    title: '测试公益', region: 'X', status: 1,
    currentProgress: 0, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7,
  });

  const res = await request(app)
    .post('/api/v1/client/orders/donation')
    .set('Authorization', `Bearer ${token}`)
    .send({
      charityProjectId: project.id,
      projectTitle: '测试公益',
      projectLocation: 'X',
      itemType: '纺织旧衣', itemName: '秋冬棉服',
      quantityText: '6件', weightText: '5kg',
      conditionText: '八成新', logisticsType: '顺丰到付',
      contactName: '林岚', contactPhone: '13800001111',
    });

  expect(res.status).toBe(201);
  const row = await DonationOrder.findOne({ where: { orderId: res.body.data.id } });
  expect(row.charityProjectId).toBe(project.id);
});

test('GET /orders 列表里 donationDetail.charityProject.id 能联出', async () => {
  const project = await CharityProject.create({
    title: '联出测试', region: 'X', status: 1,
    currentProgress: 0, targetProgress: 100, progressUnit: '件', urgentDaysThreshold: 7,
  });
  await request(app)
    .post('/api/v1/client/orders/donation')
    .set('Authorization', `Bearer ${token}`)
    .send({
      charityProjectId: project.id,
      projectTitle: '联出测试', projectLocation: 'X',
      itemType: '纺织旧衣', itemName: '秋冬棉服',
      contactName: '林岚', contactPhone: '13800001111',
    });

  const listRes = await request(app)
    .get('/api/v1/client/orders')
    .set('Authorization', `Bearer ${token}`);

  expect(listRes.status).toBe(200);
  const donationOrder = listRes.body.data.list.find((o) => o.donationDetail);
  expect(donationOrder).toBeDefined();
  expect(donationOrder.donationDetail.charityProject).toBeDefined();
  expect(donationOrder.donationDetail.charityProject.id).toBe(project.id);
});

test('charityProjectId=-1 → 40001', async () => {
  const res = await request(app)
    .post('/api/v1/client/orders/donation')
    .set('Authorization', `Bearer ${token}`)
    .send({
      charityProjectId: -1,
      itemType: '纺织旧衣', itemName: '秋冬棉服',
      contactName: '林岚', contactPhone: '13800001111',
    });

  expect(res.status).toBe(400);
  expect(res.body.code).toBe(40001);
});
```

- [ ] **Step 6: 跑扩展测试**

Run: `cd backend && npx jest __tests__/integration/orders.donation.test.js --no-coverage 2>&1 | tail -10`
Expected: PASS — 6 case 全过 (3 旧 + 3 新)。

- [ ] **Step 7: 跑全部后端测试**

Run: `cd backend && npx jest --no-coverage 2>&1 | tail -15`
Expected: PASS — 所有测试绿。

- [ ] **Step 8: 提交**

```bash
git add backend/src/modules/orders/orders.service.js backend/__tests__/integration/orders.donation.test.js
git commit -m "feat(backend): validate + write + nest-include charityProjectId on donation"
```

---

## Phase 3: 前端 CharityPage 接线 (Step 3 + Step 4)

### Task 7: api/charity.js

**Files:**
- Create: `frontend/src/api/charity.js`

- [ ] **Step 1: 写 API client**

`frontend/src/api/charity.js`:

```js
// api/charity.js
// 公益项目: 列表 / 详情
// 调用方: composables/useCharityProjects.js

import request from "@/utils/request";

export function fetchCharityProjects(params = {}) {
  return request.get("/client/charity/projects", { params });
}

export function fetchCharityProjectById(id) {
  return request.get(`/client/charity/projects/${id}`);
}
```

- [ ] **Step 2: 验证 import 路径**

Run: `cd frontend && node -e "import('./src/api/charity.js').then(m => console.log('exports:', Object.keys(m)))"`
Expected: 输出 `exports: [ 'fetchCharityProjects', 'fetchCharityProjectById' ]`。(若 vite-node 未配置,可能报 ESM 错误,改用 `cd frontend && npx vite-node -e "import('./src/api/charity.js').then(m => console.log(Object.keys(m)))"`)

- [ ] **Step 3: 提交**

```bash
git add frontend/src/api/charity.js
git commit -m "feat(frontend): api/charity.js"
```

---

### Task 8: useCharityProjects.js + 测试 (TDD)

**Files:**
- Create: `frontend/src/composables/useCharityProjects.js`
- Create: `frontend/src/composables/__tests__/useCharityProjects.test.js`

- [ ] **Step 1: 写测试**

`frontend/src/composables/__tests__/useCharityProjects.test.js`:

```js
// useCharityProjects.test.js
// 覆盖: load 成功 / load 失败 (写 errorText) / findProjectById

import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchCharityProjectsMock } = vi.hoisted(() => ({
  fetchCharityProjectsMock: vi.fn(),
}));

vi.mock("@/api/charity", () => ({
  fetchCharityProjects: fetchCharityProjectsMock,
  fetchCharityProjectById: vi.fn(),
}));

import { useCharityProjects } from "../useCharityProjects";

describe("useCharityProjects", () => {
  beforeEach(() => {
    fetchCharityProjectsMock.mockReset();
  });

  it("load 成功: projects/regions 填充, loading=true→false, errorText 空", async () => {
    fetchCharityProjectsMock.mockResolvedValueOnce({
      list: [
        { id: 1, title: "A", region: "西部地区", urgency: "常态募集中" },
        { id: 2, title: "B", region: "华东地区", urgency: "常态募集中" },
      ],
      regions: ["西部地区", "华东地区"],
      total: 2,
    });

    const { projects, regions, loading, errorText, load } = useCharityProjects();

    expect(projects.value).toEqual([]);
    expect(regions.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("");

    const p = load();
    expect(loading.value).toBe(true);
    await p;

    expect(projects.value).toHaveLength(2);
    expect(regions.value).toEqual(["西部地区", "华东地区"]);
    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("");
  });

  it("load 失败: errorText 写中文, projects 保持空, loading 仍回归 false", async () => {
    fetchCharityProjectsMock.mockRejectedValueOnce(new Error("网络异常"));

    const { projects, regions, loading, errorText, load } = useCharityProjects();
    await load();

    expect(projects.value).toEqual([]);
    expect(regions.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("网络异常");
  });

  it("findProjectById: 命中 → 返回项目; 未命中 → 返回 null", async () => {
    fetchCharityProjectsMock.mockResolvedValueOnce({
      list: [{ id: 7, title: "X" }, { id: 8, title: "Y" }],
      regions: [], total: 2,
    });
    const { findProjectById, load } = useCharityProjects();
    await load();

    expect(findProjectById(7).title).toBe("X");
    expect(findProjectById("8").title).toBe("Y");
    expect(findProjectById(999)).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend && npx vitest run src/composables/__tests__/useCharityProjects.test.js 2>&1 | tail -15`
Expected: FAIL — `Cannot find module '../useCharityProjects'`。

- [ ] **Step 3: 写 composable**

`frontend/src/composables/useCharityProjects.js`:

```js
// useCharityProjects.js
// CharityPage 单页业务状态机。
// 职责:
//   - 拉 charity_projects 列表 + regions
//   - 暴露 loading / errorText
//   - 暴露 findProjectById 给 form 提交时用
// 使用方: views/client/CharityPage.vue

import { ref } from "vue";
import * as charityApi from "@/api/charity";

export function useCharityProjects() {
  const projects = ref([]);
  const regions = ref([]);
  const loading = ref(false);
  const errorText = ref("");

  async function load() {
    loading.value = true;
    errorText.value = "";
    try {
      const data = await charityApi.fetchCharityProjects();
      projects.value = data.list;
      regions.value = data.regions;
    } catch (e) {
      errorText.value = e?.message || "公益项目加载失败，请稍后重试。";
    } finally {
      loading.value = false;
    }
  }

  function findProjectById(id) {
    return projects.value.find((p) => p.id === Number(id)) || null;
  }

  return { projects, regions, loading, errorText, load, findProjectById };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd frontend && npx vitest run src/composables/__tests__/useCharityProjects.test.js 2>&1 | tail -10`
Expected: PASS — 3 case 全过。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/composables/useCharityProjects.js frontend/src/composables/__tests__/useCharityProjects.test.js
git commit -m "feat(frontend): useCharityProjects composable + tests"
```

---

### Task 9: useCharityFilters.js 新签名 + 测试 (TDD)

**Files:**
- Modify: `frontend/src/composables/useCharityFilters.js`
- Modify: `frontend/src/composables/__tests__/useCharityFilters.test.js` (新文件)

- [ ] **Step 1: 写新签名测试**

`frontend/src/composables/__tests__/useCharityFilters.test.js`:

```js
// useCharityFilters.test.js
// 新签名: useCharityFilters({ projects, regions })
// 覆盖: 4 维筛选 (region/urgency/search + 默认 category 全部需求) +
//       selectedProject 重置 watch +
//       urgency 直接比 project.urgency (不再本地计算)

import { beforeEach, describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import { useCharityFilters } from "../useCharityFilters";

const SAMPLE_PROJECTS = [
  { id: 1, title: "大凉山计划", region: "西部地区", urgency: "紧急募集中", beneficiary: "瓦吾小学" },
  { id: 2, title: "乡村阅读", region: "西部地区", urgency: "常态募集中", beneficiary: "定西小学" },
  { id: 3, title: "上海社区", region: "华东地区", urgency: "常态募集中", beneficiary: "上海社区" },
];

const SAMPLE_REGIONS = ["西部地区", "华东地区"];

describe("useCharityFilters 新签名", () => {
  it("默认 category=全部需求 不影响过滤 (后端未返回 categories)", () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    expect(filters.filteredProjects.value).toHaveLength(3);
  });

  it("region 过滤: 全国 → 全部; 西部地区 → 2 条", () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    filters.setSelectedRegion("西部地区");
    expect(filters.filteredProjects.value.map((p) => p.id)).toEqual([1, 2]);
  });

  it("urgency 过滤: 直接比 project.urgency, 不本地算", () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    filters.setSelectedUrgency("紧急募集中");
    expect(filters.filteredProjects.value.map((p) => p.id)).toEqual([1]);
  });

  it("search 命中 title / beneficiary", () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    filters.setSearchKeyword("瓦吾");
    expect(filters.filteredProjects.value.map((p) => p.id)).toEqual([1]);

    filters.setSearchKeyword("上海");
    expect(filters.filteredProjects.value.map((p) => p.id)).toEqual([3]);
  });

  it("四维组合生效", () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    filters.setSelectedRegion("西部地区");
    filters.setSelectedUrgency("常态募集中");
    filters.setSearchKeyword("阅读");
    expect(filters.filteredProjects.value.map((p) => p.id)).toEqual([2]);
  });

  it("selectedProject 被踢出 → 自动清空 (watch)", async () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    filters.selectProject(SAMPLE_PROJECTS[0]);
    expect(filters.selectedProject.value).not.toBeNull();

    filters.setSelectedRegion("华东地区");
    await nextTick();
    expect(filters.selectedProject.value).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend && npx vitest run src/composables/__tests__/useCharityFilters.test.js 2>&1 | tail -10`
Expected: FAIL — 旧签名 `useCharityFilters(projects)` 与新签名不匹配,或 `urgency` 仍本地算。

- [ ] **Step 3: 改 composable**

`frontend/src/composables/useCharityFilters.js` (整文件替换):

```js
// useCharityFilters.js
// 公益页筛选状态机 (新签名: { projects, regions })。
//
// 职责:
//   - 持有 4 个筛选 ref: selectedCategory / selectedRegion /
//     selectedUrgency / searchKeyword
//   - 派生 filteredProjects(根据 3 个有效筛选条件 + searchKeyword;category
//     后端暂不返回,保持 '全部需求' 默认值不影响过滤)
//   - urgency 直接比 project.urgency (后端算好返回)
//   - 内部 watch(filteredProjects) 在选中项目被踢出时自动清空 selectedProject
//   - 暴露 setter 给 panel 直接调用
//
// 使用方:
//   - CharityPage.vue: const filters = useCharityFilters({ projects, regions });

import { computed, ref, watch } from "vue";

export function useCharityFilters({ projects, regions }) {
  const selectedCategory = ref("全部需求");
  const selectedRegion = ref("全国");
  const selectedUrgency = ref("全部");
  const searchKeyword = ref("");
  const selectedProject = ref(null);

  const filteredProjects = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase();

    return projects.value.filter((project) => {
      // 后端暂不返回 categories 维度, category 筛选不参与过滤 (默认 '全部需求')
      const matchesRegion =
        selectedRegion.value === "全国" || project.region === selectedRegion.value;
      const matchesUrgency =
        selectedUrgency.value === "全部" || project.urgency === selectedUrgency.value;
      const matchesSearch =
        keyword.length === 0 ||
        [project.title, project.beneficiary]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(keyword));

      return matchesRegion && matchesUrgency && matchesSearch;
    });
  });

  watch(
    filteredProjects,
    (nextProjects) => {
      if (
        selectedProject.value &&
        !nextProjects.some((p) => p.id === selectedProject.value.id)
      ) {
        selectedProject.value = null;
      }
    },
    { immediate: true },
  );

  function selectProject(project) {
    selectedProject.value = project;
  }

  function setSelectedCategory(value) {
    selectedCategory.value = value;
  }
  function setSelectedRegion(value) {
    selectedRegion.value = value;
  }
  function setSelectedUrgency(value) {
    selectedUrgency.value = value;
  }
  function setSearchKeyword(value) {
    searchKeyword.value = value;
  }

  return {
    selectedCategory,
    selectedRegion,
    selectedUrgency,
    searchKeyword,
    selectedProject,
    filteredProjects,
    selectProject,
    setSelectedCategory,
    setSelectedRegion,
    setSelectedUrgency,
    setSearchKeyword,
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd frontend && npx vitest run src/composables/__tests__/useCharityFilters.test.js 2>&1 | tail -10`
Expected: PASS — 6 case 全过。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/composables/useCharityFilters.js frontend/src/composables/__tests__/useCharityFilters.test.js
git commit -m "refactor(frontend): useCharityFilters new signature { projects, regions }"
```

---

### Task 10: useDonationSubmit 透传 charityProjectId

**Files:**
- Modify: `frontend/src/composables/useDonationSubmit.js`

- [ ] **Step 1: 加字段**

打开 `frontend/src/composables/useDonationSubmit.js`,把 `handleSubmit` 内的 `payload` 改为:

```js
const payload = {
  charityProjectId: selectedProject?.id ?? null,
  projectTitle: selectedProject.title,
  projectLocation: selectedProject.location,
  itemType: String(form.itemType || "").trim(),
  itemName: String(form.itemName || "").trim(),
  quantityText: String(form.quantity || "").trim(),
  weightText: String(form.weight || "").trim(),
  conditionText: String(form.condition || "").trim(),
  logisticsType: String(form.logistics || "").trim(),
  contactName: String(form.donorName || "").trim(),
  contactPhone: String(form.phone || "").trim(),
};
```

- [ ] **Step 2: 跑 vitest 全套**

Run: `cd frontend && npx vitest run 2>&1 | tail -10`
Expected: useOrdersList 旧测试可能 fail (legacy 路径),其它 pass — 后续 Task 22 修。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/composables/useDonationSubmit.js
git commit -m "feat(frontend): useDonationSubmit pass charityProjectId"
```

---

### Task 11: CharityProjectCard 用 project.urgency 直接读

**Files:**
- Modify: `frontend/src/components/client/charity/CharityProjectCard.vue`

- [ ] **Step 1: 改 urgency 计算**

打开 `CharityProjectCard.vue`,找到 `daysLeftText` / `project.urgentNeeds` 引用位置。原 card 没直接调用 `getProjectUrgency` —— 该函数在 `useCharityFilters` 里。但 card 有 `project.urgentNeeds` 显示,如果原 card 显示进度是用 `project.daysLeft <= urgentDaysThreshold` 算,需要把这段计算改用 `project.urgency`。

打开 `CharityProjectCard.vue` 的 `<script setup>`,改为:

```js
// CharityProjectCard.vue
// 公益项目单卡。接收 project + selected + daysLeftText, emit donate。
// urgency / daysLeft / needs 由后端返回 (project.* 字段直接读)。
// daysLeftText 由 grid/view 拼好传入 (例: "剩余 3 天" / "长期募集")。

<script setup>
defineProps({
  project: { type: Object, required: true },
  selected: { type: Boolean, required: true },
  daysLeftText: { type: String, required: true },
});

defineEmits(["donate"]);
</script>
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/components/client/charity/CharityProjectCard.vue
git commit -m "refactor(frontend): CharityProjectCard reads project.urgency directly"
```

---

### Task 12: CharityProjectFilters 暂时移除 categories 行

**Files:**
- Modify: `frontend/src/components/client/charity/CharityProjectFilters.vue`

- [ ] **Step 1: 改 props 接收 + 模板**

打开 `CharityProjectFilters.vue`,改 `<script setup>` 为:

```js
<script setup>
defineProps({
  regionOptions: { type: Array, required: true },
  urgencyOptions: { type: Array, required: true },
  selectedRegion: { type: String, required: true },
  selectedUrgency: { type: String, required: true },
  searchKeyword: { type: String, required: true },
});

defineEmits([
  "update:selected-region",
  "update:selected-urgency",
  "update:search-keyword",
]);
</script>
```

把模板 `<div class="filter-categories">...</div>` 整块删除,保留 `<div class="filter-controls">` 起的 select / search。

- [ ] **Step 2: 提交**

```bash
git add frontend/src/components/client/charity/CharityProjectFilters.vue
git commit -m "refactor(frontend): CharityProjectFilters drop categories (backend gap)"
```

---

### Task 13: CharityPage.vue 接线 composables

**Files:**
- Modify: `frontend/src/views/client/CharityPage.vue`

- [ ] **Step 1: 改 script 段**

打开 `CharityPage.vue`,改 `<script setup>` 为:

```js
<script setup>
import { computed, onMounted, ref } from "vue";

import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import { useCharityProjects } from "@/composables/useCharityProjects";
import { useCharityFilters } from "@/composables/useCharityFilters";
import { useDonationForm } from "@/composables/useDonationForm";
import { useDonationSubmit } from "@/composables/useDonationSubmit";
import {
  categories,
  urgencyOptions,
  processSteps,
  trustFeatures,
} from "@/utils/charityConstants";

import CharityHeroPanel from "@/components/client/charity/CharityHeroPanel.vue";
import CharityProjectFilters from "@/components/client/charity/CharityProjectFilters.vue";
import CharityProjectsGrid from "@/components/client/charity/CharityProjectsGrid.vue";
import CharityDetailPanel from "@/components/client/charity/CharityDetailPanel.vue";
import CharityDonationForm from "@/components/client/charity/CharityDonationForm.vue";
import CharitySuccessModal from "@/components/client/charity/CharitySuccessModal.vue";
import CharityProcessSection from "@/components/client/charity/CharityProcessSection.vue";
import CharityTrustSection from "@/components/client/charity/CharityTrustSection.vue";

const pageRef = ref(null);
useRevealOnScroll(pageRef);

const { projects, regions, loading, errorText, load } = useCharityProjects();
const filters = useCharityFilters({ projects, regions });
const regionOptions = computed(() => ["全国", ...regions.value]);
const donationForm = useDonationForm();
const submit = useDonationSubmit({
  donationForm: donationForm.donationForm,
  getSelectedProject: () => filters.selectedProject.value,
  onSuccess: donationForm.resetForm,
});

onMounted(load);

function onSelectProject(project) {
  filters.selectProject(project);
  setTimeout(() => {
    document.getElementById("donation-detail")?.scrollIntoView({ behavior: "smooth" });
  }, 100);
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
</script>
```

- [ ] **Step 2: 改 template — 删 categories prop + 加 loading/errorText 显示**

在 `<CharityProjectFilters>` 块改为:

```html
<CharityProjectFilters
  :region-options="regionOptions"
  :urgency-options="urgencyOptions"
  :selected-region="filters.selectedRegion.value"
  :selected-urgency="filters.selectedUrgency.value"
  :search-keyword="filters.searchKeyword.value"
  @update:selected-region="filters.setSelectedRegion"
  @update:selected-urgency="filters.setSelectedUrgency"
  @update:search-keyword="filters.setSearchKeyword"
/>
```

`categories` prop 已从 CharityProjectFilters 删除 (Task 12)。

在 `<CharityProjectsGrid>` 之前加 loading / error 显示:

```html
<div v-if="loading.value" class="state-line">正在加载公益项目…</div>
<div v-else-if="errorText" class="state-line state-error">{{ errorText }}</div>
<CharityProjectsGrid
  v-else
  :projects="filters.filteredProjects.value"
  :selected-project-id="filters.selectedProject.value?.id ?? null"
  @select-project="onSelectProject"
/>
```

模板里其它原 `categories` 引用直接删除。

- [ ] **Step 3: 加 state-line 样式**

在 `<style scoped>` 末尾加:

```css
.state-line {
  padding: 24px 0;
  color: var(--ink-600);
  text-align: center;
  font-size: 0.95rem;
}

.state-line.state-error {
  color: #8f431d;
  background: rgba(255, 242, 232, 0.6);
  border: 1px solid rgba(194, 131, 47, 0.3);
  border-radius: 12px;
  padding: 16px;
}
```

- [ ] **Step 4: 启动 dev server 手测**

Run: `cd frontend && npm run dev`(另开终端)
Expected: 浏览器打开 `http://localhost:5173/charity`,看到 8 个项目列表 + 4 维筛选(只剩 region/urgency/search) 联动正常。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/views/client/CharityPage.vue
git commit -m "feat(frontend): CharityPage wired to useCharityProjects"
```

---

### Task 14: 端到端 — 提交捐赠 + 联出

**Files:** (无,验证步骤)

- [ ] **Step 1: 启动 backend + frontend**

Run:
- 终端 1: `cd backend && npm run dev` (端口 8080)
- 终端 2: `cd frontend && npm run dev` (端口 5173)

- [ ] **Step 2: 浏览器走流程**

1. 登录 `user@szt.com / 123456`
2. 打开 `/charity` → 看到 8 个项目
3. 选第一个 → 滚动到表单 → 填表提交 → 看到 success modal 带 `orderNo`
4. 跳 `/orders` 切"公益捐赠" tab → 看到刚提交那条
5. DevTools Network 确认请求是 `POST /api/v1/client/orders/donation` + `body.charityProjectId` 有值

- [ ] **Step 3: 提交 commit (如需)**

如果 CharitPage 模板细节有微调,补一个 fixup commit;否则本 Task 不产生新 commit。

---

## Phase 4: 清理 pass (Step 5 + Step 6)

### Task 15: authConstants.js + AuthPage import 切换

**Files:**
- Create: `frontend/src/utils/authConstants.js`
- Modify: `frontend/src/views/auth/AuthPage.vue`

- [ ] **Step 1: 写 authConstants.js**

`frontend/src/utils/authConstants.js`:

```js
// utils/authConstants.js
// 与原 utils/auth.js 解耦的常量:只保留 AuthPage 真正用的两个。
// 角色 / 密码长度是纯常量,与 localStorage 完全无关,放在 utils/auth.js
// 里会让"切到 Pinia store"显得更复杂。

export const ROLE_CLIENT = "client";
export const MIN_PASSWORD_LENGTH = 6;
```

- [ ] **Step 2: AuthPage 改 import**

打开 `frontend/src/views/auth/AuthPage.vue`,改 import:

```js
import { MIN_PASSWORD_LENGTH, ROLE_CLIENT } from "../../utils/authConstants";
```

(原 `import { ... } from "../../utils/auth";` 改为 `authConstants`)

- [ ] **Step 3: 跑 build 验证 import 路径正确**

Run: `cd frontend && npx vite build 2>&1 | tail -10`
Expected: 成功,无 `Cannot find module` 报错。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/utils/authConstants.js frontend/src/views/auth/AuthPage.vue
git commit -m "refactor(frontend): authConstants.js + AuthPage import path"
```

---

### Task 16: App.vue 切到 useAuthStore

**Files:**
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: 改 script**

打开 `frontend/src/App.vue`,改 `<script setup>` 为:

```js
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

import LoginPromptModal from "./components/common/LoginPromptModal.vue";
import ClickSpark from "./components/common/ClickSpark.vue";
import { useAuthStore } from "./stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const showPrompt = ref(false);
let timer = null;

function clearTimer() {
  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }
}

function syncUser() {
  authStore.restoreFromStorage();
}

function shouldPrompt() {
  if (authStore.isAuthed) return false;
  if (route.path === "/auth") return false;
  if (sessionStorage.getItem("szt_prompted") === "1") return false;
  return true;
}

function setupPromptTimer() {
  clearTimer();
  showPrompt.value = false;

  if (!shouldPrompt()) {
    return;
  }

  timer = window.setTimeout(() => {
    showPrompt.value = true;
    sessionStorage.setItem("szt_prompted", "1");
  }, 3000);
}

function closePrompt() {
  showPrompt.value = false;
}

function confirmPrompt() {
  showPrompt.value = false;
  router.push({
    path: "/auth",
    query: {
      redirect: route.fullPath,
    },
  });
}

watch(
  () => route.fullPath,
  () => {
    syncUser();
    setupPromptTimer();
  },
);

onMounted(() => {
  window.addEventListener("storage", syncUser);
  setupPromptTimer();
});

onBeforeUnmount(() => {
  clearTimer();
  window.removeEventListener("storage", syncUser);
});
</script>
```

模板不变。`LoginPromptModal` 触发条件 `!authStore.isAuthed` 在 `shouldPrompt()` 里完成。

- [ ] **Step 2: 启动 dev 验证**

Run: 浏览器登录后跳首页 → 退出 → 顶栏登录态消失 → 重新登录 → 多 tab 同步

- [ ] **Step 3: 提交**

```bash
git add frontend/src/App.vue
git commit -m "refactor(frontend): App.vue use useAuthStore"
```

---

### Task 17: ClientLayout.vue 切到 useAuthStore

**Files:**
- Modify: `frontend/src/layouts/ClientLayout.vue`

- [ ] **Step 1: 改 script**

打开 `frontend/src/layouts/ClientLayout.vue`,改 `<script setup>` 为:

```js
<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterView, useRouter } from "vue-router";

import AuroraBackground from "../components/common/AuroraBackground.vue";
import NavBar from "../components/common/NavBar.vue";
import SiteFooter from "../components/common/SiteFooter.vue";
import { publicNavLinks } from "../router/siteMap";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const scrollProgress = ref(0);
let removeAfterEach = null;

function syncUser() {
  authStore.restoreFromStorage();
}

function handleLogout() {
  authStore.logout();

  if (router.currentRoute.value.path !== "/") {
    router.push("/");
  }
}

function updateScrollProgress() {
  const doc = document.documentElement;
  const scrollTop = doc.scrollTop || document.body.scrollTop;
  const height = doc.scrollHeight - doc.clientHeight;

  if (height <= 0) {
    scrollProgress.value = 0;
    return;
  }

  scrollProgress.value = Math.min((scrollTop / height) * 100, 100);
}

onMounted(() => {
  window.addEventListener("storage", syncUser);
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  removeAfterEach = router.afterEach(syncUser);
  updateScrollProgress();
});

onUnmounted(() => {
  window.removeEventListener("storage", syncUser);
  window.removeEventListener("scroll", updateScrollProgress);

  if (typeof removeAfterEach === "function") {
    removeAfterEach();
  }
});
</script>
```

模板里 `:user="user"` 保留(它现在指向 computed,响应式一致)。`@logout` 仍然触发 `handleLogout`。

- [ ] **Step 2: 启动 dev 验证**

浏览器:登录态/登出态切换正常,顶栏 `NavBar` 的 user 显示正常。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/layouts/ClientLayout.vue
git commit -m "refactor(frontend): ClientLayout.vue use useAuthStore"
```

---

### Task 18: useImageRecognition.js 内联 analyzeImage

**Files:**
- Modify: `frontend/src/composables/useImageRecognition.js`

- [ ] **Step 1: 改 import + 默认 analyzer**

打开 `useImageRecognition.js`,改顶部 import + default analyzer:

```js
import { onBeforeUnmount, ref } from "vue";
import { analyzeImageWithAI } from "../mock/picAI";

/**
 * 默认 analyzer:File 走真实 AI 识别 (analyzeImageWithAI),否则返回空数组
 * (前端 caller 用空数组显示示例)。
 * 调用方可通过 options.analyzer 注入自定义识别器。
 */
const defaultAnalyzer = async (imageSource) => {
  if (imageSource instanceof File) {
    try {
      return await analyzeImageWithAI(imageSource);
    } catch (error) {
      console.error("AI 识别失败:", error);
      return [];
    }
  }
  return [];
};

export function useImageRecognition(options = {}) {
  const analyzer = options.analyzer ?? defaultAnalyzer;

  const imageUrl = ref("");
  const imageName = ref("");
  const recognizing = ref(false);
  const results = ref([]);
  const error = ref(null);

  let requestSeq = 0;

  function revokeImageUrl() {
    if (imageUrl.value) {
      URL.revokeObjectURL(imageUrl.value);
      imageUrl.value = "";
    }
  }

  async function recognize(file, nextName) {
    if (!file) return;

    const seq = ++requestSeq;
    revokeImageUrl();
    imageUrl.value = URL.createObjectURL(file);
    imageName.value = nextName ?? file.name ?? "";
    results.value = [];
    recognizing.value = true;
    error.value = null;

    try {
      const out = await analyzer(file);
      if (seq !== requestSeq) return;
      results.value = out;
    } catch (err) {
      if (seq === requestSeq) {
        error.value = err;
        results.value = [];
      }
    } finally {
      if (seq === requestSeq) recognizing.value = false;
    }
  }

  function reset() {
    requestSeq++;
    revokeImageUrl();
    imageName.value = "";
    results.value = [];
    recognizing.value = false;
    error.value = null;
  }

  onBeforeUnmount(reset);

  return {
    imageUrl,
    imageName,
    recognizing,
    results,
    error,
    recognize,
    reset,
  };
}
```

> 注: `mock/picAI` 留作"client-side 网络模块",它的 `analyzeImageWithAI` 走 `/api/analyze-image`,原 `analyzeImage` 的逻辑 100% 一致,只是去掉了 `mock/clientApi` 这层薄包装。

- [ ] **Step 2: 提交**

```bash
git add frontend/src/composables/useImageRecognition.js
git commit -m "refactor(frontend): useImageRecognition inline analyzeImage via picAI"
```

---

### Task 19: charityConstants.js 删 projects + regionOptions

**Files:**
- Modify: `frontend/src/utils/charityConstants.js`

- [ ] **Step 1: 改文件**

打开 `frontend/src/utils/charityConstants.js`,把 `projects = [...]` 整块删除,改 `regionOptions`:

```js
// charityConstants.js
// 公益页面共享的静态数据常量 (projects / regionOptions 已迁到后端,本文件
// 只保留筛选条枚举 + 静态文案)。
//
// 包含:
//   - categories: 类目 chips(后端暂不返回,留作占位)
//   - urgencyOptions: 紧急度筛选项
//   - urgentDaysThreshold: 紧急/常态募集的分界天数(已无业务消费,保留
//     给未来本地快速判定,目前的真实判定由后端按 deadline 实时算)
//   - processSteps: 四步流程文案
//   - trustFeatures: 信任背书 4 个特性
//
// 使用方: views/client/CharityPage.vue (顶部 import 透传给 panel)

export const categories = ["全部需求", "图书", "衣物", "文具", "家居", "其他"];

export const urgencyOptions = ["全部", "紧急募集中", "常态募集中"];

export const urgentDaysThreshold = 7;

export const processSteps = [
  { icon: "search", title: "浏览项目", desc: "查看当前正在募集的公益需求" },
  { icon: "check_circle", title: "选择项目", desc: "找到最匹配您手中物资的受助方向" },
  { icon: "edit_document", title: "填写信息", desc: "登记捐赠详情,选择物流配送方式" },
  { icon: "send", title: "完成提交并等待反馈", desc: "物资送达后您将收到实时签收通知" },
];

export const trustFeatures = [
  { icon: "fact_check", title: "项目真实性审核", desc: "所有发布项目均经过三方机构实地核验与平台二次风控审核。" },
  { icon: "track_changes", title: "物资去向追踪", desc: "从出库、运输到最终发放,每一个节点均同步数字轨迹。" },
  { icon: "rate_review", title: "如何查看签收反馈", desc: "发放完成后,平台会上传受助人签收单及物资分发纪实现场照片。" },
  { icon: "gavel", title: "合规信息披露", desc: "平台财务状况与审计报告定期向公众开放,接受社会化监督。" },
];
```

- [ ] **Step 2: 跑 build 验证 import 路径**

Run: `cd frontend && npx vite build 2>&1 | tail -10`
Expected: 成功,CharityPage / CharityProjectFilters 等都没引用 `projects` / `regionOptions` 了。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/utils/charityConstants.js
git commit -m "refactor(frontend): charityConstants drop projects/regionOptions"
```

---

### Task 20: 删 utils/auth.js

**Files:**
- Delete: `frontend/src/utils/auth.js`

- [ ] **Step 1: 确认 0 引用**

Run: `cd frontend && grep -rn "utils/auth[\"'/]" src --include="*.js" --include="*.vue" 2>&1 | grep -v "authConstants"`
Expected: 0 行输出(只剩可能注释里的引用)。

- [ ] **Step 2: 删除文件**

Run: `rm frontend/src/utils/auth.js`

- [ ] **Step 3: 跑 build 验证**

Run: `cd frontend && npx vite build 2>&1 | tail -10`
Expected: 成功,无 import 错误。

- [ ] **Step 4: 跑 vitest**

Run: `cd frontend && npx vitest run 2>&1 | tail -15`
Expected: useOrdersList.test 仍 fail(下一个 Task 修),其它 pass。

- [ ] **Step 5: 提交**

```bash
git rm frontend/src/utils/auth.js
git commit -m "chore(frontend): remove legacy utils/auth.js"
```

---

### Task 21: 删 mock/clientApi.js

**Files:**
- Delete: `frontend/src/mock/clientApi.js`

- [ ] **Step 1: 确认 0 引用**

Run: `cd frontend && grep -rn "mock/clientApi[\"'/]" src --include="*.js" --include="*.vue" 2>&1`
Expected: 0 行输出(useImageRecognition 已在 Task 18 内联,useOrdersList 用的是 store)。

- [ ] **Step 2: 删除文件**

Run: `rm frontend/src/mock/clientApi.js`

- [ ] **Step 3: 跑 build + vitest**

Run: `cd frontend && npx vite build 2>&1 | tail -5 && npx vitest run 2>&1 | tail -10`
Expected: build 成功,useOrdersList.test fail(下一个 Task 修)。

- [ ] **Step 4: 提交**

```bash
git rm frontend/src/mock/clientApi.js
git commit -m "chore(frontend): remove legacy mock/clientApi.js"
```

---

## Phase 5: 测试修复 + 端到端 (Step 7 + Step 8)

### Task 22: 修 useOrdersList.test.js (TDD)

**Files:**
- Modify: `frontend/src/composables/__tests__/useOrdersList.test.js`

- [ ] **Step 1: 跑测试确认失败**

Run: `cd frontend && npx vitest run src/composables/__tests__/useOrdersList.test.js 2>&1 | tail -20`
Expected: FAIL — `mockResolvedValueOnce(SAMPLE_ORDERS)` 调的是 `fetchOrders` (mock/clientApi),但 useOrdersList 现在用 useOrdersStore.fetchList,且 store 期望 `{list, total, page, pageSize}` 形状。

- [ ] **Step 2: 改 mock + 适配新 store 形状**

整文件替换 `frontend/src/composables/__tests__/useOrdersList.test.js`:

```js
// useOrdersList.test.js
// Vitest coverage for the orders-page business composable.
// Verifies: type discrimination (donation / recycling mutual exclusion),
// status stage normalization, service-type class mapping, store fetch + error
// state roundtrip, and filteredOrders / statusStats reactive behavior across
// the keyword / tab / service-type dimensions.
//
// Mock 策略: vi.hoisted 拿到 useOrdersStoreMock;beforeEach 里 mockReturnValue
// 一个 fresh store 实例(ref + fetchList),fetchList 通过共享 storeList ref
// 把数据写入,被 composable 的 allOrders computed 读到。

import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

const { useOrdersStoreMock } = vi.hoisted(() => ({
  useOrdersStoreMock: vi.fn(),
}));

vi.mock("@/stores/orders", () => ({
  useOrdersStore: useOrdersStoreMock,
}));

import {
  ORDER_TABS,
  ORDER_SERVICE_TYPES,
  SERVICE_TYPE_CLASS,
  STATUS_STAGE,
  getServiceTypeClass,
  getStatusStage,
  isDonationOrder,
  isRecyclingOrder,
  useOrdersList,
} from "../useOrdersList";

// 新 useOrdersList 用 order.orderType === "recycle" / "donation" 判别
// 状态名也按后端 7 阶段实际字符串 (pending_review / completed / 等)。
// 测试用 5 条样本覆盖 4 维筛选。
const SAMPLE_ORDERS = [
  { id: 1, orderType: "recycle", status: "pending_review", scheduledDate: "2026-04-01", serviceCenter: { name: "徐汇站" } },
  { id: 2, orderType: "donation", status: "completed", scheduledDate: "2026-04-02", serviceCenter: { name: "长宁站" } },
  { id: 3, orderType: "recycle", status: "in_progress", scheduledDate: "2026-04-03", serviceCenter: { name: "静安站" } },
  { id: 4, orderType: "recycle", status: "cancelled", scheduledDate: "2026-04-04", serviceCenter: { name: "普陀站" } },
  { id: 5, orderType: "donation", status: "submitted", scheduledDate: "2026-04-05", serviceCenter: { name: "浦东站" } },
];

function makeStore() {
  const storeList = ref([]);
  const fetchList = vi.fn().mockImplementation(async () => {
    storeList.value = [...SAMPLE_ORDERS];
    return {
      list: storeList.value,
      total: SAMPLE_ORDERS.length,
      page: 1,
      pageSize: 10,
    };
  });
  const store = {
    fetchList,
    list: storeList,
    loading: ref(false),
    errorText: ref(""),
    statusStats: computed(() => ({
      pending: storeList.value.filter((o) => o.status === "pending_review" || o.status === "submitted").length,
      processing: storeList.value.filter((o) => o.status === "in_progress").length,
      completed: storeList.value.filter((o) => o.status === "completed").length,
      cancelled: storeList.value.filter((o) => o.status === "cancelled").length,
      total: storeList.value.length,
    })),
  };
  return store;
}

describe(`ORDER_TABS / ORDER_SERVICE_TYPES / STATUS_STAGE / SERVICE_TYPE_CLASS 常量`, () => {
  it(`ORDER_TABS 以"全部记录"为首项`, () => {
    expect(ORDER_TABS[0]).toBe("全部记录");
    expect(ORDER_TABS).toContain("回收预约");
    expect(ORDER_TABS).toContain("公益捐赠");
  });

  it(`ORDER_SERVICE_TYPES 以"所有服务类型"为首项并包含 4 类`, () => {
    expect(ORDER_SERVICE_TYPES[0]).toBe("所有服务类型");
    expect(ORDER_SERVICE_TYPES).toHaveLength(4);
  });
});

describe(`isDonationOrder / isRecyclingOrder 类型判别`, () => {
  it(`orderType="donation" → isDonationOrder true`, () => {
    expect(isDonationOrder({ orderType: "donation" })).toBe(true);
  });

  it(`orderType="recycle" → isRecyclingOrder true`, () => {
    expect(isRecyclingOrder({ orderType: "recycle" })).toBe(true);
  });

  it("两类互斥", () => {
    expect(isDonationOrder({ orderType: "recycle" })).toBe(false);
    expect(isRecyclingOrder({ orderType: "donation" })).toBe(false);
  });

  it("未知 orderType 与两类都互斥", () => {
    expect(isDonationOrder({ orderType: "remaking" })).toBe(false);
    expect(isRecyclingOrder({ orderType: "remaking" })).toBe(false);
  });

  it("缺 orderType / 空 / 非字符串都返回 false", () => {
    expect(isDonationOrder(null)).toBe(false);
    expect(isDonationOrder({})).toBe(false);
    expect(isDonationOrder({ orderType: "" })).toBe(false);
  });
});

describe("getStatusStage 状态归一", () => {
  it("recycle: completed → completed, cancelled → cancelled", () => {
    expect(getStatusStage({ orderType: "recycle", status: "completed" })).toBe(STATUS_STAGE.COMPLETED);
    expect(getStatusStage({ orderType: "recycle", status: "cancelled" })).toBe(STATUS_STAGE.CANCELLED);
  });

  it("recycle: pending_review/confirmed → pending; assigned/in_progress/weighed → processing", () => {
    expect(getStatusStage({ orderType: "recycle", status: "pending_review" })).toBe(STATUS_STAGE.PENDING);
    expect(getStatusStage({ orderType: "recycle", status: "confirmed" })).toBe(STATUS_STAGE.PENDING);
    expect(getStatusStage({ orderType: "recycle", status: "assigned" })).toBe(STATUS_STAGE.PROCESSING);
    expect(getStatusStage({ orderType: "recycle", status: "in_progress" })).toBe(STATUS_STAGE.PROCESSING);
    expect(getStatusStage({ orderType: "recycle", status: "weighed" })).toBe(STATUS_STAGE.PROCESSING);
  });

  it("donation: submitted → pending; completed → completed; cancelled → cancelled", () => {
    expect(getStatusStage({ orderType: "donation", status: "submitted" })).toBe(STATUS_STAGE.PENDING);
    expect(getStatusStage({ orderType: "donation", status: "completed" })).toBe(STATUS_STAGE.COMPLETED);
    expect(getStatusStage({ orderType: "donation", status: "cancelled" })).toBe(STATUS_STAGE.CANCELLED);
  });

  it("缺 status → pending", () => {
    expect(getStatusStage({ orderType: "recycle" })).toBe(STATUS_STAGE.PENDING);
    expect(getStatusStage(null)).toBe(STATUS_STAGE.PENDING);
  });
});

describe("getServiceTypeClass service 类别映射", () => {
  it(`orderType="recycle" → recycling`, () => {
    expect(getServiceTypeClass({ orderType: "recycle" })).toBe(SERVICE_TYPE_CLASS.RECYCLING);
  });

  it(`orderType="donation" → donation`, () => {
    expect(getServiceTypeClass({ orderType: "donation" })).toBe(SERVICE_TYPE_CLASS.DONATION);
  });

  it("其它 → remaking", () => {
    expect(getServiceTypeClass({ orderType: "remaking" })).toBe(SERVICE_TYPE_CLASS.REMAKING);
    expect(getServiceTypeClass({})).toBe(SERVICE_TYPE_CLASS.REMAKING);
  });
});

describe("useOrdersList() fetch + 状态机", () => {
  beforeEach(() => {
    useOrdersStoreMock.mockReset();
  });

  it("loadOrders 成功: 填充 allOrders, loading=false, errorText 清空", async () => {
    useOrdersStoreMock.mockReturnValue(makeStore());
    const { loading, errorText, allOrders, loadOrders } = useOrdersList();

    expect(allOrders.value).toEqual([]);

    await loadOrders();

    expect(allOrders.value).toEqual(SAMPLE_ORDERS);
    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("");
  });

  it("loadOrders 失败: errorText 写 error.message, allOrders 保持空, loading 仍回归 false", async () => {
    const store = makeStore();
    store.fetchList.mockImplementationOnce(async () => {
      throw new Error("network down");
    });
    useOrdersStoreMock.mockReturnValue(store);

    const { loading, errorText, allOrders, loadOrders } = useOrdersList();

    await loadOrders();

    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("network down");
    expect(allOrders.value).toEqual([]);
  });
});

describe("useOrdersList() filteredOrders 筛选", () => {
  beforeEach(() => {
    useOrdersStoreMock.mockReset();
    useOrdersStoreMock.mockReturnValue(makeStore());
  });

  it("keyword 命中 orderNo/serviceCenter.name", async () => {
    const { keyword, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    keyword.value = "002";
    // 数字 ID 不带 "002" 字面量,改为按 serviceCenter.name
    keyword.value = "长宁";
    expect(filteredOrders.value.map((o) => o.id)).toEqual([2]);

    keyword.value = "静安";
    expect(filteredOrders.value.map((o) => o.id)).toEqual([3]);
  });

  it(`activeTab 切到"公益捐赠"过滤非捐赠`, async () => {
    const { activeTab, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    activeTab.value = "公益捐赠";
    expect(filteredOrders.value.map((o) => o.id).sort()).toEqual([2, 5]);
  });

  it(`activeTab 切到"回收预约"过滤非回收`, async () => {
    const { activeTab, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    activeTab.value = "回收预约";
    expect(filteredOrders.value.map((o) => o.id).sort()).toEqual([1, 3, 4]);
  });

  it("三条件同时生效", async () => {
    const { keyword, activeTab, serviceTypeFilter, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    keyword.value = "站";
    activeTab.value = "回收预约";
    serviceTypeFilter.value = "回收预约";
    expect(filteredOrders.value.map((o) => o.id).sort()).toEqual([1, 3, 4]);
  });
});

describe("useOrdersList() statusStats 状态统计", () => {
  beforeEach(() => {
    useOrdersStoreMock.mockReset();
    useOrdersStoreMock.mockReturnValue(makeStore());
  });

  it("按 status 分组计数, 4 类状态覆盖正确", async () => {
    const { statusStats, loadOrders } = useOrdersList();
    await loadOrders();

    expect(statusStats.value).toEqual({
      total: 5,
      pending: 2,
      processing: 1,
      completed: 1,
      cancelled: 1,
    });
  });
});
```

- [ ] **Step 3: 跑测试**

Run: `cd frontend && npx vitest run src/composables/__tests__/useOrdersList.test.js 2>&1 | tail -20`
Expected: PASS — 全部 case 过。如果有 case fail,根据实际 diff 微调(主要看 statusStats 计算对不对得上 mock 出的 5 条样本)。

- [ ] **Step 4: 跑全部 vitest**

Run: `cd frontend && npx vitest run 2>&1 | tail -10`
Expected: PASS — 全部测试绿(useCharityProjects / useCharityFilters / useOrdersList / useProfileCalendar / useProfileCheckIn 全过)。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/composables/__tests__/useOrdersList.test.js
git commit -m "test(frontend): useOrdersList mock useOrdersStore (replace mock/clientApi)"
```

---

### Task 23: 端到端手测 (Step 8)

**Files:** (无,验证)

- [ ] **Step 1: 启服务**

Run:
- 终端 1: `cd backend && npm run db:migrate:sql && npm run db:seed && npm run dev`
- 终端 2: `cd frontend && npm run dev`

- [ ] **Step 2: 浏览器走完 6 步**

1. `/auth` 登录 `user@szt.com / 123456` → 跳首页
2. `/charity` → 8 个项目渲染,region/urgency/search 三维筛选联动正常
3. 选一个项目 → 滚动到表单 → 提交 → 成功 modal 展示 `orderNo`
4. `/orders` 切"公益捐赠" tab → 看到刚提交那条
5. `/recycle-booking` 填表提交一个回收预约 → `/orders` 看到
6. 退出登录 → 顶栏登录态消失,多 tab 同步刷新

- [ ] **Step 3: DevTools Network 核对**

确认 6 个动作对应的请求都是 `/api/v1/...` 路径,没有 `mock/clientApi` 本地调用、没有 `localStorage.szt_users` 写入(已迁到 backend)。

- [ ] **Step 4: 跑全部测试套件**

Run:
```bash
cd backend && npx jest --no-coverage 2>&1 | tail -10
cd frontend && npx vitest run 2>&1 | tail -10
```
Expected: 全部 PASS。

- [ ] **Step 5: build 验证**

Run: `cd frontend && npx vite build 2>&1 | tail -5`
Expected: 成功。

- [ ] **Step 6: 提交 (如本批有遗漏 fixup)**

如端到端发现 bug,逐个 fix 后独立 commit;若一切顺畅,本 Task 不产生新 commit。

---

## Self-Review 检查

**1. Spec coverage:**

| Spec 章节 | 覆盖 Task |
|----------|----------|
| 4.1 后端 charity 模块 (model + service + routes) | T1, T2, T3, T4 |
| 4.2 捐赠订单写 charityProjectId | T6 |
| 4.3 前端 CharityPage 接线 | T7, T8, T9, T10, T11, T12, T13, T14 |
| 4.4 清理 pass (App/ClientLayout/AuthPage/analyzeImage/charityConstants/auth.js/mock/clientApi.js) | T15, T16, T17, T18, T19, T20, T21 |
| 测试修复 (useOrdersList.test) | T22 |
| 端到端验收 | T23 |
| 数据契约 5.1/5.2 (error codes) | T4 (40401), T6 (40001) |
| 测试与验收 6.1 (后端 jest) | T4 (charity), T6 (donation) |
| 测试与验收 6.2 (前端 vitest) | T8, T9, T22 |
| 测试与验收 6.3 (端到端) | T14, T23 |

**2. Placeholder scan:** 无 "TBD/TODO/类似" 占位。每个 task 的代码块都是完整的、可直接复制的。

**3. Type consistency:**
- `CharityProject` 字段命名: `urgentDaysThreshold / currentProgress / targetProgress / progressUnit / coverImage` — model 定义 (T1) → service pickProjectPayload (T3) → 测试 expect (T4) → 前端 useCharityProjects (T8) → CharityProjectCard prop (T11) 一致。
- `useCharityFilters` 签名: `{ projects, regions }` — composable (T9) → CharityPage (T13) 一致。
- `charityProjectId` 字段名: 校验 (T6) → 写入 (T6) → 前端 payload (T10) 一致。
- `errorText` 字段名: useCharityProjects (T8) → CharityPage template (T13) 一致。

**4. Scope check:** 8 任务 phase × 2-5 步/step,总量在合理工程量内。

---

*Plan 结束 — 准备 subagent-driven execution*
