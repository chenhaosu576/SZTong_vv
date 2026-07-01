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
资讯堆叠卡四项视觉单元,以及首页数据加载、hero 描述打字机、4 张功能卡 3D
倾斜、资讯堆叠滚动计算、主页级响应式断点等多项业务关注点。本次目标是
把 home page 拆成与 charity page 同构的形态:view 编排、状态/逻辑进
composable、UI 切 panel。

**不在范围**:UI 视觉调整、动效改写、CSS 视觉回归修复、新增字段、改 mock
API 协议、打字机/滚动堆叠算法改动、3D 倾斜参数改动。

## 总体方案

镜像 `CharityPage.vue` 拆分风格,但只抽**跨页面可复用**或**显著隔离**的
单元,避免 YAGNI:

- `components/client/home/` 子目录(新建),承载 4 个 panel
- `composables/` 下新增 2 个通用 composable(`useTypewriter` / `useTilt3D`)
- 单页面内的数据 / 状态 / 逻辑 inline 进 HomePage 或所属 panel
- `utils/homePageContent.js` 删除(整文件已无引用,见"配套清理")
- `HomePage.vue` 自身 1785 → ~110 行(比纯编排厚一些,因承担了首页数
  据加载、4 条资讯数据、4 张功能卡定义、主页级响应式断点)

```
frontend/src/components/client/home/
  HomeHeroPanel.vue              Hero 区(渐变标题 + 打字机描述 + 两个 CTA)
  HomeCoreFunctionsPanel.vue     "核心功能"区:左侧 sticky 标题 + 4 张 3D 卡(直接渲染,无 FunctionCard 子组件)
  HomeWhyChoosePanel.vue         "我们的品牌使命"区(4 张 stat + 主图 + Learn more 按钮)
  HomeNewsPanel.vue              资讯堆叠滚动区:scroller/transform/rAF 逻辑全在 panel 内

frontend/src/composables/
  useTypewriter.js               通用打字机:text ref + start(text) / stop() + reduced-motion 检测
  useTilt3D.js                   通用 3D 倾斜:cardRefs / hoverStates / setCardRef / onMove / onLeave

(以下不进新文件,inline 进 HomePage:)
  - 首页 fetchHomeData 调用 + loading / loadError / home 状态管理
  - 4 条 NEWS_ITEMS 数据(原 homeNewsConstants.js)
  - 4 张 FUNCTION_CARDS 配置数据
  - 4 条 STATS 数据 + WHY_IMAGE 常量
  - HERO_DESCRIPTION 文案 + DEFAULT_HOME_HERO fallback
```

> **取舍说明**:只抽真正可复用或值得隔离的单元。`useHomeData` 只服务 HomePage
> 一个消费者,抽出来没有跨页复用价值;`FunctionCard` 只在 HomeCoreFunctionsPanel
> 内被循环用,作为子组件抽出来反而多一层 emit/prop 转发;`useScrollStack` 的
> 选择器 `.news-stack-card` 是 hardcoded,跨页复用价值低;`homeNewsConstants`
> 只被 HomeNewsPanel 单消费。`useTypewriter` / `useTilt3D` 是纯通用组件,其他
> 页面将来可能复用,因此保留为独立 composable。

## 单元职责与不做什么

