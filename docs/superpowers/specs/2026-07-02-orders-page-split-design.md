# OrdersPage 组件拆分设计

**状态**: 待用户审阅
**日期**: 2026-07-02
**范围**: `frontend/src/views/client/OrdersPage.vue`（1485 行）的 UI 与业务逻辑拆分方案
**推荐方案**: 4 个 panel + 1 个 composable + 常量抽取 + 顺手清理（方案 C）

## 背景与目标

`frontend/src/views/client/OrdersPage.vue` 当前 1485 行，单 SFC 内同时承担页面编排、订单列表 fetch、关键词/tab/service-type 筛选、状态阶段归一、状态聚合计数、4 段硬编码 impact 数据、3 条硬编码 FAQ、进度抽屉（overlay + timeline + 2 张详情卡 + 环保贡献卡 + 底栏）以及 970 行 scoped CSS。文件已不适合作为后续迭代入口。

本次拆分目标：

- `OrdersPage.vue` 降为薄编排层，预期 ~250 行（含 drawer 模板与样式）。
- UI 结构进入 `components/client/orders/`，每 panel 与页面中一块视觉区域 1:1 对应。
- 业务逻辑集中到 `composables/useOrdersList.js`，由页面组合使用。
- 硬编码常量抽到 `constants/ordersPage.js`，由 panel 直接 import。
- 顺手清理：`timeFilter` 死 ref / `getNoteText` 与 `getDisplayText` 默认值不一致 / "无"/"未填写" 等 fallback 收敛。

不在本次范围内：

- 不调整视觉风格和交互设计。
- 不改变 mock API 协议（`fetchOrders` 签名不变）。
- 不引入 Pinia/Vuex 或新的状态管理层。
- 不把硬编码的 impact / FAQ 改成真实后端数据。
- 不拆 drawer（按用户选择保留在 page 内）。

## 总体方案

延续近期 `HomePage` / `AppointmentPage` / `CharityPage` / `ProfilePage` 已形成的拆分风格：

- view 只负责页面编排、drawer 状态、loading/error 三态、组合各 panel。
- panel 组件只负责渲染和局部 UI 交互。
- composable 承载页面业务状态（fetch + 筛选 + 统计）。
- 静态常量放 `constants/ordersPage.js`，由 panel 直接 import。
- CSS 跟随 markup 移动到对应组件，page 只保留根容器、drawer、少量跨区布局样式。

> **方案 C 选择理由**：将 Tabs + StatusStats 合并进 `OrdersHeaderPanel`（视觉上共属 hero 区），将 FilterToolbar 合并进 `OrdersRecordList`（作为列表的顶部控件），与"每个 panel 一个语义区域"原则一致；panels 总量从 6 减到 4，OrdersPage 编排层更简洁。SidePanel 不再细分（impact 卡与 FAQ 卡共同构成侧栏容器）。

目标文件结构：

```text
frontend/src/composables/
  useOrdersList.js                       业务状态: fetch + 筛选 + 类型归一 + 状态归一 + 统计

frontend/src/composables/__tests__/
  useOrdersList.test.js                  vitest 覆盖类型判别 / 状态归一 / 筛选 / 统计

frontend/src/constants/
  ordersPage.js                          IMPACT_FALLBACK + FAQ_ITEMS

frontend/src/components/client/orders/
  OrdersHeaderPanel.vue                  标题 + "开启新服务" 按钮 + Tabs + StatusStats（hero 整区）
  OrdersRecordList.vue                   FilterToolbar + 列表 + 加载骨架 + 空态
  OrdersSidePanel.vue                    impact 卡 + FAQ 卡（侧栏整区）

frontend/src/views/client/OrdersPage.vue  薄编排层 + 进度抽屉（含 overlay / timeline / 详情卡 / 环保贡献 / 底栏）
```

## 单元职责与不做什么

