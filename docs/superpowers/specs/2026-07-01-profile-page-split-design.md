# ProfilePage 组件拆分设计

**状态**: 待用户审阅  
**日期**: 2026-07-01  
**范围**: `frontend/src/views/client/ProfilePage.vue` 的组件与业务逻辑拆分方案  
**推荐方案**: UI 组件 + 页面专属 composables

## 背景与目标

`frontend/src/views/client/ProfilePage.vue` 当前约 2958 行，把页面编排、资料加载、头像上传、连续打卡、守护天数动画、减排日历、环境足迹图表、任务成就、最近动态以及大量 scoped CSS 全部放在一个 SFC 中。这个文件已经不适合作为后续迭代入口。

本次拆分目标是让 `ProfilePage.vue` 变成薄编排层，预计降到约 160-230 行，只保留加载/错误状态、页面级 reveal、组合各子组件、连接 composables 与 UI 事件。UI 结构进入 `components/client/profile/`，页面业务状态进入 `composables/useProfile*.js`。

不在本次范围内:

- 不调整视觉风格和交互设计。
- 不改变 mock API 协议。
- 不引入 Pinia/Vuex 或新的状态管理层。
- 不把当前静态任务、成就、动态改成真实后端数据。
- 不重写图表视觉算法，只移动边界并去除重复模板。

## 总体方案

采用项目中 HomePage、AppointmentPage、CharityPage 已经形成的拆分风格:

- view 只负责页面编排和状态接线。
- panel 组件只负责渲染和局部 UI 交互。
- composable 承载页面专属业务状态、浏览器存储、API 调用和生命周期清理。
- 单页面私有逻辑使用 `useProfile*` 命名，避免伪装成全局通用工具。
- CSS 跟随 markup 移动到对应组件，页面只保留根容器、loading、error 和少量跨区布局样式。

目标文件结构:

```text
frontend/src/components/client/profile/
  ProfileHeaderPanel.vue          header 整区: 头像 + profile meta + blur text + 瓶子 + streak card
  ProfileCheckInAlert.vue         固定定位“今日已打卡”浮层
  ProfileCalendarSection.vue      减排日历 + 月份导航 + insight
  ProfileImpactDashboard.vue      周期 tabs + 能耗/CO2 指标卡 + 积分卡 + rewards banner
  ProfileBottomSectionsPanel.vue  任务列表 + 成就徽章 + 最近动态 (3 个静态 sub-section)

frontend/src/composables/
  useProfileCheckIn.js            打卡业务状态 (storage + 定时器 + animation flags)
  useProfileCalendar.js           日历 UI 状态 (month + fetch + highlight)
```

> 16 → 7 收敛理由: 沿用 `HomePage` 拆分后的"单消费者不抽"原则。
> - `useProfileData` / `useProfileAvatar` / `useProfileImpactMetrics` / `useBlurText` 是单消费者, 各自 inline 进唯一的消费方 (page / HeaderPanel / ImpactDashboard)。
> - `ProfileLevelBottle` / `ProfileStreakCard` / `ProfileMetricCard` 是 panel 内部 sub-block, 沿用 `HomeCoreFunctionsPanel` 把 4 张卡 inline 的做法, 合并进 `ProfileHeaderPanel` / `ProfileImpactDashboard`。
> - `ProfileTasksPanel` / `ProfileAchievementsPanel` / `ProfileActivityList` 三个纯静态列表, 沿用 `HomeWhyChoosePanel` 把 4 个 stat + image + button inline 的做法, 合并进 `ProfileBottomSectionsPanel` 的 3 个 sub-section。
> - 保留 `useProfileCheckIn` / `useProfileCalendar` 是因为它们各自有显著副作用: 前者有 3 个 setTimeout 动画 + 2 个 localStorage 键 + 重复打卡 alert; 后者有 fetch 协调 + section DOM 滚动 + 多段 setTimeout。这些逻辑与"纯展示的 panel"明显异质, 抽出来有助于 view 保持薄。

## 单元职责与不做什么

| 单元 | 职责 | 不做什么 |
|---|---|---|
| `ProfilePage.vue` | 持有 `pageRef` + 调 `useRevealOnScroll(pageRef)`; 调 3 个 fetch (`fetchProfileData` / `fetchRealDate` / `fetchCalendarWithOrders`); 组合 2 个 composable 与 5 个 panel; 转发事件; 渲染 loading / error / content 三态; 持有 3 个静态常量 (`PROFILE_TASKS` / `PROFILE_ACHIEVEMENTS` / `PROFILE_ACTIVITIES`) | 不调 `useProfileData` / `useProfileAvatar` / `useProfileImpactMetrics` / `useBlurText` (已 inline); 不调 `useTypewriter` (无); 不持有业务 ref (除 `loading` / `errorText` / `profile` / `levelProgress`) |
| `useProfileCheckIn.js` | `streakDays` / `totalRecycles` / `streakRecord` / `guardianDays` / `hasCheckedInToday` / `isStreakAnimating` / `isGuardianDaysUpdating` / `showCheckInAlert` ref; `checkTodayCheckIn()` / `triggerCheckIn()` / `resetCheckInForTesting()`; 写 `localStorage.guardianDays` 与 `lastCheckInDate` | 不滚动 DOM; 不调用 `highlightToday()`; 不持有日历 ref |
| `useProfileCalendar.js` | `currentMonth` / `calendarDays` / `orderMap` / `highlightedDay` / `calendarSectionRef` ref + `monthText` computed; `initializeCalendar()` / `generateCalendar()` / `changeMonth()` / `highlightToday()` / `setCalendarSectionRef()`; 调用 `fetchCalendarWithOrders(year, month)` | 不读写 `localStorage`; 不持有打卡状态; 不感知 panel 内部 hover |
| `ProfileHeaderPanel.vue` | 头像 + 认证角标 + 用户名 + 等级身份标签 + 守护天数 blur 文本 + 等级瓶子 + streak card (火焰/打卡按钮/调试 reset); **inline** avatar 校验/FileReader/`localStorage.userAvatar`; **inline** blur text IntersectionObserver + 字符高亮; 隐藏 file input 放在这里, 点击头像时通过 panel 内部 `avatarFileInput` 触发文件选择; `onMounted` 后 emit `blur-ready(el)` 把 blur message DOM 交给 page | 不直接调 `useProfileAvatar` / `useBlurText` (已 inline); 不发 `check-in` 之外的事件; alert 浮层不放在这里 (走 `ProfileCheckInAlert`) |
| `ProfileCheckInAlert.vue` | 固定定位“今日已打卡”提示浮层; 接收 `visible` / `message` (默认文案) prop | 无事件, 无业务状态 |
| `ProfileCalendarSection.vue` | section header + legend + 月份导航 + weekday header + `calendarDays` 网格 + intensity / activity / tooltip / highlight 动画 + insight 文案; 接收 `calendarDays` / `monthText` / `highlightedDay` prop; emit `ready(el)` 暴露 section DOM; emit `change-month(offset)` | 不调 `fetchCalendarWithOrders`; 不生成 day 数组 |
| `ProfileImpactDashboard.vue` | 周期 tabs (本周/本月/季度) + 能耗指标卡 (bar/line + gradient + tooltip) + CO2 指标卡 (同上) + 积分卡 + rewards banner; **inline** `selectedPeriod` ref + `energyData` / `co2Data` computed + `generateRandomBars()` / `generateLineChartPoints()` / `generateLinePath()`; 接收 `points` prop; emit `update:selected-period` | 不调 `useProfileImpactMetrics` (已 inline); metric 卡片不单独抽 sub-component (沿用 home 4 卡 inline 风格) |
| `ProfileBottomSectionsPanel.vue` | 3 个 sub-section inline: 任务列表 (`.tasks-section` + `.task-card` + 进度条) + 成就徽章 (`.achievement-card` + `.unlocked`/`.locked` 态 + "查看全部" 按钮) + 最近动态 (`.activity-item` + 积分正负色); 接收 `tasks` / `achievements` / `activities` prop; emit `view-all-achievements` (仅成就按钮发) | 不持有任何业务状态; 不调 API |