| 单元 | 职责 | 不做什么 |
|---|---|---|
| `HomePage.vue` | 编排 composables、传递 props、绑定 events、主页级布局(`.home-page` 容器)、加载/错误状态、主页级响应式断点;管理 `loading` / `loadError` / `home` 状态;持有 `NEWS_ITEMS` / `FUNCTION_CARDS` / `STATS` / `WHY_IMAGE` 等私有常量 | 不持有任何业务 ref(除 `pageRef` / `servicesSectionRef`)、不写 transform 字符串、不做滚动监听 |
| `useTypewriter.js` | 暴露 `text` ref + `start(s)` / `stop()`;`prefers-reduced-motion` 为 true 时 `start` 直接置完整文本不启动定时器;接受 `delay` / `startDelay` 配置 | 不感知业务字段、不与具体页面耦合 |
| `useTilt3D.js` | 接受卡片数量 `count`,返回 `cardRefs` / `cardHoverStates` / `setCardRef` / `onMove(event, index)` / `onLeave(index)`;`onMove` 内做 `getBoundingClientRect` + rotateX/Y + scale 计算 | 不持有路由、不感知跳转目标 |
| `HomeHeroPanel.vue` | 渲染 hero section(`.hero-section` / `.hero-content` / `.hero-text` / `.hero-eyebrow` / `.hero-title` / `.hero-description` / `.hero-description-cursor` / `.hero-actions` / `.hero-btn*`);`descriptionText` 由 prop 传入(打字机文本由 view 通过 `useTypewriter` 喂入) | 不启动 typewriter、不持有业务状态、不直接 import `useTypewriter` |
| `HomeCoreFunctionsPanel.vue` | 渲染核心功能 section(`.core-functions-section` / `.core-functions-content` / `.core-functions-left` / `.core-functions-title` / `.core-functions-divider` / `.core-functions-description` / `.core-functions-grid` + 4 张 `.function-card` 直接写在 panel 模板内);`ref="servicesSectionRef"`(暴露给 view 做 scrollIntoView);**panel 内部**用 `useTilt3D(cards.length)` 管 4 张卡的 3D 倾斜 | 不持有 4 张卡的具体配置数据(由 view 通过 `cards` prop 传入);不做路由跳转(emit `navigate(to)`) |
| `HomeWhyChoosePanel.vue` | 渲染 `.why-choose-section`(`.why-choose-content` / `-header` / `-label` / `-title` / `-btn` / `-grid` / `-stats` / `stat-card` / `stat-icon` / `stat-arrow` / `stat-value` / `stat-description` / `-image` / `-img`) | 不持有 4 个 stat 数据(由 prop 传入) |
| `HomeNewsPanel.vue` | 渲染 `.news-section` + `.news-scroll-container` + 循环 4 张 `.news-stack-card`;**panel 内部**实现 scrollerRef + `bindScroller`(设 will-change/transform-origin)+ `handleScroll`(rAF + transform 计算);管理 `lastNewsTransforms` Map + `isNewsUpdating` 自旋锁;接受 `items: NewsItem[]` prop,emit `navigate(to)` | 不持有 4 条资讯数据(由 prop 传入) |

## 数据流与事件契约

组件之间无 `v-model`,所有变化通过 emit 暴露给 page,page 调用 composable
方法或 composable 内部响应式更新(与 charity 一致)。

### HomeHeroPanel

Props:
- `descriptionText: String` (required) — 来自 `useTypewriter().text.value`
- `primaryCtaTo: String` (required,允许字符串字面量) — 来自 `home.hero?.primaryCta?.to`,缺失时回落到 `/ai-identify`

Emits:
- `scroll-to-services()` — view 接到后调 `servicesSectionRef.value.scrollIntoView(...)` 并 `setTimeout(focus, 420)`

### HomeCoreFunctionsPanel

Props:
- `cards: Array<{ icon: string, variant: string, title: string, subtitle: string, description: string, badge: string, to: string }>` (required) — view 层持有 `FUNCTION_CARDS` 常量传入

Emits:
- `navigate(to: string)` — view 接到后调 `router.push(to)`;panel 内 4 张卡的 `@click` / `@keydown` 都通过 emit `navigate(to)` 暴露
- `ready(ref: HTMLElement)` — view 接到后赋值给 `servicesSectionRef`(用于"探索功能"CTA 滚到此处并 focus)

Panel 内部使用 `useTilt3D(cards.length)`,在 `onMounted` 通过 `:ref="el => setCardRef(el, i)"`
把 4 张 function-card 的 DOM 注册到 `cardRefs`;`@mousemove="onMove($event, i)"` +
`@mouseleave="onLeave(i)"` 由 panel 模板直接绑定。Panel 内另有一个
`handleKeyboardNavigation(event, to)` 普通函数(非 composable),识别 Enter/Space
并 emit `navigate`。

### HomeWhyChoosePanel

Props:
- `stats: Array<{ icon: string, value: string, description: string }>` (required) — 4 条 stat 卡数据
- `imageUrl: String` (required) — 主图 URL(当前硬编码 `tse1.mm.bing.net/...`)
- `imageAlt: String` (required)

Emits:
- `learn-more()` — view 接到后调 `router.push('/science')`

