# AppointmentPage 组件拆分设计

**状态**: 待用户审阅
**日期**: 2026-06-30
**分支**: 待开(本次单独立分支,例如 `refactor/appointment-page-split`)
**参照**: `AiQaPage.vue` 在 `2026-06-29` 的拆分风格(commit 25bd578 合并前的多次
提交)——view 编排 + composable 持有状态 + panel 只渲染。

## 背景与目标

`frontend/src/views/client/AppointmentPage.vue` 当前 1631 行,模板 / 脚本 / CSS
全部塞在一个文件里,涵盖 4 个表单 section、2 个侧栏卡片、2 个 modal、日期选
择、重量映射、图片上传、mock 数据拉取、提交、校验等十多项关注点。本次目标
是按 AI QA 的拆分范式把它拆开,让 view 只做编排、各 section 独立可改。

**不在范围**:UI 视觉调整、动效改写、CSS 视觉回归修复、新增字段、动 mock
API 协议、提交/校验逻辑改动。

## 总体方案

完全镜像 `AiQaPage.vue` 拆分风格:

- `components/client/qa/` → `components/client/appointment/`(新建子目录)
- 顶层 9 个 panel 组件 + 1 个 modals 组件对
- `composables/` 下新增 4 个职责单一的 composable
- 1 个共享常量文件替代原 script 顶部散落的常量

```
frontend/src/components/client/appointment/
  AppointmentHeroPanel.vue          Hero 区(标题 + 副标题)
  AppointmentContactSection.vue     Section 01 联系信息(address/contactName/phone)
  AppointmentScheduleSection.vue    Section 02 预约时间(月/周切换 + 日期 + 时段)
  AppointmentItemSection.vue        Section 03 物品详情(分类 + 重量 + 备注 + 图片)
  AppointmentConfirmSection.vue     Section 04 信息确认(summary metrics)
  AppointmentSubmitBar.vue          提交按钮 + 错误条 + 底部备注
  AppointmentLoadingSkeleton.vue    metaLoading 时的主区骨架
  AppointmentAsideCards.vue         侧栏两张卡:服务承诺 + 官方保障(同布局合并)
  AppointmentValidationModal.vue    校验失败弹窗
  AppointmentSuccessModal.vue       成功弹窗(订单号/核验码/ETA + RouterLink)

frontend/src/composables/
  useAppointmentForm.js             form + meta + submit + modal + errorText 编排
  useDatePicker.js                  month/week 切换 + appointmentDates + maxWeekIndex
  useWeightRange.js                 weightInput ↔ form.weight 双向映射
  useAppointmentUpload.js           fileInputRef + itemImage/Name + 触发/清除

frontend/src/utils/
  appointmentConstants.js           weightPointMap / weightDisplayMap / weekdayLabels
```

## 单元职责与不做什么

