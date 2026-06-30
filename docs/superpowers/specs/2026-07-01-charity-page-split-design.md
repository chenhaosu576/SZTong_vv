# CharityPage 组件拆分设计

**状态**: 待用户审阅
**日期**: 2026-07-01
**分支**: 待开(本次单独立分支,例如 `refactor/charity-page-split`)
**参照**: `AppointmentPage.vue` 在 `2026-06-30` 的拆分风格(commit 8baf71f 合并
前的多次提交)——view 编排 + composable 持有状态 + panel 只渲染。

## 背景与目标

`frontend/src/views/client/CharityPage.vue` 当前 1894 行,模板 / 脚本 / CSS
全部塞在一个文件里,涵盖 hero 区、项目筛选、详情卡、捐赠表单、成功 modal、
四步流程、信任背书七项视觉单元,以及筛选状态机、表单状态、提交流程、
`onMounted` 手工 DOM 事件绑定等多项业务关注点。本次目标是按 appointment 拆
分范式把它拆开,让 view 只做编排、各 section 独立可改。

**不在范围**:UI 视觉调整、动效改写、CSS 视觉回归修复、新增字段、改 mock
API 协议、提交/校验逻辑改动、捐赠表单字段语义调整。

## 总体方案

完全镜像 `AppointmentPage.vue` 拆分风格:

- `components/client/appointment/` → `components/client/charity/`(新建子目录)
- 顶层 7 个 panel + 1 个 modal
- `composables/` 下新增 3 个职责单一的 composable
- `utils/` 下新增 2 个文件:`charityConstants.js`(静态数据 + 枚举)和
  `charityValidation.js`(校验纯函数)

```
frontend/src/components/client/charity/
  CharityHeroPanel.vue            Hero 区(标题 + 副标题 + 两个 CTA + 3 个 feature 条)
  CharityProjectFilters.vue       类目 chips + 区域 select + 紧急度 select + 搜索框
  CharityProjectsGrid.vue         项目卡片列表(空态包含在内)
  CharityProjectCard.vue          单张项目卡(图片 / tag / 进度 / daysLeft / 受益方 / 捐赠按钮)
  CharityDetailPanel.vue          详情左栏(描述 + needs + 物流 三张 detail card)
  CharityDonationForm.vue         详情右栏表单(itemType / itemName / quantity / weight /
                                  condition / logistics / donorName / phone / 提交按钮)
  CharitySuccessModal.vue         提交成功 modal(订单号 + RouterLink + 关闭按钮)
  CharityProcessSection.vue       四步流程
  CharityTrustSection.vue         信任背书(标题 + 承诺文案 + 4 个 feature)

frontend/src/composables/
  useCharityFilters.js            selectedCategory/Region/Urgency/Keyword + filteredProjects
                                  + watch 清理 selectedProject
  useDonationForm.js              donationForm ref + createDefault + resetForm
  useDonationSubmit.js            submitLoading/errorText/submitResult + handleSubmit
                                  + closeSuccessModal

frontend/src/utils/
  charityConstants.js             projects / categories / urgencyOptions / regionOptions
                                  / processSteps / trustFeatures / urgentDaysThreshold
  charityValidation.js            getDonationValidationMessage(form, selectedProject)
```

## 单元职责与不做什么