| 单元 | 职责 | 不做什么 |
|---|---|---|
| `OrdersPage.vue` | 持有 `pageRef` 并调 `useRevealOnScroll`; 调 `useOrdersList()`; 持有 `selectedOrder` / `showDrawer` 两个 drawer 本地 ref; 持有 drawer 辅助函数 (`splitOrderTime` / `getOrderDate` / `getOrderPeriod` / `getCategoryText` / `getDisplayText`); 渲染 3 个 panel + drawer + errorText | 不持有业务 ref (除 drawer); 不直接调 `fetchOrders`; 不持有 `keyword` / `activeTab` / `serviceTypeFilter`; 不渲染 skeleton / empty / status-stats |
| `useOrdersList.js` | `loading` / `errorText` / `allOrders` / `keyword` / `activeTab` / `serviceTypeFilter` ref; `filteredOrders` / `statusStats` computed; `loadOrders()`; 暴露命名函数 `isDonationOrder` / `isRecyclingOrder` / `getServiceTypeClass` / `getStatusStage`; 暴露常量 `ORDER_TABS` / `ORDER_SERVICE_TYPES` / `SERVICE_TYPE_CLASS` / `STATUS_STAGE` | 不持有 `selectedOrder` / `showDrawer`; 不操作 `localStorage`; 不调用 drawer 辅助函数 |
| `OrdersHeaderPanel.vue` | 页面标题 / 副标题 / "开启新服务" 按钮; Tabs 切换; 5 张状态卡片（含 primary 高亮态） | 不持有任何业务 ref; 不调 `useOrdersList`; 接收 `activeTab` / `tabs` / `statusStats` prop; emit `update:active-tab` / `new-service` |
| `OrdersRecordList.vue` | FilterToolbar（搜索框 + service-type select） + loading 骨架 / 空态文案 / record-card 列表（含 icon / 标题 / 双 badge / meta / action-btn）; 每条记录可触发 view-progress / contact-station | 不持有任何业务 ref; 不调 `useOrdersList`; 接收 `orders` / `keyword` / `serviceTypeFilter` / `serviceTypes` / `loading` prop; emit `update:keyword` / `update:service-type-filter` / `view-progress` / `contact-station` |
| `OrdersSidePanel.vue` | impact-card（4 行 impact 数据 + 积分商城按钮） + faq-card（3 条 FAQ 列表 + 跳转箭头） | 不持有任何业务 ref; 不调 `useOrdersList`; 接收 `impact` / `faqItems` prop; emit `enter-points-mall` / `faq-click` |
| `constants/ordersPage.js` | `IMPACT_FALLBACK` 4 字段; `FAQ_ITEMS` 3 条 | 不导出函数或 ref |

## UI 结构拆分

### `OrdersPage.vue`

职责：

- 持有 `pageRef`，调用 `useRevealOnScroll(pageRef)`。
- 调 `useOrdersList()` 拿到全部业务 ref / computed / actions。
- 持有 `selectedOrder` / `showDrawer` 两个 drawer 本地 ref + `selectedOrderIsDonation` computed。
- 持有 drawer 辅助函数：`splitOrderTime` / `getOrderDate` / `getOrderPeriod` / `getCategoryText` / `getDisplayText`（替代原 `getNoteText`，统一 fallback `"暂无"`）。
- 持有 `openProgressDrawer(item)` / `closeDrawer()` 两个方法。
- 渲染 3 个 panel + drawer（含 overlay / timeline / 详情卡 / 环保贡献卡 / 底栏 / 2 个 transition）+ errorText。
- drawer 模板与样式完整保留（不外迁）。

不做：

- 不持有 `keyword` / `activeTab` / `serviceTypeFilter` / `allOrders` / `loading` / `errorText` / `statusStats`（全部在 `useOrdersList` 内）。
- 不直接调 `fetchOrders`（由 composable 内部调）。
- 不渲染 skeleton / empty / status-stats / tabs / filter-toolbar / impact-card / faq-card（全部在 panel 内）。
- 不再持有 `timeFilter` ref（删除死代码）。
- 不再持有 `getNoteText` 函数（合并进 `getDisplayText`）。

### `OrdersHeaderPanel.vue`

负责页面 hero 整区：

- 标题 "服务记录中心" + 副标题 "查看回收预约、公益捐赠等服务进度与环保结果"。
- "开启新服务" 按钮（点击后 emit `new-service`，目前无实际跳转行为）。
- Tabs 切换："全部记录" / "回收预约" / "公益捐赠"。
- 5 张状态卡片：全部记录 / 进行中 / 待核验 / 已完成 / 已取消（`statusStats` 提供数据，primary 高亮态在全部记录卡上）。

Props：

- `activeTab: String` (required) — 当前激活 tab
- `tabs: Array` (required) — `ORDER_TABS`
- `statusStats: Object` (required) — `{ total, processing, pending, completed, cancelled }`

Emits：

- `update:active-tab(value: string)` — tab 切换
- `new-service()` — "开启新服务" 按钮

