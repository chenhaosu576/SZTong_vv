# 设计稿：批次一 — C 端 mock→真实接口收尾 + CharityPage 接通

> 日期：2026-07-07
> 适用范围：收智通 C 端 Web 迁移收尾（AuthPage / AppointmentPage / OrdersPage 已在 store 层接好真实后端，本批完成 CharityPage 接通 + 全量清理 legacy 路径）

---

## 一、背景与现状评估

### 1.1 文档反复强调的"4 个首批页面"

`design.md` 第 8.1 节"迁移步骤"列出的 4 个 C 端页面是 AuthPage / AppointmentPage / OrdersPage / ProfilePage；`CLAUDE.md` 与历次 commit 反复强调"逐页从 mock 切到真实接口"。

### 1.2 实际迁移进度（探查后）

| 页面 | 当前状态 | 走的链路 |
|------|----------|----------|
| AuthPage | ✅ 已接真 | `useAuthStore` → `/api/v1/client/auth/*` |
| AppointmentPage | ✅ 已接真 | `useAppointmentForm` → `useOrdersStore.submitRecycle` → `/api/v1/client/orders/recycle` |
| OrdersPage | ✅ 已接真 | `useOrdersList` → `useOrdersStore.fetchList` → `/api/v1/client/orders` |
| ProfilePage | ✅ 已接真 | `useProfileCalendar` → `useOrdersStore.fetchList`；内容走 `useContentStore` |
| HomePage / FaqPage | ✅ 已接真 | `useContentStore` |
| **CharityPage** | ❌ **projects 仍硬编码** | `projects` from `utils/charityConstants.js`（无 API） |

本批实际要做的是：

1. **接通 CharityPage 的项目列表**（新建后端 `charity` 模块 + 前端 `api/charity` + `useCharityProjects` composable + 改 page）
2. **清理 legacy 路径**：`utils/auth.js` 整文件淘汰、`mock/clientApi.js` 整文件淘汰、`App.vue` / `ClientLayout.vue` 切到 `useAuthStore`、`main.js` 删 `initAuthSeed`、修坏掉的 `useOrdersList.test.js`

### 1.3 用户决策摘要

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 批次范围 | 补完 CharityPage + 顺带清理遗留 | 对得上"逐页切"的口径 |
| 紧急度计算 | 后端按 deadline 实时算 | 规则调整不需联调前端 |
| 筛选枚举 | regions / categories 由 API 返回 | 一次拿全 |
| 捐赠项目 ID | 写入 `orders.charity_project_id` | 让表里 FK 真实生效，B 端能按项目查 |
| `categories` SQL 缺口 | 走方案 (B)：不动 schema，前端 `CharityProjectFilters` 暂不显示分类行 | SQL 没 `categories` 字段，不在 P0 7 张表范围 |
| `useCharityProjects` 是否走 Pinia | 不走，单页 composable 即可 | 项目列表只在 CharityPage 用，store 是过度抽象 |

---

## 二、目标与非目标

### 2.1 目标

1. **CharityPage 接通真实接口**：项目列表来自 `charity_projects` 表，紧急度由后端按 `deadline` 算，regions 由后端返回
2. **捐赠订单写 `charityProjectId` 外键**：让 `orders.charity_project_id` 真正生效
3. **全量清理 legacy 路径**：`utils/auth.js`、`mock/clientApi.js` 整文件删除；`App.vue` / `ClientLayout.vue` 切到 `useAuthStore`；`main.js` 移除 `initAuthSeed`
4. **修测试**：`composables/__tests__/useOrdersList.test.js` 改 mock `useOrdersStore`
5. **新增测试**：`useCharityProjects` / `useCharityFilters` 单元测试；后端 `charity.projects` + `orders.donation` 集成测试

### 2.2 非目标

