# C 端最关键接口第一批实施设计

> 版本:v1.0
> 编写日期:2026-07-06
> 适用范围:`E:\vue\SZTong_vv` 当前 C 端原型
> 状态:已通过 brainstorming,待用户 review 后进入 writing-plans
> 相关文档:`design.md`(整体平台演进)、`design2.md`(后端分阶段方案)、`task.md`(后端落地任务)

---

## 1. 目标与范围

### 1.1 本次目标

打通 C 端最关键的 8 个业务接口的真实数据流,让用户在前端浏览器里能:

1. 用邮箱注册 + 登录
2. 提交回收预约订单
3. 提交公益捐赠订单
4. 在 `/orders` 看到自己全部订单(回收 + 捐赠)
5. 点击订单查看详情
6. 在首页/详情页浏览真实服务站

### 1.2 范围

**包含**

- 后端 8 个 C 端路由 + JWT 鉴权
- 后端 1 份 migration + 1 个 seed 扩展
- 前端 Pinia 状态层 + Axios 拦截器 + 真实 API 客户端
- 前端 4 个页面 + 3 个 composable 切真实 API
- 后端 supertest 集成测试

**不包含**

- B 端管理后台(design.md / task.md P4 阶段)
- `/me`、`/profile/summary`、`/check-ins`、`/points/logs`、内容类接口(design2.md §6.4 第二批,本轮跳过)
- 文件上传(design2 §11 风险点 3,本轮仅保留元数据)
- Refresh token(7 天 JWT 过期后重新登录)
- 服务站时段 `service_slots` 表(design.md §5.3.4,本轮不在范围)
- `home_content_blocks` / `faq_items` / `science_articles` 表(第二批内容迁移)

---

## 2. 决策摘要(已锁定)

| 决策点 | 选择 | 决策依据 |
|--------|------|----------|
| 交付范围 | 后端 8 路由 + JWT + 前端 Pinia 切真实 API | 用户选择"方案 C"扩展版(全栈重构 + Pinia) |
| 登录账号 | email(强制 @+域名) | 零 schema 变更;AuthPage 加正则校验 |
| 公益项目字典 | 暂存前端 `utils/charityConstants.js`;`donation_orders.charity_project_id` 存 NULL | `donation_orders.charity_project_id` 字段已允许 NULL |
| 公益项目快照 | `donation_orders` 加 `project_title` + `project_location` 两列 | migration 002 |
| 物品图片 | 仅保留元数据,`recycle_orders.item_images` 存 NULL | 避免引入 multer / 对象存储 |
| 服务站 ID | 保留字符串 slug 作 URL;`service_centers` 加 `code VARCHAR(60) UNIQUE` 列 | URL 可读、与前端 `serviceCentersData` 对齐 |
| Demo seed | 扩 4 个 service_centers + 4 条 orders(归 demo user) | 让浏览器开箱即用 |
| 后端模块结构 | routes + service(贴近 `modules/ai/` 既有模式) | 用户选择与既有代码一致 |
| `clientApi.js` 处理 | 整体删除;composable 重写调 Pinia store | 用户选择"全部删除" |
| 订单状态枚举 | 7 阶段完整生命周期 | 与 design2.md §8.1 一致;前端映射到 4 展示阶段 |
| 服务站路由路径 | `/api/v1/client/service-centers` | 与 design2 / task.md 一致 |
| JWT payload | `{id, email, iat, exp}`,7 天过期 | email 方便调试 + 后续扩展 |
| 删除的 mock 文件 | `mock/clientApi.js`、`mock/timeApi.js`、`utils/auth.js` | 双数据源清理 |
| 前端测试 | 不写单测;只走 Vite dev 端到端浏览器验证 | 用户未要求;手动验证收益更高 |
| 后端测试 | supertest + Jest,5 个集成测试用例 | 沿用既有 jest,需新增 `jest` 依赖 |

---

## 3. 架构

### 3.1 整体分层