| 单元 | 职责 | 不做什么 |
|---|---|---|
| `CharityPage.vue` | 编排 composables、传递 props、绑定 events、布局壳(`.charity-page` 容器、各 section 外层 grid、响应式断点、hero 滚动锚点) | 不持有任何业务 ref / computed / 业务函数、不调 API、不做派生计算(除 `onSelectProject` 内的滚动) |
| `useCharityFilters.js` | 持有 4 个筛选 ref + `filteredProjects` computed + `getProjectUrgency(project)` 工具函数;内部 `watch(filteredProjects)` 维护 `selectedProject` 与列表的一致性;暴露 setter 让面板直接调用 | 不持有 `donationForm`、不调 API、不读 `submitResult` |
| `useDonationForm.js` | 持有 `donationForm` ref、`createDefaultDonationForm()` 工厂、`resetForm()`(提交成功后由 submit composable 回调) | 不调 API、不感知选中项目、不持有校验逻辑 |
| `useDonationSubmit.js` | 持有 `submitLoading` / `errorText` / `submitResult` 3 个 ref;`handleSubmit()` 走 `getDonationValidationMessage` → `submitDonationRequest` 流程;`closeSuccessModal()` 清除 `submitResult`;接受外部 `donationForm` / `getSelectedProject` / `onSuccess` 入参 | 不持有筛选状态、不写表单字段默认值、不直接 import `useDonationForm`(通过入参注入) |
| `charityConstants.js` | 集中导出 `projects` / `categories` / `urgencyOptions` / `regionOptions` / `processSteps` / `trustFeatures` / `urgentDaysThreshold`(原 script 顶部的所有静态数据) | 无运行时逻辑 |
| `charityValidation.js` | 导出 `getDonationValidationMessage(donationForm, selectedProject)` 纯函数(原 `validateDonationForm` 逻辑) | 不持有状态、不调 API |
| `CharityHeroPanel.vue` | 渲染 hero banner(`.hero-section` / `.hero-content` / `.hero-text` / `.hero-image` / `.hero-stat`);两个 CTA 按钮用 `@click="$emit(...)"` | 不持有事件处理函数、不做 scrollIntoView |
| `CharityProjectFilters.vue` | 渲染 `.filter-bar`(类目 chips + 区域 select + 紧急度 select + 搜索框);接收 7 个 props,emit 7 个 `update:*` 事件 | 不持有状态、不调 setter |
| `CharityProjectsGrid.vue` | 渲染 `.projects-grid` 卡片列表 + `.projects-empty` 空态;循环 `CharityProjectCard`;emit `select-project` | 不持有项目数据、不持有 selectedProjectId 计算 |
| `CharityProjectCard.vue` | 渲染单张 `.project-card`(图片 / tag / 进度条 / daysLeft / 受益方 / 捐赠按钮);接收 `selected` / `daysLeftText` 派生 prop | 不持有数据、不调 select |
| `CharityDetailPanel.vue` | 渲染 `.detail-section` 左栏三张 detail card(description + needs + logistics);接收 `project` | 不持有状态、不与表单交互 |
| `CharityDonationForm.vue` | 渲染 `.detail-section` 右栏 `.form-card`(itemType/itemName/quantity/weight/condition/logistics/donorName/phone + 错误条 + 提交按钮 + 保存按钮);emit 字段更新 + `submit` | 不持有表单状态、不调 submit |
| `CharitySuccessModal.vue` | 渲染提交成功 modal(订单号 + 跳 `/orders` RouterLink + 关闭按钮 + `<Transition name="fade">`);接收 `show` / `result`;emit `close` | 不持有状态 |
| `CharityProcessSection.vue` | 渲染 `.process-section` 四步流程;接收 `steps` | 无 |
| `CharityTrustSection.vue` | 渲染 `.trust-section` 信任背书;接收 `features` | 无 |

## 数据流与事件契约

组件之间无 `v-model`,所有变化通过 emit 暴露给 page,page 调用 composable
方法或直接赋值。这与 appointment 一致。

### CharityHeroPanel

Props: 无。

Emits:
- `projects-click()`
- `process-click()`

(原 view 用 `onMounted` + `document.querySelector('.hero-actions .hero-btn-primary')`
+ `removeEventListener` 反射式绑定事件。改造后由 panel 模板内 `@click="$emit('projects-click')"`,
view 监听 emit 调 `scrollToSection('charity-projects')`。完全去掉 `onMounted` /
`onBeforeUnmount` / `cleanupHeroActions` 这套反射逻辑。)

### CharityProjectFilters

Props:
- `categories: Array<string>` (required) — 来自 `categories`
- `regionOptions: Array<string>` (required) — 来自 `regionOptions`
- `urgencyOptions: Array<string>` (required) — 来自 `urgencyOptions`
- `selectedCategory: String` (required)
- `selectedRegion: String` (required)
- `selectedUrgency: String` (required)
- `searchKeyword: String` (required)

Emits:
- `update:selected-category(value: string)`
- `update:selected-region(value: string)`
- `update:selected-urgency(value: string)`
- `update:search-keyword(value: string)`

### CharityProjectsGrid

Props:
- `projects: Array` (required) — `filters.filteredProjects.value`
- `selectedProjectId: Number | null` (required) — `filters.selectedProject.value?.id`

Emits:
- `select-project(project)` — view 接到后调 `filters.selectProject(project)`,
  `filters` 内部负责更新 `selectedProject` + 触发 watch 清理逻辑

### CharityProjectCard

