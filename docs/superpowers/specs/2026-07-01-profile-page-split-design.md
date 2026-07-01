# ProfilePage 组件拆分设计

**状态**: 待用户审阅  
**日期**: 2026-07-01  
**范围**: `frontend/src/views/client/ProfilePage.vue` 的组件与业务逻辑拆分方案  
**推荐方案**: UI 组件 + 页面专属 composables

## 背景与目标

`frontend/src/views/client/ProfilePage.vue` 当前约 2619 行，把页面编排、资料加载、头像上传、连续打卡、守护天数动画、减排日历、环境足迹图表、任务成就、最近动态以及大量 scoped CSS 全部放在一个 SFC 中。这个文件已经不适合作为后续迭代入口。

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
  ProfileHeaderPanel.vue
  ProfileLevelBottle.vue
  ProfileStreakCard.vue
  ProfileCheckInAlert.vue
  ProfileCalendarSection.vue
  ProfileImpactDashboard.vue
  ProfileMetricCard.vue
  ProfileTasksPanel.vue
  ProfileAchievementsPanel.vue
  ProfileActivityList.vue

frontend/src/composables/
  useProfileData.js
  useProfileAvatar.js
  useProfileCheckIn.js
  useProfileCalendar.js
  useProfileImpactMetrics.js
  useBlurText.js