```
┌─────────────────────────────────────────────────────────────┐
│  前端 (Vue 3 + Pinia + Axios)                                │
│                                                              │
│  Views  ─►  Composables  ─►  Pinia Stores  ─►  Api Services  │
│                                                  │          │
│  (AuthPage / OrdersPage / ...)   (auth/orders/...) (api/)    │
│                                                              │
│  Api Services  ──HTTP──►  Backend                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  后端 (Express 5 + Sequelize)                                │
│                                                              │
│  routes  ─►  middlewares(auth/error)  ─►  services  ─►  ORM │
│                                                              │
│  /api/v1/client/auth /orders /service-centers /ai           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 关键边界

- **前端 store 不直接 import axios**,只调 api 层
- **api 层只发请求 + 解析响应**,不持有状态
- **composable 只编排 store + 视图状态**(loading / error / modal),不持有跨页面数据
- **后端 service 不写 router**,service 通过抛 `ApiError` + `next(err)` 由 error middleware 统一处理

### 3.3 目录变化总览

#### 后端新增

```
backend/src/
├── modules/
│   ├── auth/
│   │   ├── routes.js
│   │   └── auth.service.js
│   ├── orders/
│   │   ├── routes.js
│   │   └── orders.service.js
│   └── service-centers/
│       ├── routes.js
│       └── serviceCenters.service.js
└── utils/
    ├── ApiError.js
    ├── asyncHandler.js
    ├── jwt.js
    ├── password.js
    └── response.js

backend/migrations/
└── 002-add-service-center-code-and-donation-snapshots.js
```

#### 后端修改

- `middlewares/auth.js`(替换占位)
- `routes/index.js`(挂 3 个新模块)
- `db/seeders/001-demo-data.js`(扩 demo)
- `.env.example`(加 `JWT_SECRET`、`JWT_EXPIRES_IN`)
- `package.json`(`bcryptjs` 移到 deps,加 `jsonwebtoken`、`jest`、`supertest`)

#### 前端新增

```
frontend/src/
├── api/
│   ├── auth.js
│   ├── orders.js
│   └── serviceCenters.js
├── stores/
│   ├── auth.js
│   ├── orders.js
│   └── serviceCenters.js
└── utils/
    └── request.js
