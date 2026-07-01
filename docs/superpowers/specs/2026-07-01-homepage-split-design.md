# HomePage 组件拆分设计

**状态**: 待用户审阅
**日期**: 2026-07-01
**分支**: 待开(本次单独立分支,例如 `refactor/home-page-split`)
**参照**: `CharityPage.vue` 在 `2026-07-01` 的拆分风格(commit c811940 合
并前的多次提交)——view 编排 + composable 持有状态 + panel 只渲染。同时参照
`AppointmentPage.vue` 的拆分经验。`HomePage.vue` 不沿用 `hero-actions` 反
射式 DOM 事件绑定(CharityPage 拆掉的反模式,这里一开始就没用过)。

## 背景与目标

`frontend/src/views/client/HomePage.vue` 当前 1785 行,模板 / 脚本 / CSS
全部塞在一个文件里,涵盖 hero 区、核心功能区(4 张 3D 卡)、品牌使命区、4 张
资讯堆叠卡四项视觉单元,以及首页数据加载、登录态同步、hero 描述打字机、
4 张功能卡 3D 倾斜、资讯堆叠滚动计算、主页级响应式断点等多项业务关注点。
本次目标是把 home page 拆成与 charity page 同构的形态:view 编排、状态/逻
辑进 composable、UI 切 panel。

**不在范围**:UI 视觉调整、动效改写、CSS 视觉回归修复、新增字段、改 mock
API 协议、打字机/滚动堆叠算法改动、3D 倾斜参数改动。

## 总体方案

完全镜像 `CharityPage.vue` 拆分风格:

- `components/client/home/` 子目录(新建),承载 4 个 panel + 1 个 card 子组件
- `composables/` 下新增 5 个职责单一的 composable
- `utils/` 下新增 1 个静态常量文件 `homeNewsConstants.js`
- `utils/homePageContent.js` 删除(整文件已无引用,见"配套清理")
- `HomePage.vue` 自身 1785 → ~80 行,只做编排 + 主页级响应式 + 加载/错误状态

```
frontend/src/components/client/home/
  HomeHeroPanel.vue             Hero 区(渐变标题 + 打字机描述 + 两个 CTA)
  HomeCoreFunctionsPanel.vue    "核心功能"区(左侧 sticky 标题 + 4 张 3D 卡网格)
  FunctionCard.vue              单张 3D 功能卡(icon + 标题 + 描述 + badge + 跳转)
  HomeWhyChoosePanel.vue        "我们的品牌使命"区(4 张 stat + 主图 + Learn more 按钮)
  HomeNewsPanel.vue             资讯堆叠滚动区(4 张堆叠卡)

frontend/src/composables/
  useHomeData.js                loading / loadError / home reactive + loadHome()
  useLoginSync.js               isLoggedIn ref + storage 事件订阅/退订
  useTypewriter.js              text ref + start(text) / stop() + reduced-motion 检测
  useTilt3D.js                  4 张卡片的 3D 倾斜(cardRefs / hoverStates / 事件 handler)
  useScrollStack.js             资讯堆叠滚动 transform 计算 + rAF + will-change 初始化

frontend/src/utils/
  homeNewsConstants.js          NEWS_ITEMS(4 条资讯:badge / date / title / text / icon / to / variant)
```

## 单元职责与不做什么

