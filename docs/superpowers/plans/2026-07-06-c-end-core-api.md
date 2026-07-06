# C 端核心接口第一批实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 C 端最关键的 8 个业务接口从 localStorage mock 迁移到真实后端(Express 5 + MySQL + Sequelize),JWT 鉴权,前端引入 Pinia + Axios,5173+8080 端到端跑通。

**Architecture:** 后端采用 modules/auth|orders|service-centers 三个新模块,沿用 modules/ai 的 routes + service 模式;新增 utils 5 个工具类。前端用 Pinia stores(auth/orders/serviceCenters)持有跨页面状态,api 层封装 axios,composable 改调 store。统一响应 `{code, message, data}`,JWT payload `{id, email, iat, exp}` 7 天过期。

**Tech Stack:** 后端 Express 5 + Sequelize 6 + jsonwebtoken + bcryptjs + Jest + supertest + sqlite-memory(测试);前端 Vue 3 + Pinia + Axios + vue-router。

**Spec:** `docs/superpowers/specs/2026-07-06-c-end-core-api-design.md`

---

## 0. 文件结构总览

### 后端新增

```
backend/src/
├── utils/
│   ├── ApiError.js               # 业务异常类
│   ├── asyncHandler.js           # async 路由 wrapper
│   ├── jwt.js                    # sign/verify
│   ├── password.js               # hash/compare
│   └── response.js               # ok/fail 包装
└── modules/
    ├── auth/
    │   ├── routes.js             # /auth/{register,login,me}
    │   └── auth.service.js
    ├── orders/
    │   ├── routes.js             # /orders + /:id + recycle/donation
    │   └── orders.service.js
    └── service-centers/
        ├── routes.js             # /service-centers + /:code
        └── serviceCenters.service.js

backend/migrations/
└── 002-add-service-center-code-and-donation-snapshots.js

backend/__tests__/integration/
├── setup.js                      # 内存 sqlite + 全局 setup/teardown
├── auth.register.test.js
├── auth.login.test.js
├── orders.recycle.test.js
├── orders.donation.test.js
└── orders.list.test.js
```

### 后端修改

- `backend/src/middlewares/auth.js`(占位 → 真实 JWT 校验)
- `backend/src/routes/index.js`(挂 3 个新模块到 `/v1/client`)
- `backend/src/db/models/serviceCenter.js`(加 `code` 字段)
- `backend/src/db/models/donationOrder.js`(加 `projectTitle` / `projectLocation`)
- `backend/src/db/seeders/001-demo-data.js`(扩 4 service_centers + 4 orders)
- `backend/.env.example`(加 JWT 配置)
- `backend/package.json`(deps: bcryptjs、jsonwebtoken;devDeps: jest、supertest)

### 前端新增

```
frontend/src/
├── utils/
│   └── request.js                # Axios 实例 + 拦截器
├── api/
│   ├── auth.js
│   ├── orders.js
│   └── serviceCenters.js
├── stores/
│   ├── auth.js
│   ├── orders.js
│   └── serviceCenters.js
└── utils/
    └── orderStatus.js            # 7 阶段 → 4 展示阶段映射
```

### 前端修改

- `frontend/src/main.js`(加 Pinia、移除 initAuthSeed、调 restoreFromStorage)
- `frontend/src/router/index.js`(路由守卫改用 authStore)
- `frontend/src/views/auth/AuthPage.vue`(调 store + email 正则)
- `frontend/src/composables/useAppointmentForm.js`(调 ordersStore)
- `frontend/src/composables/useDonationSubmit.js`(调 ordersStore)
- `frontend/src/composables/useOrdersList.js`(调 ordersStore + 状态映射升级)
- `frontend/src/views/client/ServiceCenterDetailPage.vue`(调 serviceCentersStore)

### 前端删除

- `frontend/src/mock/clientApi.js`
- `frontend/src/mock/timeApi.js`
- `frontend/src/utils/auth.js`

---

## 1. 任务依赖图

```
Phase 1 (后端基础)
  T1: 写 utils(5 文件)
  T2: 升级 middlewares/auth.js
  T3: 改 .env.example + package.json

Phase 2 (后端 auth 模块 + schema)
  T4: 写 migration 002 + 改 model
  T5: 写 backend/src/modules/auth/*
  T6: 扩 seeders/001-demo-data.js

Phase 3 (后端 orders + service-centers 模块)
  T7: 写 backend/src/modules/service-centers/*
  T8: 写 backend/src/modules/orders/*

Phase 4 (后端集成测试)
  T9: jest + supertest + sqlite 配置
  T10: auth 集成测试(register + login)
  T11: orders 集成测试(recycle + donation + list)

Phase 5 (前端基础)
  T12: 加 Pinia + 改 main.js
  T13: 写 utils/request.js
  T14: 写 stores/auth.js + api/auth.js + 删 utils/auth.js
  T15: 写 utils/orderStatus.js
  T16: 写 stores/orders.js + api/orders.js
  T17: 写 stores/serviceCenters.js + api/serviceCenters.js

Phase 6 (前端集成)
  T18: 改 router/index.js
  T19: 改 views/auth/AuthPage.vue
  T20: 改 composables/useAppointmentForm.js
  T21: 改 composables/useDonationSubmit.js
  T22: 改 composables/useOrdersList.js
  T23: 改 views/client/ServiceCenterDetailPage.vue
  T24: 删 mock/clientApi.js + mock/timeApi.js

Phase 7 (端到端验证)
  T25: backend + frontend 启动 + 浏览器手动验证
```

每个 Task 是一个独立可 commit 的工作单元。

---

## Phase 1:后端基础

### Task 1:写后端 utils(5 个文件)

**Files:**
- Create: `backend/src/utils/ApiError.js`
- Create: `backend/src/utils/asyncHandler.js`
- Create: `backend/src/utils/jwt.js`
- Create: `backend/src/utils/password.js`
- Create: `backend/src/utils/response.js`

- [ ] **Step 1.1: 创建 `backend/src/utils/ApiError.js`**

```js
// utils/ApiError.js
// 业务异常类 —— service / middleware 用 throw new ApiError(code, msg, httpStatus)
// error middleware 会捕获并序列化为统一响应 {code, message, data: null}
//
// 使用方:
//   - modules/*/routes.js 抛参数校验错误
//   - modules/*/*.service.js 抛业务错误(用户禁用、邮箱冲突等)
//   - middlewares/auth.js 抛 40101

class ApiError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

module.exports = ApiError;
```

- [ ] **Step 1.2: 创建 `backend/src/utils/asyncHandler.js`**

```js
// utils/asyncHandler.js
// wrap async route handlers so thrown errors propagate to error middleware
//
// 使用方:
//   router.post('/login', asyncHandler(async (req, res) => {
//     await authService.login(...);    // 抛 ApiError 自动 next(err)
//     res.json(ok(data));
//   }));

module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

- [ ] **Step 1.3: 创建 `backend/src/utils/response.js`**

```js
// utils/response.js
// 统一响应包装。
// 业务成功:res.json(ok({...})); 业务失败:throw new ApiError(code, msg);
//   ok() 返回的 code 永远是 0
//   fail() 直接构造 ApiError(throw 后由 error middleware 序列化)

const ApiError = require('./ApiError');

const ok = (data = null) => ({ code: 0, message: 'ok', data });

const fail = (code, message, httpStatus = 400) =>
  new ApiError(code, message, httpStatus);

module.exports = { ok, fail };
```

- [ ] **Step 1.4: 创建 `backend/src/utils/password.js`**

```js
// utils/password.js
// 密码哈希 / 校验。
// bcrypt cost = 10(与现有 seeders/001-demo-data.js 保持一致)

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

exports.hash = async (plain) => bcrypt.hash(plain, SALT_ROUNDS);

exports.compare = async (plain, hashed) => bcrypt.compare(plain, hashed);
```

- [ ] **Step 1.5: 创建 `backend/src/utils/jwt.js`**

```js
// utils/jwt.js
// JWT 签发 / 校验。
// secret 与 expiresIn 来自 process.env(由 config/index.js 透传);缺失时启动期报错。
//
// 使用方:
//   - modules/auth/auth.service.js: 签发登录/注册 token
//   - middlewares/auth.js: 解析 Authorization Bearer

const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('./ApiError');

exports.sign = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

exports.verify = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (e) {
    throw new ApiError(40101, 'token 失效或已过期', 401);
  }
};
```

- [ ] **Step 1.6: 扩展 `backend/src/config/index.js` 添加 jwt 配置**

修改 `backend/src/config/index.js` —— 在 `module.exports` 里加 `jwt` 字段:

```js
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required (set in backend/.env)');
}