```

#### 前端修改

- `main.js`(加 `createPinia()`,移除 `initAuthSeed()`,mount 前 `authStore.restoreFromStorage()`)
- `router/index.js`(路由守卫改用 `useAuthStore().isAuthed`)
- `views/auth/AuthPage.vue`(调 store action;username 输入框加 email 正则)
- `views/client/AppointmentPage.vue` + `composables/useAppointmentForm.js`(改调 `ordersStore`)
- `views/client/CharityPage.vue` + `composables/useDonationSubmit.js`(改调 `ordersStore`)
- `views/client/OrdersPage.vue` + `composables/useOrdersList.js`(改调 `ordersStore` + 状态映射扩展)
- `views/client/ServiceCenterDetailPage.vue`(改调 `serviceCentersStore`)

#### 前端删除

- `frontend/src/mock/clientApi.js`
- `frontend/src/mock/timeApi.js`
- `frontend/src/utils/auth.js`

---

## 4. 接口契约

### 4.1 统一响应包装

所有 `/api/v1/*` 路由的响应统一为:

```json
{ "code": 0, "message": "ok", "data": { ... } }
```

- `code: 0` 业务成功
- `code !== 0` 业务错误(响应体仍带 `code`)
- HTTP 4xx/5xx 表示协议级错误,但响应体仍带 `code`
- 时间字段统一 ISO 8601
- 分页统一 `{ list, total, page, pageSize }`

### 4.2 8 个 C 端路由

| # | Method | Path | 鉴权 | 入参 | 出参 data | 错误码 |
|---|--------|------|------|------|-----------|--------|
| 1 | POST | `/api/v1/client/auth/register` | 公开 | `{email, password, displayName}` | `{token, user{id,email,displayName,pointsBalance}}` | 40001 / 40901 |
| 2 | POST | `/api/v1/client/auth/login` | 公开 | `{email, password}` | 同 #1 | 40101 / 40301 |
| 3 | POST | `/api/v1/client/orders/recycle` | 需登录 | `{category, weightBand, estimatedWeight, scheduledDate, scheduledPeriod, contactName, contactPhone, addressSnapshot, latitude?, longitude?, note?, itemImages?}` | `{id, orderNo, pickupCode, estimatedPoints, status}` | 40001 / 40101 |
| 4 | POST | `/api/v1/client/orders/donation` | 需登录 | `{projectTitle, projectLocation, itemType, itemName, quantityText?, weightText?, conditionText?, logisticsType?, contactName, contactPhone, note?}` | `{id, orderNo, status}` | 40001 / 40101 |

**入参校验约束**(后端手写校验,失败抛 `ApiError(40001)`)

- recycle:`category` ∈ `{小家电, 纸塑金属, 纺织旧衣, 有害垃圾, 大件家具}`;`weightBand` ∈ `{0-5kg, 5-10kg, 10-20kg, 20kg以上}`;`estimatedWeight` ∈ (0, 100] DECIMAL;`scheduledDate` 必须 ≥ 今天;`contactPhone` 必须匹配 `/^1[3-9]\d{9}$/`
- donation:`itemType` / `itemName` / `contactName` / `contactPhone` 必填,`contactPhone` 同上正则
| 5 | GET | `/api/v1/client/orders?status=&page=1&pageSize=10` | 需登录 | — | `{list:[...], total, page, pageSize}` | 40101 |
| 6 | GET | `/api/v1/client/orders/:id` | 需登录 | — | 单个 order + recycleDetail/donationDetail | 40101 / 40302 / 40401 |
| 7 | GET | `/api/v1/client/service-centers?city=&district=` | 公开 | — | `{list:[{id,code,name,city,district,address,businessHours,phone,description,status}]}` | — |
| 8 | GET | `/api/v1/client/service-centers/:code` | 公开 | — | 单个 center | 40401 |

### 4.3 Order 列表项形状

```json
{
  "id": 1,
  "orderNo": "SZT20260706001",
  "orderType": "recycle|donation",
  "status": "pending_review|confirmed|assigned|in_progress|weighed|completed|cancelled|submitted|accepted|in_transit|received",
  "scheduledDate": "2026-07-08",
  "scheduledPeriod": "09:00-12:00",
  "contactName": "张三",
  "contactPhone": "13800001111",
  "addressSnapshot": "...",
  "estimatedWeight": 7.5,
  "estimatedPoints": 45,
  "grantedPoints": 0,
  "createdAt": "2026-07-06T10:30:00Z",
  "recycleDetail": {
    "category": "纸塑金属",
    "weightBand": "5-10kg",
    "pickupCode": "P1234"
  } | null,
  "donationDetail": {
    "itemType": "衣物",
    "itemName": "旧棉衣",
    "weightText": "3kg",
    "logisticsType": "顺丰到付",
    "projectTitle": "...",
    "projectLocation": "..."
  } | null
}
```

### 4.4 ServiceCenter 形状

```json
{
  "id": 1,
  "code": "xuhui-caohejing",
  "name": "徐汇·漕河泾服务站",
  "city": "上海",
  "district": "徐汇区",
  "address": "宜山路 501 号",
  "businessHours": "09:00-21:00",
  "phone": "021-5600-2101",
  "description": "...",
  "status": 1
}
```

> 注:`coverImage` / `latitude` / `longitude` 字段后端 model 已有但本次响应不返回(前端用不到,留 P1 扩展)。

### 4.5 JWT

- Header: `Authorization: Bearer <token>`
- Payload: `{ id: <userId>, email, iat, exp }`
- 过期:7 天(`process.env.JWT_EXPIRES_IN`,默认 `7d`)
- Secret: `process.env.JWT_SECRET`(**无默认值,缺失启动报错**)

### 4.6 错误码体系

| HTTP | code | 含义 |
|------|------|------|
| 400 | 40001 | 参数校验失败 |
| 401 | 40101 | 未登录或 token 失效 |
| 403 | 40301 | 用户已禁用 |
| 403 | 40302 | 非本人订单 |
| 403 | 40303 | 当前状态不可取消(预留,本轮不实现 cancel 接口) |
| 404 | 40401 | 资源不存在 |
| 409 | 40901 | 邮箱已注册 |
| 500 | 50001 | 服务端异常 |

---

## 5. 数据模型变更

### 5.1 Migration `002-add-service-center-code-and-donation-snapshots.js`

```js
// up
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

// down
await queryInterface.removeColumn('donation_orders', 'project_location');
await queryInterface.removeColumn('donation_orders', 'project_title');
await queryInterface.removeColumn('service_centers', 'code');
```

### 5.2 Sequelize Model 同步修改

- `backend/src/db/models/serviceCenter.js`:加 `code` 字段定义(`field: 'code'`,`unique: true`)
- `backend/src/db/models/donationOrder.js`:加 `projectTitle` 和 `projectLocation` 字段定义

### 5.3 Seed 扩展(`001-demo-data.js` 追加,保持幂等)

**service_centers**(4 条,与前端 `serviceCentersData` 一一对应):

| code | name | city | district | address | business_hours | description |
|------|------|------|----------|---------|----------------|-------------|
| `xuhui-caohejing` | 徐汇·漕河泾服务站 | 上海 | 徐汇区 | 宜山路 501 号 | 09:00-21:00 | 面向漕河泾与徐家汇片区提供预约上门、社区定点回收和可复用物品分拣服务 |
| `changning-zhongshan` | 长宁·中山公园服务站 | 上海 | 长宁区 | 凯旋路 1200 号 | 09:00-20:30 | 连接中山公园商圈、周边社区与公益机构,支持旧衣筛选、二次流转和积分入账 |
| `jingan-pengpu` | 静安·彭浦服务站 | 上海 | 静安区 | 江场路 80 号 | 10:00-21:00 | 服务彭浦与大宁片区的居民回收场景,重点覆盖旧衣、闲置小家电和社区环保活动 |
| `putuo-zhenru` | 普陀·真如服务站 | 上海 | 普陀区 | 真北路 1000 号 | 09:30-19:30 | 提供有害垃圾专项收运和大件家具预约回收 |

**orders**(4 条,全部归 demo user `user@szt.com`):

| order_type | status | service_center_id | 备注 |
|------------|--------|-------------------|------|
| recycle | `pending_review` | xuhui-caohejing | 对应前端 `SZT-20260324-001` |
| recycle | `completed` | changning-zhongshan | 对应前端 `SZT-20260320-011` |
| donation | `received` | jingan-pengpu | 对应前端 `SZT-20260316-028`(类型实际是 donation) |
| donation | `cancelled` | putuo-zhenru | 对应前端 `SZT-20260311-102`(cancel_reason 字段填充) |

每条 order 同步写 `recycle_orders` 或 `donation_orders` 子表(对应原 mock 数据)。

---

## 6. 状态机

### 6.1 Recycle 订单

```
pending_review → confirmed → assigned → in_progress → weighed → completed
   ↘ ↘ ↘ ↘ ↘ ↘ ↘ 任意阶段 → cancelled
```

- 新建订单时,初始状态 `pending_review`,`pickup_code` 随机 4 位数字
- 用户侧本轮不实现 cancel 接口(design2 路径,放到第二批)
- `granted_points` 仅在 B 端"称重完成"时填入,本轮所有 seed 订单 `granted_points = 0`(已完成那两条除外,可填入历史积分便于前端展示)

### 6.2 Donation 订单

```
submitted → accepted → in_transit → received → completed
   ↘ ↘ ↘ ↘ ↘ ↘ ↘ 任意阶段 → cancelled
```

- 新建订单时,初始状态 `submitted`
- `charity_project_id` 存 NULL,`project_title` / `project_location` 由前端传入写子表

### 6.3 状态流转约束

- 任何 `order.update({status: ...})` 必须经过 `service.transitionStatus(order, toStatus, operator, {transaction})`
- 状态变更写 `order_logs`(本轮不实现 `order_logs` 表,先在 service console.log 留 TODO;第二批内容迁移时再加表)
- `cancelled` 状态需要 `cancel_reason`(本轮由 B 端填;seed 数据手工填)

### 6.4 状态 → 展示阶段映射(前端)

```js
// utils/orderStatus.js (新增)
const RECYCLE_DISPLAY_MAP = {
  pending_review: 'pending',
  confirmed: 'pending',
  assigned: 'processing',
  in_progress: 'processing',
  weighed: 'processing',
  completed: 'completed',
  cancelled: 'cancelled',
};
const DONATION_DISPLAY_MAP = {
  submitted: 'pending',
  accepted: 'processing',
  in_transit: 'processing',
  received: 'processing',
  completed: 'completed',
  cancelled: 'cancelled',
};
export function getOrderDisplayStage(order) {
  return order.orderType === 'recycle'
    ? RECYCLE_DISPLAY_MAP[order.status] || 'pending'
    : DONATION_DISPLAY_MAP[order.status] || 'pending';
}
```

`composables/useOrdersList.js` 的 `getStatusStage` 函数改造为基于 `order.status` + `orderType` 走上面这张表,替换原有字符串 includes 匹配。

---

## 7. 鉴权与安全

### 7.1 JWT 签发与校验

- `utils/jwt.js`:
  - `sign(payload)` → 调 `jsonwebtoken.sign(payload, SECRET, {expiresIn})`
  - `verify(token)` → 调 `jsonwebtoken.verify(token, SECRET)`,失败抛 `ApiError(40101)`
- `middlewares/auth.js`:
  - 解析 `Authorization: Bearer <token>`
  - 缺失或格式错 → `next(new ApiError(40101, '未登录'))`
  - `jwt.verify` 失败 → `next(new ApiError(40101, 'token 失效'))`
  - 成功 → `req.user = { id, email }`,继续

### 7.2 密码

- `utils/password.js`:
  - `hash(plain)` → `bcrypt.hash(plain, 10)`
  - `compare(plain, hashed)` → `bcrypt.compare(plain, hashed)`

### 7.3 参数校验

- 路由层手写最小校验(空值、长度、邮箱正则)→ 失败 `throw new ApiError(40001, msg)`
- 不引入 Joi / Zod(超出 P0 范围)

### 7.4 邮箱正则

- 后端:`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- 前端 AuthPage username 输入框 blur 触发同样正则

---

## 8. 错误处理与统一响应

### 8.1 `utils/ApiError.js`

```js
class ApiError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
```

### 8.2 `utils/response.js`

```js
const ok = (data = null) => ({ code: 0, message: 'ok', data });
const fail = (code, message, httpStatus = 400) => {
  const err = new ApiError(code, message, httpStatus);
  return err;
};
```

### 8.3 `utils/asyncHandler.js`

```js
// wrap async route handlers so thrown errors propagate to error middleware
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

### 8.4 `middlewares/error.js`(已存在,无改动)

确认现有实现会捕获 `ApiError` 并返回 `{code, message, data: null}`,500 时不泄露堆栈。

---

## 9. 前端 Pinia Store 形状

### 9.1 `stores/auth.js`

```js
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    user: null,           // { id, email, displayName, pointsBalance }
  }),
  getters: {
    isAuthed: (state) => !!state.token,
    displayName: (state) => state.user?.displayName || '',
    pointsBalance: (state) => state.user?.pointsBalance || 0,
  },
  actions: {
    async login({ email, password }) {
      const data = await api.auth.login({ email, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('szt_token', data.token);
      localStorage.setItem('szt_user', JSON.stringify(data.user));
    },
    async register(payload) {
      const data = await api.auth.register(payload);
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('szt_token', data.token);
      localStorage.setItem('szt_user', JSON.stringify(data.user));
    },
    logout(redirectPath) {
      this.token = '';
      this.user = null;
      localStorage.removeItem('szt_token');
      localStorage.removeItem('szt_user');
      if (redirectPath) router.push(`/auth?redirect=${encodeURIComponent(redirectPath)}`);
    },
    restoreFromStorage() {
      this.token = localStorage.getItem('szt_token') || '';
      const raw = localStorage.getItem('szt_user');
      if (raw) try { this.user = JSON.parse(raw); } catch { this.user = null; }
    },
  },
});
```

### 9.2 `stores/orders.js`

```js
export const useOrdersStore = defineStore('orders', {
  state: () => ({
    list: [],
    current: null,
    pagination: { page: 1, pageSize: 10, total: 0 },
    statusFilter: 'all',
    loading: false,
    errorText: '',
  }),
  getters: {
    statusStats(state) {
      return state.list.reduce((acc, o) => {
        const stage = getOrderDisplayStage(o);
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, { pending: 0, processing: 0, completed: 0, cancelled: 0 });
    },
  },
  actions: {
    async fetchList({ status, page = 1, pageSize = 10 } = {}) {
      this.loading = true; this.errorText = '';
      try {
        const data = await api.orders.list({ status, page, pageSize });
        this.list = data.list; this.pagination = { page, pageSize, total: data.total };
      } catch (e) { this.errorText = e.message; }
      finally { this.loading = false; }
    },
    async fetchDetail(id) {
      this.loading = true; this.errorText = '';
      try { this.current = await api.orders.detail(id); }
      catch (e) { this.errorText = e.message; }
      finally { this.loading = false; }
    },
    async submitRecycle(payload) {
      return api.orders.submitRecycle(payload);
    },
    async submitDonation(payload) {
      return api.orders.submitDonation(payload);
    },
  },
});
```

### 9.3 `stores/serviceCenters.js`

```js
export const useServiceCentersStore = defineStore('serviceCenters', {
  state: () => ({ list: [], current: null, loading: false, errorText: '' }),
  actions: {
    async fetchList(params) { /* same pattern */ },
    async fetchDetail(code) { /* same pattern */ },
  },
});
```

### 9.4 `utils/request.js` 拦截器契约

```js
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