Props:
- `project: Object` (required)
- `selected: Boolean` (required) — 用于 `.selected` 类切换和捐赠按钮文案切换
- `daysLeftText: String` (required) — 由 grid 层基于 `getProjectUrgency` 派生
  后传入,避免卡片内部重复调用工具函数

Emits:
- `donate()` — view 接到后从 `event.target` 反查项目 / 直接从循环 `project`
  引用取项目;grid 层建议把 `project` 透传上来(实际推荐在 grid 层
  `@donate="$emit('select-project', project)"`,卡片只关心点击)

> 注:为避免 grid 与 card 之间出现"select-project 与 donate 两个事件指向同一
> 行为"的歧义,grid 内统一收敛:`@donate="$emit('select-project', project)"`。
> 卡片只 emit `donate`,grid 负责把 `project` 一并向上 emit。

### CharityDetailPanel

Props:
- `project: Object` (required)

Emits: 无。

### CharityDonationForm

Props(字段转发风格,与 v-model 兼容):
- `donationForm: Object` (required) — `donationForm.donationForm.value`
- `submitLoading: Boolean` (required)
- `errorText: String` (required,允许空字符串)

Emits(逐字段转发 + 提交):
- `update:donation-form(value: Object)` — 整个对象替换,view 端
  `donationForm.donationForm.value = v`
- `submit()`

实际推荐写法:view 用 `v-model:donation-form` 风格把 8 个子字段直接绑定:
```html
<CharityDonationForm
  :donation-form="donationForm.donationForm.value"
  :submit-loading="submit.submitLoading.value"
  :error-text="submit.errorText.value"
  @update:item-type="(v) => (donationForm.donationForm.value.itemType = v)"
  @update:item-name="(v) => (donationForm.donationForm.value.itemName = v)"
  @update:quantity="(v) => (donationForm.donationForm.value.quantity = v)"
  @update:weight="(v) => (donationForm.donationForm.value.weight = v)"
  @update:condition="(v) => (donationForm.donationForm.value.condition = v)"
  @update:logistics="(v) => (donationForm.donationForm.value.logistics = v)"
  @update:donor-name="(v) => (donationForm.donationForm.value.donorName = v)"
  @update:phone="(v) => (donationForm.donationForm.value.phone = v)"
  @submit="submit.handleSubmit" />
```

(沿用 appointment 的"逐字段 update:事件"风格,无 `v-model`,保持一致性。)

### CharitySuccessModal

Props:
- `show: Boolean` (required) — `!!submit.submitResult.value`
- `result: { message, orderId, syncedToOrders } | null` (required) —
  `submit.submitResult.value`

Emits:
- `close()`

### CharityProcessSection

Props:
- `steps: Array<{ icon, title, desc }>` (required) — `processSteps`

Emits: 无。

### CharityTrustSection

Props:
- `features: Array<{ icon, title, desc }>` (required) — `trustFeatures`

Emits: 无。

### Page 持有的状态

全部为通过 composable 拿到的 ref / 函数,**不在 view 中创建任何额外 ref**:

```js
const filters = useCharityFilters();
const donationForm = useDonationForm();
const submit = useDonationSubmit({
  donationForm: donationForm.donationForm,
  getSelectedProject: () => filters.selectedProject.value,
  onSuccess: donationForm.resetForm,
});
```

view 仅持有 `pageRef`(用于 `useRevealOnScroll`)。`onSelectProject` 是唯一
view 内的协调函数(选中项目 + 滚动到 detail 区),不持有业务状态。

### Composable 耦合

- `useCharityFilters` 完全独立,只依赖 `charityConstants.js` 拿 `urgentDaysThreshold`。
- `useDonationForm` 完全独立。
- `useDonationSubmit` 接受外部 `donationForm` / `getSelectedProject` / `onSuccess` 入参,
  不直接 import `useDonationForm` / `useCharityFilters`,保持纯函数式(参考
  `useAppointmentForm` 接受 `datePicker` / `availableTimeSlots` 的做法)。
- `charityValidation` 是无依赖纯函数。

## 错误处理 / 持久化 / 生命周期

### 错误显示边界

- 校验失败 → `errorText.value = "..."`(由 `getDonationValidationMessage` 返回
  的非空字符串)
- 提交失败 → `errorText.value = "提交失败，请稍后重试。"`
- 提交成功 → `submitResult.value = { message, orderId, syncedToOrders }` +
  `donationForm.resetForm()`