module.exports = {
  // ... 保留原有 PORT / NODE_ENV / AI_KEYS / db 字段 ...
  jwt: {
    secret: JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};
```

(注意:上面是 patch,完整文件请读 `backend/src/config/index.js` 后只改最后 `module.exports` 块。)

- [ ] **Step 1.7: 验证文件创建成功**

Run: `ls backend/src/utils/`
Expected: 5 个 `.js` 文件(`ApiError.js`、`asyncHandler.js`、`jwt.js`、`password.js`、`response.js`)

- [ ] **Step 1.8: 验证语法**

Run: `cd backend && node -e "require('./src/utils/ApiError'); require('./src/utils/asyncHandler'); require('./src/utils/response'); require('./src/utils/password'); console.log('utils ok');"`
Expected: 输出 `utils ok`(注意:这一步会因为 config 没填 JWT_SECRET 而失败——可临时在 backend/.env 加 `JWT_SECRET=test_secret_for_dev_only`,或跳过此步,在 Task 3 改 .env.example 后再验证)

- [ ] **Step 1.9: Commit**

```bash
cd backend && git add src/utils/ src/config/index.js && git commit -m "feat(backend): add utils layer (ApiError, asyncHandler, jwt, password, response)"
```

---

### Task 2:升级 `middlewares/auth.js`(占位 → 真实 JWT 校验)

**Files:**
- Modify: `backend/src/middlewares/auth.js`(整体替换)

- [ ] **Step 2.1: 替换 `backend/src/middlewares/auth.js`**

```js
// middlewares/auth.js
// JWT 鉴权 —— 解析 Authorization: Bearer <token>,挂 req.user = {id, email}
// 缺失 / 格式错 / verify 失败 → next(ApiError(40101))
//
// 使用方:需要登录的路由挂载,例如
//   router.get('/me', authMiddleware, asyncHandler(...))
//
// 注意:挂在 /api/v1/* 业务路由上,/api/chat、/api/analyze-image、/api/location 不挂。

const jwtUtil = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') {
    return next(new ApiError(40101, '未登录', 401));
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(40101, 'token 格式错误', 401));
  }

  try {
    const payload = jwtUtil.verify(token);
    req.user = { id: payload.id, email: payload.email };
    return next();
  } catch (err) {
    return next(err);
  }
};
```

- [ ] **Step 2.2: 验证文件语法**

Run: `cd backend && node -e "const m = require('./src/middlewares/auth'); console.log(typeof m);"`
Expected: 输出 `function`

- [ ] **Step 2.3: Commit**

```bash
cd backend && git add src/middlewares/auth.js && git commit -m "feat(backend): upgrade auth middleware with real JWT verification"
```

---

### Task 3:改 `.env.example` + `package.json`

**Files:**
- Modify: `backend/.env.example`(追加 JWT 配置)
- Modify: `backend/package.json`(移动 bcryptjs,加 jsonwebtoken、jest、supertest)

- [ ] **Step 3.1: 修改 `backend/.env.example`**

在文件末尾追加:

```
# JWT（必填;缺失启动报错）
JWT_SECRET=please_change_me_to_a_long_random_string
JWT_EXPIRES_IN=7d
```

- [ ] **Step 3.2: 修改 `backend/package.json`**

读取文件后做三处修改:

1. 把 `bcryptjs` 从 `devDependencies` 移到 `dependencies`(因为 service 会用到)
2. 在 `dependencies` 加 `jsonwebtoken: ^9.0.2`
3. 在 `devDependencies` 加 `jest: ^29.7.0` 和 `supertest: ^7.0.0`

修改后的关键片段(其他字段保持原样):

```json
{
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "jsonwebtoken": "^9.0.2",
    // ... 保留原有 deps ...
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "morgan": "^1.10.0",
    "nodemon": "^3.1.14",
    "sequelize-cli": "^6.6.5",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 3.3: 安装依赖**

Run: `cd backend && npm install`
Expected: 安装成功,`node_modules/` 出现 `jsonwebtoken`、`jest`、`supertest`

- [ ] **Step 3.4: Commit**

```bash
cd backend && git add .env.example package.json package-lock.json && git commit -m "chore(backend): add JWT env config + test deps (jest, supertest, jsonwebtoken)"
```

---

## Phase 2:后端 auth 模块 + schema

### Task 4:写 migration 002 + 改 Sequelize model

**Files:**
- Create: `backend/migrations/002-add-service-center-code-and-donation-snapshots.js`
- Modify: `backend/src/db/models/serviceCenter.js`(加 `code` 字段)
- Modify: `backend/src/db/models/donationOrder.js`(加 `projectTitle` / `projectLocation`)

- [ ] **Step 4.1: 写 migration**

```js
// migrations/002-add-service-center-code-and-donation-snapshots.js
// 给 service_centers 加 code 字段(URL slug 用),给 donation_orders 加
// project_title / project_location 字段(项目快照,因为本轮不加 charity_projects 表)
//
// 执行入口:npm run db:migrate
// 回滚入口:npm run db:migrate:undo(单步)

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('service_centers', 'code', {
      type: Sequelize.STRING(60),
      allowNull: false,
      unique: true,
      after: 'id',
    });

    await queryInterface.addColumn('donation_orders', 'project_title', {
      type: Sequelize.STRING(120),
      allowNull: true,
      after: 'charity_project_id',
    });

    await queryInterface.addColumn('donation_orders', 'project_location', {
      type: Sequelize.STRING(120),
      allowNull: true,
      after: 'project_title',
    });
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.removeColumn('donation_orders', 'project_location');
    await queryInterface.removeColumn('donation_orders', 'project_title');
    await queryInterface.removeColumn('service_centers', 'code');
  },
};
```

- [ ] **Step 4.2: 修改 `serviceCenter.js` model**

在 `module.exports = (sequelize, DataTypes) => { ... }` 函数里、`id` 字段后、`name` 字段前加:

```js
      code: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
      },
```

(注意:`unique: true` 会让 Sequelize 在 sync 时建唯一索引;但因 migration 已显式建了,这里不会重复。)

- [ ] **Step 4.3: 修改 `donationOrder.js` model**

在 `charityProjectId` 字段后、`itemType` 字段前加:

```js
      projectTitle: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'project_title',
      },
      projectLocation: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'project_location',
      },
```

- [ ] **Step 4.4: 运行 migration**

Run: `cd backend && npm run db:migrate`
Expected: 输出 `== 202...-add-service-center-code-and-donation-snapshots: migrated =====`

- [ ] **Step 4.5: 验证 model 字段生效**

Run: `cd backend && node -e "const {ServiceCenter, DonationOrder} = require('./src/db/models'); console.log(ServiceCenter.rawAttributes.code.fieldName, DonationOrder.rawAttributes.projectTitle.field);"`
Expected: 输出 `code project_title`

- [ ] **Step 4.6: Commit**

```bash
cd backend && git add migrations/002-add-service-center-code-and-donation-snapshots.js src/db/models/serviceCenter.js src/db/models/donationOrder.js && git commit -m "feat(backend): add migration 002 + model fields (service_center.code, donation_order snapshots)"
```

---

### Task 5:写 `backend/src/modules/auth/*`

**Files:**
- Create: `backend/src/modules/auth/auth.service.js`
- Create: `backend/src/modules/auth/routes.js`

- [ ] **Step 5.1: 写 `backend/src/modules/auth/auth.service.js`**

```js
// modules/auth/auth.service.js
// 用户注册 / 登录 / 当前用户读取。
// 失败抛 ApiError;成功返回 {token, user}
// 使用方: modules/auth/routes.js

const { User } = require('../../db/models');
const passwordUtil = require('../../utils/password');
const jwtUtil = require('../../utils/jwt');
const ApiError = require('../../utils/ApiError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pickUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    pointsBalance: user.pointsBalance,
  };
}

async function register({ email, password, displayName }) {
  // 1. 校验
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ApiError(40001, '请输入有效邮箱');
  }
  if (!password || password.length < 6) {
    throw new ApiError(40001, '密码至少 6 位');
  }
  if (!displayName || !displayName.trim()) {
    throw new ApiError(40001, '昵称不能为空');
  }

  // 2. 查重
  const exists = await User.findOne({ where: { email } });
  if (exists) {
    throw new ApiError(40901, '该邮箱已注册');
  }

  // 3. 写库
  const passwordHash = await passwordUtil.hash(password);
  const user = await User.create({
    email,
    passwordHash,
    displayName: displayName.trim(),
    status: 1,
    pointsBalance: 0,
    growthValue: 0,
    carbonReductionTotal: 0,
  });

  // 4. 签 token
  const token = jwtUtil.sign({ id: user.id, email: user.email });
  return { token, user: pickUserPayload(user) };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new ApiError(40001, '请输入邮箱和密码');
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new ApiError(40101, '邮箱或密码错误');
  }
  if (user.status !== 1) {
    throw new ApiError(40301, '账号已被禁用');
  }

  const ok = await passwordUtil.compare(password, user.passwordHash);
  if (!ok) {
    throw new ApiError(40101, '邮箱或密码错误');
  }

  // 更新 lastLoginAt(可选,失败不阻塞登录)
  user.lastLoginAt = new Date();
  await user.save({ fields: ['lastLoginAt'] });

  const token = jwtUtil.sign({ id: user.id, email: user.email });
  return { token, user: pickUserPayload(user) };
}

async function fetchMe(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ApiError(40101, '用户不存在');
  }
  if (user.status !== 1) {
    throw new ApiError(40301, '账号已被禁用');
  }
  return pickUserPayload(user);
}

module.exports = { register, login, fetchMe };
```

- [ ] **Step 5.2: 写 `backend/src/modules/auth/routes.js`**

```js
// modules/auth/routes.js
// /api/v1/client/auth/* 三个端点
// 使用方: src/routes/index.js 挂载到 /v1/client/auth

const express = require('express');
const authMiddleware = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const authService = require('./auth.service');

const router = express.Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = await authService.register(req.body || {});
    res.status(201).json(ok(data));
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = await authService.login(req.body || {});
    res.json(ok(data));
  }),
);

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await authService.fetchMe(req.user.id);
    res.json(ok(data));
  }),
);

module.exports = router;
```

- [ ] **Step 5.3: 验证文件创建**

Run: `cd backend && node -e "const r = require('./src/modules/auth/routes'); console.log(typeof r);"`
Expected: 输出 `function`

- [ ] **Step 5.4: Commit**

```bash
cd backend && git add src/modules/auth/ && git commit -m "feat(backend): add auth module (register, login, me) with JWT"
```

---

### Task 6:扩 `seeders/001-demo-data.js`(4 service_centers + 4 orders)

**Files:**
- Modify: `backend/src/db/seeders/001-demo-data.js`(在 `up()` 末尾追加;`down()` 顶部追加)

- [ ] **Step 6.1: 读取现有 seed 文件**

Run: `cd backend && cat src/db/seeders/001-demo-data.js`(确认 4 行 demo 当前状态)

- [ ] **Step 6.2: 修改 `001-demo-data.js`**

```js
// db/seeders/001-demo-data.js
// Demo 数据 seeder(幂等)。
// 职责:
//   - 1 个 role (super_admin)
//   - 4 个 service_centers(代码对齐前端 serviceCentersData;由 migration 002 加 code 列支持)
//   - 1 个 admin (admin@szt.com / Admin@2026)
//   - 1 个 user  (user@szt.com / 123456,对齐 C 端 demo 账号)
//   - 4 个 orders(全部归 demo user): 2 recycle + 2 donation
// 使用方: npm run db:seed
// 幂等:全部走 findOrCreate / 重复 findOne + 直接 create

const bcrypt = require('bcryptjs');
const { Role, ServiceCenter, Admin, User, Order, RecycleOrder, DonationOrder } = require('../models');

module.exports = {
  async up() {
    // 1) Role
    const [role] = await Role.findOrCreate({
      where: { code: 'super_admin' },
      defaults: { name: '超级管理员' },
    });

    // 2) ServiceCenter × 4
    const centerSpecs = [
      {
        code: 'xuhui-caohejing',
        name: '徐汇·漕河泾服务站',
        city: '上海', district: '徐汇区', address: '宜山路 501 号',
        businessHours: '09:00-21:00', phone: '021-5600-2101', status: 1,
        description: '面向漕河泾与徐家汇片区提供预约上门、社区定点回收和可复用物品分拣服务,适合办公楼与居民小区的日常回收需求。',
      },
      {
        code: 'changning-zhongshan',
        name: '长宁·中山公园服务站',
        city: '上海', district: '长宁区', address: '凯旋路 1200 号',
        businessHours: '09:00-20:30', phone: '021-5600-2102', status: 1,
        description: '连接中山公园商圈、周边社区与公益机构,支持旧衣筛选、二次流转和积分入账,让可复用物品更快进入再利用链路。',
      },
      {
        code: 'jingan-pengpu',
        name: '静安·彭浦服务站',
        city: '上海', district: '静安区', address: '江场路 80 号',
        businessHours: '10:00-21:00', phone: '021-5600-2103', status: 1,
        description: '服务彭浦与大宁片区的居民回收场景,重点覆盖旧衣、闲置小家电和社区环保活动协同。',
      },
      {
        code: 'putuo-zhenru',
        name: '普陀·真如服务站',
        city: '上海', district: '普陀区', address: '真北路 1000 号',
        businessHours: '09:30-19:30', phone: '021-5600-2104', status: 1,
        description: '提供有害垃圾专项收运和大件家具预约回收,适合需要规范转运、单独标记和安全处理的回收任务。',
      },
    ];
    const centers = {};
    for (const spec of centerSpecs) {
      const [center] = await ServiceCenter.findOrCreate({
        where: { code: spec.code },
        defaults: spec,
      });
      centers[spec.code] = center;
    }

    // 3) Admin
    const adminHash = await bcrypt.hash('Admin@2026', 10);
    await Admin.findOrCreate({
      where: { username: 'admin@szt.com' },
      defaults: {
        passwordHash: adminHash,
        realName: '系统管理员',
        roleId: role.id,
        status: 1,
      },
    });

    // 4) User
    const userHash = await bcrypt.hash('123456', 10);
    const [user] = await User.findOrCreate({
      where: { email: 'user@szt.com' },
      defaults: {
        passwordHash: userHash,
        displayName: '环保达人',
        status: 1,
        pointsBalance: 286,
      },
    });

    // 5) Orders × 4(全部归 demo user)
    // 注: 订单有 orderNo UNIQUE,幂等通过 where 查 orderNo 实现
    const orderSpecs = [
      {
        orderNo: 'SZT-20260324-001',
        orderType: 'recycle', status: 'pending_review',
        serviceCenterId: centers['xuhui-caohejing'].id,
        contactName: '林岚', contactPhone: '13800001111',
        addressSnapshot: '上海市徐汇区宜山路 501 号',
        scheduledDate: '2026-03-25', scheduledPeriod: '13:00-16:00',
        estimatedWeight: 6.5, estimatedPoints: 45, grantedPoints: 0,
        note: '请上门前 10 分钟电话联系。',
        recycleDetail: { category: '小家电', weightBand: '5-10kg', pickupCode: 'P1234' },
      },
      {
        orderNo: 'SZT-20260320-011',
        orderType: 'recycle', status: 'completed',
        serviceCenterId: centers['changning-zhongshan'].id,
        contactName: '林岚', contactPhone: '13800001111',
        addressSnapshot: '上海市长宁区凯旋路 1200 号',
        scheduledDate: '2026-03-20', scheduledPeriod: '09:00-12:00',
        estimatedWeight: 4.0, estimatedPoints: 18, grantedPoints: 20,
        note: '已完成称重并入库。',
        recycleDetail: { category: '纸塑金属', weightBand: '0-5kg', pickupCode: 'P1023' },
      },
      {
        orderNo: 'SZT-20260316-028',
        orderType: 'donation', status: 'received',
        serviceCenterId: centers['jingan-pengpu'].id,
        contactName: '林岚', contactPhone: '13800001111',
        addressSnapshot: '上海市静安区江场路 80 号',
        scheduledDate: '2026-03-16', scheduledPeriod: '18:00-21:00',
        estimatedPoints: 0, grantedPoints: 46,
        note: '衣物包装完整,已进入复用筛选。',
        donationDetail: {
          projectTitle: '乡村学校暖冬计划', projectLocation: '云南·怒江',
          itemType: '纺织旧衣', itemName: '秋冬棉服',
          quantityText: '6件', weightText: '5kg',
          conditionText: '八成新', logisticsType: '顺丰到付',
        },
      },
      {
        orderNo: 'SZT-20260311-102',
        orderType: 'donation', status: 'cancelled',
        serviceCenterId: centers['putuo-zhenru'].id,
        contactName: '林岚', contactPhone: '13800001111',
        addressSnapshot: '上海市普陀区真北路 1000 号',
        scheduledDate: '2026-03-11', scheduledPeriod: '13:00-16:00',
        estimatedPoints: 0, grantedPoints: 0,
        note: '用户改期后取消,本次未产生运力消耗。',
        cancelReason: '用户改期取消',
        donationDetail: {
          projectTitle: '社区图书角扩容', projectLocation: '上海·浦东',
          itemType: '图书绘本', itemName: '儿童绘本',
          quantityText: '12本', weightText: '3kg',
          conditionText: '九成新', logisticsType: '上门自取',
        },
      },
    ];

    for (const spec of orderSpecs) {
      const exists = await Order.findOne({ where: { orderNo: spec.orderNo } });
      if (exists) continue;

      const { recycleDetail, donationDetail, cancelReason, ...orderFields } = spec;
      if (cancelReason) orderFields.cancelReason = cancelReason;

      const order = await Order.create({
        ...orderFields,
        userId: user.id,
      });

      if (recycleDetail) {
        await RecycleOrder.create({
          orderId: order.id,
          ...recycleDetail,
        });
      }
      if (donationDetail) {
        await DonationOrder.create({
          orderId: order.id,
          ...donationDetail,
        });
      }
    }

    console.log('OK: 4 个 service_centers + 1 admin + 1 user + 4 orders demo 数据已就位');
  },

  async down() {
    // 倒序删
    await DonationOrder.destroy({ where: {}, truncate: true, cascade: true });
    await RecycleOrder.destroy({ where: {}, truncate: true, cascade: true });
    await Order.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: { email: 'user@szt.com' } });
    await Admin.destroy({ where: { username: 'admin@szt.com' } });
    for (const code of ['xuhui-caohejing', 'changning-zhongshan', 'jingan-pengpu', 'putuo-zhenru']) {
      await ServiceCenter.destroy({ where: { code } });
    }
    await Role.destroy({ where: { code: 'super_admin' } });
    console.log('OK: demo 数据已清理');
  },
};
```

- [ ] **Step 6.3: 跑 seed**

Run: `cd backend && npm run db:seed`
Expected: 输出 `OK: 4 个 service_centers + 1 admin + 1 user + 4 orders demo 数据已就位`

- [ ] **Step 6.4: 验证数据**

Run: `cd backend && node -e "
const {ServiceCenter, Order, User} = require('./src/db/models');
(async () => {
  const centers = await ServiceCenter.count();
  const user = await User.findOne({where:{email:'user@szt.com'}});
  const orders = await Order.count({where:{userId: user.id}});
  console.log('centers:', centers, 'orders:', orders);
  process.exit(0);
})();
"`
Expected: 输出 `centers: 4 orders: 4`

- [ ] **Step 6.5: Commit**

```bash
cd backend && git add src/db/seeders/001-demo-data.js && git commit -m "feat(backend): expand demo seed (4 service_centers + 4 orders for demo user)"
```

---

## Phase 3:后端 orders + service-centers 模块

### Task 7:写 `backend/src/modules/service-centers/*`

**Files:**
- Create: `backend/src/modules/service-centers/serviceCenters.service.js`
- Create: `backend/src/modules/service-centers/routes.js`

- [ ] **Step 7.1: 写 `backend/src/modules/service-centers/serviceCenters.service.js`**

```js
// modules/service-centers/serviceCenters.service.js
// 服务站列表 / 详情。
// 列表支持 city / district 过滤(status 默认 1)
// 详情按 code(URL slug)查找,找不到抛 40401

const { ServiceCenter } = require('../../db/models');
const ApiError = require('../../utils/ApiError');

function pickCenterPayload(c) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    city: c.city,
    district: c.district,
    address: c.address,
    businessHours: c.businessHours,
    phone: c.phone,
    description: c.description,
    status: c.status,
  };
}

async function listCenters({ city, district } = {}) {
  const where = { status: 1 };
  if (city) where.city = city;
  if (district) where.district = district;

  const rows = await ServiceCenter.findAll({
    where,
    order: [['id', 'ASC']],
  });
  return rows.map(pickCenterPayload);
}

async function getCenterByCode(code) {
  if (!code) throw new ApiError(40401, '服务站不存在');
  const c = await ServiceCenter.findOne({ where: { code } });
  if (!c || c.status !== 1) throw new ApiError(40401, '服务站不存在');
  return pickCenterPayload(c);
}

module.exports = { listCenters, getCenterByCode };
```

- [ ] **Step 7.2: 写 `backend/src/modules/service-centers/routes.js`**

```js
// modules/service-centers/routes.js
// GET /api/v1/client/service-centers
// GET /api/v1/client/service-centers/:code

const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const service = require('./serviceCenters.service');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await service.listCenters({
      city: req.query.city,
      district: req.query.district,
    });
    res.json(ok({ list: data, total: data.length }));
  }),
);

router.get(
  '/:code',
  asyncHandler(async (req, res) => {
    const data = await service.getCenterByCode(req.params.code);
    res.json(ok(data));
  }),
);

module.exports = router;
```

- [ ] **Step 7.3: 验证语法**

Run: `cd backend && node -e "const r = require('./src/modules/service-centers/routes'); console.log(typeof r);"`
Expected: `function`

- [ ] **Step 7.4: Commit**

```bash
cd backend && git add src/modules/service-centers/ && git commit -m "feat(backend): add service-centers module (list + detail by code)"
```

---

### Task 8:写 `backend/src/modules/orders/*`

**Files:**
- Create: `backend/src/modules/orders/orders.service.js`
- Create: `backend/src/modules/orders/routes.js`

- [ ] **Step 8.1: 写 `backend/src/modules/orders/orders.service.js`**

```js
// modules/orders/orders.service.js
// 订单核心业务: 列表 / 详情 / 创建回收 / 创建捐赠
// 失败抛 ApiError;成功返回纯数据对象(不带 code/message 包装)
//
// 状态机:
//   recycle: pending_review → confirmed → assigned → in_progress → weighed → completed / cancelled
//   donation: submitted → accepted → in_transit → received → completed / cancelled
//
// 积分规则:
//   recycle estimated_points 走 weightBand 查表
//   donation estimated_points = 0(本轮不接 B 端,granted_points 仅 B 端发放)

const { Order, RecycleOrder, DonationOrder, ServiceCenter } = require('../../db/models');
const ApiError = require('../../utils/ApiError');

const RECYCLE_CATEGORIES = ['小家电', '纸塑金属', '纺织旧衣', '有害垃圾', '大件家具'];
const WEIGHT_BANDS = ['0-5kg', '5-10kg', '10-20kg', '20kg以上'];
const POINTS_BY_BAND = { '0-5kg': 18, '5-10kg': 45, '10-20kg': 70, '20kg以上': 100 };
const PHONE_REGEX = /^1[3-9]\d{9}$/;

function generateOrderNo(prefix) {
  const ts = new Date();
  const ymd = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${ymd}-${rand}`;
}

