# C 端第二批 5 接口实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把第二批 5 个仍在走 mock 的 C 端接口迁到真实后端(Home/Faq/Profile/TopBar/Profile 日历),跑通后 mock/timeApi.js 全删、mock/clientApi.js 只剩 AI 函数。

**Architecture:** 后端用 4 张 JSON 单行表(`home_content`/`faq_content`/`site_stats`/`profile_demo_content`)+ 给 `users` 加 `level_text` 列;新增 `modules/content` 与 `modules/metrics` 两个模块;沿用上批次的 `{code, message, data}` 响应与 JWT 鉴权模式。前端用 Pinia `useContentStore` / `useMetricsStore` / `useAuthStore`(扩字段 + 启动期 `refreshFromMe`);日历复用 `ordersStore.fetchList({ dateFrom, dateTo })`。**没有引入新依赖。**

**Tech Stack:** 与上批次完全一致(Express 5 + Sequelize 6 + Pinia 2 + Axios)。无须修改 `package.json` / `.env.example`。

**Spec:** `docs/superpowers/specs/2026-07-07-c-end-content-profile-api-design.md`

**Phase 边界检查点:** 跑完 Phase A 后暂停让用户 review(后端基础的 migration/model 都改 schema,确认 OK 再往下);其它 Phase 之间不强制 review,执行中遇到偏差直接就地修。

---

## 0. 文件结构总览

### 后端新增

```
backend/src/db/models/
├── homeContent.js                       # home_content 表(JSON 单行)
├── faqContent.js                        # faq_content 表(JSON 单行)
├── siteStats.js                         # site_stats 表(列级字段)
└── profileDemoContent.js                # profile_demo_content 表(JSON 单行)

backend/src/modules/
├── content/
│   ├── content.service.js               # home/faq/profile-demo 三个 service
│   └── routes.js                        # /content/{home,faq,profile-demo}
└── metrics/
    ├── metrics.service.js               # top service
    └── routes.js                        # /metrics/top

backend/migrations/
└── <timestamp>-content-and-profile-tables.js  # migration 003

backend/src/db/seeders/
└── 002-demo-content.js                  # 4 行单行内容 + 更新 demo user level_text

backend/__tests__/integration/
├── content.home.test.js
├── content.faq.test.js
├── content.profile-demo.test.js
└── metrics.top.test.js
```

### 后端修改

- `backend/src/db/models/user.js` —— 增加 `levelText` 字段(`field: 'level_text'`)
- `backend/src/db/models/index.js` —— 注册 4 个新 model
- `backend/src/modules/auth/auth.service.js` —— `pickUserPayload` 扩 3 字段
- `backend/src/modules/orders/orders.service.js` —— `listOrders` 接受 `dateFrom / dateTo`
- `backend/src/modules/orders/routes.js` —— 透传 `req.query.dateFrom / dateTo`
- `backend/src/routes/index.js` —— 挂 2 个新模块
- `backend/__tests__/integration/orders.list.test.js` —— 加 2 个 dateFrom/dateTo 用例

### 前端新增

```
frontend/src/
├── api/
│   ├── content.js                       # fetchHomeContent/Faq/ProfileDemo
│   └── metrics.js                       # fetchTopMetrics
└── stores/
    ├── content.js                       # home / faq / profileDemo
    └── metrics.js                       # top(4 字段)
```

### 前端修改

- `frontend/src/stores/auth.js` —— user state 字段扩 `carbonReductionTotal` / `growthValue` / `levelText`;新增 `refreshFromMe()` action
- `frontend/src/main.js` —— 启动期若登录态,自动 `await authStore.refreshFromMe()`
- `frontend/src/views/client/HomePage.vue` —— 改 `useContentStore`
- `frontend/src/views/client/FaqPage.vue` —— 改 `useContentStore`
- `frontend/src/components/common/TopBar.vue` —— 改 `useMetricsStore`
- `frontend/src/views/client/ProfilePage.vue` —— 拆 `authStore.user` + `contentStore.profileDemo` 数据源
- `frontend/src/composables/useProfileCalendar.js` —— 改 `useOrdersStore.fetchList({dateFrom, dateTo})`
- `frontend/src/components/client/profile/ProfileHeaderPanel.vue` —— prop 拆分
- `frontend/src/components/client/profile/ProfileImpactDashboard.vue` —— prop 拆分
- `frontend/src/components/client/profile/ProfileBottomSectionsPanel.vue` —— prop 拆分
- `frontend/src/composables/__tests__/useProfileCalendar.test.js` —— `vi.mock` 切到 stores

### 前端删除

- `frontend/src/mock/timeApi.js`(整文件)—— 见 Task 20

### 前端剪枝(不改文件结构,只删函数)

- `frontend/src/mock/clientApi.js` —— 删 `fetchHomeData` / `fetchFaqData` / `fetchProfileData` / `fetchTopMetrics` + 4 个对应常量 —— 见 Task 21

---

## 1. 任务依赖图

```
Phase A (后端基础)
  T1: migration 003(users.level_text + 4 张表)
  T2: 4 个新 model + index.js 注册
  T3: auth.service.pickUserPayload 扩字段
  T4: orders.service.listOrders + routes 透传 dateFrom/dateTo
   ⏸ Phase 边界:暂停 review

Phase B (后端业务)
  T5: modules/content(home/faq/profile-demo)
  T6: modules/metrics(top)
  T7: seeder 002 + routes/index.js 挂载

Phase C (后端测试)
  T8: content.home.test.js
  T9: content.faq.test.js
  T10: content.profile-demo.test.js
  T11: metrics.top.test.js
  T12: orders.list.test.js 加 dateFrom/dateTo 用例

Phase D (前端基础)
  T13: api/content.js + api/metrics.js
  T14: stores/content.js + stores/metrics.js
  T15: stores/auth.js 扩字段 + refreshFromMe + main.js 启动期刷新

Phase E (前端集成)
  T16: HomePage → contentStore
  T17: FaqPage → contentStore
  T18: TopBar → metricsStore
  T19: useProfileCalendar → ordersStore
  T20: ProfilePage + 3 个子面板拆 prop

Phase F (清理)
  T21: 删 mock/timeApi.js
  T22: mock/clientApi.js 删 4 个死函数 + 4 个常量
  T23: useProfileCalendar.test.js 改 vi.mock
  T24: 最终验证(backend npm test + frontend npm run build)
```

每个 Task 是 1 个独立可 commit 的工作单元。Task 内已包含 verify + commit 步骤,不另设 phase 总 commit。

---

## Phase A:后端基础

### Task 1:migration 003(用户加 level_text + 4 张新表)

**Files:**
- Create: `backend/migrations/<timestamp>-content-and-profile-tables.js`

- [ ] **Step 1.1: 创建 migration 文件**

```bash
cd backend
TS=$(date +%Y%m%d%H%M%S)
touch "migrations/${TS}-content-and-profile-tables.js"
```

实际文件名按上面的命令生成。后续步骤文件路径请把 `<timestamp>` 替换为上一步生成的字符串。

- [ ] **Step 1.2: 写 migration 文件**

```js
// migrations/<timestamp>-content-and-profile-tables.js
// 把第二批内容/统计/Profile demo 数据落到数据库:
//   - users 加 level_text VARCHAR(60) NULL(由 seeder 002 + 注册默认值 null 兜底)
//   - home_content / faq_content / profile_demo_content: 单行 JSON 表(id=1)
//   - site_stats: 4 字段列(将来 B 端可改)
//
// 全部走标准 Sequelize DataTypes;JSON 列在 MySQL 8.0 上以 JSON 类型落地。

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // users 加 level_text
    await queryInterface.addColumn('users', 'level_text', {
      type: Sequelize.STRING(60),
      allowNull: true,
      after: 'growth_value',
    });

    // home_content:单行 JSON
    await queryInterface.createTable('home_content', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // faq_content
    await queryInterface.createTable('faq_content', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // site_stats:列级字段(等 B 端运营改)
    await queryInterface.createTable('site_stats', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      processed_today: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      active_sites: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      avg_response_hour: {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0,
      },
      carbon_reduced_kg: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // profile_demo_content:单行 JSON
    await queryInterface.createTable('profile_demo_content', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.dropTable('profile_demo_content');
    await queryInterface.dropTable('site_stats');
    await queryInterface.dropTable('faq_content');
    await queryInterface.dropTable('home_content');
    await queryInterface.removeColumn('users', 'level_text');
  },
};
```

- [ ] **Step 1.3: 跑 migration**

Run: `cd backend && npm run db:migrate`
Expected: 输出 `== 20...-content-and-profile-tables: migrated =====`

- [ ] **Step 1.4: 验证 users.level_text 已加**