- ProfilePage 已有 store 链路，不在本批范围
- `useProfileCheckIn` 仍走 localStorage（真实化是 P3，本批不动）
- `Aiapi.js / picAI.js / mapApi.js` 三个 AI/地图代理模块已有真链路，不动
- `useChatSessions / useChatStream / useImageRecognition / useDonationForm` 不动
- `useDatePicker / useTilt3D / useTypewriter / useRevealOnScroll` 纯 UI 工具，不动
- `categories` SQL 字段（衣物/图书/文具/家居/其他）—— 不动 schema，前端筛选 UI 暂不显示分类行
- B 端 admin 端到端打通（`design.md` P1）—— 本批不涉及

---

## 三、文件清单

### 3.1 新增

**后端**

| 路径 | 职责 |
|------|------|
| `backend/src/db/models/charityProject.js` | `charity_projects` + `charity_project_needs` 两张表 |
| `backend/src/modules/charity/charity.service.js` | 列表（带 region/urgency 过滤）/ 详情（联 needs） |
| `backend/src/modules/charity/routes.js` | GET list / GET :id（公开） |
| `backend/src/db/seeders/003-charity-projects.js` | 8 个项目，幂等 `findOrCreate` |
| `backend/__tests__/charity.projects.test.js` | 列表/详情/过滤集成测试 |
| `backend/__tests__/orders.donation.test.js` | 扩：捐赠带 `charityProjectId` 入库 + list 联出 |

**前端**

| 路径 | 职责 |
|------|------|
| `frontend/src/api/charity.js` | `fetchCharityProjects` / `fetchCharityProjectById` |
| `frontend/src/composables/useCharityProjects.js` | 单页业务状态机：`projects / regions / loading / errorText` |
| `frontend/src/composables/__tests__/useCharityProjects.test.js` | composable 单元测试 |
| `frontend/src/composables/__tests__/useCharityFilters.test.js` | composable 单元测试（接收 `{ projects, regions }` 新签名） |
| `frontend/src/utils/authConstants.js` | `ROLE_CLIENT` / `MIN_PASSWORD_LENGTH` 常量，替代 `utils/auth.js` |

### 3.2 修改

| 路径 | 改动 |
|------|------|
| `backend/src/db/models/index.js` | 引入并导出 `CharityProject` / `CharityProjectNeed`；注册关联（`CharityProject.hasMany(CharityProjectNeed, { as: 'needs' })`；`DonationOrder.belongsTo(CharityProject, { foreignKey: 'charityProjectId' })`） |
| `backend/src/modules/orders/orders.service.js` | `validateDonationPayload` 新增 `charityProjectId`（可选、整数校验）；`createDonationOrder` 写入；`listOrders` / `getOrderForUser` 的 `include` 自动带出 `charityProject`（关联注册后无需手动加） |
| `backend/src/routes/index.js` | 挂 `router.use('/v1/client/charity', require('../modules/charity/routes'))` |
| `frontend/src/views/client/CharityPage.vue` | 删除静态 `projects / regionOptions` import；用 `useCharityProjects` 注入；`useCharityFilters` 改签名为 `{ projects, regions }`；`onMounted(load)`；列表区显示 loading / errorText |
| `frontend/src/composables/useCharityFilters.js` | 改签名：接收 `{ projects, regions }`；删除内部 `getProjectUrgency`（紧急度由 API 直接返回 `project.urgency`）；`regionOptions` 由 caller 注入；`matchesUrgency` 直接 `project.urgency === selectedUrgency.value` |
| `frontend/src/composables/useDonationSubmit.js` | 调 `ordersStore.submitDonation` 时多带 `charityProjectId: selectedProject?.id ?? null` |
| `frontend/src/utils/charityConstants.js` | 删除 `projects`（3 项静态）+ `regionOptions`（从 projects 推）；保留 `categories / urgencyOptions / urgentDaysThreshold / processSteps / trustFeatures` |
| `frontend/src/views/auth/AuthPage.vue` | import 切到 `utils/authConstants.js` |
| `frontend/src/App.vue` | 切到 `useAuthStore`（`computed(() => authStore.user)`、`storage` 监听 → `restoreFromStorage`） |
| `frontend/src/layouts/ClientLayout.vue` | 切到 `useAuthStore`（`authStore.user` + `authStore.logout()`） |
| `frontend/src/main.js` | 删除 `initAuthSeed()` 相关概念（整段函数从未在 main.js 调用，仅作为概念删除） |
| `frontend/src/composables/__tests__/useOrdersList.test.js` | 改 mock `@/stores/orders`；保留所有断言 |
| `frontend/src/composables/useImageRecognition.js` | 内联原 `mock/clientApi.analyzeImage` 的逻辑（`File` 走 `analyzeImageWithAI`，否则 `[]`），去掉对 `mock/clientApi` 的依赖 |
| `frontend/src/components/client/charity/CharityProjectFilters.vue` | 暂时移除分类行（或留"全部需求"占位 disabled），因为后端暂不返回 `categories` 维度 |
| `frontend/src/components/client/charity/CharityProjectCard.vue` | 把原 `getProjectUrgency(project)` 替换成直接读 `project.urgency`（API 已返回） |