## UI 结构拆分

### `ProfilePage.vue`

职责:

- 持有 `pageRef` 并调用 `useRevealOnScroll(pageRef)`。
- 直接调 `fetchProfileData` / `fetchRealDate` / `fetchCalendarWithOrders`（原 `useProfileData` 已 inline 进 view 的 `loadProfile` async）。
- 组合 2 个 composable (`useProfileCheckIn` / `useProfileCalendar`) 与 5 个 panel。
- 持有 3 个静态常量 (`PROFILE_TASKS` / `PROFILE_ACHIEVEMENTS` / `PROFILE_ACTIVITIES`) 并通过 prop 传给 `ProfileBottomSectionsPanel`。
- 渲染 loading、error、content 三种页面状态。
- 把状态通过 props 传给 profile 子组件，把事件转发给 composable 方法。

不做:

- 不直接读写 `localStorage`（avatar / guardianDays / lastCheckInDate 三处都移出 view）。
- 不调 `useProfileData` / `useProfileAvatar` / `useProfileImpactMetrics` / `useBlurText`（已 inline）。
- 不直接生成日历格子、图表数据、blur text 字符数组（全部 inline 进相应 panel）。
- 不保留长段瓶子、图表、日历、任务、成就、动态模板。

### `ProfileHeaderPanel.vue`（合并 avatar / blur text / bottle / streak card）

负责顶部个人信息整区:

- 头像、认证角标、用户名称、等级身份标签。
- 守护天数文案（含 IntersectionObserver + 字符级高亮 blur 动画）。
- 等级瓶子（液体高度、4 段波浪、气泡、玻璃反光、hover tooltip）。
- 连续打卡卡片（火焰动画、天数、已打卡按钮、调试 reset 按钮）。
- **inline** avatar 校验 / FileReader / `localStorage.userAvatar`（原 `useProfileAvatar` 职责）。
- **inline** blur text observer + 字符数组生成（原 `useBlurText` 职责）。`onMounted` 后 panel 内部直接 `observer.observe(blurMessageRef.value)`，不再 emit DOM 到 page。`onBeforeUnmount` 调 `observer.disconnect()` 防泄漏。
- 隐藏 file input 的 DOM 放在这里，由 Header 内部点击头像时打开。

为什么不抽 `ProfileLevelBottle` / `ProfileStreakCard`？参考 `HomeCoreFunctionsPanel` 把 4 张 function card inline 的做法 —— 它们是 Header 内部 sub-block，没有跨 panel 复用价值。Header 本身预计 ~200-280 行（avatar + blur + bottle + streak + 各自 CSS），比 charitied header 略厚但可控。

### `ProfileCheckInAlert.vue`

负责固定定位的“今日已打卡”提示。只接收:

- `visible`
- `message`，默认“今日已打卡，明天再来吧！”

为什么不 inline 进 Header？alert 是 fixed-position 浮层，CSS 定位逻辑和 header 布局正交，沿用 home 的"独立视觉单元 = 独立 panel"原则。

### `ProfileCalendarSection.vue`

负责减排日历:

- section header、legend、月份导航。
- weekday header。
- `calendarDays` 日期格子。
- intensity class、activity icon、tooltip、highlight 动画。
- insight 文案。

Props:

- `calendarDays`
- `monthText`
- `highlightedDay`

Emits:

- `ready(el)`
- `change-month(offset)`

日历组件不调用 `fetchCalendarWithOrders`，月份变更交给 `useProfileCalendar.changeMonth()`。
`ready(el)` 在 mounted 后把 section 根 DOM 暴露给页面，页面再交给 `useProfileCalendar.setCalendarSectionRef(el)`。不要在父组件中把 `<ProfileCalendarSection ref="...">` 当成 DOM 使用；Vue 组件 ref 默认拿到的是组件实例。

### `ProfileImpactDashboard.vue`（内联 2 张 metric 卡片）

负责环境足迹区整体:

- 周期 tabs: 本周、本月、季度。
- 能耗指标卡 + CO2 指标卡（bar/line chart + gradient + tooltip，**inline 在本组件**，不抽 `ProfileMetricCard`）。
- 积分卡 + rewards banner。
- **inline** `selectedPeriod` ref + `energyData` / `co2Data` computed + `generateRandomBars()` / `generateLineChartPoints()` / `generateLinePath()`（原 `useProfileImpactMetrics` 职责）。

Props:

- `points`

Emits:

- `update:selected-period`

为什么不抽 `ProfileMetricCard`？参考 `HomeCoreFunctionsPanel` 把 4 张 function card inline 的做法 —— 能耗卡和 CO2 卡只在 dashboard 内使用，单 consumer 不抽 sub-component。两张卡的 markup 用 `v-for` over `[{ key: 'energy', ... }, { key: 'co2', ... }]` 渲染，避免模板重复。