Run: `cd backend && node -e "
require('dotenv').config();
const { sequelize } = require('./src/config/db');
(async () => {
  const [cols] = await sequelize.query('SHOW COLUMNS FROM users WHERE Field = ?', { replacements: ['level_text'] });
  console.log(JSON.stringify(cols));
  process.exit(0);
})();
"`
Expected: 输出形如 `[{"Field":"level_text","Type":"varchar(60)","Null":"YES",...}]`

- [ ] **Step 1.5: 验证 4 张表已建**

Run: `cd backend && node -e "
require('dotenv').config();
const { sequelize } = require('./src/config/db');
(async () => {
  const [rows] = await sequelize.query('SHOW TABLES LIKE \\'home_content\\'');
  console.log('home_content:', rows.length > 0);
  const [rows2] = await sequelize.query('SHOW TABLES LIKE \\'faq_content\\'');
  console.log('faq_content:', rows2.length > 0);
  const [rows3] = await sequelize.query('SHOW TABLES LIKE \\'site_stats\\'');
  console.log('site_stats:', rows3.length > 0);
  const [rows4] = await sequelize.query('SHOW TABLES LIKE \\'profile_demo_content\\'');
  console.log('profile_demo_content:', rows4.length > 0);
  process.exit(0);
})();
"`
Expected: 4 行 `true`

- [ ] **Step 1.6: Commit**

```bash
cd backend && git add migrations/<timestamp>-content-and-profile-tables.js && \
  git commit -m "feat(backend): migration 003 — users.level_text + 4 content/stats tables"
```

---

### Task 2:4 个新 Sequelize model + 在 models/index.js 注册

**Files:**
- Create: `backend/src/db/models/homeContent.js`
- Create: `backend/src/db/models/faqContent.js`
- Create: `backend/src/db/models/siteStats.js`
- Create: `backend/src/db/models/profileDemoContent.js`
- Modify: `backend/src/db/models/user.js`(加 levelText 字段)
- Modify: `backend/src/db/models/index.js`(注册 4 个新 model)

- [ ] **Step 2.1: 修改 `backend/src/db/models/user.js`**

在 `growthValue` 字段定义之后、`lastLoginAt` 字段之前,加:

```js
      levelText: {
        type: DataTypes.STRING(60),
        allowNull: true,
        field: 'level_text',
      },
```

(保留文件顶部 / 底部其它内容不动。)

- [ ] **Step 2.2: 创建 `backend/src/db/models/homeContent.js`**

```js
// db/models/homeContent.js
// 单行 JSON 表(始终 id=1)。
// 角色:HomePage 的 hero / heroStats / principleRail / cityStages / institutionSteps / contacts。

module.exports = (sequelize, DataTypes) => {
  const HomeContent = sequelize.define(
    'HomeContent',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      tableName: 'home_content',
      timestamps: true,
      updatedAt: 'updated_at',
      createdAt: false,
    }
  );
  return HomeContent;
};
```

- [ ] **Step 2.3: 创建 `backend/src/db/models/faqContent.js`**

```js
// db/models/faqContent.js
// 单行 JSON 表(始终 id=1)。
// 角色:FaqPage 的 standards / faqs / science / diy。

module.exports = (sequelize, DataTypes) => {
  const FaqContent = sequelize.define(
    'FaqContent',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      tableName: 'faq_content',
      timestamps: true,
      updatedAt: 'updated_at',
      createdAt: false,
    }
  );
  return FaqContent;
};
```

- [ ] **Step 2.4: 创建 `backend/src/db/models/siteStats.js`**

```js
// db/models/siteStats.js
// 4 字段列(不是 JSON),将来 B 端可按字段改。
// 角色:TopBar 用的运营数字。

module.exports = (sequelize, DataTypes) => {
  const SiteStats = sequelize.define(
    'SiteStats',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      processedToday: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'processed_today',
      },
      activeSites: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'active_sites',
      },
      avgResponseHour: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0,
        field: 'avg_response_hour',
      },
      carbonReducedKg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'carbon_reduced_kg',
      },
    },
    {
      tableName: 'site_stats',
      timestamps: true,
      updatedAt: 'updated_at',
      createdAt: false,
    }
  );
  return SiteStats;
};
```

- [ ] **Step 2.5: 创建 `backend/src/db/models/profileDemoContent.js`**

```js
// db/models/profileDemoContent.js
// 单行 JSON 表(始终 id=1)。
// 角色:ProfilePage 的 tracks / weeklyTrend / badges / menu 等静态 demo 数据。

module.exports = (sequelize, DataTypes) => {
  const ProfileDemoContent = sequelize.define(
    'ProfileDemoContent',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      tableName: 'profile_demo_content',
      timestamps: true,
      updatedAt: 'updated_at',
      createdAt: false,
    }
  );
  return ProfileDemoContent;
};
```

- [ ] **Step 2.6: 在 `backend/src/db/models/index.js` 注册 4 个新 model**

读文件后,在 `RecycleOrder = require('./recycleOrder')(sequelize, Sequelize.DataTypes);` 之后追加:

```js
const HomeContent        = require('./homeContent')(sequelize, Sequelize.DataTypes);
const FaqContent         = require('./faqContent')(sequelize, Sequelize.DataTypes);
const SiteStats          = require('./siteStats')(sequelize, Sequelize.DataTypes);
const ProfileDemoContent = require('./profileDemoContent')(sequelize, Sequelize.DataTypes);
```

然后在 `module.exports = { ... }` 里追加:

```js
    HomeContent,
    FaqContent,
    SiteStats,
    ProfileDemoContent,
```

**注意:** 这 4 张表无外键,无须 `hasMany / belongsTo`。

- [ ] **Step 2.7: 验证 model 字段生效**

Run: `cd backend && node -e "
require('dotenv').config();
const { HomeContent, FaqContent, SiteStats, ProfileDemoContent, User } = require('./src/db/models');
console.log('HomeContent.tableName:', HomeContent.tableName);
console.log('FaqContent.tableName:', FaqContent.tableName);
console.log('SiteStats.tableName:', SiteStats.tableName);
console.log('ProfileDemoContent.tableName:', ProfileDemoContent.tableName);
console.log('User rawAttributes.levelText.field:', User.rawAttributes.levelText.field);
"`
Expected: 5 行输出,分别包含 `home_content` / `faq_content` / `site_stats` / `profile_demo_content` / `level_text`

- [ ] **Step 2.8: Commit**

```bash
cd backend && git add src/db/models/ && \
  git commit -m "feat(backend): add models for home_content/faq_content/site_stats/profile_demo_content + users.levelText"
```

---

### Task 3:`auth.service.pickUserPayload` 扩 3 字段

**Files:**
- Modify: `backend/src/modules/auth/auth.service.js`(`pickUserPayload` 函数体)

- [ ] **Step 3.1: 修改 `pickUserPayload`**

读 `backend/src/modules/auth/auth.service.js`,把 `pickUserPayload` 函数体改成:

```js
function pickUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    pointsBalance: user.pointsBalance,
    carbonReductionTotal: user.carbonReductionTotal,
    growthValue: user.growthValue,
    levelText: user.levelText,
  };
}
```

- [ ] **Step 3.2: 验证 service 正常返回新字段**

Run: `cd backend && node -e "
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('./src/db/models');
const authService = require('./src/modules/auth/auth.service');
(async () => {
  const hash = await bcrypt.hash('123456', 10);
  const u = await User.create({
    email: 'picktest@example.com',
    passwordHash: hash,
    displayName: 'picker',
    status: 1,
    pointsBalance: 100,
    carbonReductionTotal: 12.5,
    growthValue: 350,
    levelText: 'Lv.2 测试',
  });
  const payload = authService.pickUserPayload(u);
  console.log(JSON.stringify(payload, null, 2));
  await u.destroy({ force: true });
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
"`
Expected: JSON 包含 7 个字段:`id / email / displayName / pointsBalance / carbonReductionTotal / growthValue / levelText`,**不要**包含 `passwordHash`

- [ ] **Step 3.3: Commit**

```bash
cd backend && git add src/modules/auth/auth.service.js && \
  git commit -m "feat(backend): auth pickUserPayload adds carbonReductionTotal/growthValue/levelText"
```

---

### Task 4:`orders.listOrders` 加 `dateFrom / dateTo` + routes.js 透传

**Files:**
- Modify: `backend/src/modules/orders/orders.service.js`(imports + `listOrders`)
- Modify: `backend/src/modules/orders/routes.js`(`/` GET 路由)

- [ ] **Step 4.1: 在 orders.service.js 顶部 imports 加 `Op`**

文件现有 `const { Order, RecycleOrder, DonationOrder, ServiceCenter } = require('../../db/models');` 之后加一行:

```js
const { Op } = require('sequelize');
```

- [ ] **Step 4.2: 修改 `listOrders` 函数签名与 where 拼装**