| 单元 | 职责 | 不做什么 |
|---|---|---|
| `HomePage.vue` | 编排 composables、传递 props、绑定 events、主页级布局(`.home-page` 容器)、加载/错误状态、主页级响应式断点 | 不持有任何业务 ref / computed(除 `pageRef`)、不调 API、不写 transform 字符串、不做滚动监听 |
| `useHomeData.js` | 暴露 `loading` / `loadError` / `home` reactive;`loadHome()` 走 `fetchHomeData()` 并在 finally 块复位 loading | 不感知 typewriter、不持有登录态、不做动画 |
| `useLoginSync.js` | 暴露 `isLoggedIn` ref;`onMounted` 注册 `storage` 事件、`onUnmounted` 退订;事件触发时调用 `getCurrentUser()` 重读 | 不调任何业务 API、不触发视图副作用 |
| `useTypewriter.js` | 暴露 `text` ref + `start(s)` / `stop()`;`prefers-reduced-motion` 为 true 时 `start` 直接置完整文本不启动定时器;接受 `delay` / `startDelay` 配置 | 不感知业务字段、不与具体页面耦合 |
| `useTilt3D.js` | 接受卡片数量 `count`,返回 `cardRefs` / `cardHoverStates` / `setCardRef` / `onMove(event, index)` / `onLeave(index)`;`onMove` 内做 `getBoundingClientRect` + rotateX/Y + scale 计算 | 不持有路由、不感知跳转目标 |
| `useScrollStack.js` | 暴露 `scrollerRef` / `bindScroller()` / `handleScroll()`;`bindScroller` 内 `querySelectorAll('.news-stack-card')` 收集卡片 + 设置 will-change/transform-origin;`handleScroll` 内 `requestAnimationFrame` + transform 计算;`onUnmounted` 清理 `lastTransforms` Map | 不感知卡片内容、不持有跳转目标 |
| `homeNewsConstants.js` | 导出 `NEWS_ITEMS`(4 条资讯)+ `NEWS_TARGETS`(跳转路径数组) | 无运行时逻辑 |
| `HomeHeroPanel.vue` | 渲染 hero section(`.hero-section` / `.hero-content` / `.hero-text` / `.hero-eyebrow` / `.hero-title` / `.hero-description` / `.hero-description-cursor` / `.hero-actions` / `.hero-btn*`);`descriptionText` 由 prop 传入(打字机文本由 view 通过 `useTypewriter` 喂入) | 不启动 typewriter、不持有业务状态、不直接 import `useTypewriter` |
| `HomeCoreFunctionsPanel.vue` | 渲染核心功能 section(`.core-functions-section` / `.core-functions-content` / `.core-functions-left` / `.core-functions-title` / `.core-functions-divider` / `.core-functions-description` / `.core-functions-grid`);`ref="servicesSectionRef"`(暴露给 view 做 scrollIntoView);循环渲染 `FunctionCard` | 不持有 4 张卡的具体数据、不做 3D 倾斜 |
| `FunctionCard.vue` | 渲染 `.function-card` 单卡(`.function-card-glow` / `-inner` / `-icon` / `-content` / `-footer` / `-badge` / `-arrow`);内部使用 `useTilt3D`;props 接收 icon / variant / title / subtitle / description / badge / to | 不持有跳转逻辑(emit `navigate(to)` 给 view);不做路由跳转 |
| `HomeWhyChoosePanel.vue` | 渲染 `.why-choose-section`(`.why-choose-content` / `-header` / `-label` / `-title` / `-btn` / `-grid` / `-stats` / `stat-card` / `stat-icon` / `stat-arrow` / `stat-value` / `stat-description` / `-image` / `-img`) | 不持有 4 个 stat 数据(由 prop 传入) |
| `HomeNewsPanel.vue` | 渲染 `.news-section` + `.news-scroll-container` + 循环 4 张 `.news-stack-card`;内部使用 `useScrollStack`;接受 `items: NewsItem[]` prop,emit `navigate(to)` | 不持有 4 条资讯数据、不做 transform 计算 |

## 数据流与事件契约

组件之间无 `v-model`,所有变化通过 emit 暴露给 page,page 调用 composable
方法或 composable 内部响应式更新(与 charity 一致)。

### HomeHeroPanel

Props:
- `descriptionText: String` (required) — 来自 `useTypewriter().text.value`
- `primaryCtaTo: String` (required,允许字符串字面量) — 来自 `useHomeData().home.value.hero?.primaryCta?.to`,缺失时回落到 `/ai-identify`

Emits:
- `scroll-to-services()` — view 接到后调 `servicesSectionRef.value.scrollIntoView(...)` 并 `setTimeout(focus, 420)`

### HomeCoreFunctionsPanel

Props:
- `cards: Array<{ icon: string, variant: string, title: string, subtitle: string, description: string, badge: string, to: string }>` (required) — view 层从 `home.features` + icon 映射拼装

Emits:
- `navigate(to: string)` — view 接到后调 `router.push(to)`
- `ready(ref: HTMLElement)` — view 接到后赋值给 `servicesSectionRef`(用于"探索功能"CTA 滚到此处并 focus)

### FunctionCard