function generatePickupCode() {
  return `P${Math.floor(Math.random() * 9000) + 1000}`;
}

function pickOrderPayload(order, recycleDetail, donationDetail, center) {
  const base = {
    id: order.id,
    orderNo: order.orderNo,
    orderType: order.orderType,
    status: order.status,
    scheduledDate: order.scheduledDate,
    scheduledPeriod: order.scheduledPeriod,
    contactName: order.contactName,
    contactPhone: order.contactPhone,
    addressSnapshot: order.addressSnapshot,
    estimatedWeight: order.estimatedWeight,
    estimatedPoints: order.estimatedPoints,
    grantedPoints: order.grantedPoints,
    note: order.note,
    createdAt: order.createdAt,
  };
  if (center) {
    base.serviceCenter = {
      id: center.id,
      code: center.code,
      name: center.name,
    };
  }
  base.recycleDetail = recycleDetail
    ? {
        category: recycleDetail.category,
        weightBand: recycleDetail.weightBand,
        pickupCode: recycleDetail.pickupCode,
      }
    : null;
  base.donationDetail = donationDetail
    ? {
        itemType: donationDetail.itemType,
        itemName: donationDetail.itemName,
        quantityText: donationDetail.quantityText,
        weightText: donationDetail.weightText,
        conditionText: donationDetail.conditionText,
        logisticsType: donationDetail.logisticsType,
        projectTitle: donationDetail.projectTitle,
        projectLocation: donationDetail.projectLocation,
      }
    : null;
  return base;
}