### `ProfileBottomSectionsPanel.vue`（合并任务 / 成就 / 动态）

负责页面底部 3 个静态列表 sub-section:

- **任务列表** (`<section class="tasks-section">` + `.task-card` + 进度条)。
- **成就徽章** (`<section class="achievements-section">` + `.achievement-card` + `unlocked`/`locked` 态 + "查看全部" 按钮)。
- **最近动态** (`<section class="activities-section">` + `.activity-item` + 积分正负色)。

Props:

- `tasks: Array<{ name, progressText, progress, reward }>` (required)
- `achievements: Array<{ icon, name, unlocked }>` (required)
- `activities: Array<{ icon, title, description, points, pointsVariant, time }>` (required)

Emits:

- `view-all-achievements()` — "查看全部" 按钮（仅这一个 emit，其他 sub-section 无业务）

为什么不拆成 3 个独立 panel？参考 `HomeWhyChoosePanel` 把 4 个 stat + image + button inline 的做法 —— 3 个 sub-section 视觉上相邻、CSS 上共用 `.section-header`、逻辑上都是"由 page 传入的静态数据"，合成一个 panel 比拆 3 个 YAGNI 价值更高。

## 业务逻辑拆分

只剩 2 个 composable：4 个单消费者已 inline 进 page / Header / Dashboard。
本节描述保留的 2 个 composable + 3 处 inline 逻辑的归属。

### `useProfileCheckIn.js`

职责:

- `streakDays`
- `totalRecycles`
- `streakRecord`
- `guardianDays`
- `hasCheckedInToday`
- `isStreakAnimating`
- `isGuardianDaysUpdating`
- `showCheckInAlert`
- `checkTodayCheckIn()`
- `triggerCheckIn()`
- `resetCheckInForTesting()`

Storage keys:

- `guardianDays`
- `lastCheckInDate`

为什么保留？3 个 `setTimeout` 动画计时器（streak 1s / guardianDays 0.6s / alert 3s）+ 2 个 localStorage 键 + 重复打卡判定，逻辑相对独立且异质于"纯展示的 panel"。

打卡成功后不直接滚动日历，返回 `{ checkedIn: true }`。页面收到成功信号后调用 `highlightToday()`，这样打卡逻辑和日历 DOM 解耦。

### `useProfileCalendar.js`

职责:

- `currentMonth`
- `calendarDays`
- `orderMap`
- `highlightedDay`
- `calendarSectionRef`
- `setCalendarSectionRef(el)`
- `monthText`
- `initializeCalendar(realDate, ordersData)`
- `generateCalendar()`
- `changeMonth(offset)`
- `highlightToday()`

保留 `fetchCalendarWithOrders(year, month)` 在这里，因为月份切换天然属于日历业务。

`highlightToday()` 可以负责:

- 延迟等待打卡动画。
- 滚动到 `calendarSectionRef`。
- 找到 `isToday` 的 day。
- 临时补 intensity/emission。
- 3 秒后取消 `highlightedDay`。

为什么保留？fetch 协调 + section DOM 滚动 + 多段 setTimeout + 月份切换 + 跨调用方（`useProfileData` 初始化 / `triggerCheckIn` 成功后 highlight）的状态共享，逻辑与 panel 渲染明显异质。

### Inline 进 `ProfilePage.vue` 的数据加载

原 `useProfileData` 职责整体 inline 进 view 的 `loadProfile` async 函数。`ProfilePage.vue` 直接 import `fetchProfileData` / `fetchRealDate` / `fetchCalendarWithOrders` 三个 mock 函数（来自 `@/mock/clientApi` + `@/mock/timeApi`），按以下顺序执行：

```js
const loading = ref(true);
const errorText = ref("");
const profile = ref(null);

async function loadProfile() {
  loading.value = true;
  errorText.value = "";
  try {
    const [profileData, realDate] = await Promise.all([
      fetchProfileData(),
      fetchRealDate(),
    ]);
    const calendarDate = realDate || {
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      day: new Date().getDate(),
    };
    const ordersData = await fetchCalendarWithOrders(calendarDate.year, calendarDate.month);
    profile.value = profileData;
    initializeCalendar(calendarDate, ordersData);
    checkTodayCheckIn();
  } catch {
    errorText.value = "个人信息加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}
```

初始日历的订单月份必须和 `realDate` 同源：先获得 `realDate`，再用
`realDate.year` / `realDate.month` 拉取 `fetchCalendarWithOrders(year, month)`。
`calendarDate` 对象在 `initializeCalendar` 和 fetch 之间复用，避免月份
错位。

为什么不抽 `useProfileData`？唯一的消费者是 `ProfilePage.vue`，
`onLoaded` callback 模式（被废弃的方案）只是把 `loadProfile` 内的
3 行调用套了一层壳，单 consumer 不增加任何隔离价值。view 内的
`loadProfile` 函数承担原 composable 全部职责，且 view 已经持有
`loading` / `errorText` / `profile` 三个 ref，inline 反而更短。

### Inline 进 `ProfileHeaderPanel.vue` 的头像与 blur text

原 `useProfileAvatar` + `useBlurText` 职责整体 inline 进 `ProfileHeaderPanel` 的 `<script setup>`。

头像部分：
```js
const AVATAR_STORAGE_KEY = "userAvatar";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const avatarUrl = ref(localStorage.getItem(AVATAR_STORAGE_KEY) || null);
const avatarFileInput = ref(null);

function triggerAvatarUpload() {
  avatarFileInput.value?.click();
}

function handleAvatarChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("请选择图片文件");
    return;
  }
  if (file.size > MAX_AVATAR_BYTES) {
    alert("图片大小不能超过5MB");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    avatarUrl.value = base64;
    localStorage.setItem(AVATAR_STORAGE_KEY, base64);
  };
  reader.readAsDataURL(file);
}
```