把 `listOrders` 函数体改成:

```js
async function listOrders(userId, { status, dateFrom, dateTo, page = 1, pageSize = 10 } = {}) {
  const where = { userId };
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.scheduledDate = {};
    if (dateFrom) where.scheduledDate[Op.gte] = dateFrom;
    if (dateTo) where.scheduledDate[Op.lte] = dateTo;
  }

  const offset = (page - 1) * pageSize;
  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [
      { model: RecycleOrder, as: 'recycleDetail' },
      { model: DonationOrder, as: 'donationDetail' },
      { model: ServiceCenter, as: 'serviceCenter' },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
  });

  const list = rows.map((o) =>
    pickOrderPayload(o, o.recycleDetail, o.donationDetail, o.serviceCenter),
  );
  return { list, total: count, page, pageSize };
}
```

- [ ] **Step 4.3: 修改 routes.js `/` GET 路由**

读 `backend/src/modules/orders/routes.js`,把 `router.get('/', ...)` 处理函数改成:

```js
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await service.listOrders(req.user.id, {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 10,
    });
    res.json(ok(data));
  }),
);
```

- [ ] **Step 4.4: 验证语法**

Run: `cd backend && node -e "const r = require('./src/modules/orders/routes'); console.log(typeof r);"`
Expected: `function`

- [ ] **Step 4.5: Commit**

```bash
cd backend && git add src/modules/orders/ && \
  git commit -m "feat(backend): orders listOrders supports dateFrom/dateTo"
```

---

## ⏸ Phase A 完成 — 暂停让用户 review

跑完上面 4 个 commit 后,暂停一下告诉用户:schema 改完了,验证 OK 再继续 Phase B。可以用 `git log --oneline -5` 给用户看最近的 commit。

---

## Phase B:后端业务

### Task 5:`modules/content` —— home/faq/profile-demo 三个 service + 路由

**Files:**
- Create: `backend/src/modules/content/content.service.js`
- Create: `backend/src/modules/content/routes.js`

- [ ] **Step 5.1: 创建 `backend/src/modules/content/content.service.js`**

```js
// modules/content/content.service.js
// 静态内容三件套:home / faq / profile-demo。
// 失败抛 ApiError;成功返回 payload 整体。

const { HomeContent, FaqContent, ProfileDemoContent } = require('../../db/models');
const ApiError = require('../../utils/ApiError');

async function getHome() {
  const row = await HomeContent.findByPk(1);
  if (!row) throw new ApiError(40401, '首页内容不存在');
  return row.payload;
}

async function getFaq() {
  const row = await FaqContent.findByPk(1);
  if (!row) throw new ApiError(40401, '常见问题内容不存在');
  return row.payload;
}

async function getProfileDemo() {
  const row = await ProfileDemoContent.findByPk(1);
  if (!row) throw new ApiError(40401, '个人中心示例内容不存在');
  return row.payload;
}

module.exports = { getHome, getFaq, getProfileDemo };
```

- [ ] **Step 5.2: 创建 `backend/src/modules/content/routes.js`**

```js
// modules/content/routes.js
// GET /api/v1/client/content/home        公开
// GET /api/v1/client/content/faq         公开
// GET /api/v1/client/content/profile-demo 需登录

const express = require('express');
const authMiddleware = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const contentService = require('./content.service');

const router = express.Router();

router.get(
  '/home',
  asyncHandler(async (req, res) => {
    const data = await contentService.getHome();
    res.json(ok(data));
  }),
);

router.get(
  '/faq',
  asyncHandler(async (req, res) => {
    const data = await contentService.getFaq();
    res.json(ok(data));
  }),
);

router.get(
  '/profile-demo',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await contentService.getProfileDemo();
    res.json(ok(data));
  }),
);

module.exports = router;
```

- [ ] **Step 5.3: 验证语法**

Run: `cd backend && node -e "const r = require('./src/modules/content/routes'); console.log(typeof r);"`
Expected: `function`

- [ ] **Step 5.4: Commit**

```bash
cd backend && git add src/modules/content/ && \
  git commit -m "feat(backend): add content module (home/faq/profile-demo)"
```

---

### Task 6:`modules/metrics` —— top service + 路由

**Files:**
- Create: `backend/src/modules/metrics/metrics.service.js`
- Create: `backend/src/modules/metrics/routes.js`

- [ ] **Step 6.1: 创建 `backend/src/modules/metrics/metrics.service.js`**

```js
// modules/metrics/metrics.service.js
// TopBar 用的运营统计。失败抛 ApiError;成功返回 4 字段(数字)。

const { SiteStats } = require('../../db/models');
const ApiError = require('../../utils/ApiError');

function pickTopPayload(s) {
  return {
    processedToday: s.processedToday,
    activeSites: s.activeSites,
    avgResponseHour: Number(s.avgResponseHour),
    carbonReducedKg: Number(s.carbonReducedKg),
  };
}

async function getTop() {
  const row = await SiteStats.findByPk(1);
  if (!row) throw new ApiError(40401, '运营统计不存在');
  return pickTopPayload(row);
}

module.exports = { getTop };
```

- [ ] **Step 6.2: 创建 `backend/src/modules/metrics/routes.js`**

```js
// modules/metrics/routes.js
// GET /api/v1/client/metrics/top  公开

const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const metricsService = require('./metrics.service');

const router = express.Router();

router.get(
  '/top',
  asyncHandler(async (req, res) => {
    const data = await metricsService.getTop();
    res.json(ok(data));
  }),
);

module.exports = router;
```

- [ ] **Step 6.3: 验证语法**

Run: `cd backend && node -e "const r = require('./src/modules/metrics/routes'); console.log(typeof r);"`
Expected: `function`

- [ ] **Step 6.4: Commit**

```bash
cd backend && git add src/modules/metrics/ && \
  git commit -m "feat(backend): add metrics module (top)"
```

---

### Task 7:seeder 002 + 挂路由到 `routes/index.js`

**Files:**
- Create: `backend/src/db/seeders/002-demo-content.js`
- Modify: `backend/src/routes/index.js`

- [ ] **Step 7.1: 创建 `backend/src/db/seeders/002-demo-content.js`**