```

## UI 结构拆分

### `ProfilePage.vue`

职责:

- 持有 `pageRef` 并调用 `useRevealOnScroll(pageRef)`。
- 调用 `useProfileData` 加载 profile、真实日期和初始订单。
- 调用头像、打卡、日历、图表、blur text composables。
- 渲染 loading、error、content 三种页面状态。
- 把状态通过 props 传给 profile 子组件，把事件转发给 composable 方法。

不做:

- 不直接读写 `localStorage`。
- 不直接生成日历格子、图表数据、blur text 字符数组。
- 不保留长段瓶子、图表、日历、任务、成就、动态模板。

### `ProfileHeaderPanel.vue`

负责顶部个人信息区域:

- 头像、认证角标、用户名称、等级身份标签。
- 守护天数文案动画的展示。
- 等级瓶子和连续打卡卡片的布局组合。
- 隐藏文件 input 的 DOM 放在这里，由 Header 内部点击头像时打开；文件读取和校验逻辑由 `useProfileAvatar` 提供。

Props:

- `profile`
- `avatarUrl`
- `guardianDays`
- `levelProgress`
- `blurTextElements`
- `blurTextInView`
- `isGuardianDaysUpdating`
- `streakDays`
- `hasCheckedInToday`
- `isStreakAnimating`

Emits:

- `avatar-change`
- `check-in`
- `reset-check-in`

### `ProfileLevelBottle.vue`

负责等级瓶子 UI:

- 液体高度、波浪、气泡、玻璃反光。
- hover tooltip。
- `levelProgress` 展示。

内部只保留 `isBottleHovered` 这类纯 UI 状态。瓶子不关心 profile、积分或等级计算来源。

### `ProfileStreakCard.vue`

负责连续打卡小卡片:

- 火焰动画。
- 连续打卡天数。
- 已打卡按钮状态。
- 点击后 emit `check-in`。

当前 `resetCheckInForTesting()` 是调试入口。建议通过 `showDebugReset` prop 控制，默认 `false`，避免测试按钮长期暴露在用户 UI 中。

### `ProfileCheckInAlert.vue`

负责固定定位的“今日已打卡”提示。只接收:

- `visible`
- `message`，默认“今日已打卡，明天再来吧！”

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

### `ProfileImpactDashboard.vue`

负责环境足迹区整体:

- 周期 tabs: 本周、本月、季度。
- 能耗指标卡。
- CO2 指标卡。
- 积分卡。

Props:

- `selectedPeriod`
- `energyData`
- `co2Data`
- `points`

Emits:

- `update:selectedPeriod`

内部复用 `ProfileMetricCard.vue`，避免能耗和 CO2 两段图表模板重复。

### `ProfileMetricCard.vue`

负责单个指标卡:

- label、value、unit、trend。
- bar chart 或 line chart。
- bar tooltip、line tooltip。

Props:

- `metric`
- `gradientId`
- `accentColor`
- `formatTooltipValue`

内部可保留 `hoveredBarIndex` 和 `hoveredPointIndex`，因为这是单卡局部 UI 状态。`generateLinePath` 由 `useProfileImpactMetrics` 提供，或在该组件内部作为纯展示 helper 保留。推荐放 composable，保证数据结构和 SVG path 生成同源。

### `ProfileTasksPanel.vue`

负责进行中的任务列表。当前数据是静态模板，第一阶段可以把静态数组留在组件内部，或由页面通过 `tasks` prop 传入。推荐先由页面传入常量，方便未来接入 API。

### `ProfileAchievementsPanel.vue`

负责成就徽章列表和“查看全部”按钮。当前无真实跳转逻辑，按钮先保持现状或 emit `view-all` 供页面后续接入。

### `ProfileActivityList.vue`

负责最近动态列表。当前数据静态，建议同任务列表一样由页面传入常量。

## 业务逻辑拆分

### `useProfileData.js`

职责:

- `loading`
- `errorText`
- `profile`
- `loadProfile()`
- 并行调用 `fetchProfileData()`、`fetchRealDate()`、`fetchCalendarWithOrders()`。

返回初始日历所需的 `realDate` 和 `ordersData`，由页面传给 `useProfileCalendar` 初始化，或由 composable 接受 callbacks。推荐让 `useProfileData` 只管数据加载，不生成日历格子。

建议接口:

```js
const { loading, errorText, profile, loadProfile } = useProfileData({
  onLoaded({ realDate, ordersData }) {
    initializeCalendar(realDate, ordersData);
    checkTodayCheckIn();
  },
});
```

### `useProfileAvatar.js`

职责:

- `avatarUrl`
- `handleAvatarChange(event)`
- image 类型校验。
- 5MB 文件大小校验。
- FileReader 转 base64。
- `localStorage.userAvatar` 持久化。

头像组件只负责打开文件选择器并 emit `avatar-change`，不直接知道 FileReader 或 storage key。

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

打卡成功后不直接滚动日历，返回 `{ checkedIn: true }` 或接受 `onCheckedIn` callback。页面收到成功信号后调用 `highlightToday()`，这样打卡逻辑和日历 DOM 解耦。

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

### `useProfileImpactMetrics.js`

职责:

- `selectedPeriod`
- `energyData`
- `co2Data`
- `generateRandomBars(count)`
- `generateLineChartPoints(count)`
- `generateLinePath(points)`

当前 `energyData` 和 `co2Data` 在每次 computed 重新计算时会重新生成随机图表。拆分时建议保留现状以避免视觉行为改变；如果后续需要稳定图表，再单独改为按 period 缓存数据。

### `useBlurText.js`

职责:

- `blurTextRef`
- `blurTextInView`
- `blurTextElements`
- IntersectionObserver 创建和清理。

输入:

- `text` 或 `textRef`
- `highlightText` 或 `highlightValue`

输出:

- 字符数组 `{ char, isHighlighted }`
- 是否进入视口。

该 composable 可先保持通用命名 `useBlurText`，因为 blur text 不是 profile 独有；但当前只有 Profile 使用，不要过度扩展 API。

## 数据流与事件契约

页面组合示意:

```vue
<ProfileHeaderPanel
  :profile="profile"
  :avatar-url="avatarUrl"
  :guardian-days="guardianDays"
  :level-progress="levelProgress"
  :blur-text-elements="blurTextElements"
  :blur-text-in-view="blurTextInView"
  :is-guardian-days-updating="isGuardianDaysUpdating"
  :streak-days="streakDays"
  :has-checked-in-today="hasCheckedInToday"
  :is-streak-animating="isStreakAnimating"
  @avatar-change="handleAvatarChange"
  @check-in="handleCheckIn"
/>

<ProfileCheckInAlert :visible="showCheckInAlert" />

<ProfileCalendarSection
  :calendar-days="calendarDays"
  :month-text="monthText"
  :highlighted-day="highlightedDay"
  @ready="setCalendarSectionRef"
  @change-month="changeMonth"
/>

<ProfileImpactDashboard
  :selected-period="selectedPeriod"
  :energy-data="energyData"
  :co2-data="co2Data"
  :points="profile.points"
  @update:selected-period="selectedPeriod = $event"