blur text 部分：
```js
const blurMessageRef = ref(null);
const blurTextInView = ref(true);
let blurTextObserver = null;
const guardianDays = computed(() => /* 来自 useProfileCheckIn */);

const blurTextElements = computed(() => {
  const text = `你已通过回收行动累计为地球守护了 ${guardianDays.value} 天。感谢你的每一份坚持。`;
  const highlight = String(guardianDays.value);
  const highlightIndex = text.indexOf(highlight);
  return text.split("").map((char, index) => ({
    char,
    isHighlighted: highlightIndex >= 0 && index >= highlightIndex && index < highlightIndex + highlight.length,
  }));
});

function setBlurTextRef(el) {
  blurTextObserver?.disconnect();
  if (!el || typeof IntersectionObserver === "undefined") return;
  blurTextObserver = new IntersectionObserver(
    ([entry]) => { blurTextInView.value = entry.isIntersecting; },
    { threshold: 0.1, rootMargin: "0px" },
  );
  blurTextObserver.observe(el);
}

onMounted(() => blurTextObserver?.observe(blurMessageRef.value));
onBeforeUnmount(() => blurTextObserver?.disconnect());
```

为什么不抽 composable？两个逻辑各自只服务 `ProfileHeaderPanel` 一个
组件，没有跨页面复用价值。avatar 部分实际只有 4 个函数 + 1 个 ref，
blur text 稍长但仍是单消费者。`useBlurText` 名字暗示通用，但当前只
有 Profile 用，不要做"为可能的未来用户准备的抽象"。

### Inline 进 `ProfileImpactDashboard.vue` 的图表数据生成

原 `useProfileImpactMetrics` 职责整体 inline 进 `ProfileImpactDashboard` 的 `<script setup>`。

```js
const selectedPeriod = ref("本月");

function generateRandomBars(count) { /* 同原逻辑 */ }
function generateLineChartPoints(count) { /* 同原逻辑 */ }
function generateLinePath(points) { /* 同原逻辑 */ }

const energyData = computed(() => { /* 3 个 period 分支 */ });
const co2Data = computed(() => { /* 3 个 period 分支 */ });
```

为什么不抽 composable？3 个 helper 都是纯函数 + 2 个 computed
只服务 panel 内部，单 consumer 抽出来反而多一层 import。
`generateLinePath` 仍然在 panel 内部定义（template 调用），不通过 prop
从外部注入（之前 16 文件方案是把 `generateLinePath` 通过 prop 传给
`ProfileMetricCard`；现在 metric 卡 inline 后不需要 prop 注入）。


## 数据流与事件契约

组件之间无 `v-model`，所有变化通过 emit 暴露给 page，page 调用 composable
方法或 composable 内部响应式更新（与 home/charity 一致）。各 panel 的
DOM ref 一律通过 `ready(el)` 上抛，避免 page 错拿组件实例。**blur text
的 DOM 已在 `ProfileHeaderPanel` 内部 inline 处理**（不再 emit 到
page）。avatar / blur text / 图表数据 的 ref / 函数已 inline 进 panel
内部，**不再通过 prop 从 page 注入**，相应的 props 已删除。

### ProfileHeaderPanel

Props:
- `profile: Object` (required) — `profile.value`（来自 view 的 `loadProfile`）
- `guardianDays: Number` (required) — `useProfileCheckIn().guardianDays.value`
- `levelProgress: Number` (required) — 派生自 `profile.points` 的等级百分比
- `isGuardianDaysUpdating: Boolean` (required) — 用于 blur 数字更新动画
- `streakDays: Number` (required) — `useProfileCheckIn().streakDays.value`
- `hasCheckedInToday: Boolean` (required)
- `isStreakAnimating: Boolean` (required)
- `showDebugReset: Boolean` (default `false`) — 控制调试 reset 按钮是否渲染

Emits:
- `check-in()` — streak card 点击；page 调 `handleCheckIn`
- `reset-check-in()` — 仅在 `showDebugReset` 为 true 时从调试按钮发出

> 头像相关 state（`avatarUrl` / `handleAvatarChange` / `avatarFileInput` /
> `triggerAvatarUpload`）和 blur text 相关 state（`blurTextElements` /
> `blurTextInView` / `setBlurTextRef` / observer）已 inline 进 panel，
> 不再通过 prop 传递。avatar file input 仍由 panel 内部 `ref` 触发点击。
>
> Blur text 的 DOM ref 不再 emit 到 page（panel 内部 `onMounted` 直接
> `observer.observe(blurMessageRef.value)`，page 不参与）。不允许直接
> 用 `<ProfileHeaderPanel ref="...">` 在 page 拿 DOM，组件 ref 默认拿到
> 实例。

### ProfileCheckInAlert

Props:
- `visible: Boolean` (required) — `useProfileCheckIn().showCheckInAlert.value`
- `message: String` (default `"今日已打卡，明天再来吧！"`)

Emits: 无。

### ProfileCalendarSection

Props:
- `calendarDays: Array<{ empty?, day, month, year, intensity, emission, isToday, date }>` (required) — `useProfileCalendar().calendarDays.value`
- `monthText: String` (required) — `useProfileCalendar().monthText.value`
- `highlightedDay: Number | null` (default `null`) — 用于今日高亮动画

Emits:
- `ready(el)` — `onMounted` 把 section 根 DOM 上抛，page 调 `setCalendarSectionRef`
- `change-month(offset: -1 | 1)` — 月份左右切换，page 调 `changeMonth(offset)`

> Section 不直接调 `fetchCalendarWithOrders`，月份切换是 page 协调的行为。
> Page 不通过 `<ProfileCalendarSection ref="...">` 拿 DOM（组件 ref 是实例
> 不是节点），而是通过 `ready` emit。

### ProfileImpactDashboard

Props:
- `points: Number` (required) — 积分卡数值，传 `profile.points`

Emits:
- `update:selected-period(value: string)` — 周期 tab 切换

> `selectedPeriod` ref / `energyData` / `co2Data` computed / 3 个
> `generate*` 纯函数已 inline 进 panel 内部，**不再通过 prop 从 page 注
> 入**。能耗卡和 CO2 卡用 `v-for` over `[{ key: 'energy', ... }, { key:
> 'co2', ... }]` 渲染，避免模板重复。内部 `hoveredBarIndex` /
> `hoveredPointIndex` 作为纯 UI 局部状态保留。

### ProfileBottomSectionsPanel

Props:
- `tasks: Array<{ name, progressText, progress, reward }>` (required) — 来自 view 的 `PROFILE_TASKS` 常量
- `achievements: Array<{ icon, name, unlocked }>` (required) — 来自 view 的 `PROFILE_ACHIEVEMENTS` 常量
- `activities: Array<{ icon, title, description, points, pointsVariant, time }>` (required) — 来自 view 的 `PROFILE_ACTIVITIES` 常量