async function fetchOrderWithDetails(orderId) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: RecycleOrder, as: 'recycleDetail' },
      { model: DonationOrder, as: 'donationDetail' },
      { model: ServiceCenter, as: 'serviceCenter' },
    ],
  });
  if (!order) return null;
  return pickOrderPayload(order, order.recycleDetail, order.donationDetail, order.serviceCenter);
}

async function listOrders(userId, { status, page = 1, pageSize = 10 } = {}) {
  const where = { userId };
  if (status) where.status = status;

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

async function getOrderForUser(userId, orderId) {
  const order = await fetchOrderWithDetails(orderId);
  if (!order) throw new ApiError(40401, '订单不存在');
  // 注:此处用 orderId 反查的 order 不带 userId,需要再查 user 归属
  const raw = await Order.findByPk(orderId);
  if (raw.userId !== userId) throw new ApiError(40302, '无权访问此订单');
  return order;
}

function validateRecyclePayload(payload) {
  const {
    category, weightBand, estimatedWeight, scheduledDate, scheduledPeriod,
    contactName, contactPhone, addressSnapshot,
  } = payload || {};
  if (!RECYCLE_CATEGORIES.includes(category)) {
    throw new ApiError(40001, `category 必须是: ${RECYCLE_CATEGORIES.join(', ')}`);
  }
  if (!WEIGHT_BANDS.includes(weightBand)) {
    throw new ApiError(40001, `weightBand 必须是: ${WEIGHT_BANDS.join(', ')}`);
  }
  const w = Number(estimatedWeight);
  if (!Number.isFinite(w) || w <= 0 || w > 100) {
    throw new ApiError(40001, 'estimatedWeight 必须在 (0, 100] 范围内');
  }
  if (!scheduledDate) throw new ApiError(40001, '请选择预约日期');
  if (!scheduledPeriod) throw new ApiError(40001, '请选择预约时段');
  if (!contactName || !contactName.trim()) throw new ApiError(40001, '请填写联系人');
  if (!contactPhone || !PHONE_REGEX.test(contactPhone)) {
    throw new ApiError(40001, '请输入有效手机号');
  }
  if (!addressSnapshot || !addressSnapshot.trim()) throw new ApiError(40001, '请填写服务地址');
}

function validateDonationPayload(payload) {
  const { itemType, itemName, contactName, contactPhone } = payload || {};
  if (!itemType || !itemType.trim()) throw new ApiError(40001, '请选择物品类型');
  if (!itemName || !itemName.trim()) throw new ApiError(40001, '请填写物品名称');
  if (!contactName || !contactName.trim()) throw new ApiError(40001, '请填写联系人');
  if (!contactPhone || !PHONE_REGEX.test(contactPhone)) {
    throw new ApiError(40001, '请输入有效手机号');
  }
}

async function createRecycleOrder(userId, payload) {
  validateRecyclePayload(payload);

  const order = await Order.create({
    orderNo: generateOrderNo('SZT'),
    userId,
    orderType: 'recycle',
    status: 'pending_review',
    serviceCenterId: null,
    contactName: payload.contactName.trim(),
    contactPhone: payload.contactPhone,
    addressSnapshot: payload.addressSnapshot.trim(),
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    scheduledDate: payload.scheduledDate,
    scheduledPeriod: payload.scheduledPeriod,
    estimatedWeight: payload.estimatedWeight,
    estimatedPoints: POINTS_BY_BAND[payload.weightBand],
    grantedPoints: 0,
    note: payload.note || null,
  });

  const pickupCode = generatePickupCode();
  await RecycleOrder.create({
    orderId: order.id,
    category: payload.category,
    weightBand: payload.weightBand,
    itemImages: payload.itemImages || null,
    pickupCode,
  });

  return {
    id: order.id,
    orderNo: order.orderNo,
    pickupCode,
    estimatedPoints: order.estimatedPoints,
    status: order.status,
  };
}

async function createDonationOrder(userId, payload) {
  validateDonationPayload(payload);

  const order = await Order.create({
    orderNo: generateOrderNo('SZT-D'),
    userId,
    orderType: 'donation',
    status: 'submitted',
    serviceCenterId: null,
    contactName: payload.contactName.trim(),
    contactPhone: payload.contactPhone,
    addressSnapshot: payload.addressSnapshot?.trim() || '公益捐赠',
    estimatedWeight: null,
    estimatedPoints: 0,
    grantedPoints: 0,
    note: payload.note || null,
  });

  await DonationOrder.create({
    orderId: order.id,
    charityProjectId: null,
    projectTitle: payload.projectTitle?.trim() || null,
    projectLocation: payload.projectLocation?.trim() || null,
    itemType: payload.itemType.trim(),
    itemName: payload.itemName.trim(),
    quantityText: payload.quantityText?.trim() || null,
    weightText: payload.weightText?.trim() || null,
    conditionText: payload.conditionText?.trim() || null,
    logisticsType: payload.logisticsType?.trim() || null,
  });

  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
  };
}

module.exports = {
  listOrders,
  getOrderForUser,
  createRecycleOrder,
  createDonationOrder,
};
```

- [ ] **Step 8.2: 写 `backend/src/modules/orders/routes.js`**

```js
// modules/orders/routes.js
// 全部需登录(authMiddleware 挂载)
// GET    /api/v1/client/orders              列表
// GET    /api/v1/client/orders/:id          详情
// POST   /api/v1/client/orders/recycle      创建回收订单
// POST   /api/v1/client/orders/donation     创建捐赠订单

const express = require('express');
const authMiddleware = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const service = require('./orders.service');

const router = express.Router();

// 写操作先注册,避免被 /:id 路由吞掉
router.post(
  '/recycle',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await service.createRecycleOrder(req.user.id, req.body || {});
    res.status(201).json(ok(data));
  }),
);

router.post(
  '/donation',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await service.createDonationOrder(req.user.id, req.body || {});
    res.status(201).json(ok(data));
  }),
);

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await service.listOrders(req.user.id, {
      status: req.query.status,
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 10,
    });
    res.json(ok(data));
  }),
);

router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await service.getOrderForUser(req.user.id, Number(req.params.id));
    res.json(ok(data));
  }),
);

module.exports = router;
```

- [ ] **Step 8.3: 验证语法**

Run: `cd backend && node -e "const r = require('./src/modules/orders/routes'); console.log(typeof r);"`
Expected: `function`

- [ ] **Step 8.4: 挂到 `routes/index.js`**

读取 `backend/src/routes/index.js`,修改为:

```js
// routes/index.js
// 业务路由汇总。
// 职责:
//   - /api 兼容老路径(AI 代理 + health)
//   - /api/v1/client 挂新业务模块: auth / orders / service-centers
// 使用方: src/app.js 通过 app.use('/api', router) 挂载

const express = require('express');
const router = express.Router();

router.use(require('../modules/ai/routes'));
router.use('/_health', require('../modules/health/routes'));

// /api/v1/client/*
router.use('/v1/client/auth', require('../modules/auth/routes'));
router.use('/v1/client/orders', require('../modules/orders/routes'));
router.use('/v1/client/service-centers', require('../modules/service-centers/routes'));

module.exports = router;
```

- [ ] **Step 8.5: 启动 dev server 验证路由**

Run: `cd backend && JWT_SECRET=test_secret_for_dev_only npm run dev` (background)
Expected: 输出 `🚀 收智通后端服务已启动: http://localhost:8080` 和新增的可用接口列表

Run: `curl -s http://localhost:8080/api/v1/client/service-centers | head -c 500`
Expected: 输出 `{"code":0,"message":"ok","data":{"list":[{"id":1,"code":"xuhui-caohejing",...}],"total":4}}`

- [ ] **Step 8.6: 停 dev server**

找到后台 task,用 TaskStop 停掉。

- [ ] **Step 8.7: Commit**

```bash
cd backend && git add src/modules/orders/ src/routes/index.js && git commit -m "feat(backend): add orders module (list, detail, recycle, donation)"
```

---

## Phase 4:后端集成测试

### Task 9:Jest + supertest + sqlite 配置

**Files:**
- Create: `backend/jest.config.js`
- Create: `backend/__tests__/integration/setup.js`
- Modify: `backend/.env.test`(创建文件)

- [ ] **Step 9.1: 创建 `backend/.env.test`**

```
NODE_ENV=test
PORT=0
DB_DIALECT=sqlite
DB_NAME=:memory:
JWT_SECRET=test_secret_for_jest_only
JWT_EXPIRES_IN=1h
```