错误条统一由 `CharityDonationForm` 渲染(沿用现状位置:表单顶部)。**不引入
独立 ValidationModal**(与 appointment 拆分后引入 ValidationModal 的行为不
同,这是有意识的差异——当前 charity 体验就是 inline 错误条,不破坏 UX)。

### `selectedProject` 联动 watch

原 view:
```js
watch(filteredProjects, (nextProjects) => {
  if (selectedProject.value && !nextProjects.some((p) => p.id === selectedProject.value.id)) {
    selectedProject.value = null;
    showDonationForm.value = false;
  }
}, { immediate: true });
```

迁移到 `useCharityFilters` 内部,行为完全一致(包括 `immediate: true`)。

### `showDonationForm` 字段

原 `showDonationForm` 实质上等同于"已选项目"——在 `useCharityFilters` 的
`selectProject(project)` 里一并置为 `true`,与 `selectedProject` 同步。view
最终只看 `filters.selectedProject.value` 一个开关。

### 滚动行为

- 选中项目后 100ms 滚到 `donation-detail`:在 view 的 `onSelectProject` 函数
  内 `setTimeout(() => scrollIntoView, 100)`,从 `selectProject` 副作用里剥
  离出来(原代码把滚动放在 `selectProject` 内部,新结构里 view 是唯一能看到
  `donation-detail` DOM 的层)。
- Hero CTA 滚到 `charity-projects` / `charity-process`:view 监听 emit 后调
  `scrollToSection(id)`,panel 不持有滚动逻辑。

### 卸载清理

- view 不再需要 `onMounted` / `onBeforeUnmount` / `cleanupHeroActions`(反射式
  DOM 事件绑定整体移除)。
- 三个 composable 内部均无副作用监听,无需清理。

### 数据持久化

无持久化(沿用现状)。捐赠表单是临时态,提交成功后由 `resetForm()` 清空。

## 样式边界

每个组件自带 scoped CSS,只搬走自身 markup 用到的样式。

**留在 view**(布局 / 容器 / 响应式):
- `.charity-page` 容器(`--hero-cta-*` CSS 变量在 view 声明)
- `.page-width` 类如不在全局,需在 view 或 layout 留定义(沿用现状)
- `.projects-section` / `.section-header` / `.detail-section` 外层 grid
- `@media (max-width: 1024px)` / `768px` 两个断点(影响多 section 的响应式)

**搬入 `CharityHeroPanel`**:`.hero-section` / `.hero-content` / `.hero-text` /
`.hero-badge` / `.hero-title` / `.hero-highlight` / `.hero-desc` /
`.hero-actions` / `.hero-btn*` / `.hero-features` / `.feature-item` /
`.hero-image` / `.image-decoration` / `.hero-img` / `.hero-stat` /
`.stat-icon` / `.stat-number` / `.stat-label`。

**搬入 `CharityProjectFilters`**:`.filter-section` / `.filter-bar` /
`.filter-categories` / `.filter-btn` / `.filter-controls` / `.filter-select` /
`.search-box`。

**搬入 `CharityProjectsGrid`**:`.projects-grid` / `.projects-empty` 容器;
**搬入 `CharityProjectCard`**:`.project-card` / `.project-card:hover` /
`.project-card.selected` / `.project-image` / `.project-tag` /
`.bg-red-600` / `.bg-green-600` / `.project-body` / `.project-location` /
`.project-title` / `.project-urgent` / `.project-progress` / `.progress-info` /
`.progress-numbers` / `.progress-bar` / `.progress-fill` / `.progress-meta` /
`.meta-item` / `.meta-beneficiary` / `.project-actions` / `.btn-donate` /
`.btn-detail`。

**搬入 `CharityDetailPanel`**:`.detail-content` / `.detail-left` /
`.detail-card` / `.detail-card h2` / `.detail-meta` / `.detail-card p` /
`.needs-card` / `.detail-card h4` / `.needs-grid` / `.need-item` /
`.need-dot` / `.need-title` / `.need-desc` / `.logistics-grid` /
`.logistics-title` / `.logistics-desc`。

**搬入 `CharityDonationForm`**:`.detail-right` / `.form-card` /
`.form-card h3` / `.form-notice` / `.notice-title` / `.notice-subtitle` /
`.form-alert` / `.alert-title` / `.alert-text` / `.submit-feedback` /
`.submit-feedback.is-error` / `.submit-feedback-content` /
`.submit-feedback-title` / `.submit-feedback-text` / `.donation-form` /
`.form-group` / `.form-group label` / `.form-group input` /
`.form-group select` / `.form-row` / `.form-group-split` / `.input-suffix` /
`.radio-group` / `.radio-label` / `.radio-label span` /
`.radio-label:has(input:checked)` / `.logistics-options` / `.logistics-btn` /
`.logistics-btn.active` / `.btn-submit` / `.btn-submit:hover` /
`.btn-submit:disabled` / `.btn-save` / `.btn-save:hover`。