```js
// db/seeders/002-demo-content.js
// 第二批 demo 内容 seeder(幂等)。
// 职责:
//   - 在 home_content / faq_content / site_stats / profile_demo_content 各插一行 (id=1)
//   - 给 user@szt.com 写 level_text = 'Lv.4 城市循环合伙人'
// 使用方: npm run db:seed
// 幂等:全部走 findOrCreate + findOne + 直接 update。

const { HomeContent, FaqContent, SiteStats, ProfileDemoContent, User } = require('../models');

module.exports = {
  async up() {
    // 1) home_content(id=1)
    const homePayload = {
      hero: { primaryCta: { to: '/ai-identify' } },
      heroStats: [
        { value: '18,240+', label: '累计服务家庭' },
        { value: '286 吨', label: '进入再生链路的旧物' },
        { value: '96.4%', label: '上门准时完成率' },
        { value: '39', label: '社区协同网点' },
      ],
      principleRail: [
        {
          title: '识别先行',
          note: '用对话和图片识别降低判断成本，让用户先知道怎么分，再决定如何回收。',
        },
        {
          title: '智能调度',
          note: '系统根据品类、地址、时间段和机构运力自动匹配最近可服务网点。',
        },
        {
          title: '结果可追踪',
          note: '每一笔回收都形成订单、积分和减排记录，用户与机构都能看到结果。',
        },
      ],
      cityStages: [
        {
          title: '居民发起',
          text: '从看不懂分类，到几秒钟完成识别和预约，把环保动作变成一件轻松的小事。',
          metric: '平均决策时长缩短 43%',
        },
        {
          title: '社区协同',
          text: '社区回收点、志愿者和服务站统一协同，让不同街区也能共享同一套处理逻辑。',
          metric: '履约效率提升 29%',
        },
        {
          title: '机构回流',
          text: '机构在管理端获得更稳定的派单、入库和复用数据，提升运营连续性。',
          metric: '月度复用率持续增长',
        },
      ],
      institutionSteps: [
        '提交机构资质、覆盖片区与主营回收品类。',
        '接入平台审核与调度规则，建立订单协作关系。',
        '开通机构管理端，查看派单、仓储、排班和报表。',
        '参与城市联营计划，联合开展社区回收活动。',
      ],
      contacts: [
        '商务合作：bd@shouzhitong.cn',
        '机构入驻：partner@shouzhitong.cn',
        '用户支持：400-8855-227',
        '总部地址：上海市徐汇区龙漕路 299 号绿创港 A2',
      ],
    };
    await HomeContent.findOrCreate({
      where: { id: 1 },
      defaults: { payload: homePayload },
    });

    // 2) faq_content(id=1)
    const faqPayload = {
      standards: [
        { name: '可回收物', text: '纸类、塑料、金属、玻璃及其制品，尽量保持清洁干燥后投放。' },
        { name: '有害垃圾', text: '电池、灯管、过期药品、油漆桶等需进入专门回收链路。' },
        { name: '厨余垃圾', text: '剩菜剩饭、果皮、茶渣等易腐有机物，应与包装分离投放。' },
        { name: '其他垃圾', text: '受污染纸巾、一次性餐具、破损陶瓷等难以回收的生活废弃物。' },
      ],
      faqs: [
        {
          category: '塑料类',
          q: '塑料瓶盖需要单独拧开吗？',
          a: '建议瓶身与瓶盖分开投放，便于后续按材质分拣；瓶内液体也要尽量倒空。',
        },
        {
          category: '外卖类',
          q: '外卖盒可以直接扔进可回收物吗？',
          a: '先清掉剩余油污和食物残渣，简单冲洗后再投放，会更利于再生处理。',
        },
        {
          category: '家具类',
          q: '旧家具只能丢弃吗？',
          a: '能复用的家具建议优先捐赠或二次流转；无法复用时再预约大件上门回收。',
        },
        {
          category: '有害类',
          q: '过期药品可以混入厨余垃圾吗？',
          a: '不可以。过期药品应投入社区药品回收箱，避免污染水体和土壤。',
        },
      ],
      science: [
        '1 吨废纸回收后，通常可减少约 17 棵树木砍伐。',
        '铝罐回收再造的能耗，仅为原生铝生产的约 5%。',
        '厨余资源化可以进一步转化为生物质能源与土壤改良材料。',
      ],
      diy: [
        '玻璃瓶改造：阳台水培小花器',
        '旧 T 恤改造：无缝环保购物袋',
        '纸箱改造：桌面抽屉收纳格',
      ],
    };
    await FaqContent.findOrCreate({
      where: { id: 1 },
      defaults: { payload: faqPayload },
    });

    // 3) site_stats(id=1) — 列级字段
    const exists3 = await SiteStats.findByPk(1);
    if (!exists3) {
      await SiteStats.create({
        processedToday: 421,
        activeSites: 39,
        avgResponseHour: 2.1,
        carbonReducedKg: 1860,
      });
    }

    // 4) profile_demo_content(id=1)
    const demoPayload = {
      tracks: [
        { name: '回收活跃度', value: 82 },
        { name: '分类准确率', value: 91 },
        { name: '社区参与度', value: 68 },
      ],
      weeklyTrend: [42, 54, 61, 48, 68, 72, 77],
      badges: ['连续 4 周回收', '旧衣分类达标', '社区环保志愿者'],
      menu: ['地址管理', '回收偏好', '积分兑换', '隐私设置'],
    };
    await ProfileDemoContent.findOrCreate({
      where: { id: 1 },
      defaults: { payload: demoPayload },
    });

    // 5) demo user 写 level_text
    const user = await User.findOne({ where: { email: 'user@szt.com' } });
    if (user && !user.levelText) {
      user.levelText = 'Lv.4 城市循环合伙人';
      await user.save({ fields: ['levelText'] });
    }

    console.log('OK: 4 张内容/统计/demo 表已就位 + demo user.levelText 已写入');
  },

  async down() {
    await ProfileDemoContent.destroy({ where: {}, truncate: true, restartIdentity: true });
    await SiteStats.destroy({ where: {}, truncate: true, restartIdentity: true });
    await FaqContent.destroy({ where: {}, truncate: true, restartIdentity: true });
    await HomeContent.destroy({ where: {}, truncate: true, restartIdentity: true });
    const user = await User.findOne({ where: { email: 'user@szt.com' } });
    if (user) {
      user.levelText = null;
      await user.save({ fields: ['levelText'] });
    }
    console.log('OK: demo content 已清理');
  },
};
```

- [ ] **Step 7.2: 修改 `backend/src/routes/index.js`**

把现有的 3 行模块挂载:

```js
router.use('/v1/client/auth', require('../modules/auth/routes'));
router.use('/v1/client/orders', require('../modules/orders/routes'));
router.use('/v1/client/service-centers', require('../modules/service-centers/routes'));
```

之后追加 2 行:

```js
router.use('/v1/client/content', require('../modules/content/routes'));
router.use('/v1/client/metrics', require('../modules/metrics/routes'));
```

(并把文件顶部注释从 "auth / orders / service-centers" 改成 "auth / orders / service-centers / content / metrics"。)

- [ ] **Step 7.3: 跑 seeder**

Run: `cd backend && npm run db:seed`
Expected: 输出 `OK: 4 张内容/统计/demo 表已就位 + demo user.levelText 已写入`

- [ ] **Step 7.4: 验证内容已落地**

Run: `cd backend && node -e "
require('dotenv').config();
const { HomeContent, FaqContent, SiteStats, ProfileDemoContent, User } = require('./src/db/models');
(async () => {
  const h = await HomeContent.findByPk(1);
  const f = await FaqContent.findByPk(1);
  const s = await SiteStats.findByPk(1);
  const p = await ProfileDemoContent.findByPk(1);
  const u = await User.findOne({ where: { email: 'user@szt.com' } });
  console.log('home.heroStats.length:', h.payload.heroStats.length);
  console.log('faq.faqs.length:', f.payload.faqs.length);
  console.log('siteStats.processedToday:', s.processedToday);
  console.log('profileDemo.tracks.length:', p.payload.tracks.length);
  console.log('user.levelText:', u.levelText);
  process.exit(0);
})();
"`
Expected: 5 行非空输出:
- `home.heroStats.length: 4`
- `faq.faqs.length: 4`
- `siteStats.processedToday: 421`
- `profileDemo.tracks.length: 3`
- `user.levelText: Lv.4 城市循环合伙人`

- [ ] **Step 7.5: 启动 dev server 验证路由**

Run: `cd backend && JWT_SECRET=test_secret_for_dev_only npm run dev` (background)
Expected: 输出 `🚀 收智通后端服务已启动: http://localhost:8080`

Run: `curl -s http://localhost:8080/api/v1/client/content/home | head -c 300`
Expected: `{"code":0,"message":"ok","data":{"hero":...,"heroStats":[...]}}` —— 即 payload 整体在 data 里

Run: `curl -s http://localhost:8080/api/v1/client/metrics/top`
Expected: `{"code":0,"message":"ok","data":{"processedToday":421,"activeSites":39,"avgResponseHour":2.1,"carbonReducedKg":1860}}`

- [ ] **Step 7.6: 停 dev server**

用 TaskStop 关掉后台 task。

- [ ] **Step 7.7: Commit**

```bash
cd backend && git add src/db/seeders/002-demo-content.js src/routes/index.js && \
  git commit -m "feat(backend): seeder 002 (4 content tables + demo user.level_text) + route registrations"
```

---

## Phase C:后端集成测试

> 沿用上批次 `__tests__/integration/setup.js`(全局 sqlite-memory + sequelize sync force:true)。新写 4 个测试文件 + 给 `orders.list.test.js` 加 2 个用例。

### Task 8:`content.home.test.js`

**Files:**
- Create: `backend/__tests__/integration/content.home.test.js`

- [ ] **Step 8.1: 写测试文件**

```js
// __tests__/integration/content.home.test.js

const request = require('supertest');
const app = require('../../src/app');
const { HomeContent } = require('../../src/db/models');

describe('GET /api/v1/client/content/home', () => {
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
```

- [ ] **Step 8.2: 跑测试**

Run: `cd backend && npx jest __tests__/integration/content.home.test.js`
Expected: `PASS` 3 个 test

- [ ] **Step 8.3: Commit**

```bash
cd backend && git add __tests__/integration/content.home.test.js && \
  git commit -m "test(backend): add content.home integration tests"
```

---

### Task 9:`content.faq.test.js`

**Files:**
- Create: `backend/__tests__/integration/content.faq.test.js`

- [ ] **Step 9.1: 写测试文件**

```js
// __tests__/integration/content.faq.test.js

const request = require('supertest');
const app = require('../../src/app');
const { FaqContent } = require('../../src/db/models');

describe('GET /api/v1/client/content/faq', () => {
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
```

- [ ] **Step 9.2: 跑测试**

Run: `cd backend && npx jest __tests__/integration/content.faq.test.js`
Expected: 3 个 test 全 PASS

- [ ] **Step 9.3: Commit**

```bash
cd backend && git add __tests__/integration/content.faq.test.js && \
  git commit -m "test(backend): add content.faq integration tests"
```

---

### Task 10:`content.profile-demo.test.js`(需登录)

**Files:**
- Create: `backend/__tests__/integration/content.profile-demo.test.js`

- [ ] **Step 10.1: 写测试文件**