const request = axios.create({ baseURL: 'http://localhost:8080/api/v1' });

request.interceptors.request.use((config) => {
  const { token } = useAuthStore();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

request.interceptors.response.use(
  (res) => {
    if (res.data.code !== 0) {
      const err = new Error(res.data.message);
      err.code = res.data.code;
      throw err;
    }
    return res.data.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout(router.currentRoute.value.fullPath);
    }
    return Promise.reject(error);
  },
);

export default request;
```

> 注:`baseURL` 写入策略:dev 用 `http://localhost:8080/api/v1`,prod 用空字符串(同源由后端 app.js 的 SPA fallback 代理)。简单做:`baseURL: import.meta.env.DEV ? 'http://localhost:8080/api/v1' : '/api/v1'`。

---

## 10. 积分预估规则

- Recycle:`estimated_points` 根据 `weightBand` 查表

  | weightBand | estimatedPoints |
  |------------|-----------------|
  | `0-5kg` | 18 |
  | `5-10kg` | 45 |
  | `10-20kg` | 70 |
  | `20kg以上` | 100 |

- Donation:`estimated_points = 0`,`granted_points = 0`(本轮不接 B 端,前端展示时统一显示 `|| 120` 兜底)
- 用户 `points_balance` 仅在 B 端发放;C 端下单**不动余额**,避免前端伪造

---

## 11. 测试策略

### 11.1 后端集成测试(`backend/__tests__/integration/`)

新增依赖:`jest` + `supertest`。`jest.config.js` 使用 sqlite 内存模式(`process.env.DB_DIALECT='sqlite'`,`DB_NAME=':memory:'`)避免污染 MySQL。

5 个集成测试用例:

1. `auth.register.test.js` — POST `/auth/register` 成功 + 重复 email 返回 40901
2. `auth.login.test.js` — POST `/auth/login` 成功 + 错误密码返回 40101
3. `orders.recycle.test.js` — POST `/orders/recycle` 成功(已登录)+ 未登录返回 40101
4. `orders.donation.test.js` — POST `/orders/donation` 成功(已登录)
5. `orders.list.test.js` — GET `/orders` 需登录;无 token 返回 40101

### 11.2 前端测试

不写单测。本轮走 Vite dev 端到端浏览器验证(`npm run dev` + 实际操作)。

### 11.3 验收清单

```
cd backend
npm install
npm run db:migrate           # 应用 migration 001 + 002
npm run db:seed              # 4 个 service_centers + 4 条 orders 写入
npm test                     # 5 个集成测试全绿
npm run dev                  # 启动后端,http://localhost:8080

# 另一终端
cd frontend
npm install
npm run dev                  # 启动前端,http://localhost:5173
```

- [ ] curl `localhost:8080/api/v1/client/service-centers` 返回 4 条
- [ ] curl 登录 demo 账号,拿到 token
- [ ] 浏览器登录 demo 账号,跳到首页
- [ ] 提交回收预约,跳到 `/orders` 看到新订单(recycle)
- [ ] 提交捐赠,跳到 `/orders` 看到新订单(donation)
- [ ] 点首页服务站卡片 → `/service-centers/xuhui-caohejing` 详情页正常
- [ ] 退出登录 → `/orders` 跳到 `/auth?redirect=/orders`

---

## 12. 风险与控制

| 风险 | 控制 |
|------|------|
| 前端双数据源不一致(mix 真接口 + mock) | 彻底删除 `mock/clientApi.js` / `mock/timeApi.js` / `utils/auth.js` |
| AuthPage 邮箱校验与后端不一致 | 前后端共用 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`,code review 同步 |
| 种子数据不幂等(重复跑报错) | 用 `findOrCreate` + `where: {email/username/code}` 兜底 |
| Jest 用 sqlite 与 mysql 行为不一致(JSON 字段) | 集成测试只覆盖 auth + 简单 order CRUD,不涉及 JSON 字段写入 |
| JWT_SECRET 缺失导致启动报错 | `.env.example` 加注释;`server.js` 启动期 `if (!JWT_SECRET) process.exit(1)` |
| `baseURL` 在 prod 同源部署时拼接错误 | 用 `import.meta.env.DEV` 区分;production 走同源 `/api/v1` |

---

## 13. 显式不做(Out of Scope)

- B 端管理后台(design.md §7)
- Refresh token / 注销设备列表
- `/me` 单独接口(本轮 login/register 响应已带 user 信息)
- `/orders/:id/cancel` 取消接口(design2 第一批列表里有,本轮用户未要求,留第二批)
- 短信验证码 / 找回密码(design.md P3 阶段)
- 服务站时段 `service_slots` 表 + 可预约时段接口(design.md §5.3.4)
- `charity_projects` 表 + 公益项目 CRUD(design.md §5.3.7)
- 个人中心聚合接口 `/profile/summary`、`/check-ins`、`/points/logs`(design2 §6.4 第二批)
- 首页内容 `/content/home`、`/content/faq`、`/content/science`(design2 §6.4 第二批)
- 文件上传(multer / OSS)
- 速率限制 / 防爆破中间件(design.md §9 安全)
- 审计日志 `audit_logs`(B 端才需要)
- 国际化文案切换

---

## 14. 后续路径

完成本批后,下一批建议顺序:

1. `/me` + `/profile/summary`(用户信息聚合,前端 ProfilePage 接入)
2. `/check-ins` + `/points/logs`(积分体系闭环)
3. `/orders/:id/cancel` 用户取消订单
4. `/content/{home,faq,science}` 内容类迁移(design2 §6.4 第二批)
5. B 端管理后台(task.md §6 + design.md §7)

每批单独走一次 brainstorming → spec → plan → implementation 循环。

---

*文档结束*