### 3.3 删除

| 路径 | 原因 |
|------|------|
| `frontend/src/utils/auth.js` | 整文件 10 个函数全部淘汰；2 个常量（`ROLE_CLIENT` / `MIN_PASSWORD_LENGTH`）迁到 `utils/authConstants.js` |
| `frontend/src/mock/clientApi.js` | 8 个导出中 7 个死代码（grep 全 src 0 引用），1 个 `analyzeImage` 内联到 `useImageRecognition` |

### 3.4 保持不变

- 后端 `auth / content / service-centers / metrics` 模块
- `frontend/src/api/{auth,orders,content,serviceCenters,metrics}.js`
- `frontend/src/stores/{auth,orders,content,serviceCenters,metrics}.js`
- `frontend/src/utils/{request.js, orderStatus.js, appointmentConstants.js, appointmentValidation.js, charityValidation.js}`
- `frontend/src/composables/{useAppointmentForm, useAppointmentUpload, useDatePicker, useOrdersList, useDonationForm, useRevealOnScroll, useProfileCheckIn, useProfileCalendar, ...}`
- `frontend/src/views/{auth/AuthPage.vue, client/AppointmentPage.vue, client/OrdersPage.vue, client/HomePage.vue, client/FaqPage.vue, client/ProfilePage.vue, client/ServiceCenterDetailPage.vue, ...}`
- 路由配置 / siteMap / 布局

---

## 四、详细设计

### 4.1 后端 charity 模块

**模型** `charityProject.js`

```js
// 对应 SZTong.sql L78-L101 + L269-L281
module.exports = (sequelize, DataTypes) => {
  const CharityProject = sequelize.define('CharityProject', {
    id, title, location, region, tag, status,
    urgentDaysThreshold, currentProgress, targetProgress, progressUnit,
    beneficiary, coverImage, description,
    createdAt, updatedAt,
  }, { tableName: 'charity_projects' });

  const CharityProjectNeed = sequelize.define('CharityProjectNeed', {
    id, charityProjectId, title, description, sortOrder,
    createdAt, updatedAt,
  }, { tableName: 'charity_project_needs' });

  CharityProject.hasMany(CharityProjectNeed, { foreignKey: 'charityProjectId', as: 'needs' });
  CharityProjectNeed.belongsTo(CharityProject, { foreignKey: 'charityProjectId', as: 'project' });

  return { CharityProject, CharityProjectNeed };
};
```

关联在 `db/models/index.js` 重新注册（保证 `DonationOrder.belongsTo(CharityProject)` 也生效）：

```js
const { CharityProject, CharityProjectNeed } = require('./charityProject')(sequelize, Sequelize.DataTypes);

CharityProject.hasMany(CharityProjectNeed, { foreignKey: 'charityProjectId', as: 'needs' });
CharityProjectNeed.belongsTo(CharityProject, { foreignKey: 'charityProjectId', as: 'project' });

DonationOrder.belongsTo(CharityProject, { foreignKey: 'charityProjectId', as: 'charityProject' });
```

**服务** `charity.service.js`