```js
// __tests__/integration/content.profile-demo.test.js

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { ProfileDemoContent, User } = require('../../src/db/models');

describe('GET /api/v1/client/content/profile-demo', () => {
  let token;

  beforeEach(async () => {
    await ProfileDemoContent.destroy({ where: {}, truncate: true, restartIdentity: true });
    await User.destroy({ where: {}, truncate: true, restartIdentity: true });

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
```

- [ ] **Step 10.2: 跑测试**

Run: `cd backend && npx jest __tests__/integration/content.profile-demo.test.js`
Expected: 3 个 test 全 PASS

- [ ] **Step 10.3: Commit**

```bash
cd backend && git add __tests__/integration/content.profile-demo.test.js && \
  git commit -m "test(backend): add content.profile-demo integration tests (auth required)"
```

---

### Task 11:`metrics.top.test.js`

**Files:**
- Create: `backend/__tests__/integration/metrics.top.test.js`

- [ ] **Step 11.1: 写测试文件**

```js
// __tests__/integration/metrics.top.test.js

const request = require('supertest');
const app = require('../../src/app');
const { SiteStats } = require('../../src/db/models');

describe('GET /api/v1/client/metrics/top', () => {
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
```

- [ ] **Step 11.2: 跑测试**

Run: `cd backend && npx jest __tests__/integration/metrics.top.test.js`
Expected: 3 个 test 全 PASS

- [ ] **Step 11.3: Commit**

```bash
cd backend && git add __tests__/integration/metrics.top.test.js && \
  git commit -m "test(backend): add metrics.top integration tests"
```

---

### Task 12:`orders.list.test.js` 加 dateFrom/dateTo 用例

**Files:**
- Modify: `backend/__tests__/integration/orders.list.test.js`

- [ ] **Step 12.1: 读现有测试文件**

Run: `cd backend && cat __tests__/integration/orders.list.test.js | tail -20`

(了解现有 `beforeEach` 怎么建用户/取 token、现有 case 的命名风格与位置。)

- [ ] **Step 12.2: 在最后一个 test 之后追加 2 个新 test**

在 `});`(整个 describe 块的结尾)前插入:

```js

  test('dateFrom 过滤 → 只返回 >= dateFrom 的订单', async () => {
    // 一条 2026-12-01,一条 2026-12-15
    await request(app)
      .post('/api/v1/client/orders/recycle')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: '小家电', weightBand: '5-10kg', estimatedWeight: 6.5,
        scheduledDate: '2026-12-01', scheduledPeriod: '09:00-12:00',
        contactName: '张三', contactPhone: '13800001111', addressSnapshot: '...',
      });
    await request(app)
      .post('/api/v1/client/orders/recycle')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: '小家电', weightBand: '5-10kg', estimatedWeight: 6.5,
        scheduledDate: '2026-12-15', scheduledPeriod: '09:00-12:00',
        contactName: '张三', contactPhone: '13800001111', addressSnapshot: '...',
      });

    const res = await request(app)
      .get('/api/v1/client/orders?dateFrom=2026-12-10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.list[0].scheduledDate).toBe('2026-12-15');
  });

  test('dateFrom + dateTo 夹逼 → 返回范围以内', async () => {
    // 3 条: 12-01, 12-15, 12-30
    for (const date of ['2026-12-01', '2026-12-15', '2026-12-30']) {
      await request(app)
        .post('/api/v1/client/orders/recycle')
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: '小家电', weightBand: '5-10kg', estimatedWeight: 6.5,
          scheduledDate: date, scheduledPeriod: '09:00-12:00',
          contactName: '张三', contactPhone: '13800001111', addressSnapshot: '...',
        });
    }

    const res = await request(app)
      .get('/api/v1/client/orders?dateFrom=2026-12-10&dateTo=2026-12-20')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.list[0].scheduledDate).toBe('2026-12-15');
  });
```

- [ ] **Step 12.3: 跑全部 orders 测试**

Run: `cd backend && npx jest __tests__/integration/orders.list.test.js`
Expected: 原有 3 个 + 新增 2 个 = 5 个 test 全 PASS

- [ ] **Step 12.4: 跑全部后端测试**

Run: `cd backend && npm test`
Expected: 全过(8 auth + 4 recycle + 3 donation + 5 orders-list + 3 content.home + 3 content.faq + 3 content.profile-demo + 3 metrics.top = 32 个;具体数字以实际为准)

- [ ] **Step 12.5: Commit**

```bash
cd backend && git add __tests__/integration/orders.list.test.js && \
  git commit -m "test(backend): orders.list covers dateFrom/dateTo filtering"
```

---

## Phase D:前端基础

### Task 13:`api/content.js` + `api/metrics.js`

**Files:**
- Create: `frontend/src/api/content.js`
- Create: `frontend/src/api/metrics.js`

- [ ] **Step 13.1: 创建 `frontend/src/api/content.js`**

```js
// api/content.js
// 公开 + 需登录(后端挂载 authMiddleware)
// 调用方: stores/content.js

import request from "@/utils/request";

export function fetchHomeContent() {
  return request.get("/client/content/home");
}

export function fetchFaqContent() {
  return request.get("/client/content/faq");
}

export function fetchProfileDemoContent() {
  return request.get("/client/content/profile-demo");
}
```

- [ ] **Step 13.2: 创建 `frontend/src/api/metrics.js`**

```js
// api/metrics.js
// TopBar 用的运营统计
// 调用方: stores/metrics.js

import request from "@/utils/request";

export function fetchTopMetrics() {
  return request.get("/client/metrics/top");
}
```

- [ ] **Step 13.3: Commit**

```bash
cd frontend && git add src/api/content.js src/api/metrics.js && \
  git commit -m "feat(frontend): add content + metrics api clients"
```

---

### Task 14:`stores/content.js` + `stores/metrics.js`

**Files:**
- Create: `frontend/src/stores/content.js`
- Create: `frontend/src/stores/metrics.js`

- [ ] **Step 14.1: 创建 `frontend/src/stores/content.js`**

```js
// stores/content.js
// home / faq / profile-demo 三个异步内容块。
// 使用方:HomePage / FaqPage / ProfilePage

import { defineStore } from "pinia";
import * as contentApi from "@/api/content";

export const useContentStore = defineStore("content", {
  state: () => ({
    home: null,
    faq: null,
    profileDemo: null,
    loading: false,
    errorText: "",
  }),

  actions: {
    async fetchHome() {
      this.loading = true;
      this.errorText = "";
      try {
        this.home = await contentApi.fetchHomeContent();
      } catch (e) {
        this.errorText = e.message || "首页内容加载失败";
      } finally {
        this.loading = false;
      }
    },

    async fetchFaq() {
      this.loading = true;
      this.errorText = "";
      try {
        this.faq = await contentApi.fetchFaqContent();
      } catch (e) {
        this.errorText = e.message || "常见问题加载失败";
      } finally {
        this.loading = false;
      }
    },

    async fetchProfileDemo() {
      this.loading = true;
      this.errorText = "";
      try {
        this.profileDemo = await contentApi.fetchProfileDemoContent();
      } catch (e) {
        this.errorText = e.message || "个人中心示例内容加载失败";
      } finally {
        this.loading = false;
      }
    },
  },
});
```

- [ ] **Step 14.2: 创建 `frontend/src/stores/metrics.js`**

```js
// stores/metrics.js
// TopBar 用的运营数字;state 用 0 默认值撑住首屏。
// 使用方:components/common/TopBar.vue

import { defineStore } from "pinia";
import * as metricsApi from "@/api/metrics";

export const useMetricsStore = defineStore("metrics", {
  state: () => ({
    top: {
      processedToday: 0,
      activeSites: 0,
      avgResponseHour: 0,
      carbonReducedKg: 0,
    },
    loading: false,
    errorText: "",
  }),

  actions: {
    async fetchTop() {
      this.loading = true;
      this.errorText = "";
      try {
        const data = await metricsApi.fetchTopMetrics();
        this.top = { ...this.top, ...data };
      } catch (e) {
        this.errorText = e.message || "运营数据加载失败";
      } finally {
        this.loading = false;
      }
    },
  },
});
```

- [ ] **Step 14.3: 验证构建**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: `✓ built in <N>s`,无 error

- [ ] **Step 14.4: Commit**

```bash
cd frontend && git add src/stores/content.js src/stores/metrics.js && \
  git commit -m "feat(frontend): add content + metrics stores"
```

---

### Task 15:`stores/auth.js` 扩 user state + `refreshFromMe` + `main.js` 启动期刷新

**Files:**
- Modify: `frontend/src/stores/auth.js`(getters、actions)
- Modify: `frontend/src/main.js`(启动期调 `refreshFromMe`)