Props:
- `icon: String` (required) — 图标资源 URL(由 view 层 `import` 后传入)
- `variant: String` (required, enum: `'default' | 'secondary' | 'tertiary' | 'charity'`) — 颜色修饰类后缀
- `title: String` (required)
- `subtitle: String` (required)
- `description: String` (required)
- `badge: String` (required)
- `to: String` (required)

Emits:
- `navigate(to: string)` — view 接到后调 `router.push(to)`;FunctionCard 内部 `handleKeyboardNavigation` 仅识别 Enter/Space 并 emit

FunctionCard 内部使用 `useTilt3D(1)`(单卡实例),在 mount 后通过 `setCardRef`
把自身 ref 注册到 `cardRefs`,事件 handler 接受 `index=0`。

### HomeWhyChoosePanel

Props:
- `stats: Array<{ icon: string, value: string, description: string }>` (required) — 4 条 stat 卡数据
- `imageUrl: String` (required) — 主图 URL(当前硬编码 `tse1.mm.bing.net/...`)
- `imageAlt: String` (required)

Emits:
- `learn-more()` — view 接到后调 `router.push('/science')`

### HomeNewsPanel

Props:
- `items: Array<{ badge: string, date: string, title: string, text: string, icon: string, to: string, variant: string }>` (required) — 来自 `NEWS_ITEMS` 常量

Emits:
- `navigate(to: string)` — view 接到后调 `router.push(to)`

HomeNewsPanel 内部使用 `useScrollStack()`,在 `onMounted` 调
`bindScroller(scrollerRef.value)`,`@scroll="handleScroll"`,卸载时由
`useScrollStack` 自身清理 `lastTransforms`。

### Page 持有的状态

全部为通过 composable 拿到的 ref / 函数,**view 中不创建任何业务 ref**:

```js
const pageRef = ref(null);
useRevealOnScroll(pageRef);

const data = useHomeData();
const login = useLoginSync();
const typewriter = useTypewriter({ delay: 58, startDelay: 320 });

const HERO_DESCRIPTION = "通过高精度AI和有机物流改变城市回收...";
const DEFAULT_HOME_HERO = Object.freeze({ primaryCta: { to: "/ai-identify" } });
const FUNCTION_CARDS = [
  { icon: imagePlusIcon, variant: "default", title: "AI识别", subtitle: "AI Identification", description: "智能识别废弃物类型,精准分类指导", badge: "Precision AI", to: "/ai-identify" },
  { icon: ghostIcon, variant: "secondary", title: "AI助手", subtitle: "Category Inquiry", description: "快速查询物品分类,获取回收建议", badge: "Smart Catalog", to: "/ai-qa" },
  { icon: blocksIcon, variant: "tertiary", title: "预约回收", subtitle: "Book Collection", description: "便捷预约上门回收,省时省力环保", badge: "Scheduled Flow", to: "/recycle-booking" },
  { icon: heartHandshakeIcon, variant: "charity", title: "公益捐赠", subtitle: "Public Welfare", description: "闲置物品捐赠,传递爱心与温暖", badge: "Ethereal Impact", to: "/charity" },
];

const STATS = [
  { icon: "✓", value: "600+", description: "成功落地的城市循环再生项目" },
  { icon: "🌿", value: "1.5万吨", description: "每年通过我们的生态系统处理的回收材料" },
  { icon: "👥", value: "98%", description: "在我们的无缝预约回收流程中的客户满意度" },
  { icon: "📊", value: "AI 优先", description: "自主研发的识别引擎,确保 99.9% 的分类准确率" },
];
const WHY_IMAGE = { url: "https://tse1.mm.bing.net/...", alt: "现代生态办公环境" };

onMounted(() => {
  data.loadHome();
  watch(() => data.home.value?.hero, (hero) => {
    if (hero) typewriter.start(HERO_DESCRIPTION);
  });
});
```

view 模板(精简示意):
```html
<main ref="pageRef" class="home-page" data-reveal>
  <template v-if="data.loading.value">
    <!-- 加载 skeleton,inline 9 行 -->
  </template>
  <template v-else-if="data.home.value?.hero">
    <HomeHeroPanel
      :description-text="typewriter.text.value"
      :primary-cta-to="data.home.value.hero.primaryCta?.to || DEFAULT_HOME_HERO.primaryCta.to"
      @scroll-to-services="scrollToServices"
    />
    <HomeCoreFunctionsPanel
      :cards="FUNCTION_CARDS"
      @navigate="navigateTo"
      @ready="(el) => (servicesSectionRef = el)"
    />
    <HomeWhyChoosePanel
      :stats="STATS"
      :image-url="WHY_IMAGE.url"
      :image-alt="WHY_IMAGE.alt"
      @learn-more="navigateTo('/science')"
    />
    <HomeNewsPanel :items="NEWS_ITEMS" @navigate="navigateTo" />
  </template>
  <p v-if="data.loadError.value" class="state-error">{{ data.loadError.value }}</p>
</main>
```