```js
async function listProjects({ region, urgency } = {}) {
  const where = { status: 1 };
  if (region && region !== '全国') where.region = region;

  const rows = await CharityProject.findAll({
    where, include: [{ model: CharityProjectNeed, as: 'needs' }],
    order: [['currentProgress', 'DESC']],
  });

  const now = new Date();
  const list = rows.map(p => {
    let daysLeft = null;
    if (p.deadline) {
      const ms = new Date(p.deadline).getTime() - now.getTime();
      daysLeft = ms > 0 ? Math.ceil(ms / 86400000) : 0;
    }
    const urgency = daysLeft !== null && daysLeft <= p.urgentDaysThreshold
      ? '紧急募集中' : '常态募集中';
    return pickProjectPayload(p, p.needs, daysLeft, urgency);
  });

  const filtered = !urgency || urgency === '全部' ? list : list.filter(p => p.urgency === urgency);

  const regions = [...new Set(list.map(p => p.region).filter(Boolean))];

  return { list: filtered, regions, total: filtered.length };
}
```

> 暂不返回 `categories` 数组（SZTong.sql 没有 `categories` 字段；后续 P1 加列后再扩）

**路由** `charity/routes.js`

```js
router.get('/projects', asyncHandler(async (req, res) => {
  const data = await service.listProjects({
    region: req.query.region,
    urgency: req.query.urgency,
  });
  res.json(ok(data));
}));

router.get('/projects/:id', asyncHandler(async (req, res) => {
  const data = await service.getProjectById(Number(req.params.id));
  res.json(ok(data));
}));
```

### 4.2 捐赠订单写入 `charityProjectId`

`backend/src/modules/orders/orders.service.js` `validateDonationPayload`：

```js
if (payload.charityProjectId != null) {
  if (!Number.isInteger(payload.charityProjectId) || payload.charityProjectId < 1) {
    throw new ApiError(40001, 'charityProjectId 必须是正整数');
  }
}
```

`createDonationOrder`：

```js
const order = await Order.create({
  ...,
  charityProjectId: payload.charityProjectId ?? null,  // ← 新增
  ...,
});
```

`listOrders` / `getOrderForUser` 现有 `include` 不用动——`DonationOrder.belongsTo(CharityProject)` 关联注册后，Sequelize 会自动通过 `DonationOrder` 的外键拉出 `charityProject` 字段（响应里出现在 `donationDetail.charityProject`）。

### 4.3 前端 CharityPage 接线

**`api/charity.js`**

```js
import request from "@/utils/request";

export function fetchCharityProjects(params = {}) {
  return request.get("/client/charity/projects", { params });
}
export function fetchCharityProjectById(id) {
  return request.get(`/client/charity/projects/${id}`);
}
```

**`composables/useCharityProjects.js`**

```js
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
    return projects.value.find(p => p.id === Number(id)) || null;
  }

  return { projects, regions, loading, errorText, load, findProjectById };
}
```

**`useCharityFilters` 新签名**

```js
// before: useCharityFilters(projects)
// after:  useCharityFilters({ projects, regions })
//
// 内部:
//   - 删除 getProjectUrgency 内部函数
//   - matchesUrgency 直接比对 project.urgency === selectedUrgency.value
//   - 保留 watch(filteredProjects) 在 selectedProject 被踢出时清空
//   - 保留 selectProject / setSelected* 5 个 setter
//
// 使用方 caller 拼 regionOptions: ["全国", ...regions.value]
```

**`CharityPage.vue` 改动**

```js
// 删除:
//   import { projects, regionOptions, urgencyOptions, processSteps, trustFeatures } from "@/utils/charityConstants";
// 新增:
const { projects, regions, loading, errorText, load } = useCharityProjects();
const filters = useCharityFilters({ projects, regions });
const regionOptions = computed(() => ["全国", ...regions.value]);
onMounted(load);
```

`useDonationSubmit` 拿 `selectedProject.id` → `charityProjectId`：

```js
const payload = {
  charityProjectId: selectedProject?.id ?? null,  // ← 新增
  projectTitle: ...,
  ...
};
```

### 4.4 清理 pass

**`App.vue`**：