- [ ] **Step 15.1: 修改 `frontend/src/api/auth.js` —— 已有 `fetchMe` 就够了,本 Task 不动**

Run: `cat frontend/src/api/auth.js`
Expected: 应已包含 `export function fetchMe() { return request.get("/client/auth/me"); }`(上一批次 T13 已加,本批次不动)

- [ ] **Step 15.2: 在 `stores/auth.js` 内 `actions` 里加 `refreshFromMe`**

读 `frontend/src/stores/auth.js`,在 `restoreFromStorage()` 之后、`});` 之前,加一个新 action:

```js
    async refreshFromMe() {
      try {
        const data = await authApi.fetchMe();
        this.user = data;
        localStorage.setItem(USER_KEY, JSON.stringify(data));
      } catch {
        // 401 等失败场景:保留旧 user,不强制清。
        // 不在这里调 logout,避免后端暂时不可用时把用户踢掉。
      }
    },
```

(注意:`data` 已是 `pickUserPayload` 完整对象,直接整存 localStorage 即可。)

- [ ] **Step 15.3: 在 `stores/auth.js` 顶部 imports 加 router 已被用到、不变;但 getter 区加 3 个派生字段(可选,看 UI 是否要在 getter 层访问)**

**这一步可选**:若 ProfilePage 直接读 `authStore.user?.carbonReductionTotal`(已在 useAuthStore 暴露的 state 上),不需要 getter。模板 fallback `authStore.user?.levelText || 'Lv.1 入门用户'` 即可。

跳过 getter 改动。如果后续发现需要 `getters` 包装,再补 —— 本批次不在 Plan 中。

- [ ] **Step 15.4: 修改 `frontend/src/main.js`**

读 `frontend/src/main.js`,把下面这段:

```js
const authStore = useAuthStore();
authStore.restoreFromStorage();

app.use(router);
app.mount("#app");
```

改成:

```js
const authStore = useAuthStore();
authStore.restoreFromStorage();

app.use(router);

if (authStore.isAuthed) {
  authStore.refreshFromMe().finally(() => {
    app.mount("#app");
  });
} else {
  app.mount("#app");
}
```

注意:`refreshFromMe` 是 best-effort,失败时仍 mount,不阻塞首屏。

- [ ] **Step 15.5: 验证构建**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: 无 error

- [ ] **Step 15.6: Commit**

```bash
cd frontend && git add src/stores/auth.js src/main.js && \
  git commit -m "feat(frontend): auth refreshFromMe + startup hydration"
```

---

## Phase E:前端集成

### Task 16:HomePage → contentStore

**Files:**
- Modify: `frontend/src/views/client/HomePage.vue`(script 部分)

- [ ] **Step 16.1: 读 HomePage 现状**

读 `frontend/src/views/client/HomePage.vue`,确认现有 `loading / loadError / home` 三个 ref + `loadHome` 函数的位置。

- [ ] **Step 16.2: 修改 HomePage 的 `<script setup>` 部分**

把顶部 imports:

```js
import { fetchHomeData } from "@/mock/clientApi";
```

改成:

```js
import { useContentStore } from "@/stores/content";
```

把 4 个变量:

```js
const loading = ref(true);
const loadError = ref("");
const home = ref(null);

async function loadHome() {
  loading.value = true;
  loadError.value = "";
  try {
    const data = await fetchHomeData();
    home.value = data;
  } catch {
    loadError.value = "首页数据加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}
```

改成:

```js
const contentStore = useContentStore();
const loading = computed(() => contentStore.loading);
const loadError = computed(() => contentStore.errorText);
const home = computed(() => contentStore.home);

async function loadHome() {
  await contentStore.fetchHome();
}
```

- [ ] **Step 16.3: 模板里所有 `home.value.xxx` 替换为 `home.xxx`**

由于现在是 computed(template 自动 unwrap),搜 `home.value` 全局替换为 `home`。

Run: `cd frontend && grep -n "home\.value" src/views/client/HomePage.vue`
(确认确实有这些引用,逐行替换。)

- [ ] **Step 16.4: 验证构建**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: 无 error

- [ ] **Step 16.5: Commit**

```bash
cd frontend && git add src/views/client/HomePage.vue && \
  git commit -m "feat(frontend): HomePage wired to content store"
```

---

### Task 17:FaqPage → contentStore

**Files:**
- Modify: `frontend/src/views/client/FaqPage.vue`(script 部分)

- [ ] **Step 17.1: 修改 FaqPage 的 `<script setup>` 部分**

把顶部 imports:

```js
import { fetchFaqData } from "../../mock/clientApi";
```

改成:

```js
import { useContentStore } from "../../stores/content";
```

把:

```js
const loading = ref(true);
const errorText = ref("");
const faqPayload = ref(null);
```

改成:

```js
const contentStore = useContentStore();
const loading = computed(() => contentStore.loading);
const errorText = computed(() => contentStore.errorText);
const faqPayload = computed(() => contentStore.faq);
```

把 `loadFaq` 函数体改成:

```js
async function loadFaq() {
  await contentStore.fetchFaq();
}
```

- [ ] **Step 17.2: 模板里所有 `faqPayload.value.xxx` 替换为 `faqPayload.xxx`**

Run: `cd frontend && grep -n "faqPayload\.value" src/views/client/FaqPage.vue`
逐行替换 `faqPayload.value` → `faqPayload`。

- [ ] **Step 17.3: 验证构建**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: 无 error

- [ ] **Step 17.4: Commit**

```bash
cd frontend && git add src/views/client/FaqPage.vue && \
  git commit -m "feat(frontend): FaqPage wired to content store"
```

---

### Task 18:TopBar → metricsStore

**Files:**
- Modify: `frontend/src/components/common/TopBar.vue`(script 部分)

- [ ] **Step 18.1: 修改 TopBar 的 `<script setup>` 部分**

把顶部 imports:

```js
import { fetchTopMetrics } from "../../mock/clientApi";
```

改成:

```js
import { useMetricsStore } from "@/stores/metrics";
```

`props` / `emits` / `defineProps` / `defineEmits` 保留不动。

把:

```js
const loading = ref(true);
const metrics = ref({
  processedToday: 0,
  activeSites: 0,
  avgResponseHour: 0,
  carbonReducedKg: 0,
});

async function loadMetrics() {
  loading.value = true;
  try {
    metrics.value = await fetchTopMetrics();
  } finally {
    loading.value = false;
  }
}

onMounted(loadMetrics);
```

改成:

```js
const metricsStore = useMetricsStore();
const loading = computed(() => metricsStore.loading);
const metrics = computed(() => metricsStore.top);

onMounted(() => metricsStore.fetchTop());
```

- [ ] **Step 18.2: 验证构建**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: 无 error

- [ ] **Step 18.3: Commit**

```bash
cd frontend && git add src/components/common/TopBar.vue && \
  git commit -m "feat(frontend): TopBar wired to metrics store"
```

---

### Task 19:`useProfileCalendar` → ordersStore

**Files:**
- Modify: `frontend/src/composables/useProfileCalendar.js`

- [ ] **Step 19.1: 重写 `useProfileCalendar.js`**

整体替换 `frontend/src/composables/useProfileCalendar.js`,新内容:

```js
// useProfileCalendar.js
// 个人中心日历:取本月订单(走 ordersStore),按日聚合,渲染网格。
// 公开 monthBounds / groupByDay 工具给上层 reload / 翻月复用。

import { computed, ref } from "vue";
import { useOrdersStore } from "@/stores/orders";

const HIGHLIGHT_SCROLL_DELAY_MS = 300;
const HIGHLIGHT_PULSE_DELAY_MS = 800;
const HIGHLIGHT_DISPLAY_MS = 3000;

function monthBounds(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { dateFrom: fmt(start), dateTo: fmt(end) };
}

function groupByDay(list) {
  const map = {};
  for (const o of list) {
    if (!o.scheduledDate) continue;
    const day = Number(o.scheduledDate.split("-")[2]);
    if (!map[day]) map[day] = [];
    map[day].push(o);
  }
  return map;
}

export function useProfileCalendar() {
  const ordersStore = useOrdersStore();

  const currentMonth = ref(new Date());
  const calendarDays = ref([]);
  const orderMap = ref({});
  const highlightedDay = ref(null);
  const calendarSectionRef = ref(null);

  function setCalendarSectionRef(el) {
    calendarSectionRef.value = el;
  }

  async function loadMonth(year, month) {
    const { dateFrom, dateTo } = monthBounds(year, month);
    const data = await ordersStore.fetchList({ dateFrom, dateTo, pageSize: 100 });
    orderMap.value = groupByDay(data.list);
  }

  function generateCalendar() {
    const days = [];
    const year = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayAdjusted; i++) {
      days.push({ empty: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const orders = orderMap.value[day] || [];
      const intensity = orders.length > 0 ? Math.min(orders.length, 3) : 0;

      days.push({
        date: date.toISOString().split("T")[0],
        day,
        month: month + 1,
        year,
        intensity,
        emission: intensity * (Math.random() * 4 + 2),
        isToday: date.toDateString() === new Date().toDateString(),
      });
    }

    calendarDays.value = days;
  }

  // 保留旧签名 compatible caller;内部调用 loadMonth
  async function initializeCalendar(realDate, _ordersData) {
    const target = realDate ? new Date(realDate.year, realDate.month, 1) : new Date();
    currentMonth.value = target;
    await loadMonth(target.getFullYear(), target.getMonth());
    generateCalendar();
  }

  async function changeMonth(offset) {
    const newMonth = new Date(currentMonth.value);
    newMonth.setMonth(newMonth.getMonth() + offset);
    currentMonth.value = newMonth;
    await loadMonth(newMonth.getFullYear(), newMonth.getMonth());
    generateCalendar();
  }

  async function highlightToday() {
    await new Promise((resolve) => setTimeout(resolve, HIGHLIGHT_SCROLL_DELAY_MS));
    if (calendarSectionRef.value) {
      calendarSectionRef.value.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    await new Promise((resolve) => setTimeout(resolve, HIGHLIGHT_PULSE_DELAY_MS));
    const todayIndex = calendarDays.value.findIndex((day) => day.isToday);
    if (todayIndex === -1) return;
    highlightedDay.value = todayIndex;
    if (calendarDays.value[todayIndex].intensity === 0) {
      calendarDays.value[todayIndex].intensity = 1;
      calendarDays.value[todayIndex].emission = 2.5;
    }
    setTimeout(() => {
      highlightedDay.value = null;
    }, HIGHLIGHT_DISPLAY_MS);
  }

  const monthText = computed(() => {
    const year = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth() + 1;
    return `${year}年 ${month}月`;
  });

  return {
    currentMonth,
    calendarDays,
    orderMap,
    highlightedDay,
    calendarSectionRef,
    setCalendarSectionRef,
    monthText,
    initializeCalendar,
    generateCalendar,
    changeMonth,
    highlightToday,
  };
}
```

- [ ] **Step 19.2: 验证构建**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: 无 error

- [ ] **Step 19.3: Commit**

```bash
cd frontend && git add src/composables/useProfileCalendar.js && \
  git commit -m "feat(frontend): useProfileCalendar delegates to orders store + monthBounds helper"
```

---

### Task 20:ProfilePage 拆数据源 + 3 个子面板 prop 拆分

**Files:**
- Modify: `frontend/src/views/client/ProfilePage.vue`
- Modify: `frontend/src/components/client/profile/ProfileHeaderPanel.vue`
- Modify: `frontend/src/components/client/profile/ProfileImpactDashboard.vue`
- Modify: `frontend/src/components/client/profile/ProfileBottomSectionsPanel.vue`

- [ ] **Step 20.1: 读 4 个文件了解现状**

读 `frontend/src/views/client/ProfilePage.vue` 完整内容 + 三个子面板的 props 定义(用 grep 找 `:profile=` / `defineProps` 等)。

- [ ] **Step 20.2: 修改 ProfilePage.vue**

(本步骤给你一条主线,具体替换需要看实际文件结构后再实施。)

5 处必要改动:

1. **顶部 imports 加 useAuthStore / useContentStore,删 fetchProfileData / fetchRealDate / fetchCalendarWithOrders imports**:

```js
import { useAuthStore } from "../../stores/auth";
import { useContentStore } from "../../stores/content";
```

把原来的:

```js
import { fetchProfileData } from "../../mock/clientApi";
import { fetchRealDate, fetchCalendarWithOrders } from "../../mock/timeApi";
```

整体删掉。

2. **加 store 引用 + 计算 profile 视图模型(computed)**:

```js
const authStore = useAuthStore();
const contentStore = useContentStore();

const profileName = computed(() => authStore.user?.displayName || "");
const profilePoints = computed(() => Number(authStore.user?.pointsBalance || 0));
const profileCarbon = computed(() => {
  const v = Number(authStore.user?.carbonReductionTotal || 0);
  return `累计减排 ${v} kgCO2`;
});
const profileLevel = computed(() => authStore.user?.levelText || "Lv.1 入门用户");

const demoData = computed(() => contentStore.profileDemo);
const tracks = computed(() => demoData.value?.tracks || []);
const weeklyTrend = computed(() => demoData.value?.weeklyTrend || []);
const badges = computed(() => demoData.value?.badges || []);
const menuItems = computed(() => demoData.value?.menu || []);
```

3. **改写 `loadProfile` 函数**(删本地 `profile` ref,改用 Promise.all 拉两源):

```js
async function loadProfile() {
  loading.value = true;
  errorText.value = "";
  try {
    const now = new Date();
    await Promise.all([
      contentStore.fetchProfileDemo(),
      initializeCalendar({
        year: now.getFullYear(),
        month: now.getMonth(),
        day: now.getDate(),
      }),
    ]);
    checkTodayCheckIn();
  } catch (error) {
    errorText.value = "个人信息加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}
```

(删除 `const profile = ref(null);` —— 不再需要;ProfilePage 不再持有这个 ref,改为传 props 给子面板。)

4. **修改子面板组件用法**(拆 prop):

```html
<ProfileHeaderPanel
  :name="profileName"
  :points="profilePoints"
  :level-text="profileLevel"
  :carbon-text="profileCarbon"
  :guardian-days="guardianDays"
  :level-progress="levelProgress"
  :is-guardian-days-updating="isGuardianDaysUpdating"
  :streak-days="streakDays"
  :has-checked-in-today="hasCheckedInToday"
  :is-streak-animating="isStreakAnimating"
  :show-debug-reset="true"
  @check-in="handleCheckIn"
  @reset-check-in="resetCheckInForTesting"
/>

<ProfileImpactDashboard
  :points="profilePoints"
  :weekly-trend="weeklyTrend"
  :selected-period="selectedPeriod"
  @update:selected-period="selectedPeriod = $event"
/>

<ProfileBottomSectionsPanel
  :tasks="PROFILE_TASKS"
  :achievements="PROFILE_ACHIEVEMENTS"
  :activities="PROFILE_ACTIVITIES"
  :tracks="tracks"
  :badges="badges"
  :menu="menuItems"
  @view-all-achievements="() => {/* TODO: 接入路由跳转 */}"
/>
```

5. **`levelProgress` 改成从 `profilePoints` 读**:

```js
const levelProgress = computed(() => Math.min(100, Math.max(0, (profilePoints.value % 1000) / 10)));
```

(原来是 `profile.value?.points ?? 0`,改用 profilePoints.value。)

- [ ] **Step 20.3: 修改 `ProfileHeaderPanel.vue`**

读组件,原 `defineProps` 里如果有 `profile` 对象,改成接受标量 prop:

```js
const props = defineProps({
  name: { type: String, default: "" },
  points: { type: Number, default: 0 },
  levelText: { type: String, default: "Lv.1 入门用户" },
  carbonText: { type: String, default: "" },
  guardianDays: { type: Number, default: 0 },
  levelProgress: { type: Number, default: 0 },
  isGuardianDaysUpdating: { type: Boolean, default: false },
  streakDays: { type: Number, default: 0 },
  hasCheckedInToday: { type: Boolean, default: false },
  isStreakAnimating: { type: Boolean, default: false },
  showDebugReset: { type: Boolean, default: false },
});
```

模板里所有 `props.profile.xxx` / `profile.xxx` / `profile.value.xxx` 改为读对应标量 prop。落到具体行请按组件实际代码改。

- [ ] **Step 20.4: 修改 `ProfileImpactDashboard.vue`**

`defineProps` 改成:

```js
const props = defineProps({
  points: { type: Number, default: 0 },
  weeklyTrend: { type: Array, default: () => [] },
  selectedPeriod: { type: String, default: "本月" },
});
```

模板里原本从 `props.profile.points` / `props.profile.weeklyTrend` 读的地方改成 `props.points` / `props.weeklyTrend`。

- [ ] **Step 20.5: 修改 `ProfileBottomSectionsPanel.vue`**

`defineProps` 加 3 个新 prop(其它保留):

```js
const props = defineProps({
  tasks: { type: Array, required: true },
  achievements: { type: Array, required: true },
  activities: { type: Array, required: true },
  tracks: { type: Array, default: () => [] },
  badges: { type: Array, default: () => [] },
  menu: { type: Array, default: () => [] },
});
```

模板里 tracks / badges / menu 三个区块的渲染 data source 改为读对应 prop。

- [ ] **Step 20.6: 验证构建**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: 无 error

- [ ] **Step 20.7: Commit**