| 单元 | 职责 | 不做什么 |
|---|---|---|
| AppointmentPage.vue | 编排 composables、传递 props、绑定 events、布局壳(`.booking-shell`、`.appointment-page` 容器、modal 遮罩定位、响应式断点) | 不持有任何业务 ref / computed / 业务函数、不写 form 字段、不调 API、不做派生计算 |
| useAppointmentForm.js | `loadMeta()` 拉取 meta 并初始化 form 默认值;`handleSubmit()` 校验 → 提交 → 驱动 modal;`errorText` / `submitLoading` / `showValidationModal` / `showSuccessModal` / `submitResult` 状态;setter 暴露给面板 | 不计算日期 / 重量内部细节、不管 fileInput、不感知 layout |
| useDatePicker.js | `currentMonth` / `weekOffset` ref、`appointmentDates` / `currentMonthText` / `dateRangeText` / `maxWeekIndex` computed、`switchMonth(offset)` / `switchWeek(offset)` 方法 | 不感知 form、不调 API、不持久化 |
| useWeightRange.js | `weightInput` ref、`estimatedPoints` / `normalizedWeightText` computed、`syncWeightRange(event)` / `normalizeWeightInput()` 方法;接受外部 form + weightPointMap + weightDisplayMap 注入,保持纯函数式 | 不感知 API / submit |
| useAppointmentUpload.js | `fileInputRef` template ref、`itemImage` / `itemImageName` ref、`triggerFileSelect()` / `handleFileChange(event)` / `clearSelectedFile()` 方法 | 不感知 form / API;上传是临时态,提交时由 `useAppointmentForm.handleSubmit` 读取 `upload.itemImage.value` |
| appointmentConstants.js | 集中导出 `weightPointMap` / `weightDisplayMap` / `weekdayLabels`(原 script 顶部常量) | 无运行时逻辑 |
| AppointmentHeroPanel.vue | 渲染 `<header class="reference-hero">` 标题 + 副标题 | 无 |
| AppointmentContactSection.vue | 渲染 Section 01 三字段(address/contactName/phone) + `.section-mark` 头;emit `update:address` 等 | 不持有状态 |
| AppointmentScheduleSection.vue | 渲染 Section 02 月/周切换 + 日期卡 + 时段按钮;内部调用 `useDatePicker()`;emit `select-date` / `select-time` / `switch-month` / `switch-week` | 不持有 form 字段 |
| AppointmentItemSection.vue | 渲染 Section 03 分类 select + 重量输入 + 备注 textarea + 图片上传区;内部调用 `useWeightRange({ form, ... })` 和 `useAppointmentUpload()`;emit 字段更新与命令 | 不持有上传临时态(在内部 composable 里) |
| AppointmentConfirmSection.vue | 渲染 Section 04 summary metrics;接收派生好的 metrics prop(由 view 算好) | 不派生、不持有 |
| AppointmentSubmitBar.vue | 渲染提交按钮 + 底部备注 + 错误条;接收 `submitLoading` / `errorText`;emit `submit` | 不调 submit / 不调 API |
| AppointmentLoadingSkeleton.vue | metaLoading 时渲染 `.loading-stack` 4 个骨架卡 | 无 |
| AppointmentAsideCards.vue | 渲染侧栏两张卡(promise-card + trust-card),硬编码承诺文案(原 `promiseItems` 数组直接搬入模板) | 不持有状态 |
| AppointmentValidationModal.vue | 渲染校验弹窗;接收 `show` / `message`;emit `close` | 不持有状态 |
| AppointmentSuccessModal.vue | 渲染成功弹窗;接收 `show` / `result`(orderId/pickupCode/etaMinutes);emit `close` | 不持有状态 |

## 数据流与事件契约

组件之间无 `v-model`,所有变化通过 emit 暴露给 page,page 调用 composable
方法或直接 `form.xxx = v`。这与 AI QA 一致。

### AppointmentHeroPanel

Props: 无。

Emits: 无。

### AppointmentContactSection

Props:
- `address: String` (required)
- `contactName: String` (required)
- `phone: String` (required)

Emits:
- `update:address(value: string)`
- `update:contact-name(value: string)`
- `update:phone(value: string)`

### AppointmentScheduleSection

内部调用 `useDatePicker()` 自给自足。view 只需要把 `form.date` / `form.period` 通过
props 传进来用作激活态。

Props:
- `selectedDate: String` (required) — 即 `form.date`
- `selectedPeriod: String` (required) — 即 `form.period`

Emits:
- `select-date(item: { value, isFull })` — 面板内部已检查 `!isFull`,view 端 `form.date = item.value`
- `select-time(slot: { value, disabled })` — 面板内部已检查 `!disabled`,view 端 `form.period = slot.value`
- `switch-month(offset: number)`
- `switch-week(offset: number)`

### AppointmentItemSection

内部调用 `useWeightRange({ form, defaultWeight, weightPointMap, weightDisplayMap })`
和 `useAppointmentUpload()`。

Props:
- `categories: Array<string>` (required) — 来自 `meta.categories`
- `selectedCategory: String` (required) — 即 `form.category`

Emits:
- `update:category(value: string)`
- `update:note(value: string)` — 备注 textarea 直接 `form.note = v`,不上 useWeightRange

(重量与上传字段是面板内部 composable 状态,view 不需要知道。)

### AppointmentConfirmSection

Props:
- `summaryMetrics: Array<{ label, value, detail }>` (required)

Emits: 无。

### AppointmentSubmitBar

Props:
- `submitLoading: Boolean` (required)
- `errorText: String` (required,允许空字符串)

Emits:
- `submit()` — page 转发到 `useAppointmentForm.handleSubmit()`

### AppointmentLoadingSkeleton

Props: 无。Emits: 无。

### AppointmentAsideCards

Props: 无。Emits: 无。承诺文案硬编码在模板 v-for 里。

### AppointmentValidationModal

Props:
- `show: Boolean` (required)
- `message: String` (required)

Emits:
- `close()`

### AppointmentSuccessModal

Props:
- `show: Boolean` (required)
- `result: { orderId, pickupCode, etaMinutes } | null` (required)

Emits:
- `close()`

### Page 持有的状态

全部为通过 destructuring 从 composable 拿到的 ref,**不在 view 中创建任何额外
ref**:

```
const datePicker = useDatePicker();

const availableTimeSlots = computed(() =>
  meta.periods.map((period) => ({ value: period, label: period, disabled: false })),
);

const {
  form, meta, metaLoading, submitLoading, errorText,
  submitResult, showValidationModal, showSuccessModal, validationMessage,
  loadMeta, handleSubmit,
  closeValidationModal, closeSuccessModal,
} = useAppointmentForm({ datePicker, availableTimeSlots });
```

注意:`meta` / `availableTimeSlots` 都是 `useAppointmentForm` 调用之后才能拿
到(view 在 `loadMeta` 之后才持有 meta),所以 view 实际执行顺序是:
1. 同步创建 `datePicker`;
2. 同步创建 `availableTimeSlots` computed(初始为空);
3. 调 `useAppointmentForm({ datePicker, availableTimeSlots })` 拿到 `meta`;
4. **之后**再用一个 `computed` 包裹 `meta.periods` → 重新赋值给
   `availableTimeSlots`,或者保留上面那段同步声明并接受首次 meta 加载完成
   前为空数组。

实际推荐写法:把 `availableTimeSlots` 抽成一个普通 computed 函数,在 view
顶层声明,`useAppointmentForm` 通过闭包读取——view 不需要把 meta 先填进
composable,只需要在 `loadMeta` 里通过入参的 `availableTimeSlots.value` 取当
前值。

view 还要做派生(给面板用的派生 prop):

- `availableTimeSlots = computed(() => meta.periods.map(...))` — 这是 meta 的一次包装,不算业务逻辑,view 派生合理
- `summaryMetrics = computed(...)` — 4 个 section 信息汇总,view 派生并传给 `AppointmentConfirmSection`

**理由**:这两个 computed 与 form 字段耦合,放在 view 比放在 panel 更省事
(避免 panel 重新收集 form 片段)。

### Composable 耦合

- `useWeightRange` 接受外部传入的 `form` / `weightPointMap` /
  `weightDisplayMap`,不直接 import,保持纯函数式(参考 `useChatStream` 接
  受 `chatHistory` ref 的做法)。
- `useDatePicker` 完全独立,不依赖其他 composable。
- `useAppointmentUpload` 完全独立。
- `useAppointmentForm` 内部:
  - `loadMeta` 调用 `fetchAppointmentMeta()` 拿 meta,并通过 `datePicker.appointmentDates.value`
    选默认值(初始化时序:在 view `onMounted` 里调用 `loadMeta`)。
  - 不直接持有 file upload 状态——`handleSubmit` 接收外部 `itemImage` 入参
    (由 view 在调用时从 `upload.itemImage.value` 取出传入)。

## 错误处理 / 持久化 / 生命周期

### 错误显示边界

- meta 加载失败 → `errorText.value = "预约配置加载失败，请刷新后重试。"`
  (沿用现状文案)
- 提交失败 → `errorText.value = "提交失败，请稍后重试。"`
- 校验失败 → `validationMessage` + `showValidationModal = true`
- 成功 → `submitResult` + `showSuccessModal = true`

错误条统一由 `AppointmentSubmitBar` 渲染(沿用现状位置:提交按钮下方)。

### `availableTimeSlots` 默认初始化

原代码在 `loadMeta` 里写死 `availableTimeSlots[1]?.value` 作为默认
`form.period`。重构成 view 派生 `availableTimeSlots` 后,`useAppointmentForm.loadMeta`
通过依赖注入拿 `datePicker` + `availableTimeSlots`(改为 `useAppointmentForm({ datePicker, availableTimeSlots })` 入参)。

**理由**:form composable 不直接耦合 date picker 的实现细节;保持
`useAppointmentForm` 单测时可用 mock 替换。

### 卸载清理

- view `onMounted(loadMeta)`,无需 `onBeforeUnmount` 清理(无 document 监听、无
  定时器)。
- `useDatePicker` / `useWeightRange` / `useAppointmentUpload` 内部均无副作用
  监听,无需清理。
- `useAppointmentForm` 内部无副作用监听,无需清理。

### 上传文件生命周期

上传是临时态(`itemImage` / `itemImageName`),不持久化、不入 form、不参与
提交 payload(原代码也未把图片加进 `submitAppointment`,沿用)。

## 样式边界

每个组件自带 scoped CSS,只搬走自身 markup 用到的样式。