```js
// before
import { getCurrentUser } from "./utils/auth";
const user = ref(getCurrentUser());
function syncUser() { user.value = getCurrentUser(); }

// after
import { useAuthStore } from "./stores/auth";
const authStore = useAuthStore();
const user = computed(() => authStore.user);
function syncUser() { authStore.restoreFromStorage(); }
```

`storage` 监听保留；`LoginPromptModal` 显示条件改为 `!authStore.isAuthed`。

**`ClientLayout.vue`**：同上，import 改 `useAuthStore`，`logout()` 改 `authStore.logout()`，`NavBar` 接收 `:user="authStore.user"`。

**`main.js`**：不变（已经只 import `useAuthStore`；`initAuthSeed` 从未在 main.js 出现，是 `utils/auth.js` 里的死函数）。

**`utils/authConstants.js`**（新建）：

```js
export const ROLE_CLIENT = "client";
export const MIN_PASSWORD_LENGTH = 6;
```

`AuthPage.vue` 的 2 处 import 改路径。

**`utils/auth.js`**：整文件删除。`grep -r "utils/auth" frontend/src` 应只剩 `authConstants.js` 自身。

**`mock/clientApi.js`**：整文件删除。`analyzeImage` 逻辑内联到 `useImageRecognition.js`：

```js
// useImageRecognition.js 默认 analyzer 由 analyzeImageWithAI 提供
// (analyzeImageWithAI 已直接处理 File 输入;无 File 情况由 caller 决定,
//  当前 useImageRecognition 接受 analyzer options,不传则用默认)
```

**`useOrdersList.test.js`**：mock 入口从 `@/mock/clientApi` 换到 `@/stores/orders`：

```js
vi.mock("@/stores/orders", () => ({ useOrdersStore: vi.fn() }));
import { useOrdersStore } from "@/stores/orders";

const fetchList = vi.fn();
useOrdersStore.mockReturnValue({
  fetchList,
  list: ref([]),
  loading: ref(false),
  errorText: ref(""),
  statusStats: computed(() => ({ pending:0, processing:0, completed:0, cancelled:0, total:0 })),
});
```

---

## 五、数据契约

### 5.1 后端响应

**`GET /api/v1/client/charity/projects`**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 1,
        "title": "大凉山冬季暖心计划",
        "location": "四川·凉山",
        "region": "西部地区",
        "tag": "紧急项目",
        "urgentDaysThreshold": 7,
        "currentProgress": 72,
        "targetProgress": 1200,
        "progressUnit": "件",
        "beneficiary": "瓦吾小学学生",
        "coverImage": "https://...",
        "description": "...",
        "deadline": "2026-08-15T00:00:00.000Z",
        "daysLeft": 14,
        "urgency": "常态募集中",
        "needs": [
          { "id": 1, "title": "儿童冬装外套", "description": "标准:8 成新以上", "sortOrder": 1 }
        ]
      }
    ],
    "regions": ["西部地区", "华东地区", "华中地区"],
    "total": 8
  }
}
```

**`GET /api/v1/client/charity/projects/:id`**

```json
{ "code": 0, "message": "ok", "data": { /* 单个 project，同上结构 */ } }
```

**`POST /api/v1/client/orders/donation`**（新增可选字段）

```json
// request
{
  "charityProjectId": 5,           // ← 新增，可选
  "projectTitle": "...",
  "projectLocation": "...",
  "itemType": "纺织旧衣",
  "itemName": "秋冬棉服",
  "quantityText": "6件",
  "weightText": "5kg",
  "conditionText": "八成新",
  "logisticsType": "顺丰到付",
  "contactName": "林岚",
  "contactPhone": "13800001111"
}