**搬入 `CharitySuccessModal`**:`.success-modal-overlay` / `.success-modal` /
`.success-modal-close` / `.success-modal-icon` / `.success-modal-eyebrow` /
`.success-modal-title` / `.success-modal-text` / `.success-modal-actions` /
`.success-modal-link` / `.success-modal-secondary` / `name="fade"` 相关样式
(若有 `<style scoped>` 外的 `@keyframes fade-*`,跟随 modal 一起搬入)。

**搬入 `CharityProcessSection`**:`.process-section` / `.process-title` /
`.process-steps` / `.process-steps::before` / `.process-step` / `.step-icon` /
`.process-step:hover .step-icon` / `.process-step h4` / `.process-step p`。

**搬入 `CharityTrustSection`**:`.trust-section` / `.trust-content` /
`.trust-text` / `.trust-text h2` / `.trust-text p` / `.btn-trust` /
`.btn-trust:hover` / `.trust-features` / `.trust-feature` /
`.trust-feature .material-symbols-outlined` / `.trust-feature h5` /
`.trust-feature p`。

**全局样式**:`.material-symbols-outlined` 字体规则原本在 scoped 内只服务于
`hero-btn` 等图标,scope 迁出后失效。**保留**:全局样式中已存在的
`.material-symbols-outlined` 规则(在 `App.vue` 或全局 CSS 中查找);若不在
全局,各 panel 在 scoped 内用 `:deep(.material-symbols-outlined)` 或单独
scoped 声明。

## 重构配套清理

- **删除 `cleanupHeroActions`**:DOM 反射式事件绑定整体废弃。
- **删除 `handleProjectsClick` / `handleProcessClick`**:由 panel emit 触发
  view 内 inline `() => scrollToSection(...)`,无需命名函数。
- **删除 `selectedCategory = cat` 这种直接赋值模板**:view 改用
  `@update:selected-category="filters.setSelectedCategory"`,模板内不再做赋
  值。
- **删除 `showDonationForm`**:被 `selectedProject` 合并。
- 重构完跑一次 grep:
  - 未被任何 template 引用的 ref / computed
  - 未被任何 selector 引用的 CSS class
  - 未被 import 的模块
  - 未被 export 的常量(常量统一从 `charityConstants.js` 取)

## 验证策略

按 CLAUDE.md 与现有 CI 约定(没有 Vitest / Jest / ESLint,CI 步骤
`--passWithNoTests`),本次重构不做单元测试,验证全部走 Vite dev server + 浏
览器手动。

### 功能验证清单

| 场景 | 期望 |
|---|---|
| 首次访问 | hero 区、9 张项目卡、四步流程、信任背书全部可见 |
| 切换类目 chips | 项目列表实时筛选;`getProjectUrgency` 联动工作 |
| 切换区域 select | 项目列表实时筛选 |
| 切换紧急度 select | 项目列表实时筛选 |
| 输入搜索关键词 | 项目列表实时筛选(标题 / 地点 / 受益方 / 紧急需求匹配) |
| 选中项目被筛选踢出 | `selectedProject` 自动清空,detail + 表单区消失 |
| 点击项目卡 "我要捐赠" | 卡片标 `.selected`,detail + 表单区出现,100ms 后滚到 `donation-detail` |
| 点击项目卡 "详情" | 当前是 `<a href="#">`,无业务行为,沿用 |
| 提交空表单 | 错误条显示对应字段提示(如 "请先选择一个公益项目后再提交。") |
| 提交合法表单 | 提交按钮变 "提交中...";成功后弹 success modal;表单 reset |
| 点 success modal "前往服务记录" | 跳 `/orders` |
| 点 success modal "继续浏览项目" | 关闭 modal,留在页面 |
| 点击 hero "立即捐赠" | 滚到 `charity-projects` |
| 点击 hero "查看项目" | 滚到 `charity-process` |
| 滚动出现动效 | 各 section 依序 reveal(由 view 上 `useRevealOnScroll(pageRef)` 驱动) |
| 移动端 ≤ 1024px | 两栏变单列、process steps 变 2 列、trust features 单列 |
| 移动端 ≤ 768px | 项目网格单列、filter controls 垂直堆叠、process steps 单列 |