`data-reveal` 与 `--reveal-delay`（60ms / 80ms）跟随 markup 一起搬入 panel。

### `OrdersRecordList.vue`

负责记录列表 + 顶部筛选：

- FilterToolbar：搜索框（关键词）+ service-type select。
- loading 骨架（3 个 `.record-skeleton`）。
- 空态文案 `"当前筛选条件下还没有匹配的订单。"`。
- record-card 列表：左 icon / 中 title + 双 badge + meta / 右双 action-btn。
- record-card 含 `border-{donation|recycling|remaking}` 边框色 + `icon-{...}` 图标色 + `badge-{...}` 双 badge 配色。

Props：

- `orders: Array` (required) — `filteredOrders`
- `keyword: String` (required)
- `serviceTypeFilter: String` (required)
- `serviceTypes: Array` (required) — `ORDER_SERVICE_TYPES`
- `loading: Boolean` (required)

Emits：

- `update:keyword(value: string)` — 搜索框输入
- `update:service-type-filter(value: string)` — select 切换
- `view-progress(item)` — "查看进度" 按钮
- `contact-station(item)` — "联系站点" 按钮（当前无业务，预留）

`data-reveal` 与 `--reveal-delay`（100ms / 120ms）跟随 markup 一起搬入 panel。

`getServiceTypeClass` / `getStatusClass` / `isDonationOrder` / `isRecyclingOrder` 由 panel 内部直接 import（从 `useOrdersList.js` 顶部 export 的命名函数），不再通过 emit 二次传递。

### `OrdersSidePanel.vue`

负责右侧栏整区：

- impact-card：4 行（总计回收 / 公益贡献次数 / CO2 减排 / 当前环保积分）+ 1 个 "进入积分商城" 按钮。
- faq-card：3 条 FAQ 列表 + 右侧 chevron 箭头。

Props：

- `impact: Object` (required) — `IMPACT_FALLBACK`
- `faqItems: Array<{ id, question }>` (required) — `FAQ_ITEMS`

Emits：

- `enter-points-mall()` — "进入积分商城" 按钮
- `faq-click(item)` — 单条 FAQ 点击（当前无业务，预留）

panel 直接从 `@/constants/ordersPage` import 两个常量 prop，OrdersPage 不再透传。

## 业务逻辑拆分

只新增 1 个 composable `useOrdersList`，命名函数 / 常量与其并列。

### `useOrdersList.js`

顶部 export 常量：

```js
export const ORDER_TABS = ["全部记录", "回收预约", "公益捐赠"];
export const ORDER_SERVICE_TYPES = ["所有服务类型", "回收预约", "公益捐赠", "旧物改造"];

export const SERVICE_TYPE_CLASS = {
  DONATION: "donation",
  RECYCLING: "recycling",
  REMAKING: "remaking",
};

export const STATUS_STAGE = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};
```

顶部 export 命名函数：

```js
export function isDonationOrder(item) { /* 原逻辑 */ }
export function isRecyclingOrder(item) { /* 原逻辑 */ }
export function getServiceTypeClass(type) { /* 原逻辑 */ }
export function getStatusStage(status) { /* 原逻辑 */ }
```

主体 composable：

```js
import { computed, ref } from "vue";
import { fetchOrders } from "@/mock/clientApi";

export function useOrdersList() {
  const loading = ref(true);
  const errorText = ref("");
  const allOrders = ref([]);
  const keyword = ref("");
  const activeTab = ref(ORDER_TABS[0]);
  const serviceTypeFilter = ref(ORDER_SERVICE_TYPES[0]);

  const filteredOrders = computed(() => {
    return allOrders.value.filter((item) => {
      const query = keyword.value.trim().toLowerCase();
      const passKeyword =
        !query ||
        String(item?.id || "").toLowerCase().includes(query) ||
        getNormalizedType(item).toLowerCase().includes(query) ||
        String(item?.station || "").toLowerCase().includes(query);
      const passTab =
        activeTab.value === "全部记录" ||
        (activeTab.value === "回收预约" && isRecyclingOrder(item)) ||
        (activeTab.value === "公益捐赠" && isDonationOrder(item));
      const passServiceType =
        serviceTypeFilter.value === "所有服务类型" ||
        (serviceTypeFilter.value === "回收预约" && isRecyclingOrder(item)) ||
        (serviceTypeFilter.value === "公益捐赠" && isDonationOrder(item)) ||
        (serviceTypeFilter.value === "旧物改造" && !isRecyclingOrder(item) && !isDonationOrder(item));

      return passKeyword && passTab && passServiceType;
    });
  });

  const statusStats = computed(() => {
    const stats = {
      total: allOrders.value.length,
      processing: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };
    allOrders.value.forEach((item) => {
      const stage = getStatusStage(item.status);
      stats[stage]++;
    });
    return stats;
  });

  async function loadOrders() {
    loading.value = true;
    errorText.value = "";
    try {
      allOrders.value = await fetchOrders();
    } catch (error) {
      errorText.value = "订单数据加载失败，请稍后重试。";
    } finally {
      loading.value = false;
    }
  }

  return {
    loading, errorText, allOrders,
    keyword, activeTab, serviceTypeFilter,
    filteredOrders, statusStats,
    loadOrders,
  };
}
```