Emits:
- `view-all-achievements()` — 成就 sub-section "查看全部" 按钮点击；当前无真实跳转行为，预留接入

### Page 持有的状态

Page 直接持有 `loading` / `errorText` / `profile` 三个 ref + `loadProfile`
async 函数（inline 原 `useProfileData` 职责），不调
`useProfileData` / `useProfileAvatar` / `useProfileImpactMetrics` /
`useBlurText` 四个 composable。`levelProgress` 派生自
`profile.value.points` 留在 page 内的 `computed`：

```js
const levelProgress = computed(() => {
  const points = profile.value?.points ?? 0;
  return Math.min(100, Math.max(0, points % 1000 / 10));
});
```

`avatarFileInput` 不再出现在 page —— 头像 DOM 整体迁入 `ProfileHeaderPanel`。

### 页面 composable 调用与事件转发

```js
import { computed, onMounted, ref } from "vue";
import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import { useProfileCheckIn } from "@/composables/useProfileCheckIn";
import { useProfileCalendar } from "@/composables/useProfileCalendar";

import { fetchProfileData } from "@/mock/clientApi";
import { fetchRealDate, fetchCalendarWithOrders } from "@/mock/timeApi";

import ProfileHeaderPanel from "@/components/client/profile/ProfileHeaderPanel.vue";
import ProfileCheckInAlert from "@/components/client/profile/ProfileCheckInAlert.vue";
import ProfileCalendarSection from "@/components/client/profile/ProfileCalendarSection.vue";
import ProfileImpactDashboard from "@/components/client/profile/ProfileImpactDashboard.vue";
import ProfileBottomSectionsPanel from "@/components/client/profile/ProfileBottomSectionsPanel.vue";

const PROFILE_TASKS = [ /* 同原 16 文件方案 */ ];
const PROFILE_ACHIEVEMENTS = [ /* 同原 16 文件方案 */ ];
const PROFILE_ACTIVITIES = [ /* 同原 16 文件方案 */ ];

const pageRef = ref(null);
useRevealOnScroll(pageRef);

const loading = ref(true);
const errorText = ref("");
const profile = ref(null);

async function loadProfile() {
  loading.value = true;
  errorText.value = "";
  try {
    const [profileData, realDate] = await Promise.all([
      fetchProfileData(),
      fetchRealDate(),
    ]);
    const calendarDate = realDate || {
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      day: new Date().getDate(),
    };
    const ordersData = await fetchCalendarWithOrders(calendarDate.year, calendarDate.month);
    profile.value = profileData;
    initializeCalendar(calendarDate, ordersData);
    checkTodayCheckIn();
  } catch {
    errorText.value = "个人信息加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

const {
  streakDays,
  guardianDays,
  hasCheckedInToday,
  isStreakAnimating,
  isGuardianDaysUpdating,
  showCheckInAlert,
  checkTodayCheckIn,
  triggerCheckIn,
} = useProfileCheckIn();

const {
  calendarDays,
  highlightedDay,
  monthText,
  setCalendarSectionRef,
  initializeCalendar,
  changeMonth,
  highlightToday,
} = useProfileCalendar();

const levelProgress = computed(() => {
  const points = profile.value?.points ?? 0;
  return Math.min(100, Math.max(0, points % 1000 / 10));
});

async function handleCheckIn() {
  const result = triggerCheckIn();
  if (result?.checkedIn) {
    await highlightToday();
  }
}

function handleCalendarReady(el) {
  setCalendarSectionRef(el);
}

onMounted(() => {
  loadProfile();
});
```

> blur text DOM 不再 emit 到 page —— `ProfileHeaderPanel` 内部
> `onMounted` 直接 `observer.observe(blurMessageRef.value)`，无 page 中
> 转。`ProfileHeaderPanel` 自身 `onBeforeUnmount` 调
> `observer.disconnect()` 清理。

### Composable 耦合

- `useProfileCheckIn`: 完全独立，写 `localStorage.guardianDays` / `lastCheckInDate`。
- `useProfileCalendar`: 依赖 `mock/timeApi.fetchCalendarWithOrders`。

不引入 `vue-router` / Pinia / 任何新的运行时依赖。


## 错误处理 / 生命周期

### 错误显示边界

- 加载失败 → view 的 `loadProfile` 内 `errorText.value = "个人信息加载失败，请稍后重试。"`（inline 原 `useProfileData` 职责）；view 渲染 `.error-state` 容器 + `.btn-retry` 按钮（`@click="loadProfile"`）。
- 头像非图片 → `ProfileHeaderPanel` 内 inline 的 `handleAvatarChange` 弹 `alert("请选择图片文件")`（沿用现状，**不**改成 inline 错误条）。
- 头像 > 5MB → `ProfileHeaderPanel` 内 inline 的 `handleAvatarChange` 弹 `alert("图片大小不能超过5MB")`（沿用现状）。
- 重复打卡 → `useProfileCheckIn.triggerCheckIn` 返回 `{ checkedIn: false }` 同时置 `showCheckInAlert.value = true` 持续 3 秒；`ProfileCheckInAlert` 渲染固定定位提示。

错误条统一由 view 渲染（loading / error / content 三态），不引入独立 error
组件。

### 数据加载顺序

view 的 `loadProfile` async 函数严格顺序（inline 原 `useProfileData.loadProfile`）：
1. `Promise.all([fetchProfileData(), fetchRealDate()])` — 先拿到 profile 和真实日期（两者无依赖）
2. 用 `realDate || { year, month, day = new Date() }` 作为 `calendarDate`
3. `await fetchCalendarWithOrders(calendarDate.year, calendarDate.month)` — 拿当前月订单
4. `profile.value = profileData`
5. `initializeCalendar(calendarDate, ordersData)` — 直接调 composable 方法（无 `onLoaded` callback 中转）
6. `checkTodayCheckIn()` — 同上
7. `finally { loading.value = false }`

`calendarDate.year` / `calendarDate.month` 与 `useProfileCalendar.initializeCalendar`
的 `realDate` 必须**同源**（实现层复用同一对象），避免初始月份和初始订
单对不上。

### 副作用与清理

- `useProfileCheckIn` 内部 `setTimeout` 动画计时器在 `isStreakAnimating` /
  `isGuardianDaysUpdating` / `showCheckInAlert` 三处使用。无需在 unmount
  清理（计时器最多 3s 后自然结束；超时后 ref 写入 unmounted 组件无副作用，
  Vue 不会抛错）。如果未来延长到分钟级，再补 `onBeforeUnmount(clearAll)`。