view 内只保留 3 个 inline 协调函数(均无业务状态):
- `navigateTo(to)` — `router.push(to)`
- `scrollToServices()` — `servicesSectionRef.scrollIntoView` + `setTimeout(focus, 420)`
- `servicesSectionRef` 的接收(`@ready` 回调赋值)

### Composable 耦合

- `useHomeData` 完全独立,只依赖 `mock/clientApi.js` 的 `fetchHomeData`。
- `useLoginSync` 完全独立,只依赖 `utils/auth.js` 的 `getCurrentUser`。
- `useTypewriter` 完全独立(通用组件)。
- `useTilt3D` 完全独立(通用组件)。
- `useScrollStack` 完全独立(通用组件,但 CSS class 选择器 `.news-stack-card`
  是硬编码,因为目前唯一使用者就是 HomeNewsPanel;若将来其他页面复用,
  把它升级为接受 `itemSelector` 参数)。

## 错误处理 / 生命周期

### 错误显示边界

- `fetchHomeData` 抛错 → `useHomeData` catch 内 `loadError.value = "首页数据加载失败，请稍后重试。"`,finally 块 `loading.value = false`
- view `v-if="data.loadError.value"` 渲染 `.state-error` 条(沿用现状的 inline 渲染,不抽组件)
- typewriter / scroll stack / tilt 3D 内部均无错误路径

### 打字机 reduced-motion

`useTypewriter.start(text)`:
```js
if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
  text.value = fullText;
  return;
}
```
直接跳过定时器,文本一次性完整渲染,保留 `aria-label` 与 `aria-hidden` 的屏
读体验。

### 滚动堆叠 rAF 自旋锁

原代码用 `isNewsUpdating` 自旋锁防 `handleScroll` 在 `updateNewsCardTransforms`
执行中被并发触发,`useScrollStack` 完整继承。

### 卸载清理

- `useLoginSync` 内部 `onMounted` 注册、`onUnmounted` 退订 `storage` 事件。
- `useTypewriter` 内部 `onUnmounted` 清 `setTimeout` handle。
- `useScrollStack` 内部 `onUnmounted` 清 `lastTransforms` Map + `cardRefs`。
- view 自身的 `pageRef` 由 `useRevealOnScroll` 内部清理(沿用现状)。

### 数据持久化

无持久化。`isLoggedIn` 跨标签同步靠 `storage` 事件。

## 样式边界

每个组件自带 scoped CSS,只搬走自身 markup 用到的样式。

**留在 view**(布局 / 容器 / 响应式):
- `.home-page` 容器
- 主页级 `@media (max-width: 1180px / 960px / 720px / 380px)` 响应式断点(影响多 section)
- `.state-error` 错误条样式

**搬入 `HomeHeroPanel`**:`.hero-section` / `.hero-content` / `.hero-text` /
`.hero-eyebrow` / `.hero-title` / `.hero-title-gradient` / `.hero-description` /
`.hero-description-cursor` / `@keyframes heroCursorBlink` /
`@media (prefers-reduced-motion: reduce) { .hero-description-cursor }` /
`.hero-actions` / `.hero-btn` / `.hero-btn-primary` / `.hero-btn-secondary`。

**搬入 `HomeCoreFunctionsPanel`**:`.core-functions-section` /
`.core-functions-section:focus` / `.core-functions-content` /
`.core-functions-left` / `.core-functions-title` / `.core-functions-divider` /
`.core-functions-description` / `.core-functions-grid`。

**搬入 `FunctionCard`**:`.function-card` 全套及其变体(`.function-card--secondary`
/ `--tertiary` / `--charity`)、`.function-card-glow` / `-inner` / `-icon` /
`-icon-image` / `-icon--secondary` 等 / `-content` / `-title` / `-subtitle` /
`-description` / `-footer` / `-badge` / `-badge--secondary` 等 / `-arrow` /
`@keyframes glowPulse` / `@keyframes iconGlowPulse` /
`@media (prefers-reduced-motion: reduce) { .function-card ... }`。