`getNormalizedType` 是 `filteredOrders` 内部辅助函数（与原实现一致），**不**对外 export，因为 `isDonationOrder` / `isRecyclingOrder` 已经覆盖。

为什么不抽 `useOrderDetail`（drawer 状态）？drawer 状态是页面级 UI 状态（仅 `selectedOrder` + `showDrawer` 两个 ref + `open/close` 两个方法），与列表业务异质程度低，且 drawer 不会跨页面复用，单 consumer 不抽 composable。

### `constants/ordersPage.js`

```js
export const IMPACT_FALLBACK = {
  totalRecycled: "24.5 kg",
  totalDonations: "5 次",
  co2Reduced: "12.8 kg",
  ecoPoints: "1,480",
};

export const FAQ_ITEMS = [
  { id: "donation-logistics", question: "如何查看捐赠物流信息？" },
  { id: "remaking-duration", question: "改造服务的工期多久？" },
  { id: "points-calculation", question: "积分是如何计算的？" },
];
```

为什么不把 `IMPACT_FALLBACK` 放到 composable 内？panel 导入 composable 会引入业务语义（fetchOrders / 筛选），但 side-panel 只需要纯展示数据；常量与业务状态分离更清晰。

## 数据流与事件契约

组件之间无 `v-model`，所有变化通过 emit 暴露给 page，page 调用 composable 方法（与 home/profile 一致）。Drawer 状态完全本地（不 emit / 不传 prop）。

### OrdersHeaderPanel

Props：

- `activeTab: String` (required)
- `tabs: Array` (required)
- `statusStats: { total, processing, pending, completed, cancelled }` (required)

Emits：

- `update:active-tab(value: string)` — page 写入 `useOrdersList().activeTab`
- `new-service()` — 当前无业务，预留

### OrdersRecordList

Props：

- `orders: Array` (required) — `filteredOrders`
- `keyword: String` (required)
- `serviceTypeFilter: String` (required)
- `serviceTypes: Array` (required) — `ORDER_SERVICE_TYPES`
- `loading: Boolean` (required)

Emits：

- `update:keyword(value: string)` — page 写入 `useOrdersList().keyword`
- `update:service-type-filter(value: string)` — page 写入 `useOrdersList().serviceTypeFilter`
- `view-progress(item)` — page 调 `openProgressDrawer(item)`
- `contact-station(item)` — 当前无业务，预留

> `getServiceTypeClass` / `getStatusClass` / `isDonationOrder` / `isRecyclingOrder` 由 panel 内部直接 import，不再通过 prop 二次传递。

### OrdersSidePanel

Props：

- `impact: { totalRecycled, totalDonations, co2Reduced, ecoPoints }` (required)
- `faqItems: Array<{ id, question }>` (required)

Emits：

- `enter-points-mall()` — 当前无业务，预留
- `faq-click(item)` — 当前无业务，预留

### Page 持有的状态