// response（不变）
{ "code": 0, "message": "ok", "data": { "id": 102, "orderNo": "SZT-D-...", "status": "submitted" } }
```

### 5.2 错误码

| code | message | httpStatus | 触发条件 |
|------|---------|------------|----------|
| 40001 | `charityProjectId 必须是正整数` | 400 | 传了非整数 / ≤0 |
| 40401 | `公益项目不存在` | 404 | GET projects/:id 不存在 / status=0 |

---

## 六、测试与验收

### 6.1 后端（jest + supertest）

- `charity.projects.test.js`:
  - 空库 → `list=[], regions=[]`
  - `?region=西部地区` → 仅 region 匹配
  - `?urgency=紧急募集中` → `daysLeft <= urgentDaysThreshold` 的项目
  - `GET /:id` 存在 → 联 `needs`
  - `GET /:id` 不存在 → 404
- `orders.donation.test.js`:
  - `POST /donation` 带 `charityProjectId: 5` → DB `orders.charity_project_id = 5`
  - `GET /orders` 列表里 `donationDetail.charityProject.id` 能联出
  - `POST /donation` 带 `charityProjectId: -1` → 40001

### 6.2 前端（vitest + happy-dom/jsdom）

- `useOrdersList.test.js`: mock `@/stores/orders`，所有原断言保持
- `useCharityProjects.test.js`: mock `@/api/charity`，success/error 两条分支
- `useCharityFilters.test.js`: 新签名 `{ projects, regions }`，验证 4 维筛选 + selectedProject 重置 watch

### 6.3 端到端手测

启动顺序：`backend` 先 `npm run db:seed`（001 + 002 + 003）+ `npm run dev`，`frontend` 再 `npm run dev`。

浏览器走完：

1. `/auth` 登录 `user@szt.com / 123456` → 跳首页
2. `/charity` → 8 个项目渲染，4 维筛选（全部需求 / 区域 / 紧急度 / 搜索）联动正常
3. 选一个紧急项目 → 滚动到表单 → 提交 → 成功 modal 展示 `orderNo`
4. `/orders` 切到"公益捐赠" tab → 看到刚提交那一条
5. `/recycle-booking` 填表提交一个回收预约 → `/orders` 看到
6. 退出登录 → 顶栏登录态消失，多 tab 同步
7. DevTools Network 面板核对所有 6 个动作都走 `/api/v1/...`，没有 `mock/clientApi` 本地调用

---

## 七、风险与缓解

| 风险 | 缓解 |
|------|------|
| `categories` SQL 缺口，前端 `CharityProjectFilters` 分类行暂时挂掉 | 走方案 (B)：UI 移除分类行 / 留 disabled 占位；后续 P1 加 `categories JSON` 字段再恢复 |
| `urgent_days_threshold` 在 seeder 里要算对 | 8 个项目至少 2-3 个紧急（`daysLeft <= threshold`），让前端紧急标签可见 |
| App/ClientLayout 切到 store 后，多 tab 同步行为变化 | `storage` 事件保留，`restoreFromStorage` 处理，单独手测一遍 |
| `useOrdersList.test.js` mock 改造影响 assertion | 断言一字不改，只换 mock 入口；跑通即可 |
| `analyzeImage` 内联到 `useImageRecognition` 后语义偏差 | 内联函数行为与原 wrapper 完全一致：`File` → `analyzeImageWithAI`，否则 `[]` |

---

## 八、里程碑（建议）

| 阶段 | 内容 | 验证 |
|------|------|------|
| Step 1 | 后端：`charityProject` 模型 + 关联 + service + routes + seeder 003 + 挂载 | curl 跑通 8 个项目列表 |
| Step 2 | 后端：`createDonationOrder` 写入 `charityProjectId` | DB 落库 + jest 通过 |
| Step 3 | 前端：`api/charity` + `useCharityProjects` + 改 `useCharityFilters` + 改 `CharityPage` | 浏览器 `/charity` 看到真实数据 |
| Step 4 | 前端：`useDonationSubmit` 带 `charityProjectId` | 提交后 `/orders` 联出 `charityProject` |
| Step 5 | 清理：App / ClientLayout 切 store；新建 `authConstants`；删 `utils/auth.js` | 登录态正常 |
| Step 6 | 清理：内联 `analyzeImage`；删 `mock/clientApi.js` | 图片识别功能仍工作 |
| Step 7 | 测试：修 `useOrdersList.test` + 新增 useCharityProjects / useCharityFilters 单元测试 | vitest 全绿 |
| Step 8 | 端到端手测 | 6 步流程通 |

---

*文档结束*
