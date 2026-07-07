# C 端第二批 5 接口迁移设计

> Spec for: 把第二批仍走 mock 的 C 端接口迁到真实后端
> Date: 2026-07-07
> Author: chenhao + claude
> 与上一批次(`2026-07-06-c-end-core-api-design.md`)同 schema/auth/store 风格

## 1. 目标

5 个仍走 mock 的 C 端接口迁到真实后端:HomePage `fetchHomeData`、FaqPage `fetchFaqData`、ProfilePage `fetchProfileData`、TopBar `fetchTopMetrics`、ProfilePage 日历 `fetchCalendarWithOrders`。本批次跑完,mock/timeApi.js 可以全删;mock/clientApi.js 只剩 3 个 AI 函数。

**不在范围(归后续批次):** AI 三件套 (`analyzeImage` / `fetchAiQuickQuestions` / `askAiAssistant`)、B 端管理后台、文件上传、check-ins、points/logs。`App.vue` / `ClientLayout.vue` 仍走 `utils/auth` 留作下批次的债,本批次不解决。

## 2. 端点总览

| 端点 | 方法 | 鉴权 | 数据源 | 消费者 |
| --- | --- | --- | --- | --- |
| `/api/v1/client/content/home` | GET | 公开 | `home_content.payload` (JSON) | HomePage |
| `/api/v1/client/content/faq` | GET | 公开 | `faq_content.payload` (JSON) | FaqPage |
| `/api/v1/client/content/profile-demo` | GET | 需登录 | `profile_demo_content.payload` (JSON) | ProfilePage |
| `/api/v1/client/metrics/top` | GET | 公开 | `site_stats` (列字段) | TopBar |
| `/auth/me`、`/auth/login`、`/auth/register` | 已存在 | 已存在 | `users` 表新增 `level_text` 列 | authStore.user |
| `/api/v1/client/orders` | GET | 需登录 | 已存在 + `?dateFrom=&dateTo=` 扩展 | useProfileCalendar |

后端返回结构沿用上一批次 `{ code: 0, message: "ok", data }`;出错用 `ApiError` 抛 4xx,JSON 序列化为 `{ code, message, data: null }`。

## 3. 数据模型

### 3.1 新增表(migration 003)

```sql
ALTER TABLE users
  ADD COLUMN level_text VARCHAR(60) NULL AFTER growth_value;

CREATE TABLE home_content (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payload     JSON NOT NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE faq_content (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payload     JSON NOT NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE site_stats (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  processed_today   INT NOT NULL DEFAULT 0,
  active_sites      INT NOT NULL DEFAULT 0,
  avg_response_hour DECIMAL(4,1) NOT NULL DEFAULT 0,
  carbon_reduced_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE profile_demo_content (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payload     JSON NOT NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
```

四张新表的 `home_content / faq_content / profile_demo_content` 始终只存 1 行,id=1。新行通过 `findOrCreate({ where: { id: 1 } })` 插入。`site_stats` 同样设计为单行——支持将来 B 端运营改字段,本批次 seeder 写满。

### 3.2 Sequelize 模型定义

放在 `backend/src/db/models/` 下:

- `homeContent.js` —— 主键 `id`,字段 `{ payload: JSON, updatedAt }`,表名 `home_content`
- `faqContent.js` —— 同上结构,表名 `faq_content`
- `profileDemoContent.js` —— 同上结构,表名 `profile_demo_content`
- `siteStats.js` —— 字段 `{ processedToday, activeSites, avgResponseHour, carbonReducedKg }`(全部列级)
- `user.js` —— 增加 `levelText` 字段(`field: 'level_text'`)

`./backend/src/db/models/index.js` 自动把所有 model export 出来,本批次无须手动注册关联,JSON 列无外键。

### 3.3 Seeder 002-demo-content

新增 `backend/src/db/seeders/002-demo-content.js`,在 seeder 里:

1. `homeContent.findOrCreate({ where: { id: 1 }, defaults: { payload: { hero: { primaryCtaTo: '/ai-identify' }, heroStats: [{ value: '18,240+', label: '累计服务家庭' }, ...], principleRail: [...3 items...], cityStages: [...3 items...], institutionSteps: [...4 items...], contacts: [...4 items...] } } })`
2. `faqContent.findOrCreate({ where: { id: 1 }, defaults: { payload: { standards: [...4 items...], faqs: [...4 items...], science: [...3 strings...], diy: [...3 strings...] } } })`
3. `siteStats.findOrCreate({ where: { id: 1 }, defaults: { processedToday: 421, activeSites: 39, avgResponseHour: 2.1, carbonReducedKg: 1860 } })`
4. `profileDemoContent.findOrCreate({ where: { id: 1 }, defaults: { payload: { tracks: [{ name: '回收活跃度', value: 82 }, { name: '分类准确率', value: 91 }, { name: '社区参与度', value: 68 }], weeklyTrend: [42, 54, 61, 48, 68, 72, 77], badges: ['连续 4 周回收', '旧衣分类达标', '社区环保志愿者'], menu: ['地址管理', '回收偏好', '积分兑换', '隐私设置'] } } })`
5. `User.update({ levelText: 'Lv.4 城市循环合伙人' }, { where: { email: 'user@szt.com' } })`

`down()` 倒序清。注意 `homeContent.payload` / `faqContent.payload` / `profileDemoContent.payload` 的 JSON 字段在 sqlite 测试库会以 TEXT 落地,本批次测试不涉及内容字段校验,只需模块返回非空,记一遍。

## 4. auth 接口扩展

`backend/src/modules/auth/auth.service.js` 的 `pickUserPayload(user)` 增加 3 个字段:

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

`register / login / fetchMe` 都通过 `pickUserPayload` 自动返回新字段,前端 `authStore.user` 同步扩展。**注意 register 默认值:** `levelText` 在注册时为 `null`,前端 UI 在 `levelText` 为空时降级显示"Lv.1 入门用户"或类似 fallback。

## 5. orders 接口扩展

`backend/src/modules/orders/orders.service.js` 的 `listOrders(userId, opts)` 签名扩展:

```js
async function listOrders(userId, { status, dateFrom, dateTo, page = 1, pageSize = 10 } = {}) {
  const where = { userId };
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.scheduledDate = {};
    if (dateFrom) where.scheduledDate[Op.gte] = dateFrom;
    if (dateTo) where.scheduledDate[Op.lte] = dateTo;
  }
  // ... findAndCountAll 同上
}
```

`Op` 从 `sequelize` 引入。`scheduledDate` 是 `Order` 表的 DATE 列,字符串 'YYYY-MM-DD' 直接传给 MySQL 比较没问题。

## 6. 新增后端业务模块

### 6.1 `backend/src/modules/content/`

三个 service 函数合在一个文件,路由也合一份:

- `contentHomeService.getHome()` —— `HomeContent.findByPk(1)`,找不到抛 40401
- `contentFaqService.getFaq()` —— `FaqContent.findByPk(1)`,找不到抛 40401
- `contentProfileDemoService.getDemo()` —— `ProfileDemoContent.findByPk(1)`,找不到抛 40401

`routes.js`:

```js
router.get('/home', asyncHandler(async (req, res) => res.json(ok(await contentHomeService.getHome()))));
router.get('/faq', asyncHandler(async (req, res) => res.json(ok(await contentFaqService.getFaq()))));
router.get('/profile-demo', authMiddleware, asyncHandler(async (req, res) => res.json(ok(await contentProfileDemoService.getDemo()))));
```

挂载到 `/api/v1/client/content`。前两个公开,第三个挂 `authMiddleware`。

### 6.2 `backend/src/modules/metrics/`

`metricsTopService.getTop()` —— `SiteStats.findByPk(1)`,找不到抛 40401(虽然不会发生,但与上面保持一致);返回 `pickTopPayload()`:

```js
function pickTopPayload(s) {
  return {
    processedToday: s.processedToday,
    activeSites: s.activeSites,
    avgResponseHour: Number(s.avgResponseHour),
    carbonReducedKg: Number(s.carbonReducedKg),
  };
}
```

DECIMAL 字段用 `Number()` 转,避免前端拿到字符串。

`routes.js` 公开挂载 `/api/v1/client/metrics/top`。

### 6.3 挂到 `routes/index.js`

```js
router.use('/v1/client/content', require('../modules/content/routes'));
router.use('/v1/client/metrics', require('../modules/metrics/routes'));
```

## 7. 前端 stores 与 api

### 7.1 `api/` 目录新增

`api/content.js`:

```js
import request from "@/utils/request";
export const fetchHomeContent = () => request.get("/client/content/home");
export const fetchFaqContent = () => request.get("/client/content/faq");
export const fetchProfileDemoContent = () => request.get("/client/content/profile-demo");
```