```js
const {
  loading, errorText, allOrders,
  keyword, activeTab, serviceTypeFilter,
  filteredOrders, statusStats,
  loadOrders,
} = useOrdersList();

const showDrawer = ref(false);
const selectedOrder = ref(null);
const selectedOrderIsDonation = computed(() => isDonationOrder(selectedOrder.value));

const pageRef = ref(null);
useRevealOnScroll(pageRef);

function openProgressDrawer(item) {
  selectedOrder.value = item;
  showDrawer.value = true;
}

function closeDrawer() {
  showDrawer.value = false;
  setTimeout(() => {
    selectedOrder.value = null;
  }, 300);
}

function getDisplayText(value, fallback = "暂无") {
  const normalizedValue = String(value || "").trim();
  return normalizedValue || fallback;
}

function splitOrderTime(time = "") {
  const [date = "", ...periodParts] = String(time || "").trim().split(" ");
  return {
    date: date.trim(),
    period: periodParts.join(" ").trim(),
  };
}

function getOrderDate(order) {
  if (!order) return "";
  if (order.date) return order.date;
  return splitOrderTime(order.time).date;
}

function getOrderPeriod(order) {
  if (!order) return "";
  if (order.period) return order.period;
  return splitOrderTime(order.time).period;
}

function getCategoryText(order) {
  if (!order) return "";
  if (order.category) return order.category;
  return String(order.type || "").replace(/回收预约$/, "").trim();
}

onMounted(loadOrders);
```

模板主体：

```vue
<template>
  <div ref="pageRef" class="orders-page page-width">
    <OrdersHeaderPanel
      :active-tab="activeTab"
      :tabs="ORDER_TABS"
      :status-stats="statusStats"
      @update:active-tab="activeTab = $event"
      @new-service="/* TODO: 接入路由跳转 */"
    />

    <div class="content-grid" data-reveal style="--reveal-delay: 120ms">
      <OrdersRecordList
        :orders="filteredOrders"
        :keyword="keyword"
        :service-type-filter="serviceTypeFilter"
        :service-types="ORDER_SERVICE_TYPES"
        :loading="loading"
        @update:keyword="keyword = $event"
        @update:service-type-filter="serviceTypeFilter = $event"
        @view-progress="openProgressDrawer"
        @contact-station="/* TODO */"
      />

      <OrdersSidePanel
        :impact="IMPACT_FALLBACK"
        :faq-items="FAQ_ITEMS"
        @enter-points-mall="/* TODO */"
        @faq-click="/* TODO */"
      />
    </div>

    <p v-if="errorText" class="state-error">{{ errorText }}</p>
  </div>

  <!-- Progress Drawer（完整保留原模板） -->
  <Transition name="fade">...</Transition>
  <Transition name="slide-right">...</Transition>
</template>
```

> `data-reveal` 的 `--reveal-delay` 跟随 markup 移动到对应 panel；`content-grid` 容器留在 page（因为它是 page 级的两栏布局），其 `data-reveal` 也保留在 page 内的容器上。

### Composable 耦合

- `useOrdersList` 依赖 `@/mock/clientApi.fetchOrders`，与原 `OrdersPage` 一致。
- 命名函数 / 常量无依赖，可被任意 panel / page import。

不引入 `vue-router` / Pinia / 任何新的运行时依赖。

## 错误处理 / 生命周期

### 错误显示边界

- 加载失败 → `useOrdersList.loadOrders()` 内 `errorText.value = "订单数据加载失败，请稍后重试。"`（与原行为完全一致）；view 渲染 `<p v-if="errorText" class="state-error">`。
- 加载中 / 空态 → `OrdersRecordList.vue` 内部根据 `loading` prop 渲染 skeleton / 空态文案（与原行为一致）。
- 不引入 retry 按钮（保持原行为不变）。

### 数据加载顺序

`OrdersPage.vue` 的 `onMounted(loadOrders)`：

1. `loading.value = true` / `errorText.value = ""`
2. `await fetchOrders()` → `allOrders.value = ...`
3. 失败 → `errorText.value = "订单数据加载失败，请稍后重试。"`
4. `finally` → `loading.value = false`

`filteredOrders` / `statusStats` 自动响应 `allOrders` / `keyword` / `activeTab` / `serviceTypeFilter` 变化。

### 副作用与清理

- `useOrdersList` 无副作用（无 `setTimeout` / `localStorage`），无需清理。
- Drawer 的 `setTimeout` 在 `closeDrawer` 内使用 300ms 延迟清理 `selectedOrder`，与原行为一致。如果未来延长到秒级，再补 `onBeforeUnmount(clearTimeout)`。
- `useRevealOnScroll(pageRef)` 内部清理逻辑由 composable 自己负责（沿用现状）。

### 路由守卫

`/orders` 受 `frontend/src/router/index.js` 的 `meta.requiresAuth` 保护。未登录访问 → 跳 `/auth?redirect=/orders`，登录成功后回到 `/orders`。本次重构不触碰 `router/index.js`，与 `frontend/CLAUDE.md` "touching nav or protected routes" 约定一致。

### 持久化

本次拆分不涉及 `localStorage` 写入。原 `OrdersPage` 也未写入任何 `localStorage` 键。