### HomeNewsPanel

Props:
- `items: Array<{ badge: string, date: string, title: string, text: string, icon: string, to: string, variant: string }>` (required) — 来自 view 层持有的 `NEWS_ITEMS` 常量

Emits:
- `navigate(to: string)` — view 接到后调 `router.push(to)`

Panel 内部维护:
- `scrollerRef` 引用 `.news-scroll-container`
- `newsCardsRef` 4 张卡片的 DOM 引用数组
- `lastNewsTransforms` Map,key 为卡片 index,value 为最近一次 `{ translateY, scale }`
- `isNewsUpdating` 自旋锁 boolean
- `onMounted` 调用 `bindScroller(scrollerRef.value)`:`querySelectorAll('.news-stack-card')` 收集 + 设置 will-change / transform-origin / backface-visibility + 首次 `updateNewsCardTransforms()`
- `@scroll="handleNewsScroll"` → 内 `requestAnimationFrame(updateNewsCardTransforms)`
- `onUnmounted` 清 `lastNewsTransforms` Map + `newsCardsRef` 数组

### Page 持有的状态

view 持有少量状态 + 私有数据常量:

```js
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import { useTypewriter } from "@/composables/useTypewriter";
import { fetchHomeData } from "@/mock/clientApi";

import HomeHeroPanel from "@/components/client/home/HomeHeroPanel.vue";
import HomeCoreFunctionsPanel from "@/components/client/home/HomeCoreFunctionsPanel.vue";
import HomeWhyChoosePanel from "@/components/client/home/HomeWhyChoosePanel.vue";
import HomeNewsPanel from "@/components/client/home/HomeNewsPanel.vue";

import blocksIcon from "@/assets/blocks.png";
import ghostIcon from "@/assets/ghost.png";
import heartHandshakeIcon from "@/assets/heart-handshake.png";
import imagePlusIcon from "@/assets/image-plus.png";

const pageRef = ref(null);
const servicesSectionRef = ref(null);
useRevealOnScroll(pageRef);
const router = useRouter();

// 首页数据状态(inline,原 useHomeData 职责)
const loading = ref(true);
const loadError = ref("");
const home = ref(null);

async function loadHome() {
  loading.value = true;
  loadError.value = "";
  try {
    const data = await fetchHomeData();
    home.value = data;
  } catch {
    loadError.value = "首页数据加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

// 打字机
const typewriter = useTypewriter({ delay: 58, startDelay: 320 });
const HERO_DESCRIPTION =
  "通过高精度AI和有机物流改变城市回收。我们不仅仅是处理废弃物；我们打造一个可持续发展与精致相遇的生态系统。";
const DEFAULT_HOME_HERO = Object.freeze({ primaryCta: { to: "/ai-identify" } });

// 私有数据常量
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
const NEWS_ITEMS = [
  { badge: "系统公告", date: "2025.03.18", title: "收智通全新升级,已上线ai大模型", text: "全新 UI 设计,更强大的 Qwen2.5 AI 识别引擎以及社区功能全面升级,带来更流畅的绿色生活体验。", icon: "🔬", to: "/ai-identify", variant: "system" },
  { badge: "活动", date: "2025.03.15", title: "AI 驱动灵感,定义你的绿色坐标", text: "提交废品,即刻开启 AI 协作模式。探索智能回收的无限可能,让每一次分类都成为环保创新的起点。", icon: "🌱", to: "/upcycle", variant: "community" },
  { badge: "签到", date: "2025.03.12", title: "本周你用了多少次收智通呢", text: "查看个人中心是否获得了新的成就或奖励。持续参与,解锁更多环保勋章,见证你的绿色足迹。", icon: "⭐", to: "/profile", variant: "checkin" },
  { badge: "环保知识", date: "2025.03.10", title: "如何正确进行垃圾分类?AI 助手来教你", text: "详细解析各类垃圾的分类标准与回收利用价值,让环保成为日常习惯。从源头做起,共建可持续未来。", icon: "📚", to: "/science", variant: "knowledge" },
];

// 协调函数
function navigateTo(to) {
  if (!to) return;
  router.push(to);
}
function scrollToServices() {
  const node = servicesSectionRef.value;
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => node.focus({ preventScroll: true }), 420);
}

onMounted(() => {
  loadHome();
  watch(() => home.value?.hero, (hero) => {
    if (hero) typewriter.start(HERO_DESCRIPTION);
  });
});
```