`api/metrics.js`:

```js
import request from "@/utils/request";
export const fetchTopMetrics = () => request.get("/client/metrics/top");
```

### 7.2 `stores/` 目录新增

`stores/content.js`:

```js
import { defineStore } from "pinia";
import * as contentApi from "@/api/content";

export const useContentStore = defineStore("content", {
  state: () => ({ home: null, faq: null, profileDemo: null, loading: false, errorText: "" }),
  actions: {
    async fetchHome() { this.loading = true; this.errorText = ""; try { this.home = await contentApi.fetchHomeContent(); } catch (e) { this.errorText = e.message || "首页内容加载失败"; } finally { this.loading = false; } },
    async fetchFaq() { /* 同上,赋值 this.faq */ },
    async fetchProfileDemo() { /* 同上,赋值 this.profileDemo */ },
  },
});
```

`stores/metrics.js`:

```js
import { defineStore } from "pinia";
import * as metricsApi from "@/api/metrics";

export const useMetricsStore = defineStore("metrics", {
  state: () => ({ top: { processedToday: 0, activeSites: 0, avgResponseHour: 0, carbonReducedKg: 0 }, loading: false, errorText: "" }),
  actions: {
    async fetchTop() { this.loading = true; this.errorText = ""; try { const data = await metricsApi.fetchTopMetrics(); this.top = { ...this.top, ...data }; } catch (e) { this.errorText = e.message || "运营数据加载失败"; } finally { this.loading = false; } },
  },
});
```

metricsStore 的 `state.top` 用 0 默认值撑住首屏 SSR / dev mode;`fetchTop` 用 spread 在 0 默认值上合并后端返回,避免后端字段缺失导致 NaN。

### 7.3 `stores/auth.js` 扩字段

`state` 不变(`token / user`)。`user` 的字段类型约定扩成:

```
{ id, email, displayName, pointsBalance, carbonReductionTotal, growthValue, levelText }
```

- `restoreFromStorage()` 不动(从 localStorage `szt_user` 读 JSON;旧数据缺新字段时 `levelText` 是 undefined,模板 fallback 即可)
- 新增 action `refreshFromMe()`,调用 `authApi.fetchMe()`,把返回写回 `user` 和 localStorage
- `register / login` 后端已经返回完整 user,store 自动同步

`main.js` 在 `authStore.restoreFromStorage()` 之后,若 `authStore.isAuthed`,自动 `await authStore.refreshFromMe()`,首屏拿到最新 levelText / carbonReductionTotal。这是一次性启动期 IO,不污染热路径。

## 8. 页面与 composable 改造

### 8.1 HomePage.vue

- 顶部 imports 改 `import { useContentStore } from "@/stores/content"`
- `data` ref、`loadHome` 函数都删掉,改成 computed / 直接调 store action
- template 里的 `data.value.xxx` 全替换为 `data.xxx`(现在是 computed,不需要 .value)
- onMounted 调 `contentStore.fetchHome()`

### 8.2 FaqPage.vue

- 同 HomePage,改用 `contentStore.fetchFaq`,computed 读 `contentStore.faq`

### 8.3 TopBar.vue

- 顶部 imports 改 `import { useMetricsStore } from "@/stores/metrics"`
- 删本地 `loading / metrics` ref
- `const loading = computed(() => metricsStore.loading)`
- `const metrics = computed(() => metricsStore.top)`
- onMounted 调 `metricsStore.fetchTop()`
- template `metrics.processedToday` 直接用(因为 computed 自动 unwrap)

### 8.4 ProfilePage.vue

- 拆数据来源:
  - `name` / `pointsBalance` / `carbonReductionTotal` / `growthValue` / `levelText` → `useAuthStore().user`
  - `tracks` / `weeklyTrend` / `badges` / `menu` → `useContentStore().profileDemo`(profileDemo 是异步拉)
  - `PROFILE_TASKS / PROFILE_ACHIEVEMENTS / PROFILE_ACTIVITIES` 保留在文件内部静态常量(不在范围内)