## 样式边界

CSS 按 markup 归属移动：

- `OrdersPage.vue`: `.orders-page`、`.page-width`、`.content-grid`（page 级两栏布局）、`.state-error`、fade / slide-right transition keyframes、`.drawer-overlay` / `.progress-drawer` / `.drawer-content` / `.drawer-header` / `.drawer-title` / `.btn-close` / `.drawer-basic-info` / `.info-label` / `.info-value` / `.drawer-timeline` / `.timeline-line` / `.timeline-items` / `.timeline-item` / `.timeline-icon` / `.timeline-content` / `.timeline-title` / `.timeline-time` / `.pulse-dot` / `pulse keyframes` / `.drawer-details` / `.details-card` / `.details-row` / `.details-label` / `.details-value` / `.eco-card` / `.eco-header` / `.eco-stats` / `.eco-stat-label` / `.eco-stat-value` / `.drawer-footer` / `.btn-footer` / drawer 响应式（≤ 768px）。
  - **不要**重复 `@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:...")`：该字体已在 `frontend/index.html` `<link>` 全局加载。
  - **不要**重复定义 `.material-symbols-outlined { font-variation-settings: ... }`：该类已在 `frontend/src/style.css` 全局定义。
  - OrdersPage 现有 `@import` 与 `.material-symbols-outlined` scoped 块在本次拆分中**随页面 CSS 整体删除**（一次性清理，3 个新 panel 不需要重新引入）。
- `OrdersHeaderPanel.vue`: `.orders-header`、`.page-title`、`.page-subtitle`、`.header-actions`、`.btn-new-service`、`.tabs-nav`、`.tab-btn`、`.status-stats`、`.stat-card`、`.stat-value`、`.stat-label`、`.stat-desc` + header 区响应式（≤ 768px）。
- `OrdersRecordList.vue`: `.filter-toolbar`、`.search-box`、`.search-icon`、`.filter-select`、`.record-list`、`.record-card`、`.record-icon`、`.icon-{donation|recycling|remaking}`、`.record-content`、`.record-header`、`.record-title`、`.badge`、`.badge-{donation|recycling|remaking|completed|processing|pending|cancelled}`、`.record-meta`、`.meta-item`、`.record-actions`、`.action-btn` + record-card 区响应式（≤ 768px）、`.record-skeleton`、`.empty-state`。
- `OrdersSidePanel.vue`: `.side-panel`、`.impact-card`、`.impact-card::after`、`.impact-title`、`.impact-stats`、`.impact-row`、`.impact-label`、`.impact-value`、`.impact-divider`、`.points-display`、`.points-icon`、`.points-value`、`.btn-points-mall`、`.faq-card`、`.faq-title`、`.faq-list`、`.faq-item`。

`.badge-{donation|recycling|remaking}` 与 `.record-card.border-{...}` / `.icon-{...}` 的 class 映射表在 panel 内部仍可使用 `getServiceTypeClass(type)` 派生，不再二次抽工具函数。

## 重构配套清理

下面这些符号在拆分过程中应当**同步删除 / 收敛**，避免拆分后留下死代码。

### 死 ref

- `timeFilter` ref + 模板内 `<select v-model="timeFilter">` 完全删除（从未被任何 computed 消费）。

### 死函数

- `getNoteText` 删除；drawer 模板中所有 `getNoteText(selectedOrder)` 调用改为 `getDisplayText(selectedOrder?.note, "暂无")`。
- `getDisplayText` 默认参数统一为 `"暂无"`（替代部分调用方硬编码的 `"未填写"` / `"无"`）。

### 死硬编码

- `totalRecycled` / `totalDonations` / `co2Reduced` / `ecoPoints` 4 个 computed 字符串全部删除；改由 `OrdersSidePanel` 直接 import `IMPACT_FALLBACK`。
- 模板内 3 条 FAQ 静态 `<li>` 删除；改由 `OrdersSidePanel` 渲染 `FAQ_ITEMS.map(...)`。

### 死 import

- `OrdersPage.vue` 不再直接 import `fetchOrders`（由 composable 内部 import）。

### 死 CSS

- `.page-width` 不属于 page 级 CSS（来自全局样式），检查后保留。
- 与删除的 markup 对应的 CSS 同步删除（如原硬编码 4 个 `computed` 字符串不需要对应 CSS，但仍需 review 是否有 orphan rule）。

## 实施顺序