**搬入 `HomeWhyChoosePanel`**:`.why-choose-section` / `.why-choose-content` /
`.why-choose-header` / `.why-choose-label` / `.why-choose-title` /
`.why-choose-btn` / `.why-choose-grid` / `.why-choose-stats` / `.stat-card` 全套 /
`.why-choose-image` / `.why-choose-img`。

**搬入 `HomeNewsPanel`**:`.news-section` / `.news-content` / `.news-header` /
`.news-title` / `.news-divider` / `.news-description` / `.news-scroll-container` 全套
(包括 webkit scrollbar 隐藏规则) / `.news-stack-wrapper` /
`.news-stack-card` 全套及其 4 种 variant / `.news-stack-card-inner` /
`.news-stack-card-header` / `.news-stack-badge` 全套 4 种 variant /
`.news-stack-date` / `.news-stack-card-title` / `.news-stack-card-text` /
`.news-stack-card-footer` / `.news-stack-icon` / `.news-stack-arrow` /
`.news-stack-spacer` /
`@media (prefers-reduced-motion: reduce) { .news-scroll-container / .news-stack-card }`。

## 重构配套清理

- **删除 `impactPanel` computed + `getImpactPanelContent` 导入**:`utils/homePageContent.js`
  整文件无引用(grep 验证),`HomePage.vue` 内的 `const impactPanel = computed(...)`
  也未在模板内使用,纯死代码。删除 `import { ..., getImpactPanelContent } from "../../utils/homePageContent"`
  + 删 `import { HOME_SECTION_IDS, getImpactPanelContent }` 中后半段。
- **删除 `homePageContent.js`** 整个文件。
- **删除重复响应式断点**:原文件 1583-1708 与 1687-1775 是几乎完全重复的两份
  `@media` 块(后半段 `.state-error` 也有重复)。新结构里只保留一份,放在
  HomePage.vue 内。
- **删除 `.section-title-center` / `.section-description-center`**:未在任何
  markup 中引用,死样式。
- **`HOME_SECTION_IDS` 保留**:`HomeCoreFunctionsPanel` 的 `:id` 绑定仍在用,
  迁到 panel 内(panel 接 `sectionId` prop 或直接 `import HOME_SECTION_IDS`)。
  决策:直接 `import HOME_SECTION_IDS`,避免新增一层 prop 转发。
- **`DEFAULT_HOME_HERO` 保留**:view 层 fallback 用,迁到 view 内 inline。
- **`HERO_DESCRIPTION` 保留**:view 层传给 typewriter。
- **`newsTargets` 数组**:`charityConstants.js` 不直接对应,这里改为
  `homeNewsConstants.js` 内 `NEWS_ITEMS[i].to`,不再需要单独的 `newsTargets`。
- **`TYPEWRITER_DELAY` / `TYPEWRITER_START_DELAY`**:迁入 `useTypewriter` 调用
  处的 `options`,即 `useTypewriter({ delay: 58, startDelay: 320 })`。
- **`isNewsUpdating` 自旋锁**:迁入 `useScrollStack`。
- **`lastNewsTransforms` / `newsCardsRef`**:迁入 `useScrollStack`,不再暴露。
- **`cardRefs` / `cardHoverStates` / `handleCardMouseMove` / `handleCardMouseLeave`
  / `setCardRef`**:迁入 `useTilt3D`,由 FunctionCard 内部使用。
- **`newsListRef` / `newsTargets` / `focusNewsItem` / `navigateNews` / `activeNewsIndex`**:
  原代码定义但**未在模板中使用**(grep 验证),死代码,直接删。
- **`DEFAULT_HOME_HERO` 内 `Object.freeze`**:保留。
- 重构完跑一次 grep:
  - 未被任何 template 引用的 ref / computed
  - 未被任何 selector 引用的 CSS class
  - 未被 import 的模块
  - 未被 export 的常量
  - 未被引用的 `HOME_SECTION_IDS` / `getImpactPanelContent`

## 验证策略

按 CLAUDE.md 与现有 CI 约定(没有 Vitest / Jest / ESLint,CI 步骤
`--passWithNoTests`),本次重构不做单元测试,验证全部走 Vite dev server + 浏
览器手动。