- 加载顺序:`Promise.all([contentStore.fetchProfileDemo(), initializeCalendar({ year: ..., month: ..., day: ... })])`;日历取数完全由 useProfileCalendar 内部通过 ordersStore 完成,ProfilePage 不再直接调 ordersStore(详见 8.5)。authStore.restoreFromStorage 已经在 main.js 启动期跑过
- 模板里 `profile.value.name` → `authStore.user.displayName`、`profile.value.points` → `authStore.user.pointsBalance`、`profile.value.carbon` → 拼字符串 `\`累计减排 \${authStore.user.carbonReductionTotal} kgCO2\``、`profile.value.level` → `authStore.user.levelText || 'Lv.1 入门用户'`
- 子面板组件 `ProfileHeaderPanel.vue` / `ProfileImpactDashboard.vue` / `ProfileBottomSectionsPanel.vue` 的 props 需要相应调整 prop 名;这些是组件级小改,Phase E 单独再做

### 8.5 useProfileCalendar.js

- 删 `fetchCalendarWithOrders`、`fetchRealDate` 的 import 和调用
- 拆出内部 `loadMonth(year, month)`,初始化 / 翻月都走它:

```js
async function loadMonth(year, month) {
  const { dateFrom, dateTo } = monthBounds(year, month);
  const data = await ordersStore.fetchList({ dateFrom, dateTo, pageSize: 100 });
  orderMap.value = groupByDay(data.list);
}
```

- `initializeCalendar(realDate, _ordersData)` 接收签名保持兼容(旧 caller 还有一份,后续清理时再砍),但内部把取数职责转交给 `loadMonth`:

```js
async function initializeCalendar(realDate, _ordersData) {
  const target = realDate
    ? new Date(realDate.year, realDate.month, 1)
    : new Date();
  currentMonth.value = target;
  await loadMonth(target.getFullYear(), target.getMonth());
  generateCalendar();
}
```

注:ProfilePage 调用 `initializeCalendar` 的 caller 不需要再单独拉 `fetchCalendarWithOrders`/`fetchRealDate`,全部走 useProfileCalendar 内部取数。`_ordersData` 参数保留只是给现有调用方签名不破坏(后续清理时再砍)。

- `changeMonth(offset)`:

```js
async function changeMonth(offset) {
  const newMonth = new Date(currentMonth.value);
  newMonth.setMonth(newMonth.getMonth() + offset);
  currentMonth.value = newMonth;
  await loadMonth(newMonth.getFullYear(), newMonth.getMonth());
  generateCalendar();
}
```

- 文件内新增 `monthBounds(year, month)`:

```js
function monthBounds(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dateFrom: fmt(start), dateTo: fmt(end) };
}
```

- `groupByDay(list)`:

```js
function groupByDay(list) {
  const map = {};
  for (const o of list) {
    if (!o.scheduledDate) continue;
    const day = Number(o.scheduledDate.split('-')[2]);
    if (!map[day]) map[day] = [];
    map[day].push(o);
  }
  return map;
}
```

`ordersStore.fetchList` 返回的 order 字段名是后端 `pickOrderPayload` 给的,`scheduledDate` 已是 'YYYY-MM-DD' 字符串(从 seeder 001 验证过)。

### 8.6 子面板组件 prop 调整

`ProfileHeaderPanel.vue` / `ProfileImpactDashboard.vue` / `ProfileBottomSectionsPanel.vue` 当前按 `profile` 整体对象传 prop,拆数据来源后需要拆 prop。本次设计中:

- `ProfileHeaderPanel` 接 `:display-name="authStore.user.displayName"`、`:points="authStore.user.pointsBalance"`、`:level-text="authStore.user.levelText"`、`:streak-days / guardian-days / has-checked-in-today` 同上
- `ProfileImpactDashboard` 接 `:points="authStore.user.pointsBalance"`、`:weekly-trend="contentStore.profileDemo?.weeklyTrend"`
- `ProfileBottomSectionsPanel` 接 `:tracks="contentStore.profileDemo?.tracks"`、`:menu="contentStore.profileDemo?.menu"`、`:badges="contentStore.profileDemo?.badges"`、`PROFILE_TASKS / ACHIEVEMENTS / ACTIVITIES` 由 Parent 注入

ProfilePage 顶层把这些都接好再下发,子面板组件只调整 prop 名。本质上是把原本一个 `:profile="profile"` 大对象换成多个标量 prop。这是预期工作量,不是范围扩张。

## 9. 测试计划

### 9.1 后端集成测试

新增/扩展:

- `__tests__/integration/content.home.test.js` —— GET 200 + payload 非空(JSON)
- `__tests__/integration/content.faq.test.js` —— 同上
- `__tests__/integration/content.profile-demo.test.js` —— 401 无 token;200 带 token 取到 payload
- `__tests__/integration/metrics.top.test.js` —— 公开访问;4 个字段都是 number
- `__tests__/integration/orders.list.test.js` —— 加 2 条 dateFrom/dateTo 用例(夹逼、空范围)