**留在 view**(布局 / 容器 / 响应式):
- `.appointment-page` 容器(grid + padding + 渐变背景)
- `.booking-shell` / `.booking-shell--reference` grid 布局
- `.booking-main` / `.booking-aside` 内部 gap
- `.reference-hero` 样式(注:hero 实际迁入 `AppointmentHeroPanel.vue`,这里只
  留 `data-reveal` 相关的延迟属性由 view 渲染——但 `.reference-hero` 内部 h1/p
  样式跟着 panel 走;view 不再持有此规则)
- `.modal-overlay` 定位 + 背景遮罩(模态面板样式在各自 modal 组件)
- `@media (max-width: 1180px)` / `860px` / `720px` 三个断点

**搬入 `AppointmentHeroPanel`**:`.reference-hero` 及其 h1 / p 样式。

**搬入 `AppointmentContactSection`**:`.section-card` 边框 / `.section-mark` /
`.section-badge` / `.section-head` / `.section-grid` / `.section-grid--contact`
/ `.field` / `.field--full` / `.field input` 等所有 Section 01 用到的样式。

**搬入 `AppointmentScheduleSection`**:`.section-head--between` /
`.month-switcher` / `.month-btn` / `.month-text` / `.week-switcher` /
`.week-btn` / `.week-range-text` / `.section-helper` / `.date-picker-grid` /
`.date-card*` / `.time-slot-row` / `.time-slot*` / `.material-symbols-outlined`
(本组件内部用到的图标字体规则)。

**搬入 `AppointmentItemSection`**:`.section-grid--items` / `.weight-input` /
`.upload-field` / `.upload-box*` / `.upload-icon` / `.upload-title` /
`.upload-note` / `.upload-actions` / `.upload-trigger` / `.upload-clear`。

**搬入 `AppointmentConfirmSection`**:`.reference-confirm` / `.section-title-inline`
/ `.status-dot` / `.reference-summary` / `.summary-metrics` / `.summary-card*`。

**搬入 `AppointmentSubmitBar`**:`.submit-panel` / `.submit-btn*` /
`.submit-note` / `.submit-caption` / `.state-error`。

**搬入 `AppointmentLoadingSkeleton`**:`.loading-stack` / `.loading-card` /
`.loading-card--hero` / `.loading-card--summary` / `@keyframes shimmer`。

**搬入 `AppointmentAsideCards`**:`.promise-card` / `.promise-list` /
`.promise-item*` / `.promise-dot` / `.promise-policy*` / `.trust-label` /
`.trust-dot` / `.trust-card*`。

**搬入 `AppointmentValidationModal`**:`.modal-card` / `.modal-icon*` /
`.modal-tag*` / `.modal-btn` / `.modal-emphasis`(本 modal 用到的)。

**搬入 `AppointmentSuccessModal`**:`.success-modal*`(全部 success 相关样式)。

**全局样式**:`.material-symbols-outlined` 字体规则原本在 scoped 内只服务于
`month-btn` 等图标,scope 迁出后失效。**保留**:全局样式中已存在的
`.material-symbols-outlined` 规则(在 `App.vue` 或全局 CSS 中查找);若不在
全局,本组件内重新声明 `:deep(.material-symbols-outlined)` 或在 scoped 内用
`:global` 兼容。

## 重构配套清理

- **删除 `referenceTimeSlots` 常量**:原 script 顶部定义了但模板从未引用,
  属于死代码,直接删除。
- **删除 `dateSeed` 变量**:原代码 `const dateSeed = new Date();
  dateSeed.setHours(12, 0, 0, 0);` 但后续从未使用,删除。
- **删除 `weekdayLabels` 重复声明**:若 `appointmentConstants.js` 已导出,
  `useDatePicker` 直接 import 即可,view 不再重复声明。
- 重构完跑一次 grep:
  - 未被任何 template 引用的 ref / computed
  - 未被任何 selector 引用的 CSS class
  - 未被 import 的模块
  - 未被 export 的常量(常量统一从 `appointmentConstants.js` 取)

## 验证策略

按 CLAUDE.md 与现有 CI 约定(没有 Vitest / Jest / ESLint,CI 步骤
`--passWithNoTests`),本次重构不做单元测试,验证全部走 Vite dev server + 浏
览器手动。

### 功能验证清单