view 模板(精简示意,ref 在 template 内自动解包):
```html
<main ref="pageRef" class="home-page" data-reveal>
  <template v-if="loading">
    <!-- 加载 skeleton,inline 9 行 -->
  </template>
  <template v-else-if="home && home.hero">
    <HomeHeroPanel
      :description-text="typewriter.text"
      :primary-cta-to="home.hero.primaryCta?.to || DEFAULT_HOME_HERO.primaryCta.to"
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
  <p v-if="loadError" class="state-error">{{ loadError }}</p>
</main>
```

### Composable 耦合

- `useTypewriter` 完全独立(通用组件)。
- `useTilt3D` 完全独立(通用组件)。

两个 composable 都不依赖 `vue-router` / `mock/clientApi` / `utils/*`,跨页面
可直接 import 复用。

## 错误处理 / 生命周期

### 错误显示边界

- `fetchHomeData` 抛错 → view 内 `catch` 块 `loadError.value = "首页数据加载失败，请稍后重试。"`,`finally` 块复位 `loading.value = false`
- view `v-if="loadError"` 渲染 `.state-error` 条(沿用现状的 inline 渲染,不抽组件)
- typewriter / tilt 3D 内部均无错误路径;scroll stack 在 HomeNewsPanel 内,同样无错误路径

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

HomeNewsPanel 内部沿用原 `isNewsUpdating` 自旋锁防 `handleNewsScroll` 在
`updateNewsCardTransforms` 执行中被并发触发。

### 卸载清理

- `useTypewriter` 内部 `onUnmounted` 清 `setTimeout` handle。
- HomeNewsPanel 自身 `onUnmounted` 清 `lastNewsTransforms` Map + `newsCardsRef` 数组。
- view 自身的 `pageRef` 由 `useRevealOnScroll` 内部清理(沿用现状)。

### 数据持久化

无持久化。

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
`.core-functions-description` / `.core-functions-grid` / `.function-card` 全套
及其变体(`.function-card--secondary` / `--tertiary` / `--charity`)、所有
`.function-card-glow` / `-inner` / `-icon` / `-icon-image` / `-icon--secondary` 等 /
`-content` / `-title` / `-subtitle` / `-description` / `-footer` / `-badge` /
`-badge--secondary` 等 / `-arrow` / `@keyframes glowPulse` /
`@keyframes iconGlowPulse` /
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
`@media (max-width: 720px) { .news-scroll-container / .news-stack-card-inner / ... }` /
`@media (prefers-reduced-motion: reduce) { .news-scroll-container / .news-stack-card }`。

## 重构配套清理

- **删除 `impactPanel` computed + `getImpactPanelContent` 导入**:`utils/homePageContent.js`
  整文件无引用(grep 验证),`HomePage.vue` 内的 `const impactPanel = computed(...)`
  也未在模板内使用,纯死代码。删除 `import { ..., getImpactPanelContent } from "../../utils/homePageContent"`
  + 删 `import { HOME_SECTION_IDS, getImpactPanelContent }` 中后半段。
- **删除 `homePageContent.js`** 整个文件。`HOME_SECTION_IDS.services`(值 `"home-services"`)
  改为 `HomeCoreFunctionsPanel` 内的局部 `const SERVICES_SECTION_ID = "home-services"`,
  panel 模板 `:id="SERVICES_SECTION_ID"`。
- **删除重复响应式断点**:原文件 1583-1708 与 1687-1775 是几乎完全重复的两份
  `@media` 块(后半段 `.state-error` 也有重复)。新结构里只保留一份,放在
  HomePage.vue 内。
- **删除 `.section-title-center` / `.section-description-center`**:未在任何
  markup 中引用,死样式。
- **`DEFAULT_HOME_HERO` 保留**:view 层 fallback 用,迁到 view 内 inline。
- **`HERO_DESCRIPTION` 保留**:view 层传给 typewriter。
- **`newsTargets` 数组**:已合并进 `NEWS_ITEMS[i].to`,不再需要单独的 `newsTargets`。
- **`TYPEWRITER_DELAY` / `TYPEWRITER_START_DELAY`**:迁入 `useTypewriter` 调用
  处的 `options`,即 `useTypewriter({ delay: 58, startDelay: 320 })`。