每个新增测试文件用现有的 jest.config.js + __tests__/integration/setup.js(全局 sqlite-memory + sequelize sync)。

### 9.2 前端测试

- `composables/__tests__/useProfileCalendar.test.js` 改造:把 `vi.mock('@/mock/timeApi', ...)` 改成 `vi.mock('@/stores/orders', ...)` 桩掉 `useOrdersStore`。具体的 mock 形态以最终读到的 test 文件为准(目前是 mock timeApi)。其他 vi.mock 不动。
- 不为本批次新增前单测(store 层薄,信任 review)。

### 9.3 Smoke

- 后端 `npm test` 全过(8 auth + 4 recycle + 3 donation + 3 orders-list + 2 date filter + 4 content + 1 metrics = 23 个)
- 前端 `npm run build` 通过(244 modules,无 error)
- 浏览器手动清单留作 PR checklist,本批次不强制跑(沿用上批次决策)

## 10. 执行阶段

> 实际进度追踪在 `docs/superpowers/plans/2026-07-07-c-end-content-profile-api.md`,本 spec 仅描述设计。

| Phase | 任务 | commit message 风格 |
| --- | --- | --- |
| A. 后端基础 | migration + 4 model + auth 扩字段 + orders 扩查询 | `feat(backend): ...` |
| B. 后端业务 | content + metrics 模块 + seeder + 挂路由 | `feat(backend): ...` |
| C. 后端测试 | 5 个 test 文件 + orders.date 用例 | `test(backend): ...` |
| D. 前端基础 | api + stores + auth 扩字段 + main.js 刷新 | `feat(frontend): ...` |
| E. 前端集成 | HomePage + FaqPage + TopBar + ProfilePage + useProfileCalendar + 子面板 prop 调整 | `feat(frontend): ...` |
| F. 清理 | 删 mock/timeApi.js + 删 4 个死函数 + 改 useProfileCalendar.test.js + frontend build + backend test | `chore(frontend): ...` / `test(frontend): ...` |

每个 Phase 跑完暂停 review 一次,Phase boundary check 走 subagent 或 inline check(由 orchestrator 决定)。

## 11. 已识别风险

| 风险 | 缓解 |
| --- | --- |
| `users.level_text` 列 migration 与 `seeders/001-demo-data.js` 里 User.create 没有该字段的耦合 | migration 加上后,001-demo-data.js 默认值 `levelText: null` 是安全的(register 默认也 null),seed 002 显式 update 到 'Lv.4'。对老用户(已注册)回到登录路径通过 `authStore.refreshFromMe()` 自然拿到最新版。 |
| `homeContent.payload` 等 JSON 列在 sqlite 测试中可能丢失精度 | 测试只断言非空 + 字段存在,不比较值精度。本批次集成测试 23 个全过优先。 |
| 前端 `authStore.user` 老数据缺 `carbonReductionTotal / levelText` | 启动期 `refreshFromMe()` 解决,SSR 期间显示 fallback。 |
| `mock/timeApi.js` 整文件被删,但被任何未识别代码 import 会立刻 build 崩 | Phase F1 前先 grep,确认 `import timeApi / mock/timeApi` 已经绝迹(本批次前 useProfileCalendar 是唯一已知用户) |
| `useOrdersStore.fetchList` 默认 `pageSize: 10`,日历需要更多(一个月订单可能超过 10) | `useProfileCalendar` 显式传 `pageSize: 100`,足以覆盖 prototype 阶段。后续订单增长需分页调整,不在本批次。 |

## 12. 后续批次(本批次不解决)

1. `App.vue` / `ClientLayout.vue` 还引用 `utils/auth.js`,迁完后才能删 utils/auth。本批次保留 `utils/auth.js` 现状(不动)。
2. `mock/clientApi.js` 里 `analyzeImage / fetchAiQuickQuestions / askAiAssistant` —— AI 批次。
3. `ProfilePage.vue` 里 `PROFILE_TASKS / PROFILE_ACHIEVEMENTS / PROFILE_ACTIVITIES` —— check-ins / points-logs 批次。
4. `home_content` / `faq_content` / `profile_demo_content` 将来若做 B 端,需要分字段拆表。
5. 文件上传、refund / 取消订单等流程。

---

*Spec 结束*