- `useProfileCalendar.highlightToday` 内部 `setTimeout` 共三段（300ms /
  800ms / 3000ms），同不上 unmount 清理（最长 3.1s）。`scrollIntoView` 在
  unmount 后的 section ref 上调用是 no-op（`.value` 为 null），已被
  `calendarSectionRef.value?.scrollIntoView(...)` 保护。
- `ProfileHeaderPanel` 的 `IntersectionObserver` **必须** 在 panel 自身
  `onBeforeUnmount` 调 `observer.disconnect()`，否则在 SPA 路由切换时
  观察器泄漏（原 `useBlurText` 的清理职责已 inline 进 panel）。
- `ProfileImpactDashboard` 无副作用，无需清理。
- view 自身的 `pageRef` 由 `useRevealOnScroll` 内部清理（沿用现状）。
- 头像 `localStorage.userAvatar` 跨会话保留，刷新后由 `ProfileHeaderPanel`
  启动时读出。`localStorage.guardianDays` / `lastCheckInDate` 同上。

### 路由守卫

`/profile` 受 `frontend/src/router/index.js` 的 `meta.requiresAuth` 保护。
未登录访问 → 跳 `/auth?redirect=/profile`，登录成功后回到 `/profile`。
本次重构不触碰 `router/index.js`，与 `frontend/CLAUDE.md` “touching nav
or protected routes” 约定一致。

### 持久化

| 键 | 写入方 | 读取方 | 时机 |
|---|---|---|---|
| `userAvatar` | `ProfileHeaderPanel` (inline `handleAvatarChange`) | `ProfileHeaderPanel` (inline `avatarUrl` ref init) | FileReader `onload` |
| `guardianDays` | `useProfileCheckIn` | `useProfileCheckIn` | `triggerCheckIn` 成功后 |
| `lastCheckInDate` | `useProfileCheckIn` | `useProfileCheckIn` | 同上 |
| `szt_user` / `szt_users` | — | — | 不在 profile 拆分范围（属于 auth 体系） |

## 样式边界

CSS 按 markup 归属移动:

- `ProfilePage.vue`: `.profile-page`、loading、error、`.profile-content`、`.tasks-achievements-grid` 容器、主页级响应式断点。
- `ProfileHeaderPanel.vue`: `.profile-header`、`.header-left/right`、avatar、profile meta、blur text 容器、bottle、cap、neck、body、liquid、wave、bubble、reflection、tooltip、compact streak、button、flame animation、debug reset button 及所有相关 keyframes（10+ 个 bottle keyframes + streak 火焰 + blur 模糊）。
- `ProfileCheckInAlert.vue`: alert fixed layer、slide/pulse/shake keyframes。
- `ProfileCalendarSection.vue`: calendar section、controls、legend、grid、day、highlight、tooltip、insight。
- `ProfileImpactDashboard.vue`: dashboard、period tabs、metrics grid、metric card (2 张 inline)、bar chart、line chart、chart tooltip、rewards banner。
- `ProfileBottomSectionsPanel.vue`: tasks section/list/card/progress + achievements section/list/card/button + activity section/list/item。

重复类名风险:

- `.tooltip-label` 当前同时用于 bottle 和 chart tooltip。拆分后因 scoped CSS 隔离可保留，但推荐在新组件中使用更明确命名，例如 `.bottle-tooltip-label`、`.metric-tooltip-label`，降低未来迁移成本（实施阶段顺手做）。

## 重构配套清理

下面这些符号在 `ProfilePage.vue` 拆分过程中应当**同步删除**，避免拆分
后留下死代码或死 CSS：

### 死 ref / computed / 变量

最终归属在 7 个文件之间：

- `avatarUrl` / `avatarFileInput` / `triggerAvatarUpload` → inline 进 `ProfileHeaderPanel`
- `isBottleHovered` → inline 进 `ProfileHeaderPanel`（瓶子 sub-block）
- `hoveredBarIndex` / `hoveredPointIndex` → inline 进 `ProfileImpactDashboard`
- `selectedPeriod` / `energyData` / `co2Data` → inline 进 `ProfileImpactDashboard`
- 本地 `generateRandomBars()` / `generateLineChartPoints()` / `generateLinePath()` → inline 进 `ProfileImpactDashboard`
- `blurTextRef` / `blurTextContent` / `blurTextObserver` / `setBlurTextRef` / `blurTextInView` / `blurTextElements` → inline 进 `ProfileHeaderPanel`
- `currentMonth` / `orderMap` / `calendarSectionRef` / `highlightedDay` / `monthText` → 移入 `useProfileCalendar`
- `calendarDays` / `generateCalendar()` / `changeMonth()` / `scrollToCalendarAndHighlight()` → 移入 `useProfileCalendar`
- `streakDays` / `totalRecycles` / `streakRecord` / `guardianDays` / `hasCheckedInToday` / `isStreakAnimating` / `isGuardianDaysUpdating` / `showCheckInAlert` → 移入 `useProfileCheckIn`
- `checkTodayCheckIn()` / `triggerCheckIn()` / `resetCheckInForTesting()` → 移入 `useProfileCheckIn`
- `loading` / `errorText` / `profile` / `loadProfile` → **保留在 view**（inline 原 `useProfileData` 职责）
- `levelProgress` computed → **保留在 view**（跨 composable 抽出来没复用价值）

### 死 import

拆分完成后 `ProfilePage.vue` 不应再直接 import：
- `useTemplateRef`（如果 avatar DOM 已迁入 `ProfileHeaderPanel`）
- `onBeforeUnmount`（如果 blur 清理已迁入 `ProfileHeaderPanel`）
- 4 个被 inline 掉的 composable: `useProfileData` / `useProfileAvatar` / `useProfileImpactMetrics` / `useBlurText`

`ProfilePage.vue` 仍直接 import：
- `fetchProfileData` / `fetchRealDate` / `fetchCalendarWithOrders`（inline 后由 view 直接调）
- `useProfileCheckIn` / `useProfileCalendar`（保留的 2 个 composable）

### 死 CSS