1. 新建 `constants/ordersPage.js`，导出 `IMPACT_FALLBACK` + `FAQ_ITEMS`。
2. 新建 `composables/useOrdersList.js`，导出常量 + 命名函数 + `useOrdersList()`。
3. 新建 `composables/__tests__/useOrdersList.test.js`，按"测试覆盖范围"一节写 ~12 个 it。
4. 新建 `OrdersHeaderPanel.vue`（hero 整区：标题 / 按钮 / tabs / status-stats + 对应 CSS）。
5. 新建 `OrdersRecordList.vue`（filter + list + skeleton + empty + 对应 CSS）。
6. 新建 `OrdersSidePanel.vue`（impact + FAQ + 对应 CSS）。
7. 改造 `OrdersPage.vue`：删除 `timeFilter` / `getNoteText` / 4 个 hardcoded computed / FAQ 模板；只保留 3 个 panel + drawer + errorText + drawer 辅助函数。
8. 运行 `npm run test -- useOrders` 与 `npm run build` 验证。
9. 启动 dev server 浏览器手测。

每步提交一个独立 commit，便于 review 与回退。

## 测试覆盖范围

### 命令验证

```bash
cd frontend
npm run test -- useOrders
npm run build
```

期望：12 个 `useOrdersList` 测试全部通过；Vite build 退出码 0。

### Vitest 单元测试

`useOrdersList.test.js` 覆盖：

| 类别 | case |
|---|---|
| **类型判别** | `isDonationOrder` 命中"捐赠"；`isRecyclingOrder` 命中"回收"；二者互斥；其它字符串都返回 false |
| **状态归一** | `getStatusStage("已完成")` → completed；`getStatusStage("已签收")` → completed；`getStatusStage("处理中")` → processing；`getStatusStage("已取消")` → cancelled；`getStatusStage("待核验")` → pending；`getStatusStage("")` → pending；未知 status → pending |
| **service class** | `getServiceTypeClass("纸类回收预约")` → recycling；`getServiceTypeClass("衣物捐赠")` → donation；`getServiceTypeClass("旧物改造")` → remaking |
| **fetch + 状态** | `loadOrders` 成功 → `loading=false`、`allOrders` 填充；失败 → `errorText="订单数据加载失败，请稍后重试。"`、`loading=false` |
| **filteredOrders** | keyword 命中 id 字符串；tab 切到"公益捐赠"过滤非捐赠；serviceType 切到"旧物改造"过滤前两类；三条件同时生效 |
| **statusStats** | total / processing / pending / completed / cancelled 计数正确（5 条 mock 订单覆盖 4 类状态） |

### 不测什么

- Panel 渲染（项目无 `@vue/test-utils` 配置，ProfilePage 重构时也未引入；保持一致）。
- Drawer 行为（同上）。
- `useRevealOnScroll` 副作用（已存在的 composable 各自覆盖）。

### 浏览器功能验证

- `/orders` 未登录时按路由守卫跳转 `/auth?redirect=/orders`。
- 登录后访问 `/orders` 正常加载。
- 5 张状态卡片计数与原行为一致。
- Tabs 切换"全部记录" / "回收预约" / "公益捐赠"过滤正确。
- 搜索框关键词命中 id / type / station。
- Service-type select 切到"旧物改造"过滤正确。
- "查看进度"打开 drawer；timeline 显示 4 个时间点（2 已完成 + 1 当前 + 1 待确认）。
- Drawer 内 2 张详情卡（详细信息 / 捐赠信息或预约详情）+ 环保贡献卡 + 底栏双按钮正常。
- "关闭"按钮关闭 drawer（300ms 后清 `selectedOrder`）。
- "开启新服务" / "联系站点" / "查看感谢信" / "联系机构" / "进入积分商城" / FAQ 3 条点击暂无业务行为（不报错）。
- errorText 在 fetchOrders reject 时显示在内容底部。

### 视觉回归点

- Hero 区：标题字号 / 副标题颜色 / "开启新服务"按钮（深绿底 + 白字）。
- Tabs：底部 2px 边框 active 态深绿。
- 5 张状态卡片：primary 卡片深绿底白字 + 其余白底。
- Filter toolbar：搜索框 / select 同宽度圆角。
- Record card：左边框 4px 颜色（donation 浅绿 / recycling 深绿 / remaking 深绿）+ icon 背景色。
- 双 badge：服务类型 badge + 状态 badge，颜色按 class 区分。
- Side panel：impact-card 深绿底 + ::after blur 装饰；faq-card 白底。
- Drawer：右侧滑入 + overlay 黑色半透明 + backdrop-filter blur。
- 响应式 ≤ 768px：hero 区垂直堆叠 / 状态卡单列 / record-card 垂直堆叠 / action-btn 各占一半 / 两栏变单栏 / drawer details-row 垂直堆叠。