- [ ] **Step 9.2: 创建 `backend/jest.config.js`**

```js
// jest.config.js
// Jest 配置: 测试用 sqlite 内存库,跑完清空

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  globalSetup: '<rootDir>/__tests__/integration/setup.js',
  globalTeardown: '<rootDir>/__tests__/integration/teardown.js',
  testTimeout: 30000,
};
```

- [ ] **Step 9.3: 创建 `backend/__tests__/integration/setup.js`**

```js
// __tests__/integration/setup.js
// Jest globalSetup: 加载 .env.test,跑 migration 建表

require('dotenv').config({ path: '.env.test' });

const { sequelize } = require('../../src/config/db');

module.exports = async () => {
  await sequelize.sync({ force: true });
};
```

- [ ] **Step 9.4: 创建 `backend/__tests__/integration/teardown.js`**

```js
// __tests__/integration/teardown.js
// Jest globalTeardown: 关闭 sequelize 连接

const { sequelize } = require('../../src/config/db');

module.exports = async () => {
  await sequelize.close();
};
```

- [ ] **Step 9.5: 修改 `backend/src/config/db.js` 支持 sqlite**

读取 `backend/src/config/db.js`,修改 dialect 处理:`dialect` 改为读取 `config.db.dialect`,已经是了;但 sqlite 不支持 DECIMAL 长类型,需要把 donationOrder / order 的 decimal 字段加 `get/set` 钩子——这超出本任务范围。

简化方案:测试用 sqlite-memory 时,**decimal 字段在 sqlite 里会变成 TEXT**。当前 listOrders / fetchOrderWithDetails 不做 DECIMAL 计算,只读字段,**可以兼容**。但 `createRecycleOrder` 写入 `estimatedWeight` DECIMAL 时,sqlite 也能接受 number。所以**不动 config/db.js**,直接用现有。

- [ ] **Step 9.6: 验证 Jest 配置可启动**

Run: `cd backend && npx jest --listTests`
Expected: 输出 0 个测试(尚未写)

- [ ] **Step 9.7: Commit**

```bash
cd backend && git add jest.config.js __tests__/integration/setup.js __tests__/integration/teardown.js .env.test && git commit -m "test(backend): configure jest with sqlite-memory + global setup/teardown"
```

---

### Task 10:auth 集成测试(register + login)

**Files:**
- Create: `backend/__tests__/integration/auth.register.test.js`
- Create: `backend/__tests__/integration/auth.login.test.js`

- [ ] **Step 10.1: 写 `auth.register.test.js`**

```js
// __tests__/integration/auth.register.test.js
// TDD: 先写测试,后看它失败(等 Task 5 实现 register 后通过)

const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/db/models');

describe('POST /api/v1/client/auth/register', () => {
  beforeEach(async () => {
    await User.destroy({ where: {}, truncate: true, restartIdentity: true });
  });

  test('成功注册 → 201 + 返回 token + user', async () => {
    const res = await request(app)
      .post('/api/v1/client/auth/register')
      .send({
        email: 'newuser@example.com',
        password: '123456',
        displayName: '新用户',
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('newuser@example.com');
    expect(res.body.data.user.displayName).toBe('新用户');
    expect(res.body.data.user.pointsBalance).toBe(0);
  });

  test('email 已注册 → 40901', async () => {
    await User.create({
      email: 'dup@example.com',
      passwordHash: 'placeholder',
      displayName: 'dup',
      status: 1,
      pointsBalance: 0,
    });

    const res = await request(app)
      .post('/api/v1/client/auth/register')
      .send({
        email: 'dup@example.com',
        password: '123456',
        displayName: 'x',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe(40901);
  });

  test('email 格式错 → 40001', async () => {
    const res = await request(app)
      .post('/api/v1/client/auth/register')
      .send({
        email: 'not-an-email',
        password: '123456',
        displayName: 'x',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });

  test('密码 < 6 位 → 40001', async () => {
    const res = await request(app)
      .post('/api/v1/client/auth/register')
      .send({
        email: 'a@b.com',
        password: '12345',
        displayName: 'x',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });
});
```

- [ ] **Step 10.2: 写 `auth.login.test.js`**

```js
// __tests__/integration/auth.login.test.js

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { User } = require('../../src/db/models');

describe('POST /api/v1/client/auth/login', () => {
  beforeEach(async () => {
    await User.destroy({ where: {}, truncate: true, restartIdentity: true });
  });

  async function seedUser(email = 'login@test.com', password = '123456') {
    const passwordHash = await bcrypt.hash(password, 10);
    return User.create({
      email,
      passwordHash,
      displayName: '登录测试',
      status: 1,
      pointsBalance: 100,
    });
  }

  test('登录成功 → 200 + 返回 token', async () => {
    await seedUser();

    const res = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'login@test.com', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('login@test.com');
  });

  test('密码错误 → 40101', async () => {
    await seedUser();

    const res = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'login@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(40101);
  });

  test('用户不存在 → 40101', async () => {
    const res = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'nobody@test.com', password: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(40101);
  });

  test('用户已禁用 → 40301', async () => {
    const passwordHash = await bcrypt.hash('123456', 10);
    await User.create({
      email: 'disabled@test.com',
      passwordHash,
      displayName: 'x',
      status: 0,
      pointsBalance: 0,
    });

    const res = await request(app)
      .post('/api/v1/client/auth/login')
      .send({ email: 'disabled@test.com', password: '123456' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(40301);
  });
});
```

- [ ] **Step 10.3: 跑测试**

Run: `cd backend && npx jest __tests__/integration/auth.register.test.js __tests__/integration/auth.login.test.js`
Expected: 8 个 test 全 PASS(register 4 个 + login 4 个)

- [ ] **Step 10.4: Commit**

```bash
cd backend && git add __tests__/integration/auth.register.test.js __tests__/integration/auth.login.test.js && git commit -m "test(backend): add auth integration tests (register + login)"
```

---

### Task 11:orders 集成测试(recycle + donation + list)

**Files:**
- Create: `backend/__tests__/integration/orders.recycle.test.js`
- Create: `backend/__tests__/integration/orders.donation.test.js`
- Create: `backend/__tests__/integration/orders.list.test.js`

- [ ] **Step 11.1: 写 `orders.recycle.test.js`**

```js
// __tests__/integration/orders.recycle.test.js

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { User, Order } = require('../../src/db/models');

describe('POST /api/v1/client/orders/recycle', () => {
  let token;

  beforeEach(async () => {
    await Order.destroy({ where: {}, truncate: true, restartIdentity: true });
    await User.destroy({ where: {}, truncate: true, restartIdentity: true });

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
        addressSnapshot: '...',
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
        addressSnapshot: '...',
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
        contactPhone: '13800000000',   // 不符合 /^1[3-9]\d{9}$/
        addressSnapshot: '...',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(40001);
  });
});
```

- [ ] **Step 11.2: 写 `orders.donation.test.js`**

```js
// __tests__/integration/orders.donation.test.js

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { User, Order } = require('../../src/db/models');

describe('POST /api/v1/client/orders/donation', () => {
  let token;

  beforeEach(async () => {
    await Order.destroy({ where: {}, truncate: true, restartIdentity: true });
    await User.destroy({ where: {}, truncate: true, restartIdentity: true });

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
```

- [ ] **Step 11.3: 写 `orders.list.test.js`**

```js
// __tests__/integration/orders.list.test.js

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { User, Order } = require('../../src/db/models');

describe('GET /api/v1/client/orders', () => {
  let token;

  beforeEach(async () => {
    await Order.destroy({ where: {}, truncate: true, restartIdentity: true });
    await User.destroy({ where: {}, truncate: true, restartIdentity: true });

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
        addressSnapshot: '...',
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
});
```

- [ ] **Step 11.4: 跑全部测试**

Run: `cd backend && npm test`
Expected: 全部 PASS(8 auth + 4 recycle + 3 donation + 3 list = 18 个)

- [ ] **Step 11.5: Commit**

```bash
cd backend && git add __tests__/integration/orders.*.test.js && git commit -m "test(backend): add orders integration tests (recycle + donation + list)"
```

---

## Phase 5:前端基础

### Task 12:加 Pinia + 改 `main.js`

**Files:**
- Modify: `frontend/package.json`(加 `pinia` 依赖)
- Modify: `frontend/src/main.js`(注册 Pinia,移除 initAuthSeed,调 restoreFromStorage)

- [ ] **Step 12.1: 安装 pinia + axios**

Run: `cd frontend && npm install pinia@^2.2.0 axios@^1.7.0`
Expected: 安装成功

- [ ] **Step 12.2: 修改 `frontend/src/main.js`**

读取文件后整体替换:

```js
// main.js
// 启动入口。
// 职责:
//   - 创建 Vue 应用 + 注册 Pinia
//   - 注册 router
//   - 导入全局 CSS
//   - 挂载前恢复 authStore 登录态(restoreFromStorage)
//   - mount('#app')

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "./stores/auth";

import "./assets/main.css";

const app = createApp(App);
app.use(createPinia());

// 路由前先恢复登录态(否则守卫会丢登录)
const authStore = useAuthStore();
authStore.restoreFromStorage();

app.use(router);
app.mount("#app");
```

- [ ] **Step 12.3: Commit**

```bash
cd frontend && git add package.json package-lock.json src/main.js && git commit -m "feat(frontend): add Pinia + auth state restore from localStorage"
```

---

### Task 13:写 `utils/request.js`(Axios 实例 + 拦截器)

**Files:**
- Create: `frontend/src/utils/request.js`

- [ ] **Step 13.1: 写文件**

```js
// utils/request.js
// Axios 单例 + 拦截器。
// 职责:
//   - 注入 Authorization Bearer(token 从 authStore 读)
//   - 响应 code !== 0 → 抛 Error(message),由 caller 处理
//   - 响应 401 → 清 authStore + 跳 /auth?redirect=...
// 使用方: api/*.js

import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import router from "@/router";

const isDev = import.meta.env.DEV;

const request = axios.create({
  baseURL: isDev ? "http://localhost:8080/api/v1" : "/api/v1",
  timeout: 15000,
});

request.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

request.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && body.code !== 0) {
      const err = new Error(body.message || "请求失败");
      err.code = body.code;
      err.httpStatus = res.status;
      throw err;
    }
    return body.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout(router.currentRoute.value.fullPath);
    }
    const msg =
      error.response?.data?.message || error.message || "网络错误";
    const err = new Error(msg);
    err.code = error.response?.data?.code || -1;
    err.httpStatus = error.response?.status || 0;
    return Promise.reject(err);
  },
);

export default request;
```