### 视觉回归

- hero 按钮 hover 阴影增强 / translateY
- 项目卡 hover translateY(-4px) + 阴影增强、`.selected` 边框高亮
- 项目卡捐赠按钮 hover 翻色
- 进度条宽度绑定 `progress%`
- 物流按钮 active 翻色
- 提交按钮 hover translateY(-2px) + 阴影增强,disabled 状态禁用
- success modal 居中 + 背景模糊
- 响应式断点两档:`max-width: 1024px` / `768px`
- `material-symbols-outlined` 图标字体正常显示

### 完成判定

- `npm run dev` 启动无报错。
- 功能验证清单全部场景通过。
- 视觉无回归。
- 无死代码 / 死 import / 死 CSS。
- view 行数降到 ~200(允许 180-230 浮动)。

## 风险与注意

- **scoped CSS 中的 `.material-symbols-outlined`**:该类原本在 scoped 内,
  scope 迁出后失效。提前 grep 全局 CSS 确认是否已有;若没有,在用到图标的
  组件内用 `:deep(.material-symbols-outlined)` 或单独 scoped 声明。
- **`useDonationSubmit` 与 `useDonationForm` 解耦**:view 在 `useDonationSubmit`
  入参里把 `donationForm.donationForm` 注入;成功后通过 `onSuccess` 回调调
  `donationForm.resetForm()`。**不要**让 `useDonationSubmit` 直接 import
  `useDonationForm`,否则 composable 之间形成隐式依赖,破坏可测性。
- **`getSelectedProject` 用 getter 而非值**:因为 `useDonationSubmit.handleSubmit`
  在用户点提交时才读 `selectedProject`,view 里 `selectedProject` 可能晚于
  `useDonationSubmit` 实例化变化。用 `getSelectedProject: () => filters.selectedProject.value`
  而非 `selectedProject: filters.selectedProject.value`,避免闭包捕获陈旧值。
- **`selectedProject` 的 watch 必须放在 `useCharityFilters` 内部**:`immediate: true`
  在 view 实例化时即触发,若放在 view 层会破坏 composable 的自包含性。
- **`showDonationForm` 字段删除是行为不变的前提**:确保 `selectedProject` 与
  `showDonationForm` 在 `selectProject` 内同步置 `true`,在 watch 清理时同
  步置 `null` / `false`,避免 detail 区显示状态分裂。
- **view 仍需少量协调逻辑**:`onSelectProject`(选中 + 滚动)和 inline
  `() => scrollToSection(...)` 是 view 内的合法存在,不强行抽走。
- **`CharityDonationForm` 字段转发风格**:8 个字段 8 个 `update:*` 事件略冗
  长,但与 appointment 拆分风格一致;不为了"简洁"换成整个 `donationForm`
  对象 `v-model`(那样 panel 会持有 form 对象的完整结构)。
- **重构期间不要破坏 UX**:确保 100ms 滚动延时与原逻辑完全一致;watch 清理
  `selectedProject` 的 `immediate: true` 不能丢;hero CTA 滚动目标不能错。
- **`@import` Material Symbols 字体**:原 view 顶部有
  `@import url("https://fonts.googleapis.com/...")`。如果该字体规则在全局
  CSS 已存在,删除此 import;否则迁入 `CharityHeroPanel` 顶部 `@import`。

## 文件清单

### 新增(13 个)

```
frontend/src/utils/charityConstants.js
frontend/src/utils/charityValidation.js
frontend/src/composables/useCharityFilters.js
frontend/src/composables/useDonationForm.js
frontend/src/composables/useDonationSubmit.js
frontend/src/components/client/charity/CharityHeroPanel.vue
frontend/src/components/client/charity/CharityProjectFilters.vue
frontend/src/components/client/charity/CharityProjectsGrid.vue
frontend/src/components/client/charity/CharityProjectCard.vue
frontend/src/components/client/charity/CharityDetailPanel.vue
frontend/src/components/client/charity/CharityDonationForm.vue
frontend/src/components/client/charity/CharitySuccessModal.vue
frontend/src/components/client/charity/CharityProcessSection.vue
frontend/src/components/client/charity/CharityTrustSection.vue
```

### 修改(1 个)

```
frontend/src/views/client/CharityPage.vue  (1894 → ~200 行)
```