- **`isNewsUpdating` 自旋锁**:迁入 `HomeNewsPanel` 内部(原 useScrollStack 已被吃掉)。
- **`lastNewsTransforms` / `newsCardsRef`**:迁入 `HomeNewsPanel` 内部。
- **`cardRefs` / `cardHoverStates` / `handleCardMouseMove` / `handleCardMouseLeave`
  / `setCardRef`**:迁入 `useTilt3D`,由 `HomeCoreFunctionsPanel` 内部使用。
- **`newsListRef` / `focusNewsItem` / `navigateNews` / `activeNewsIndex`**:
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
- view 行数降到 ~110(允许 80-140 浮动,因持有 4 个私有数据常量)。
- `homePageContent.js` 已删除。

## 风险与注意

- **HomeNewsPanel 滚动堆叠选择器 hardcoded**:`'.news-stack-card'` 直接写在
  panel 模板 + 内部 `querySelectorAll`。当前唯一使用者是 HomeNewsPanel 本
  身,可接受。如需跨页复用,升级为接受 `itemSelector` 入参。
- **HomeCoreFunctionsPanel 内 `useTilt3D(cards.length)`**:`count` 跟 props 走,
  保证 cardHoverStates 长度与 cards 长度一致。`onMove` / `onLeave` 的 index
  来自 panel 模板 `v-for` 的 `i`。
- **`@ready` 事件传递 ref**:HomeCoreFunctionsPanel 通过 emit `ready(ref)`
  把 `servicesSectionRef` 暴露给 view。view 用 `(el) => (servicesSectionRef = el)`
  接收后用于"探索功能"CTA 的 scrollIntoView + focus。
- **响应式断点**:原文件里 `@media (max-width: 720px)` 块在 1750 行附近
  提到 `news-scroll-container { height: 500px }` / `news-stack-card-inner
  { padding: 32px }` 等。这些 style 是 news 段专属响应式,应**搬入
  HomeNewsPanel**(跟随 markup 走),不留在 view 的主页级断点里。
- **`function-card` 的 3D 倾斜 + variant CSS**:`.function-card--secondary`
  影响 `.icon-glow` 颜色、`.function-card-icon--secondary` 渐变背景、
  `.function-card-badge--secondary` 颜色与 hover box-shadow 等多个修饰。
  panel 内 4 张卡的 class 拼装:`['function-card', card.variant !== 'default' ? `function-card--${card.variant}` : null]`。
- **`prefers-reduced-motion`**:`@media (prefers-reduced-motion: reduce)`
  在原文件出现 3 处(hero-description-cursor / function-card / news-scroll-container
  / news-stack-card),分别跟随各自 panel 搬入。
- **view 内的数据常量**:`FUNCTION_CARDS` / `STATS` / `WHY_IMAGE` / `NEWS_ITEMS`
  / `HERO_DESCRIPTION` / `DEFAULT_HOME_HERO` 都保留在 view 内 inline。这
  些都是 home page 私有,不跨页面复用。view 内 inline 与 CharityPage 的
  `projects / categories / ...` 抽到 `charityConstants.js` 的策略不同 — 因
  为 home 的常量只被 view 自己用,慈善页的常量被多个 composable / 模板引用。
- **view 行数估算**:~110 行 = 30 行 import + 30 行数据常量 + 25 行 setup +
  5 行 onMounted + 20 行 template。`composables/` 节省的 4 个文件 vs view
  增厚 ~30 行,总代码量净减少。

## 文件清单

### 新增(6 个)

```
frontend/src/composables/useTypewriter.js
frontend/src/composables/useTilt3D.js
frontend/src/components/client/home/HomeHeroPanel.vue
frontend/src/components/client/home/HomeCoreFunctionsPanel.vue
frontend/src/components/client/home/HomeWhyChoosePanel.vue
frontend/src/components/client/home/HomeNewsPanel.vue
```

### 修改(1 个)

```
frontend/src/views/client/HomePage.vue  (1785 → ~110 行)
```

### 删除(1 个)

```
frontend/src/utils/homePageContent.js
```