- [ ] **Step 13.2: Commit**

```bash
cd frontend && git add src/utils/request.js && git commit -m "feat(frontend): add Axios instance with auth interceptor + 401 redirect"
```

---

### Task 14:写 `stores/auth.js` + `api/auth.js` + 删 `utils/auth.js`

**Files:**
- Create: `frontend/src/api/auth.js`
- Create: `frontend/src/stores/auth.js`
- Delete: `frontend/src/utils/auth.js`

- [ ] **Step 14.1: 写 `frontend/src/api/auth.js`**

```js
// api/auth.js
// 注册 / 登录 / 当前用户 三个端点
// 调用方: stores/auth.js

import request from "@/utils/request";

export function register(payload) {
  return request.post("/client/auth/register", payload);
}

export function login(payload) {
  return request.post("/client/auth/login", payload);
}

export function fetchMe() {
  return request.get("/client/auth/me");
}
```

- [ ] **Step 14.2: 写 `frontend/src/stores/auth.js`**

```js
// stores/auth.js
// 用户登录状态: token + user profile
// 持久化: localStorage.szt_token + localStorage.szt_user
// 使用方: router/index.js 守卫;views/*/* 调用 login/register/logout

import { defineStore } from "pinia";
import router from "@/router";
import * as authApi from "@/api/auth";

const TOKEN_KEY = "szt_token";
const USER_KEY = "szt_user";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: "",
    user: null,
  }),

  getters: {
    isAuthed: (state) => !!state.token,
    displayName: (state) => state.user?.displayName || "",
    pointsBalance: (state) => state.user?.pointsBalance || 0,
  },

  actions: {
    async login(payload) {
      const data = await authApi.login(payload);
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    },

    async register(payload) {
      const data = await authApi.register(payload);
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    },

    logout(redirectPath) {
      this.token = "";
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (redirectPath) {
        router.push(`/auth?redirect=${encodeURIComponent(redirectPath)}`);
      }
    },

    restoreFromStorage() {
      this.token = localStorage.getItem(TOKEN_KEY) || "";
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        try {
          this.user = JSON.parse(raw);
        } catch {
          this.user = null;
        }
      }
    },
  },
});
```

- [ ] **Step 14.3: 此时先不动 `frontend/src/utils/auth.js`**

> **重要**:此文件还在被 `router/index.js`(Task 18)和 `views/auth/AuthPage.vue`(Task 19)引用。
> 真正的 `git rm` 推迟到 Phase 6 末尾的 Task 24,跟 mock 文件一起删,这样执行顺序安全。
> 本任务**只**创建 stores/api,**不**触碰 utils/auth.js。

- [ ] **Step 14.4: Commit**

```bash
cd frontend && git add src/api/auth.js src/stores/auth.js && git commit -m "feat(frontend): add auth store + API client, remove legacy utils/auth.js"
```

---

### Task 15:写 `utils/orderStatus.js`(7 阶段 → 4 展示阶段)

**Files:**
- Create: `frontend/src/utils/orderStatus.js`

- [ ] **Step 15.1: 写文件**

```js
// utils/orderStatus.js
// 订单 7 阶段状态 → 4 展示阶段映射
// recycle: pending_review → confirmed → assigned → in_progress → weighed → completed / cancelled
// donation: submitted → accepted → in_transit → received → completed / cancelled
//
// 展示阶段: pending | processing | completed | cancelled
// (与前端 useOrdersList 现有 badge 配色兼容)

const RECYCLE_MAP = {
  pending_review: "pending",
  confirmed: "pending",
  assigned: "processing",
  in_progress: "processing",
  weighed: "processing",
  completed: "completed",
  cancelled: "cancelled",
};

const DONATION_MAP = {
  submitted: "pending",
  accepted: "processing",
  in_transit: "processing",
  received: "processing",
  completed: "completed",
  cancelled: "cancelled",
};

export const DISPLAY_STAGES = ["pending", "processing", "completed", "cancelled"];

export function getOrderDisplayStage(order) {
  if (!order || !order.status) return "pending";
  const map = order.orderType === "donation" ? DONATION_MAP : RECYCLE_MAP;
  return map[order.status] || "pending";
}

export function isDonationOrder(order) {
  return order?.orderType === "donation";
}

export function isRecyclingOrder(order) {
  return order?.orderType === "recycle";
}
```

- [ ] **Step 15.2: Commit**

```bash
cd frontend && git add src/utils/orderStatus.js && git commit -m "feat(frontend): add order status mapping (7 stages → 4 display)"
```

---

### Task 16:写 `stores/orders.js` + `api/orders.js`

**Files:**
- Create: `frontend/src/api/orders.js`
- Create: `frontend/src/stores/orders.js`

- [ ] **Step 16.1: 写 `frontend/src/api/orders.js`**

```js
// api/orders.js

import request from "@/utils/request";

export function fetchOrders(params = {}) {
  return request.get("/client/orders", { params });
}

export function fetchOrderById(id) {
  return request.get(`/client/orders/${id}`);
}

export function submitRecycleOrder(payload) {
  return request.post("/client/orders/recycle", payload);
}

export function submitDonationOrder(payload) {
  return request.post("/client/orders/donation", payload);
}
```

- [ ] **Step 16.2: 写 `frontend/src/stores/orders.js`**

```js
// stores/orders.js
// 订单列表 + 详情 + 提交
// 使用方: views/client/OrdersPage + useOrdersList + useAppointmentForm + useDonationSubmit

import { defineStore } from "pinia";
import * as ordersApi from "@/api/orders";
import { getOrderDisplayStage, DISPLAY_STAGES } from "@/utils/orderStatus";

export const useOrdersStore = defineStore("orders", {
  state: () => ({
    list: [],
    current: null,
    pagination: { page: 1, pageSize: 10, total: 0 },
    statusFilter: "all",
    loading: false,
    errorText: "",
  }),

  getters: {
    statusStats(state) {
      const stats = { pending: 0, processing: 0, completed: 0, cancelled: 0 };
      for (const o of state.list) {
        const stage = getOrderDisplayStage(o);
        stats[stage] = (stats[stage] || 0) + 1;
      }
      stats.total = state.list.length;
      return stats;
    },
  },

  actions: {
    async fetchList(params = {}) {
      this.loading = true;
      this.errorText = "";
      try {
        const data = await ordersApi.fetchOrders(params);
        this.list = data.list;
        this.pagination = {
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
        };
      } catch (e) {
        this.errorText = e.message || "订单加载失败";
      } finally {
        this.loading = false;
      }
    },

    async fetchDetail(id) {
      this.loading = true;
      this.errorText = "";
      try {
        this.current = await ordersApi.fetchOrderById(id);
      } catch (e) {
        this.errorText = e.message || "订单详情加载失败";
      } finally {
        this.loading = false;
      }
    },

    async submitRecycle(payload) {
      return ordersApi.submitRecycleOrder(payload);
    },

    async submitDonation(payload) {
      return ordersApi.submitDonationOrder(payload);
    },

    setStatusFilter(filter) {
      this.statusFilter = filter;
    },
  },
});
```

- [ ] **Step 16.3: Commit**

```bash
cd frontend && git add src/api/orders.js src/stores/orders.js && git commit -m "feat(frontend): add orders store + API client"
```

---

### Task 17:写 `stores/serviceCenters.js` + `api/serviceCenters.js`

**Files:**
- Create: `frontend/src/api/serviceCenters.js`
- Create: `frontend/src/stores/serviceCenters.js`

- [ ] **Step 17.1: 写 `frontend/src/api/serviceCenters.js`**

```js
// api/serviceCenters.js

import request from "@/utils/request";

export function fetchServiceCenters(params = {}) {
  return request.get("/client/service-centers", { params });
}

export function fetchServiceCenterByCode(code) {
  return request.get(`/client/service-centers/${code}`);
}
```

- [ ] **Step 17.2: 写 `frontend/src/stores/serviceCenters.js`**

```js
// stores/serviceCenters.js

import { defineStore } from "pinia";
import * as serviceCentersApi from "@/api/serviceCenters";

export const useServiceCentersStore = defineStore("serviceCenters", {
  state: () => ({
    list: [],
    current: null,
    loading: false,
    errorText: "",
  }),

  actions: {
    async fetchList(params = {}) {
      this.loading = true;
      this.errorText = "";
      try {
        const data = await serviceCentersApi.fetchServiceCenters(params);
        this.list = data.list;
      } catch (e) {
        this.errorText = e.message || "服务站列表加载失败";
      } finally {
        this.loading = false;
      }
    },

    async fetchDetail(code) {
      this.loading = true;
      this.errorText = "";
      this.current = null;
      try {
        this.current = await serviceCentersApi.fetchServiceCenterByCode(code);
      } catch (e) {
        this.errorText = e.message || "服务站详情加载失败";
      } finally {
        this.loading = false;
      }
    },
  },
});
```

- [ ] **Step 17.3: Commit**

```bash
cd frontend && git add src/api/serviceCenters.js src/stores/serviceCenters.js && git commit -m "feat(frontend): add serviceCenters store + API client"
```

---

## Phase 6:前端集成

### Task 18:改 `router/index.js`(路由守卫改用 authStore)

**Files:**
- Modify: `frontend/src/router/index.js`(移除 `getCurrentUser` import,改用 `useAuthStore().isAuthed`)

- [ ] **Step 18.1: 修改 `router/index.js`**

读取文件,做两处修改:

1. 顶部 `import { getCurrentUser } from "../utils/auth";` 改为 `import { useAuthStore } from "../stores/auth";`
2. `router.beforeEach((to) => { ... })` 内的 `const user = getCurrentUser();` 改为 `const authStore = useAuthStore(); const user = authStore.isAuthed ? authStore.user : null;`,以及 `if (to.name === "auth" && user)` 改为 `if (to.name === "auth" && authStore.isAuthed)`,`if (to.meta.requiresAuth && !user)` 改为 `if (to.meta.requiresAuth && !authStore.isAuthed)`

修改后的 `beforeEach` 块:

```js
router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.name === "auth" && authStore.isAuthed) {
    return "/";
  }

  if (to.meta.requiresAuth && !authStore.isAuthed) {
    return {
      path: "/auth",
      query: {
        redirect: to.fullPath,
      },
    };
  }

  return true;
});
```

- [ ] **Step 18.2: 验证语法**

Run: `cd frontend && npx vite build --mode development 2>&1 | tail -20`
Expected: 无语法错误

- [ ] **Step 18.3: Commit**