- 瓶子相关样式 / 10+ 个 bottle keyframes → inline 进 `ProfileHeaderPanel`（与 streak 卡共享 header 容器）
- 指标卡 / bar / line chart / tooltip / rewards banner → inline 进 `ProfileImpactDashboard`
- 周期 tabs / metric grid → inline 进 `ProfileImpactDashboard`
- 日历 / legend / day cell / tooltip / insight → 移入 `ProfileCalendarSection`
- compact streak / flame / debug reset → inline 进 `ProfileHeaderPanel`（与 bottle 共享 header 容器）
- 任务 / 成就 / 动态 section 样式 → inline 进 `ProfileBottomSectionsPanel`（3 个 sub-section 共用 panel）
- alert fixed layer / slide / pulse / shake → 移入 `ProfileCheckInAlert`
- header / avatar / profile meta / blur text 容器 → inline 进 `ProfileHeaderPanel`

view 只保留 `.profile-page` / `.profile-content` / loading / error / spinner / retry / 页面级 grid（如 `.tasks-achievements-grid`）和主页级响应式断点。

### 死工具函数

如果旧 `ProfilePage.vue` 里有 `getLevelProgress(points)` 之类的纯派生
函数，要么 inline 进 page 的 `levelProgress` computed（当前采用），
要么放进 `utils/profileUtils.js`。本设计选择 inline，不要在缺少消费者
的情况下新建 utils 文件。

### 死常量

`PROFILE_TASKS` / `PROFILE_ACHIEVEMENTS` / `PROFILE_ACTIVITIES` 三个
静态数组保留在 `ProfilePage.vue` 顶层（`const`），由 page 通过 prop
传给 `ProfileBottomSectionsPanel`。**不**抽到独立文件（与 home 的
`FUNCTION_CARDS` / `STATS` 等常量策略一致：单消费者不放 utils）。

## 实施顺序

1. 抽 `useProfileCheckIn` 和 `useProfileCalendar`（两个保留的 composable），并写 Vitest。
2. 抽 `ProfileHeaderPanel`（含 avatar / blur text / bottle / streak card 全 inline），把 page 内的 `avatarUrl` / avatar file input / blur text observer 全部搬入 panel 内。
3. 抽 `ProfileImpactDashboard`（含 2 张 metric 卡 + 3 个 generate helper inline），把 page 内的 `selectedPeriod` / `energyData` / `co2Data` 全部搬入 panel 内。
4. 抽 `ProfileCalendarSection`，并把 `useProfileCalendar.initializeCalendar` 接到 `loadProfile` 末尾。
5. 抽 `ProfileBottomSectionsPanel`（3 个 sub-section inline），把 3 个静态常量传给 panel。
6. 抽 `ProfileCheckInAlert`（最小独立 panel）。
7. 清理 `ProfilePage.vue` 中的未使用 import、ref、computed、CSS；`loadProfile` async 函数 inline 在 view 内。

## 验证策略

项目当前没有 Vitest 用例 / ESLint 配置（CI 步骤 `--passWithNoTests`），
本次重构以 Vite build + 浏览器手动验证为主，保留的 2 个 composable 补
最小 Vitest 覆盖。验证分四层：命令验证、composable 单元测试、浏览器功
能、视觉回归。

### 命令验证

```bash
cd frontend
npm run test -- useProfile
npm run build
```

期望：2 个 composable 测试通过，Vite build 退出码 0。

### Composable 单元测试

只剩 2 个 composable 有测试（4 个 inline 掉的 composable 失去测试边界，
由浏览器功能 + 视觉回归兜底）：

- `useProfileCheckIn`: `localStorage.guardianDays` 读取；当日已打卡检测；首打卡 +1；重复打卡 alert + 不增量；`resetCheckInForTesting` 清空。
- `useProfileCalendar`: `initializeCalendar` 后 `monthText` 正确；`changeMonth` 调 `fetchCalendarWithOrders(year, month)`；`highlightToday` 置 `highlightedDay` 并 3s 后清。

### 浏览器功能验证

- `/profile` 未登录时仍按路由守卫跳转到 `/auth?redirect=/profile`。
- 登录后访问 `/profile` 能正常加载个人中心。
- loading、错误重试状态仍可展示（临时把 view 的 `loadProfile` 改成 throw 验证 error 态，验证完恢复）。
- 头像点击触发文件选择，非图片和超过 5MB 仍提示，合法图片保存后刷新仍显示（`ProfileHeaderPanel` 内 inline 逻辑）。
- 今日未打卡时点击打卡：火焰动画 → 守护天数 +1 → 按钮变已打卡 → 日历滚动 + 高亮今天。
- 今日已打卡时点击打卡：显示提示浮层，不重复增加守护天数。
- 月份左右切换后日历重新加载。
- 本周/本月/季度切换后能耗和 CO2 图表形态符合原行为（`ProfileImpactDashboard` 内 inline 逻辑）。
- 能耗、CO2 图表 hover tooltip 正常。
- 等级瓶子 hover tooltip 正常。
- 任务、成就、最近动态内容与拆分前一致（`ProfileBottomSectionsPanel` 内 inline sub-section）。

### 视觉回归点

拆分前后视觉不应有可观察差异：

- 头部渐变标题色、`forest-700 → moss-500`。
- 守护天数 blur 文本：未进入视口时模糊，进入后清晰；高亮数字（守护天数部分）单独高亮。
- 等级瓶子：液体高度、4 段波浪错峰、玻璃反射、tooltip 三行。
- streak 卡片：火焰跳动动画、按钮态切换、reset 按钮隐藏。
- 日历：日期网格、intensity 三档颜色、activity 图标、tooltip、3 秒 highlight 动画。
- 能耗 / CO2 指标卡：bar 数量（7 / 30）、line 数量（12）、gradient 填充、tooltip 文案（能耗 `${value} kWh`、CO2 `${(value * 0.15).toFixed(1)} kg`）、rewards banner。
- 任务进度条：宽度 = `task.progress`%。
- 成就卡片：unlocked / locked 两态视觉。
- 动态列表：积分正负号颜色（`.pointsVariant === "positive"` 绿 / `"negative"` 红）。
- 固定 alert：滑入 + 抖动 / pulse。

如果 `npm run build` 产物对比拆分前的 `frontend/dist/assets/*.css`
大小相近（±5%），可作为粗粒度“CSS 没大瘦身”信号。最终以浏览器视觉检
查为准。

### 响应式断点验证