### 响应式断点验证

| 断点 | 期望 |
|---|---|
| ≥ 1024px | `.content-grid` 变两栏（左列表 + 右 24rem 侧栏） |
| ≤ 768px | hero 垂直堆叠 / 状态卡单列 / record-card 垂直堆叠 / action-btn flex:1 / content-grid 单栏 / drawer details-row 垂直堆叠 |
| 768~1024px | 两栏布局尚未启用，内容单栏堆叠 |

## 风险与注意事项

- OrdersPage 模板里有 970 行 scoped CSS（包含 drawer 完整样式），移动 markup 时**务必把对应 CSS 一起搬走**，避免拆分后留 orphan rule。建议按"实施顺序"逐步推进，每步完成后用浏览器快速验证视觉无回归。
- Material Symbols 字体已在 `index.html` 全局 `<link>` 加载、`.material-symbols-outlined` 类已在 `style.css` 全局定义，**panel 不需要也不应该** 重新 `@import` 或重定义该类（本次拆分顺手把 OrdersPage 原 scoped `@import` 一起清理）。
- `getServiceTypeClass` / `getStatusClass` 等命名函数在 panel 内部 import，**不要**通过 emit 二次传递（会增加事件复杂度）。
- `useOrdersList` 暴露 7 个 ref + 2 个 computed + 1 个 action 的返回对象，page 端按需解构（避免不必要暴露）。
- Drawer 内的 `getDisplayText` 默认值从 `"暂无"` 收敛后，原有 `"未填写"` / `"无"` 的 fallback 调用方需逐一替换为 `getDisplayText(..., "暂无")`。本次拆分顺手做（不引入新功能）。
- `timeFilter` 删除后，原 `<select v-model="timeFilter">` 模板片段对应删除，filter-toolbar 的 `<select>` 数量从 2 减到 1，UI 行为无变化（因为原 `timeFilter` 从未被任何 computed 消费）。
- 不引入 retry 按钮 / 不调整视觉风格 / 不改 mock API 协议 / 不抽 `useOrderDetail`（drawer 状态太轻）/ 不抽 `OrderRecordCard` 单条（按方案 C 留在 `OrdersRecordList`）。
- 实施完成后 `git grep` 检查 `OrdersPage.vue` 内不再含 `timeFilter` / `getNoteText` / `totalRecycled` / `totalDonations` / `co2Reduced` / `ecoPoints` / `fetchOrders` 等被迁移的符号。

## 文件清单

### 新增（5 个）

```text
frontend/src/components/client/orders/OrdersHeaderPanel.vue
frontend/src/components/client/orders/OrdersRecordList.vue
frontend/src/components/client/orders/OrdersSidePanel.vue

frontend/src/composables/useOrdersList.js
frontend/src/constants/ordersPage.js
```

### 新增测试（1 个）

```text
frontend/src/composables/__tests__/useOrdersList.test.js
```

### 修改（1 个）

```text
frontend/src/views/client/OrdersPage.vue  （1485 → 约 250 行）
```

### 删除

无独立文件删除。原 `OrdersPage.vue` 内 `timeFilter` / `getNoteText` / 4 个硬编码 computed / FAQ 模板片段在 view 内原地删除。

## 完成判定

- `OrdersPage.vue` 降到约 250 行（含 drawer 模板与样式）。
- 5 个新增文件全部存在；3 个 panel 在 `frontend/src/components/client/orders/`，composable 在 `frontend/src/composables/`，常量在 `frontend/src/constants/`。
- 1 个 composable 测试文件全部通过；`npm run build` 成功。
- 浏览器验证清单通过；视觉回归点全部通过；3 个响应式断点布局无错位。
- 没有遗留未使用 import、未使用 ref/computed、死 CSS、硬编码字符串（FAQ / impact 已迁移）。
- `git grep` 确认 `OrdersPage.vue` 内不再含 `timeFilter` / `getNoteText` / `totalRecycled` / `totalDonations` / `co2Reduced` / `ecoPoints` / `fetchOrders` 等被迁移符号。