```bash
cd frontend && git add src/views/client/ProfilePage.vue \
  src/components/client/profile/ProfileHeaderPanel.vue \
  src/components/client/profile/ProfileImpactDashboard.vue \
  src/components/client/profile/ProfileBottomSectionsPanel.vue && \
  git commit -m "feat(frontend): ProfilePage + 3 sub-panels take scalar props from auth + content stores"
```

---

## Phase F:清理

### Task 21:删除 `mock/timeApi.js`(整文件)

**Files:**
- Delete: `frontend/src/mock/timeApi.js`

- [ ] **Step 21.1: 确认无其它 import 后 git rm**

Run: `cd frontend && grep -rln "mock/timeApi\|from.*timeApi" src/ 2>&1 | head -10`
Expected: 无输出(useProfileCalendar 是唯一已知引用,Task 19 已切到 ordersStore,ProfilePage 在 Task 20 也不引用 timeApi)

若 grep 有输出:**不要 rm**,先解决那些 import。

Run: `cd frontend && git rm src/mock/timeApi.js`
Expected: `rm 'frontend/src/mock/timeApi.js'`

- [ ] **Step 21.2: 验证构建**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: 无 error

- [ ] **Step 21.3: Commit**

```bash
cd frontend && git commit -m "chore(frontend): remove legacy mock/timeApi.js (fully dead)"
```

---

### Task 22:`mock/clientApi.js` 删 4 个死函数 + 4 个常量

**Files:**
- Modify: `frontend/src/mock/clientApi.js`

- [ ] **Step 22.1: 确认所有引用已切走**

Run: `cd frontend && grep -rln "fetchHomeData\|fetchFaqData\|fetchProfileData\|fetchTopMetrics" src/ 2>&1`
Expected: 无输出(HomePage / FaqPage / TopBar / ProfilePage 已在 Phase E 切走)

- [ ] **Step 22.2: 删除 `homeData` / `faqData` / `profileData` / `topMetrics` 4 个常量**

读 `frontend/src/mock/clientApi.js`,删除从 `const homeData = {...};` 到 `const topMetrics = {...};` 的 4 段常量定义(连带闭合括号)。

具体常量在哪行不重要,**关键是删掉后剩余 file 里没人引用这些常量**。

- [ ] **Step 22.3: 删除 4 个 export 函数**

在文件里找出并删除:

```js
export async function fetchTopMetrics() { ... }
export async function fetchHomeData() { ... }
export async function fetchProfileData() { ... }
export async function fetchFaqData() { ... }
```

- [ ] **Step 22.4: 验证构建**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: 无 error

- [ ] **Step 22.5: Commit**

```bash
cd frontend && git add src/mock/clientApi.js && \
  git commit -m "chore(frontend): prune legacy fetchHomeData/fetchFaqData/fetchProfileData/fetchTopMetrics"
```

---

### Task 23:`useProfileCalendar.test.js` 改 `vi.mock` 切到 stores

**Files:**
- Modify: `frontend/src/composables/__tests__/useProfileCalendar.test.js`

- [ ] **Step 23.1: 读现有测试**

Run: `cat frontend/src/composables/__tests__/useProfileCalendar.test.js`

- [ ] **Step 23.2: 把 `vi.mock('@/mock/timeApi' / vi.mock('../../mock/timeApi'` 替换为 stub**

最常用写法(按现有 import 路径调整相对深度):

```js
// 在文件顶部
import { vi } from "vitest";
import { ref } from "vue";

vi.mock("@/stores/orders", () => ({
  useOrdersStore: () => ({
    fetchList: vi.fn(async () => ({
      list: [
        // 视用例需要加 mock 订单
      ],
      total: 0,
      page: 1,
      pageSize: 100,
    })),
  }),
}));
```

具体 payload 以原测试期望为准 —— 如果原测试期待特定日期/订单,需要在该 stub 的 list 里塞对应对象。

- [ ] **Step 23.3: 跑测试**

Run: `cd frontend && npx vitest run __tests__/useProfileCalendar.test.js 2>&1 | tail -30`
Expected: 全 PASS

(如 vitest 未配,跳过本 Task;但仍 commit test 文件改动 —— 这是 dead reference 清理。)

- [ ] **Step 24.4: Commit**

```bash
cd frontend && git add src/composables/__tests__/useProfileCalendar.test.js && \
  git commit -m "test(frontend): useProfileCalendar.test mocks useOrdersStore instead of mock/timeApi"
```

---

### Task 24:最终验证

**Files:** 无文件改动,纯运行验证。

- [ ] **Step 24.1: 全量后端测试**

Run: `cd backend && npm test`
Expected: 全过(约 32 个 test:auth 8 + orders 4+3+5=12 + content 9 + metrics 3)

- [ ] **Step 24.2: 前端构建**

Run: `cd frontend && npm run build`
Expected: 无 error,产物落 `frontend/dist/`

- [ ] **Step 24.3: 全仓 grep 验证残留**

Run: `cd "E:/vue/SZTong_vv/frontend" && grep -rln "fetchHomeData\|fetchFaqData\|fetchProfileData\|fetchTopMetrics\|mock/timeApi" src/ 2>&1`
Expected: 无输出

(注意:`mock/clientApi.js` 里 3 个 AI 函数 `analyzeImage / fetchAiQuickQuestions / askAiAssistant` 保留,不算残留。)

- [ ] **Step 24.4: 最终 commit(可选)**

只有当验证全部通过、且 working tree 还有未提交改动时,做一次收尾 commit:

```bash
cd "E:/vue/SZTong_vv" && git status --short && \
  git add -A && git commit -m "chore: end-to-end verification for content/profile batch passed"
```

若 `git status --short` 已空,跳过本步。

---

## 附录 A:常见问题排查

### A.1 migration 跑报"data truncated for column 'level_text'"

`users.level_text` 已有行不带值,`addColumn` 默认 nullable 应该没问题。若仍报错,改用:

```js
allowNull: true,  // 已默认就是 true
```

并确认 BEFORE 步骤没强制 NOT NULL。

### A.2 JSON 列在 sqlite 测试中报错

sqlite 把 JSON 落地为 TEXT,如果 `Sequelize.JSON` validator 失败,在 models 里将 `payload` 类型改为 `DataTypes.TEXT`,并加 `get / set` 钩子做 JSON.parse / stringify。但本批次 4 个测试都只验证"非空 + 字段存在",不涉及深层校验,**应能跑通**。若仍失败,临时关闭 validator:

```js
validate: false,
```

### A.3 `refreshFromMe` 在登录态但后端 401 时把用户踢掉

`refreshFromMe` 实现里 try-catch 失败时**不调 logout**,只 catch 即可。如果未来扩展,记得不要在 catch 里清 token。

### A.4 `authStore.user` 缺新字段(undefined)

老用户的 localStorage 里 `szt_user` JSON 没新字段(如 `carbonReductionTotal`)。启动期 `refreshFromMe` 会从 `/auth/me` 重新拉一遍,覆盖 localStorage。首屏可能出现 undefined 闪一下,模板用 `authStore.user?.levelText || 'Lv.1 入门用户'` 兜底即可。

### A.5 ProfilePage 子面板 prop 改名后旧调用没更新

如果前端 build 报"missing required prop",回 Task 20.3-20.5 检查子面板的 `defineProps` 与 ProfilePage 模板对齐。

### A.6 `mock/clientApi.js` 删错常量导致 build 崩

Step 22.2 删除常量之前,**先在文件内 grep 函数体,确认这些常量没有别处引用**。若 `mock/clientApi.js` 仍引用了 `homeData` / `faqData` / `profileData` / `topMetrics`,先一起删函数体。

### A.7 useProfileCalendar 在 changeMonth 后日历高亮不刷新

日历重渲依赖 `orderMap` 变化 + `generateCalendar` 被调。Task 19 已确保 `changeMonth` 末尾调 `generateCalendar()`。若仍不刷,检查 `orderMap.value` 是否真更新成新的 month 订单。

---

## 附录 B:不在本计划范围(后续批次)

- `frontend/src/App.vue` / `frontend/src/layouts/ClientLayout.vue` 仍 `import getCurrentUser / logout from "@/utils/auth"`,留给未来"utils/auth 全删"批次。
- `frontend/src/mock/clientApi.js` 里 AI 三件套(`analyzeImage / fetchAiQuickQuestions / askAiAssistant`)—— AI 批次。
- `frontend/src/views/client/ProfilePage.vue` 里 `PROFILE_TASKS / PROFILE_ACHIEVEMENTS / PROFILE_ACTIVITIES` —— check-ins / points-logs 批次。
- B 端管理后台(design.md §7)
- 文件上传、refund / 取消订单
- home_content / faq_content / profile_demo_content 字段级管理后台编辑

---

*计划结束*