| 断点 | 期望 |
|---|---|
| ≤ 1200px | 头部水平布局变垂直；avatar / bottle / streak card 单列堆叠；period tabs 横向不换行 |
| ≤ 768px | 日历 weekday header 字号降级；任务 / 成就 / 动态 section padding 缩小；指标卡双列变单列 |
| ≤ 480px | profile meta 字号降级；积分卡字号降级；alert 浮层宽度收缩 |
| 桌面 ≥ 1200px | 头部水平、avatar 在 bottle 左侧、streak card 在右侧 |

只验证 view 的主页级断点不破坏，panels 自身不引入新断点（沿用现状，原
文件 1583-1708 与 1687-1775 两段重复断点保留一份在 view）。

## 风险与注意事项

- 当前源码在 PowerShell 输出中显示乱码，拆分时**尽量移动代码块**避免无意义重打中文文案，移动后用 `Read` 工具二次校验。
- `energyData` / `co2Data` 使用随机图表数据，拆分时不要顺手改成稳定缓存，否则会改变现有视觉行为（包括测试时图表形态不稳定是预期行为）。
- 打卡逻辑同时影响 `guardianDays`、`lastCheckInDate`、alert、动画、日历高亮，必须先明确：`useProfileCheckIn` 负责业务状态（streak / guardianDays / alert timers / animation flags / localStorage 写入），`useProfileCalendar` 负责日历 UI 状态（currentMonth / calendarDays / highlightToday），页面只做协调（`handleCheckIn` 调两者）。不要把 `highlightToday()` 放进 `useProfileCheckIn`，也不要让 `useProfileCheckIn` 知道 `calendarSectionRef`。
- `ProfileHeaderPanel` 因为 inline 了 avatar / blur text / bottle / streak card 4 个 sub-block，会比 home 的 `HomeCoreFunctionsPanel` 厚一些（预计 ~200-280 行）。但每个 sub-block 在 home 都有 analog（4 张 function card），inline 是有先例的。如果实施时发现确实超过 300 行，可以再单独评估是否把 streak 抽 sub-component（**不**在本次拆分范围内）。
- 调试用 reset button 不应默认暴露给正式用户，必须加 `showDebugReset: false` prop 控制渲染，默认 user 路径不显示。
- `ProfileHeaderPanel` 的 `IntersectionObserver` 必须在 `onBeforeUnmount` 调 `disconnect()`，否则在 SPA 路由切换时观察器泄漏（与 HomeNewsPanel 的 rAF 清理是同类问题，参考 home 拆分后 `useScrollStack` 内的清理模式）。
- `useProfileCalendar.highlightToday` 内部 `setTimeout` 共三段（300ms / 800ms / 3000ms），最长 3.1s 自然结束，不在 unmount 时显式清理（避免引入额外 `onBeforeUnmount` 复杂度）。如果未来延长到分钟级，再补 `onBeforeUnmount(clearAll)`。
- Vue 组件 ref 默认拿到的是**组件实例**而不是 DOM 节点。任何需要 page 持有 DOM 节点的场景（`calendarSectionRef`）必须通过 `ready(el)` emit 显式上抛。blur text 的 DOM 已经在 `ProfileHeaderPanel` 内部 inline 处理，不再 emit 到 page（与原 16 文件方案不同）。
- 重复类名 `.tooltip-label` 同时用于 bottle 和 chart tooltip，scoped CSS 隔离后可保留但建议重命名为 `.bottle-tooltip-label` / `.metric-tooltip-label`，降低未来维护成本（在实施阶段顺手做，不单独开任务）。
- 不要顺手把静态 `PROFILE_TASKS` / `PROFILE_ACHIEVEMENTS` / `PROFILE_ACTIVITIES` 抽到 `utils/profileConstants.js`（home 拆分已确定“单消费者不抽 utils”原则，避免 YAGNI）。
- 不要在 `ProfileImpactDashboard` 内的 `generateRandomBars` / `generateLineChartPoints` / `generateLinePath` 引入按 period 缓存（如 `Map<period, data>`），保持每次 `computed` 重新生成随机数据。视觉回归在 视觉回归点 一节明确列了这一点。
- 实施完成后必须 `grep` 检查 `ProfilePage.vue` 内不再有 `useProfileData` / `useProfileAvatar` / `useProfileImpactMetrics` / `useBlurText` / `useTemplateRef` / `onBeforeUnmount` 等被 inline 掉的 composable / API。

## 文件清单

### 新增（7 个）

```
frontend/src/components/client/profile/ProfileHeaderPanel.vue
frontend/src/components/client/profile/ProfileCheckInAlert.vue
frontend/src/components/client/profile/ProfileCalendarSection.vue
frontend/src/components/client/profile/ProfileImpactDashboard.vue
frontend/src/components/client/profile/ProfileBottomSectionsPanel.vue

frontend/src/composables/useProfileCheckIn.js
frontend/src/composables/useProfileCalendar.js
```

### 新增测试（2 个）

```
frontend/src/composables/__tests__/useProfileCheckIn.test.js
frontend/src/composables/__tests__/useProfileCalendar.test.js
```

### 修改（1 个）

```
frontend/src/views/client/ProfilePage.vue  （2958 → 约 160-230 行）
```

### 删除

无独立文件删除。原 16 文件方案里的 9 个文件（4 个 inline 掉的 composable + 3 个 inline 掉的 sub-panel + 2 个 inline 掉的 list panel）从未真正创建，profile 当前没有同类型死文件（与 home 拆分删除 `utils/homePageContent.js` 不同）。

## 完成判定

- `ProfilePage.vue` 降到约 160-230 行（含 `PROFILE_TASKS` / `PROFILE_ACHIEVEMENTS` / `PROFILE_ACTIVITIES` 三个常量 + `loadProfile` async 函数 + `levelProgress` computed）。
- 7 个新增文件全部存在；`useProfileCheckIn.js` / `useProfileCalendar.js` + 5 个 panel 都在 `frontend/src/components/client/profile/`。
- 2 个 composable 测试文件全部通过；实施计划全部完成。
- `npm run build` 通过；`npm run test -- useProfile` 全部通过。
- 浏览器验证清单通过；视觉回归点全部通过；4 个响应式断点布局无错位。
- 没有遗留未使用 import、未使用 ref/computed、死 CSS。
- `git grep` 确认 `ProfilePage.vue` 内不再含 `useProfileData` / `useProfileAvatar` / `useProfileImpactMetrics` / `useBlurText` / `useTemplateRef` / `onBeforeUnmount` 等被 inline 掉的符号。