```bash
cd frontend && git add src/router/index.js && git commit -m "feat(frontend): route guards now use Pinia auth store"
```

---

### Task 19:改 `views/auth/AuthPage.vue`(调 store + email 正则)

**Files:**
- Modify: `frontend/src/views/auth/AuthPage.vue`

- [ ] **Step 19.1: 修改 script 部分**

读取 `frontend/src/views/auth/AuthPage.vue`,做以下修改:

1. 删除 `import { ... login, register } from "../../utils/auth";`,改为:
   ```js
   import { useAuthStore } from "../../stores/auth";
   const authStore = useAuthStore();
   ```
2. 在 `isValidUsername` 函数(原校验 username)替换为 `isValidEmail`:
   ```js
   const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   function isValidEmail(value) {
     const text = value.trim();
     if (!text) return false;
     return EMAIL_REGEX.test(text);
   }
   ```
3. `validateLogin` 改为:
   ```js
   function validateLogin() {
     if (!isValidEmail(loginForm.username)) {
       return { valid: false, field: "username", message: "请输入有效邮箱" };
     }
     if (!loginForm.password.trim()) {
       return { valid: false, field: "password", message: "请输入密码" };
     }
     return { valid: true };
   }
   ```
4. `validateRegister` 把 `isValidUsername(registerForm.username)` 替换为 `isValidEmail(registerForm.username)`,message 改为 "请输入有效邮箱"
5. `submitLogin` 内的 `const result = login(loginForm.username, loginForm.password);` 改为:
   ```js
   try {
     await authStore.login({
       email: loginForm.username.trim(),
       password: loginForm.password.trim(),
     });
   } catch (e) {
     setStatus(e.message || "登录失败");
     // 抖动动画逻辑保持不变
     return;
   }
   router.push(resolveTarget(authStore.user));
   ```
6. `submitRegister` 内的 `const result = register({...})` 改为:
   ```js
   try {
     await authStore.register({
       email: registerForm.username.trim(),
       password: registerForm.password.trim(),
       displayName: registerForm.displayName.trim(),
     });
   } catch (e) {
     setStatus(e.message || "注册失败");
     return;
   }
   setStatus("注册成功，请登录。");
   isRightPanelActive.value = false;
   loginForm.username = registerForm.username;
   loginForm.password = registerForm.password;
   ```
7. `fillClientDemo` 的 prefilled 值保持 `user@szt.com / 123456`

- [ ] **Step 19.2: 模板 placeholder 调整**

把 `placeholder="账号（邮箱或手机号，至少 4 位）"` 改为 `placeholder="邮箱"`;`placeholder="账号（邮箱或手机号）"` 改为 `placeholder="邮箱"`。

- [ ] **Step 19.3: 验证构建**

Run: `cd frontend && npx vite build --mode development 2>&1 | tail -10`
Expected: 无错

- [ ] **Step 19.4: Commit**

```bash
cd frontend && git add src/views/auth/AuthPage.vue && git commit -m "feat(frontend): AuthPage wired to auth store + email regex"
```

---

### Task 20:改 `composables/useAppointmentForm.js`(调 ordersStore)

**Files:**
- Modify: `frontend/src/composables/useAppointmentForm.js`

- [ ] **Step 20.1: 修改 composable**

读取 `frontend/src/composables/useAppointmentForm.js`,做以下修改:

1. 顶部 imports:`import { fetchAppointmentMeta, submitAppointment } from "../mock/clientApi";` 改为:
   ```js
   import { useOrdersStore } from "../stores/orders";
   ```
2. 在 `useAppointmentForm` 函数顶部加 `const ordersStore = useOrdersStore();`
3. `loadMeta` 内部 `await fetchAppointmentMeta()` 改为:
   ```js
   // meta 是前端常量(utils/appointmentConstants),无需调远端;但保留 loadMeta 接口签名
   const { categories, weights, periods, tips } = await import("../utils/appointmentConstants").then(m => ({
     categories: ["小家电", "纸塑金属", "纺织旧衣", "有害垃圾", "大件家具"],
     weights: m.weightDisplayMap ? Object.keys(m.weightDisplayMap) : ["0-5kg", "5-10kg", "10-20kg", "20kg以上"],
     periods: ["09:00-12:00", "13:00-16:00", "18:00-21:00"],
     tips: [
       "请提前将可回收物打包，并保持表面干燥。",
       "玻璃、刀具等尖锐物请单独标记，便于上门人员安全处理。",
       "大件家具建议在备注里补充尺寸、电梯情况和搬运路径。",
     ],
   }));
   ```
   (或者更简洁——直接 import 常量,这里 inline 写出来保持 self-contained。)
4. `handleSubmit` 内部 `submitResult.value = await submitAppointment({...})` 改为:
   ```js
   try {
     const result = await ordersStore.submitRecycle({
       category: form.category,
       weightBand: form.weight,
       estimatedWeight: Number(weightInput.value) || 0,
       scheduledDate: form.date,
       scheduledPeriod: form.period,
       contactName: form.contactName,
       contactPhone: form.phone,
       addressSnapshot: form.address,
       note: form.note,
     });
     submitResult.value = {
       orderId: result.orderNo,
       pickupCode: result.pickupCode,
       estimatedPoints: result.estimatedPoints,
       status: result.status,
     };
     showSuccessModal.value = true;
   } catch (e) {
     errorText.value = e.message || "提交失败";
   } finally {
     submitLoading.value = false;
   }
   ```

注意:`AppointmentPage.vue` 调用 `handleSubmit({ itemImage: upload.itemImage.value })`,需要把这个参数保留为可选项;在 handleSubmit 内部 `itemImage` 暂时忽略(本轮不做文件上传)。

- [ ] **Step 20.2: 验证构建**

Run: `cd frontend && npx vite build --mode development 2>&1 | tail -10`
Expected: 无错

- [ ] **Step 20.3: Commit**

```bash
cd frontend && git add src/composables/useAppointmentForm.js && git commit -m "feat(frontend): useAppointmentForm submits to real backend via orders store"
```

---

### Task 21:改 `composables/useDonationSubmit.js`(调 ordersStore)

**Files:**
- Modify: `frontend/src/composables/useDonationSubmit.js`

- [ ] **Step 21.1: 修改 composable**

读取 `frontend/src/composables/useDonationSubmit.js`,做以下修改:

1. 顶部 imports:`import { submitDonation as submitDonationRequest } from "../mock/clientApi";` 改为:
   ```js
   import { useOrdersStore } from "../stores/orders";
   ```
2. 在 `useDonationSubmit` 函数顶部加 `const ordersStore = useOrdersStore();`
3. `handleSubmit` 内的 `const result = await submitDonationRequest(payload);` 改为:
   ```js
   try {
     const result = await ordersStore.submitDonation(payload);
     submitResult.value = {
       message: "捐赠信息提交成功，已同步到服务记录。",
       orderId: result.orderNo,
       status: result.status,
     };
     if (typeof onSuccess === "function") onSuccess();
   } catch (e) {
     errorText.value = e.message || "提交失败，请稍后重试。";
   } finally {
     submitLoading.value = false;
   }
   ```

- [ ] **Step 21.2: 验证构建**

Run: `cd frontend && npx vite build --mode development 2>&1 | tail -10`
Expected: 无错

- [ ] **Step 21.3: Commit**

```bash
cd frontend && git add src/composables/useDonationSubmit.js && git commit -m "feat(frontend): useDonationSubmit submits to real backend via orders store"
```

---

### Task 22:改 `composables/useOrdersList.js`(调 ordersStore + 状态映射升级)

**Files:**
- Modify: `frontend/src/composables/useOrdersList.js`

- [ ] **Step 22.1: 修改 composable**

读取 `frontend/src/composables/useOrdersList.js`,做以下修改:

1. 顶部 imports 修改:`import { fetchOrders } from "@/mock/clientApi";` 改为:
   ```js
   import { useOrdersStore } from "@/stores/orders";
   import {
     getOrderDisplayStage,
     isDonationOrder,
     isRecyclingOrder,
   } from "@/utils/orderStatus";
   ```
2. 把原文件顶部导出的 `isDonationOrder / isRecyclingOrder / getStatusStage / STATUS_STAGE / SERVICE_TYPE_CLASS` 整段删掉(或保留 SERVICE_TYPE_CLASS 常量定义),改成 re-export:
   ```js
   export { isDonationOrder, isRecyclingOrder } from "@/utils/orderStatus";
   export const getStatusStage = (order) => getOrderDisplayStage(order);
   export const STATUS_STAGE = {
     PENDING: "pending",
     PROCESSING: "processing",
     COMPLETED: "completed",
     CANCELLED: "cancelled",
   };
   export const SERVICE_TYPE_CLASS = {
     DONATION: "donation",
     RECYCLING: "recycling",
     REMAKING: "remaking",
   };
   export function getServiceTypeClass(order) {
     if (isDonationOrder(order)) return SERVICE_TYPE_CLASS.DONATION;
     if (isRecyclingOrder(order)) return SERVICE_TYPE_CLASS.RECYCLING;
     return SERVICE_TYPE_CLASS.REMAKING;
   }
   ```
3. 把 `useOrdersList` 函数体内的 `allOrders` ref、`fetchOrders` 调用、`statusStats` 实现全部委托给 store。**注意:** `ORDER_TABS` 和 `ORDER_SERVICE_TYPES` 常量必须先在文件顶部定义(下方给出完整代码),否则 `ORDER_TABS[0]` 会报 ReferenceError。
   ```js
   // 文件顶部(在 import 之后、export 之前):
   const ORDER_TABS = ["全部", "回收预约", "公益捐赠"];
   const ORDER_SERVICE_TYPES = ["全部类型", "回收预约", "公益捐赠", "旧物改造"];

   export function useOrdersList() {
     const store = useOrdersStore();
     return {
       loading: computed(() => store.loading),
       errorText: computed(() => store.errorText),
       allOrders: computed(() => store.list),
       keyword: ref(""),
       activeTab: ref(ORDER_TABS[0]),
       serviceTypeFilter: ref(ORDER_SERVICE_TYPES[0]),
       filteredOrders: computed(() => {
         const query = keyword.value.trim().toLowerCase();
         return store.list.filter((item) => {
           const passKeyword =
             !query ||
             String(item?.orderNo || "").toLowerCase().includes(query) ||
             String(item?.orderType || "").toLowerCase().includes(query) ||
             String(item?.serviceCenter?.name || "").toLowerCase().includes(query);
           const passTab =
             activeTab.value === ORDER_TABS[0] ||
             (activeTab.value === "回收预约" && isRecyclingOrder(item)) ||
             (activeTab.value === "公益捐赠" && isDonationOrder(item));
           const passServiceType =
             serviceTypeFilter.value === ORDER_SERVICE_TYPES[0] ||
             (serviceTypeFilter.value === "回收预约" && isRecyclingOrder(item)) ||
             (serviceTypeFilter.value === "公益捐赠" && isDonationOrder(item)) ||
             (serviceTypeFilter.value === "旧物改造" && !isRecyclingOrder(item) && !isDonationOrder(item));
           return passKeyword && passTab && passServiceType;
         });
       }),
       statusStats: computed(() => store.statusStats),
       loadOrders: () => store.fetchList(),
     };
   }
   ```