| 场景 | 期望 |
|---|---|
| 首次访问 | meta 加载 → 4 个 section 出现 → 第一个日期(明天)+ 第二个时段 + meta.weights[1] + meta.categories[0] 作为默认值 |
| 修改联系信息 | 三字段实时双向绑定到 form |
| 切换月份 | 日期卡刷新;weekOffset 重置为 0 |
| 切换周 | 日期卡滚动 7 天;边界禁用对应按钮 |
| 选择日期 | `.date-card.is-active` 高亮;summary 实时更新 |
| 选择时段 | `.time-slot.is-active` 高亮;summary 实时更新 |
| 重量输入 | 输入数字 → form.weight 自动映射区间;blur 后格式化为一位小数 |
| 重量清空后 blur | 回退到默认显示值 |
| 上传图片 | 选择文件 → 显示文件名 + "重新选择" / "移除" 按钮;移除后清空 input.value |
| 信息确认 summary | 三项指标随上述任意变化实时更新 |
| 提交校验失败 | 校验弹窗显示对应字段名 |
| 提交成功 | 成功弹窗显示 orderId / pickupCode / etaMinutes;"前往服务记录" RouterLink 跳 /orders |
| 提交中 | 提交按钮 disabled + "提交中..." |
| meta 加载失败 | 主区下方显示 "预约配置加载失败，请刷新后重试。" |
| 提交失败 | 主区下方显示 "提交失败，请稍后重试。" |
| 滚动出现动效 | hero / 主区 / 侧栏依序 reveal(由 view 上 `useRevealOnScroll(pageRef)` 驱动) |
| 移动端 ≤ 720px | 两栏变单列、日期卡列数减半、所有 section-head 垂直堆叠 |

### 视觉回归

- 月/周切换按钮 hover 高亮
- 日期卡 / 时段按钮 hover 上抬 1px + `.is-active` 高亮
- 提交按钮 hover 阴影增强
- 校验 / 成功 modal 居中、背景模糊
- 响应式断点三档:`max-width: 1180px` / `860px` / `720px`
- `material-symbols-outlined` 图标字体正常显示

### 完成判定

- `npm run dev` 启动无报错。
- 功能验证清单全部场景通过。
- 视觉无回归。
- 无死代码 / 死 import / 死 CSS。
- view 行数降到 ~150(允许 120-180 浮动)。

## 风险与注意

- **scoped CSS 中的 `.material-symbols-outlined`**:该类原本在 scoped 内,
  scope 迁出后失效。提前 grep 全局 CSS 确认是否已有;若没有,在用到图标的
  组件内用 `:deep(.material-symbols-outlined)` 或单独 scoped 声明。
- **`availableTimeSlots` 初始化时序**:`useAppointmentForm.loadMeta` 默认值
  依赖 `datePicker.appointmentDates` 和 `availableTimeSlots`。必须在 view
  里把这两个传入 composable(`useAppointmentForm({ datePicker, availableTimeSlots })`),
  不能在 composable 内部隐式 import,否则破坏纯函数性。
- **upload 与 form 解耦**:view 在 `handleSubmit` 调用时手动把
  `upload.itemImage.value` 传给 `useAppointmentForm`,**不要**让
  `useAppointmentForm` import `useAppointmentUpload`,否则 composable 之间
  形成隐式依赖。
- **view 仍需派生少量 computed**:`availableTimeSlots` 和 `summaryMetrics`
  是 form / meta 的纯派生,留在 view 比分散到 panel 简单;不要为了"view 不
  做任何派生"而过度拆解。
- **重构期间不要破坏 UX**:确保 `weightInput` ↔ `form.weight` 双向同步
  (`syncWeightRange` 失活会导致 blur 时无法回填),日期默认初始化与原逻辑
  完全一致(`availableDates[1]?.value || availableDates[0]?.value`,
  `availableTimeSlots[1]?.value || availableTimeSlots[0]?.value`)。

## 文件清单

### 新增(15 个)

```
frontend/src/utils/appointmentConstants.js
frontend/src/composables/useAppointmentForm.js
frontend/src/composables/useDatePicker.js
frontend/src/composables/useWeightRange.js
frontend/src/composables/useAppointmentUpload.js
frontend/src/components/client/appointment/AppointmentHeroPanel.vue
frontend/src/components/client/appointment/AppointmentContactSection.vue
frontend/src/components/client/appointment/AppointmentScheduleSection.vue
frontend/src/components/client/appointment/AppointmentItemSection.vue
frontend/src/components/client/appointment/AppointmentConfirmSection.vue
frontend/src/components/client/appointment/AppointmentSubmitBar.vue
frontend/src/components/client/appointment/AppointmentLoadingSkeleton.vue
frontend/src/components/client/appointment/AppointmentAsideCards.vue
frontend/src/components/client/appointment/AppointmentValidationModal.vue
frontend/src/components/client/appointment/AppointmentSuccessModal.vue
```

### 修改(1 个)

```
frontend/src/views/client/AppointmentPage.vue  (1631 → ~150 行)
```