/>
```

Page-level handler:

```js
async function handleCheckIn() {
  const result = triggerCheckIn();
  if (result?.checkedIn) {
    await highlightToday();
  }
}
```

## 样式边界

CSS 按 markup 归属移动:

- `ProfilePage.vue`: `.profile-page`、loading、error、`.profile-content` 和少量页面级间距。
- `ProfileHeaderPanel.vue`: `.profile-header`、`.header-left/right`、avatar、profile meta、blur text 容器。
- `ProfileLevelBottle.vue`: bottle、cap、neck、body、liquid、wave、bubble、reflection、tooltip 和相关 keyframes。
- `ProfileStreakCard.vue`: compact streak、button、flame animation、debug reset button。
- `ProfileCheckInAlert.vue`: alert fixed layer、slide/pulse/shake keyframes。
- `ProfileCalendarSection.vue`: calendar section、controls、legend、grid、day、highlight、tooltip、insight。
- `ProfileImpactDashboard.vue`: dashboard、period tabs、metrics grid。
- `ProfileMetricCard.vue`: metric card、bar chart、line chart、chart tooltip、rewards banner。
- `ProfileTasksPanel.vue`: tasks section/list/card/progress。
- `ProfileAchievementsPanel.vue`: achievements section/list/card/button。
- `ProfileActivityList.vue`: activity section/list/item.

重复类名风险:

- `.tooltip-label` 当前同时用于 bottle 和 chart tooltip。拆分后因 scoped CSS 隔离可保留，但推荐在新组件中使用更明确命名，例如 `.bottle-tooltip-label`、`.metric-tooltip-label`，降低未来迁移成本。

## 实施顺序

1. 抽 `useProfileAvatar` 和 `useProfileImpactMetrics`。这两个边界清晰，风险最低。
2. 抽 `ProfileLevelBottle` 和 `ProfileMetricCard`。优先减少最长 CSS 和重复图表模板。
3. 抽 `useProfileCalendar` 和 `ProfileCalendarSection`。
4. 抽 `useProfileCheckIn`，把打卡成功后的滚动/高亮交给页面协调。
5. 抽 `ProfileHeaderPanel`，组合头像、blur text、瓶子和打卡卡片。
6. 抽 `ProfileTasksPanel`、`ProfileAchievementsPanel`、`ProfileActivityList`。
7. 清理 `ProfilePage.vue` 中的未使用 import、ref、computed、CSS。

## 验证策略

项目当前没有可靠的单元测试/ lint 配置，本次重构以 Vite build 和浏览器行为验证为主。

命令验证:

```bash
cd frontend
npm run build
```

浏览器验证:

- `/profile` 未登录时仍按路由守卫跳转到 `/auth?redirect=/profile`。
- 登录后访问 `/profile` 能正常加载个人中心。
- loading、错误重试状态仍可展示。
- 头像点击触发文件选择，非图片和超过 5MB 仍提示，合法图片保存后刷新仍显示。
- 今日未打卡时点击打卡，火焰动画、守护天数 +1、按钮变已打卡、日历滚动并高亮今天。
- 今日已打卡时点击打卡，显示提示浮层，不重复增加守护天数。
- 月份左右切换后日历重新加载。
- 本周/本月/季度切换后能耗和 CO2 图表形态符合原行为。
- 能耗、CO2 图表 hover tooltip 正常。
- 等级瓶子 hover tooltip 正常。
- 任务、成就、最近动态内容与拆分前一致。
- 桌面和移动端布局无明显错位。

## 风险与注意事项

- 当前源码在 PowerShell 输出中显示乱码，拆分时要尽量移动代码块，避免无意义重打中文文案。
- `energyData` / `co2Data` 使用随机图表数据，拆分时不要顺手改成稳定缓存，否则会改变现有视觉行为。
- 打卡逻辑同时影响 `guardianDays`、`lastCheckInDate`、alert、动画、日历高亮，必须先明确由 `useProfileCheckIn` 负责业务状态，由 `useProfileCalendar` 负责日历 UI 状态，页面只做协调。
- `ProfileHeaderPanel` 容易变成新的大组件。瓶子、打卡卡片、alert 必须单独拆，Header 只做上方区域组合。
- 调试用 reset button 不应默认暴露给正式用户，建议加 `showDebugReset` prop。

## 完成判定

- `ProfilePage.vue` 降到约 160-230 行。
- 所有 profile 子组件都在 `frontend/src/components/client/profile/`。
- 页面业务逻辑拆到 `useProfile*.js` 和 `useBlurText.js`。
- `npm run build` 通过。
- 浏览器验证清单通过。
- 没有遗留未使用 import、未使用 ref/computed、死 CSS。