- [ ] **Step 22.2: 验证构建**

Run: `cd frontend && npx vite build --mode development 2>&1 | tail -10`
Expected: 无错

- [ ] **Step 22.3: Commit**

```bash
cd frontend && git add src/composables/useOrdersList.js && git commit -m "feat(frontend): useOrdersList delegates to orders store + status mapping"
```

---

### Task 23:改 `views/client/ServiceCenterDetailPage.vue`(调 serviceCentersStore)

**Files:**
- Modify: `frontend/src/views/client/ServiceCenterDetailPage.vue`

- [ ] **Step 23.1: 修改 script 部分**

读取 `frontend/src/views/client/ServiceCenterDetailPage.vue`,做以下修改:

1. 顶部 imports:`import { fetchServiceCenterById } from "../../mock/clientApi";` 改为:
   ```js
   import { useServiceCentersStore } from "../../stores/serviceCenters";
   ```
2. 把 `const loading / errorText / center` 三个 ref 删掉,改用 store:
   ```js
   const centersStore = useServiceCentersStore();
   const loading = computed(() => centersStore.loading);
   const errorText = computed(() => centersStore.errorText);
   const center = computed(() => centersStore.current);
   ```
3. `loadCenter(siteId)` 函数改为:
   ```js
   async function loadCenter(siteId = route.params.siteId) {
     // 注: 前端路由 param 名为 siteId,实际值是服务站 code(如 "xuhui-caohejing")。
     // 后端 service-centers 详情按 code 查,这里直接透传。
     await centersStore.fetchDetail(siteId);
   }
   ```

- [ ] **Step 23.2: 模板微调**

把模板里所有 `center.value.xxx` 改为 `center.xxx`(因为现在是 computed,不需要 .value),或在 setup 里保留 `const centerVal = computed(() => center.value);` 然后模板用 `centerVal.xxx`。

最简洁:在 setup 末尾加 `const centerData = computed(() => centersStore.current);` 把模板里的 `center.value` 全局替换为 `centerData`。

- [ ] **Step 23.3: 验证构建**

Run: `cd frontend && npx vite build --mode development 2>&1 | tail -10`
Expected: 无错

- [ ] **Step 23.4: Commit**

```bash
cd frontend && git add src/views/client/ServiceCenterDetailPage.vue && git commit -m "feat(frontend): ServiceCenterDetailPage wired to serviceCenters store"
```

---

### Task 24:删 `mock/clientApi.js` + `mock/timeApi.js`

**Files:**
- Delete: `frontend/src/mock/clientApi.js`
- Delete: `frontend/src/mock/timeApi.js`
- Delete: `frontend/src/utils/auth.js`(Task 14 推迟到这里,确保 router/AuthPage 已切到 store)

- [ ] **Step 24.1: 删除 + 验证**

Run:
```bash
cd frontend && git rm src/mock/clientApi.js src/mock/timeApi.js src/utils/auth.js
```
Expected: 三条 `rm ...` 输出

- [ ] **Step 24.2: 检查 mock 目录还剩什么**

Run: `ls frontend/src/mock/ && ls frontend/src/utils/`
Expected:
- `frontend/src/mock/` 至少剩 `Aiapi.js`、`picAI.js`、`mapApi.js`(这三个真实走远端,保留);`clientApi.js` 和 `timeApi.js` 已消失
- `frontend/src/utils/` 还存在 `auth.js`?**不应该存在**(`git rm` 已删)

- [ ] **Step 24.3: 验证构建**

Run: `cd frontend && npx vite build --mode development 2>&1 | tail -10`
Expected: 无错(已无 mock/clientApi 引用)

- [ ] **Step 24.4: 全仓 grep 残留**

Run: `grep -r "mock/clientApi\|mock/timeApi\|from.*mock/clientApi\|from.*mock/timeApi" frontend/src/ backend/src/ 2>&1 | head -20`
Expected: 无输出

- [ ] **Step 24.5: Commit**

```bash
cd frontend && git commit -m "chore(frontend): remove legacy mock layer (clientApi.js, timeApi.js)"
```

---

## Phase 7:端到端验证

### Task 25:backend + frontend 启动 + 浏览器手动验证

**Files:** 无文件改动,纯运行验证。

- [ ] **Step 25.1: 准备 backend `.env`**

Run: `cd backend && cp .env.example .env`(若 .env 已存在,跳过)
Edit `backend/.env`:
- 设 `JWT_SECRET=<任意长随机字符串>`
- 设 `DB_PASS=<本机 MySQL root 密码>`

- [ ] **Step 25.2: 应用 migration + seed**

Run:
```bash
cd backend && npm run db:migrate && npm run db:seed
```
Expected: 输出 migration 全部完成 + seed 成功

- [ ] **Step 25.3: 后端跑全部测试**

Run: `cd backend && npm test`
Expected: 18 个集成测试全 PASS

- [ ] **Step 25.4: 启动后端 dev server**

Run: `cd backend && npm run dev` (background)
Expected: 输出 `🚀 收智通后端服务已启动: http://localhost:8080`

- [ ] **Step 25.5: curl 验证关键端点**

Run:
```bash
# 1) 服务站列表
curl -s http://localhost:8080/api/v1/client/service-centers | head -c 300
# 期望: {"code":0,"message":"ok","data":{"list":[{"id":1,"code":"xuhui-caohejing",...}],"total":4}}

# 2) 登录拿 token
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/client/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@szt.com","password":"123456"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.token))")
echo "TOKEN=$TOKEN"

# 3) 订单列表(带 token)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/client/orders | head -c 400
# 期望: {"code":0,"message":"ok","data":{"list":[...4 条订单...],"total":4,...}}
```
Expected: 全部 `code: 0`

- [ ] **Step 25.6: 启动前端 dev server**

Run: `cd frontend && npm run dev` (background)
Expected: Vite 输出 `Local: http://localhost:5173/`

- [ ] **Step 25.7: 浏览器手动验证清单**

打开 `http://localhost:5173/`,按顺序验证:

- [ ] 首页加载正常,看到 4 个服务站卡片(从后端拿)
- [ ] 点首页服务站卡片 → 进入 `/service-centers/xuhui-caohejing` 详情页,显示名称/地址/电话/描述
- [ ] 点导航"登录" → 进入 `/auth`
- [ ] 点"填充测试账号" → 账号密码自动填好,点登录
- [ ] 登录成功 → 跳到首页
- [ ] 导航进"预约回收"(`/recycle-booking`),填表 → 提交,看到成功弹窗(orderNo + pickupCode)
- [ ] 跳到"订单"(`/orders`),看到刚才的 recycle 订单 + 4 条 seed 订单
- [ ] 点任意订单的"查看进度",drawer 打开显示详情
- [ ] 切 tab 到"公益捐赠",看到 2 条 seed donation 订单
- [ ] 进"公益"(`/charity`),选项目 → 填表 → 提交,看到成功弹窗
- [ ] 回"订单"页 → 看到新增的 donation 订单
- [ ] 点右上角退出登录 → 跳到 `/auth?redirect=/orders`(或当前页)
- [ ] 直接访问 `/orders` → 跳到 `/auth?redirect=/orders`

每项不通过就停下来查问题,不要继续往下推。

- [ ] **Step 25.8: 验证 frontend build**

Run: `cd frontend && npm run build`
Expected: `frontend/dist/` 产物生成,无 error

- [ ] **Step 25.9: 停 dev server**

用 TaskStop 关掉 backend + frontend 的后台 task。

- [ ] **Step 25.10: 最终 commit**

```bash
cd .. && git add -A && git status  # 检查没有意外新增
git commit -m "chore: end-to-end verification passed"  # 仅当 verify 全过
```

> **重要**:这一步 commit 只在所有验证都通过后做。如果发现问题,先回到对应 Task 修复再重跑。

---

## 附录 A:常见问题排查

### A.1 后端启动报 `JWT_SECRET is required`

`backend/.env` 没设 JWT_SECRET。在 `.env` 里加 `JWT_SECRET=<任意长字符串>`。

### A.2 migration 报 "table already has column code"

已运行过 migration 002。运行 `cd backend && npx sequelize-cli db:migrate:undo` 回滚一次,再 `npm run db:migrate` 重跑。

### A.3 测试报 "ValidationError: Unknown constraint"

sqlite 内存库不支持 DECIMAL/JSON 字段的某些约束。本计划的所有集成测试都不涉及 JSON 字段,DECIMAL 字段也只是数字写入,所以应该都能跑通。如果失败,把 `decimals: false` 加到对应 model 定义或临时切换到 MySQL test db。

### A.4 前端 dev server 报 "Cannot find module '@/stores/auth'"

确认 Task 14 已创建 `frontend/src/stores/auth.js`。检查 `frontend/vite.config.js` 的 `@` alias 是否指向 `src`。

### A.5 登录后跳到首页但 store 没更新

确认 `main.js` 在 `app.use(router)` 之前调了 `authStore.restoreFromStorage()`,且 store action 内 `this.token = data.token` 写入正常。

### A.6 浏览器 F12 报 "Network Error"

后端 dev server 没启动 / 端口不对。确认 `http://localhost:8080` 可访问,`baseURL` 在 `utils/request.js` 配置正确。

### A.7 Vite build 报 "Cannot find name 'getStatusStage'"

`composables/useOrdersList.js` 没把 `getStatusStage` export 出来。回去检查 Task 22.1 第 2 步的 re-export 块。

---

## 附录 B:不在本计划范围(后续批次)

- B 端管理后台(design.md §7)
- `/me` 单独接口(已隐式通过 login/register 返回)
- `/orders/:id/cancel` 用户取消
- Refresh token / 注销设备
- `/profile/summary`、`/check-ins`、`/points/logs`
- `/content/{home,faq,science}`
- `charity_projects` 表 + 公益项目 CRUD
- `service_slots` 可预约时段
- 文件上传(multer / OSS)
- 速率限制中间件
- 审计日志

---

*计划结束*