### 功能验证清单

| 场景 | 期望 |
|---|---|
| 首次访问 | loading skeleton 出现并被替换为完整首页;hero、4 张功能卡、品牌使命、4 张资讯卡全部可见 |
| Hero 打字机 | hero 描述逐字出现(58ms / 字),结束后光标停止闪烁;prefers-reduced-motion 时直接显示完整文本 |
| Hero CTA "立即预约回收" | 跳 `/ai-identify`(或 `home.hero.primaryCta.to` 值) |
| Hero CTA "探索功能" | 平滑滚到核心功能区,420ms 后 focus 到 section |
| 4 张功能卡 hover | 3D 倾斜 transform 应用,hover scale 1.05 |
| 4 张功能卡 click | 跳对应路由(AI识别→/ai-identify 等) |
| 4 张功能卡 Enter/Space | 跳对应路由 |
| 品牌使命 4 张 stat | 静态展示;hover translateY(-4px) + 阴影 |
| 品牌使命 "了解更多" | 跳 `/science` |
| 主图 hover | 图片 scale(1.05) |
| 4 张资讯卡滚动 | 堆叠 transform 计算:translate3d + scale 渐变;pin 到 stack position |
| 4 张资讯卡 click | 跳对应路由(/ai-identify / /upcycle / /profile / /science) |
| 4 张资讯卡 Enter/Space | 跳对应路由 |
| 浏览器多标签登录/登出 | storage 事件触发,`isLoggedIn` 同步 |
| 模拟 fetchHomeData 失败 | 显示 `.state-error` 红条 + 中文提示 |
| reveal 动画 | 各 section 依序 reveal(由 view 上 `useRevealOnScroll(pageRef)` 驱动) |

### 响应式断点验证

| 断点 | 期望 |
|---|---|
| ≤ 1180px | 核心功能两栏变单列,左侧 sticky 失效;品牌使命 grid 单列,stats 顺序 2、image 顺序 1 |
| ≤ 960px | 4 张功能卡变单列;品牌使命 header 垂直堆叠 |
| ≤ 720px | Hero padding 缩小、actions 垂直堆叠、字号降级;3 个 section padding 缩小;stats 单列;news header 垂直堆叠;news-scroll-container height=500px;news-stack-card-inner padding=32px;title/text 字号降级 |
| ≤ 380px | hero-title 字号 1.65rem;news-stack-card-inner padding=24px |

(只在 view 留**一份**响应式断点块,panels 自身不写响应式 — 沿用现状,目前
原文件里 panels 也不写响应式。)

### 视觉回归

- hero 渐变文字(forest-700 → moss-500)
- 功能卡 4 种颜色变体的 hover 效果(标题变色 + translateX(4px)、badge 翻色 + translateY(-2px)、icon translateY(-8px) scale(1.1))
- 资讯卡 4 种 variant 的 hover 标题变色一致
- 滚动堆叠的 translate3d + scale 计算结果与原代码完全一致(`Math.round(translateY * 100) / 100`、`Math.round(scale * 1000) / 1000`、change threshold 0.1 / 0.001)
- 3D 倾斜的 `perspective(1000px) rotateX(${y}deg) rotateY(${x}deg) scale(${isHovered ? 1.05 : 1})` 字符串拼装一致

### 完成判定

- `npm run dev` 启动无报错。
- 功能验证清单全部场景通过。
- 响应式 4 个断点正确。
- 视觉无回归(对比拆分前后截图)。
- 无死代码 / 死 import / 死 CSS / 死 export。
- view 行数降到 ~80(允许 60-120 浮动,因 `FUNCTION_CARDS` / `STATS` 常量也放 view 内)。
- `homePageContent.js` 已删除。

## 风险与注意

- **`useScrollStack` 的 `news-stack-card` 选择器硬编码**:目前唯一使用者是
  HomeNewsPanel,可接受。复用面扩大时升级为 `useScrollStack({ itemSelector })`
  入参。
- **`useTilt3D` 的 `count` 参数**:目前 HomeCoreFunctionsPanel 用 4 张卡,
  FunctionCard 自身用 `useTilt3D(1)`。两种 count 都合法,但 panel 层循环
  4 张 FunctionCard 时,每张 FunctionCard 各自实例化 `useTilt3D(1)`(4 个独立
  实例) — 而不是 panel 层 `useTilt3D(4)` 然后 props 传 index。理由:
  FunctionCard 是自包含组件,自管自己的 hover 状态符合封装原则;4 张卡独立
  hover 互不干扰。
- **`FunctionCard` 的 `icon` 是 URL 而非组件**:当前 home 里 4 张卡的 icon
  是 PNG import(`blocks.png` / `ghost.png` / `heart-handshake.png` /
  `image-plus.png`),FunctionCard 接收 string URL,在 template 里 `<img :src="icon">`。
  view 层负责 `import iconUrl from "../../assets/..."` 并塞进 `FUNCTION_CARDS`。
- **`watch(home.hero)` 触发打字机**:useHomeData 的 `home` 是 reactive 对象,
  watch 内需 `() => data.home.value?.hero`(或 useHomeData 暴露 reactive,
  watch 选择 `() => data.home.hero`)。决策:useHomeData 暴露 `home` 为
  reactive,view 里写 `watch(() => data.home.hero, (hero) => {...})`。
- **`@ready` 事件传递 ref**:HomeCoreFunctionsPanel 通过 emit `ready(ref)`
  把 `servicesSectionRef` 暴露给 view。view 用 `(el) => (servicesSectionRef = el)`
  接收后用于"探索功能"CTA 的 scrollIntoView + focus。
- **响应式断点**:原文件里 `@media (max-width: 720px)` 块在 1750 行附近
  提到 `news-scroll-container { height: 500px }` / `news-stack-card-inner
  { padding: 32px }` 等。这些 style 是 news 段专属响应式,应**搬入
  HomeNewsPanel**(跟随 markup 走),不留在 view 的主页级断点里。
- **`news-stack-card` 的点击 + 键盘导航**:原代码 4 张卡分别绑定
  `@click="navigateTo(newsTargets[i])"` + `@keydown="handleKeyboardNavigation(...)"`
  且 `handleKeyboardNavigation` 接受 `(event, to)`。新结构里 panel 内部统一
  emit `navigate(to)`(FunctionCard 同款契约),view 接到后 `router.push(to)`。
- **`function-card` 的 3D 倾斜 + variant CSS**:`.function-card--secondary`
  影响 `.icon-glow` 颜色、`.function-card-icon--secondary` 渐变背景、
  `.function-card-badge--secondary` 颜色与 hover box-shadow 等多个修饰。
  FunctionCard 接收 `variant` prop 拼出类名后缀,模板内只写一个
  `:class="['function-card', variant !== 'default' ? `function-card--${variant}` : null]"`,
  所有 `.function-card--*` 选择器跟随搬入。
- **`prefers-reduced-motion`**:`@media (prefers-reduced-motion: reduce)`
  在原文件出现 3 处(hero-description-cursor / function-card / news-scroll-container
  / news-stack-card),分别跟随各自 panel 搬入。
- **view 内的 `HERO_DESCRIPTION` 字面量**:保留在 view 内 inline(与其他常量
  `STATS` / `WHY_IMAGE` / `FUNCTION_CARDS` 同处理),不单独抽文件。理由:
  这 4 个常量都是 home page 私有,不跨页面复用,view 内 inline 与
  CharityPage 的 `projects / categories / urgencyOptions / regionOptions /
  processSteps / trustFeatures` 抽到 `charityConstants.js` 的策略不同 — 因
  为这些常量被多个 composable / 模板引用,而 home 这 4 个只被 view 自己用。

## 文件清单

### 新增(11 个)

```
frontend/src/utils/homeNewsConstants.js
frontend/src/composables/useHomeData.js
frontend/src/composables/useLoginSync.js
frontend/src/composables/useTypewriter.js
frontend/src/composables/useTilt3D.js
frontend/src/composables/useScrollStack.js
frontend/src/components/client/home/HomeHeroPanel.vue
frontend/src/components/client/home/HomeCoreFunctionsPanel.vue
frontend/src/components/client/home/FunctionCard.vue
frontend/src/components/client/home/HomeWhyChoosePanel.vue
frontend/src/components/client/home/HomeNewsPanel.vue
```

### 修改(1 个)

```
frontend/src/views/client/HomePage.vue  (1785 → ~80 行)
```

### 删除(1 个)

```
frontend/src/utils/homePageContent.js
```