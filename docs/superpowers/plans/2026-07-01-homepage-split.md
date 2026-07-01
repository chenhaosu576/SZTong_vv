# HomePage 组件拆分实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 1785 行的 `HomePage.vue` 拆成 view 编排层(110 行)+ 4 个 panel + 2 个 composable,删 `utils/homePageContent.js`,清理重复响应式断点 + 死代码。

**Architecture:** 镜像 `CharityPage.vue` / `AppointmentPage.vue` 拆分风格。view 只持有 destructure 后的 ref + 私有数据常量 + 少量协调函数;`useTypewriter` / `useTilt3D` 作为通用 composable 单独抽出(其他页面将来可复用);其他单消费者逻辑 inline 进所属 panel 或 view;UI 区域切 4 个 panel 通过 props + emits 与 view 通信。CSS 跟着 markup 搬,view 只留容器 / 布局 / 响应式。

**Tech Stack:** Vue 3 `<script setup>` + Composition API + `useRevealOnScroll` composable + `clientApi.js` mock + Vite 6。

**前置阅读:**
- 设计文档:`docs/superpowers/specs/2026-07-01-homepage-split-design.md`
- 拆分范式参照:`frontend/src/views/client/CharityPage.vue`(1894 → 189 拆分后版本)+ `frontend/src/components/client/charity/*.vue` + `frontend/src/composables/useCharityFilters.js`
- 当前源:`frontend/src/views/client/HomePage.vue`(1785 行,所有 CSS / 模板 / 脚本都在内)
- 资产:`frontend/src/assets/{blocks.png, ghost.png, heart-handshake.png, image-plus.png}`
- Mock API:`frontend/src/mock/clientApi.js` 的 `fetchHomeData()`

**TDD 注:** 项目无 Vitest / Jest / ESLint 配置(见 `frontend/CLAUDE.md`),spec 明确"本次重构不做单元测试,验证全部走 Vite dev server + 浏览器手动"。本计划每个 task 用 `npm run build` 做语法 / import 校验,Task 9 用 dev server + 浏览器做完整视觉 / 功能验证。CI 测试步骤 `--passWithNoTests`,无需调整。

**文件顶部注释要求:** 每个新建文件的顶部必须有一段块注释说明用途 / 职责 / 使用方,这是用户的硬性要求(不是建议)。

**view 行数估算:** 1785 → ~110 行(import ~15 + 数据常量 ~30 + setup ~25 + onMounted ~5 + template ~25 + style ~10)。

---

## 文件结构(锁定)

```
frontend/src/composables/
  useTypewriter.js                              (新建:通用打字机 + reduced-motion 检测)
  useTilt3D.js                                  (新建:通用 3D 卡片倾斜)
frontend/src/components/client/home/
  HomeHeroPanel.vue                             (新建:Hero 区,接 descriptionText / primaryCtaTo)
  HomeCoreFunctionsPanel.vue                    (新建:核心功能区,4 张 3D 卡 inline + useTilt3D)
  HomeWhyChoosePanel.vue                        (新建:品牌使命区,4 张 stat + 主图)
  HomeNewsPanel.vue                             (新建:资讯堆叠区,scroller/rAF/transform 全在 panel 内)
frontend/src/views/client/HomePage.vue          (重写:1785 → ~110)
frontend/src/utils/homePageContent.js           (删除:只剩死代码 impactPanel + HOME_SECTION_IDS)
```

**总任务数**:9(含最终验证)

---

## Task 1: 抽出通用 composable `useTypewriter`

**Files:**
- Create: `frontend/src/composables/useTypewriter.js`

无依赖,纯通用组件。打字机 + reduced-motion 检测 + 自动清理定时器。

- [ ] **Step 1.1: 创建文件**

创建 `frontend/src/composables/useTypewriter.js`:

```javascript
// useTypewriter.js
// 通用打字机 composable。
//
// 职责:
//   - 暴露 text ref(当前已显示的文本)
//   - start(fullText): 从头开始逐字渲染,间隔 delay ms(默认 58ms)
//   - start 接受 startDelay ms 启动延时(默认 320ms,等 hero 区淡入完再开始)
//   - stop(): 立即停止渲染(组件卸载时调用)
//   - 检测 prefers-reduced-motion:true 时 start 直接置完整文本不启动定时器
//   - 内部用闭包持有定时器 handle,onUnmounted 自动 stop()
//
// 不感知业务字段、不与具体页面耦合;跨页面可直接复用。

import { onUnmounted, ref } from "vue";

const DEFAULT_DELAY = 58;
const DEFAULT_START_DELAY = 320;

export function useTypewriter(options = {}) {
  const delay = options.delay ?? DEFAULT_DELAY;
  const startDelay = options.startDelay ?? DEFAULT_START_DELAY;

  const text = ref("");
  let timer = null;

  function clearTimer() {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function stop() {
    clearTimer();
  }

  function start(fullText) {
    clearTimer();

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      text.value = fullText;
      return;
    }

    text.value = "";
    let currentIndex = 0;

    const typeNextCharacter = () => {
      if (currentIndex >= fullText.length) {
        timer = null;
        return;
      }

      currentIndex += 1;
      text.value = fullText.slice(0, currentIndex);

      if (currentIndex < fullText.length) {
        timer = window.setTimeout(typeNextCharacter, delay);
        return;
      }

      timer = null;
    };

    timer = window.setTimeout(typeNextCharacter, startDelay);
  }

  onUnmounted(stop);

  return {
    text,
    start,
    stop,
  };
}
```

- [ ] **Step 1.2: 验证 import**

```bash
cd frontend && node -e "import('./src/composables/useTypewriter.js').then(m => console.log(Object.keys(m)))"
```

Expected: `[ 'useTypewriter' ]`。

- [ ] **Step 1.3: 提交**

```bash
git add frontend/src/composables/useTypewriter.js
git commit -m "refactor(home): extract useTypewriter composable

Generic typewriter: text ref + start(fullText) / stop(), with
prefers-reduced-motion short-circuit. onUnmounted auto-stops.
Will be consumed by HomeHeroPanel in a later task."
```

---

## Task 2: 抽出通用 composable `useTilt3D`

**Files:**
- Create: `frontend/src/composables/useTilt3D.js`

无依赖,纯通用组件。接管 4 张(或 N 张)卡片的 3D 倾斜 transform 状态 + mouse 事件 handler。

- [ ] **Step 2.1: 创建文件**

创建 `frontend/src/composables/useTilt3D.js`:

```javascript
// useTilt3D.js
// 通用 3D 卡片倾斜 composable。
//
// 职责:
//   - 接受卡片数量 count,初始化 cardRefs (DOM 数组) +
//     cardHoverStates (数组,每项 { x, y, isHovered })
//   - setCardRef(el, index): panel 模板用 :ref="el => setCardRef(el, i)" 注册
//   - onMove(event, index): 鼠标移动时计算 rotateX / rotateY + 写 hover 状态
//     (rotateX = (mouseY - centerY) / 10; rotateY = (centerX - mouseX) / 10;
//      state.x 存 rotateY, state.y 存 rotateX — 与原 HomePage 行为完全一致,
//      模板直接用 perspective(...) rotateX(state.y) rotateY(state.x) ...)
//   - onLeave(index): 鼠标离开时重置 hover 状态
//
// 模板用法:
//   :ref="el => setCardRef(el, i)"
//   @mousemove="onMove($event, i)"
//   @mouseleave="onLeave(i)"
//   :style="{ transform: \`perspective(1000px) rotateX(\${cardHoverStates[i].y}deg) rotateY(\${cardHoverStates[i].x}deg) scale(\${cardHoverStates[i].isHovered ? 1.05 : 1})\` }"
//
// 不持有路由、不感知跳转目标;panel / view 自己处理 navigate 逻辑。

import { reactive, ref } from "vue";

function createInitialStates(count) {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, isHovered: false }));
}

export function useTilt3D(count) {
  const cardRefs = ref([]);
  const cardHoverStates = reactive(createInitialStates(count));

  function setCardRef(el, index) {
    if (el) {
      cardRefs.value[index] = el;
    }
  }

  function onMove(event, index) {
    const card = cardRefs.value[index];
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (mouseY - centerY) / 10;
    const rotateY = (centerX - mouseX) / 10;

    cardHoverStates[index] = {
      x: rotateY,
      y: rotateX,
      isHovered: true,
    };
  }

  function onLeave(index) {
    cardHoverStates[index] = {
      x: 0,
      y: 0,
      isHovered: false,
    };
  }

  return {
    cardRefs,
    cardHoverStates,
    setCardRef,
    onMove,
    onLeave,
  };
}
```

- [ ] **Step 2.2: 验证 import**

```bash
cd frontend && node -e "import('./src/composables/useTilt3D.js').then(m => console.log(Object.keys(m)))"
```

Expected: `[ 'useTilt3D' ]`。

- [ ] **Step 2.3: 提交**

```bash
git add frontend/src/composables/useTilt3D.js
git commit -m "refactor(home): extract useTilt3D composable

Generic 3D card tilt: count-driven cardRefs + cardHoverStates + setCardRef /
onMove / onLeave. State shape (x: rotateY, y: rotateX) matches the existing
HomePage transform-string usage verbatim, so the template math carries over
unchanged. Will be consumed by HomeCoreFunctionsPanel in a later task."
```

---

## Task 3: 抽出 `HomeHeroPanel.vue`

**Files:**
- Create: `frontend/src/components/client/home/HomeHeroPanel.vue`

Hero 区。接 `descriptionText`(打字机文本) + `primaryCtaTo`(CTA 跳转目标);emit `scroll-to-services` 给 view 做"探索功能"CTA 的 scrollIntoView。

- [ ] **Step 3.1: 创建文件**

创建 `frontend/src/components/client/home/HomeHeroPanel.vue`:

```vue
<!-- HomeHeroPanel.vue -->
<!-- 首页 Hero 区。
     接 descriptionText (打字机文本, 由 view 通过 useTypewriter 喂入)
     和 primaryCtaTo (CTA 跳转目标, view 内有 fallback)。
     "探索功能" 按钮 emit scroll-to-services 给 view 做 scrollIntoView。
     "立即预约回收" 直接渲染 <RouterLink>。
     所有 scoped 样式随 markup 搬入,view 不持有 hero 相关 CSS。 -->

<script setup>
import { RouterLink } from "vue-router";

defineProps({
  descriptionText: {
    type: String,
    required: true,
  },
  primaryCtaTo: {
    type: String,
    required: true,
  },
});

defineEmits(["scroll-to-services"]);
</script>

<template>
  <section class="hero-section" data-reveal>
    <div class="hero-content">
      <div class="hero-text">
        <span class="hero-eyebrow">循环经济的未来</span>
        <h1 class="hero-title">
          <span class="hero-title-gradient">智慧回收，空灵未来</span>
        </h1>
        <p class="hero-description" aria-label="通过高精度AI和有机物流改变城市回收。我们不仅仅是处理废弃物；我们打造一个可持续发展与精致相遇的生态系统。">
          <span aria-hidden="true">{{ descriptionText }}</span>
          <span class="hero-description-cursor" aria-hidden="true"></span>
        </p>
        <div class="hero-actions">
          <RouterLink class="hero-btn hero-btn-primary" :to="primaryCtaTo">
            立即预约回收
          </RouterLink>
          <button class="hero-btn hero-btn-secondary" type="button" @click="$emit('scroll-to-services')">
            探索功能
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  position: relative;
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: clamp(80px, 12vw, 160px) clamp(32px, 5vw, 80px);
  text-align: center;
}

.hero-content {
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  z-index: 10;
}

.hero-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.hero-eyebrow {
  display: inline-block;
  font-family: var(--font-data);
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--forest-700);
  margin-bottom: 8px;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  margin: 0;
  white-space: nowrap;
}

.hero-title-gradient {
  background: linear-gradient(135deg, var(--forest-700) 0%, var(--moss-500) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: clamp(1.125rem, 2vw, 1.375rem);
  line-height: 1.6;
  color: var(--ink-600);
  max-width: 640px;
  margin: 0;
}

.hero-description-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 4px;
  background: var(--forest-700);
  vertical-align: -0.12em;
  animation: heroCursorBlink 0.9s steps(1, end) infinite;
}

@keyframes heroCursorBlink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-description-cursor {
    animation: none;
  }
}

.hero-actions {
  justify-content: center;
}

@media (max-width: 720px) {
  .hero-section {
    padding: clamp(48px, 10vw, 80px) clamp(20px, 4vw, 32px);
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }
}

@media (max-width: 380px) {
  .hero-title {
    font-size: 1.65rem;
  }
}
</style>
```

> 注:这段 CSS 是从原 HomePage.vue 提取的 hero 相关规则(`.hero-section`、
> `.hero-content`、`.hero-text`、`.hero-eyebrow`、`.hero-title` 及其变体、
> `.hero-description`、`.hero-description-cursor`、`.hero-actions`、动画 +
> 三档响应式断点)。原文件 1583-1708 / 1687-1775 重复的 `@media` 块已合并。
> view 内的 `.home-page` 容器 + `.state-error` 不在此文件。

- [ ] **Step 3.2: 验证 build 不报错**

```bash
cd frontend && npm run build
```

Expected:build 成功(此 panel 还没被引用,但 Vue 解析器仍会校验 SFC 语法)。

- [ ] **Step 3.3: 提交**

```bash
git add frontend/src/components/client/home/HomeHeroPanel.vue
git commit -m "refactor(home): extract HomeHeroPanel

Hero section with descriptionText (typewriter) + primaryCtaTo props;
emits scroll-to-services for the explore button. Carries all hero CSS
verbatim from HomePage.vue. Will be wired up by the view-rewrite task."
```

---

## Task 4: 抽出 `HomeCoreFunctionsPanel.vue`

**Files:**
- Create: `frontend/src/components/client/home/HomeCoreFunctionsPanel.vue`

核心功能区。接 `cards`(4 张卡配置) prop,4 张 3D 卡直接写在 panel 模板里(无 FunctionCard 子组件,简化 emit/prop 转发);内部 `useTilt3D(cards.length)` 管 4 张卡的 3D 倾斜;emit `navigate(to)` + `ready(ref)`(暴露 servicesSectionRef)。

- [ ] **Step 4.1: 创建文件**

创建 `frontend/src/components/client/home/HomeCoreFunctionsPanel.vue`:

```vue
<!-- HomeCoreFunctionsPanel.vue -->
<!-- 首页 "核心功能" 区。
     接 cards prop (4 张功能卡的配置: icon / variant / title /
     subtitle / description / badge / to)。
     4 张 .function-card 直接写在 panel 模板内,各自绑定:
       - mousemove / mouseleave -> useTilt3D 的 onMove / onLeave
       - click / keydown(Enter/Space) -> emit('navigate', card.to)
     panel 内部 ref="servicesSectionRef", mount 后 emit('ready', el)
     把 ref 暴露给 view,用于 "探索功能" CTA 的 scrollIntoView + focus。
     所有 .core-functions-* 和 .function-card* CSS 都随 markup 搬入。 -->

<script setup>
import { onMounted, ref } from "vue";

import { useTilt3D } from "@/composables/useTilt3D";

const SERVICES_SECTION_ID = "home-services";

const props = defineProps({
  cards: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["navigate", "ready"]);

const servicesSectionRef = ref(null);
const { cardHoverStates, setCardRef, onMove, onLeave } = useTilt3D(props.cards.length);

function cardClass(card) {
  return [
    "function-card",
    card.variant && card.variant !== "default" ? `function-card--${card.variant}` : null,
  ];
}

function handleKeyboardNavigation(event, to) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  emit("navigate", to);
}

function cardVariantClass(card) {
  if (!card.variant || card.variant === "default") return null;
  return `function-card-icon--${card.variant}`;
}

function badgeVariantClass(card) {
  if (!card.variant || card.variant === "default") return null;
  return `function-card-badge--${card.variant}`;
}

onMounted(() => {
  if (servicesSectionRef.value) {
    emit("ready", servicesSectionRef.value);
  }
});
</script>

<template>
  <section
    :id="SERVICES_SECTION_ID"
    ref="servicesSectionRef"
    class="core-functions-section"
    data-reveal
    tabindex="-1"
    style="--reveal-delay: 60ms"
  >
    <div class="core-functions-content">
      <div class="core-functions-left">
        <h2 class="core-functions-title">核心功能</h2>
        <div class="core-functions-divider"></div>
        <p class="core-functions-description">
          技术背后：<br />我们的生态系统由神经网络和自动化精度的交响乐驱动。
        </p>
      </div>

      <div class="core-functions-grid">
        <div
          v-for="(card, i) in cards"
          :key="card.to"
          :ref="(el) => setCardRef(el, i)"
          :class="cardClass(card)"
          :style="{
            transform: `perspective(1000px) rotateX(${cardHoverStates[i].y}deg) rotateY(${cardHoverStates[i].x}deg) scale(${cardHoverStates[i].isHovered ? 1.05 : 1})`,
          }"
          role="link"
          tabindex="0"
          @click="$emit('navigate', card.to)"
          @keydown="handleKeyboardNavigation($event, card.to)"
          @mousemove="onMove($event, i)"
          @mouseleave="onLeave(i)"
        >
          <div class="function-card-glow"></div>
          <div class="function-card-inner">
            <div :class="['function-card-icon', cardVariantClass(card)]">
              <img class="function-card-icon-image" :src="card.icon" alt="" aria-hidden="true" />
              <div class="icon-glow"></div>
            </div>
            <div class="function-card-content">
              <h3 class="function-card-title">{{ card.title }}</h3>
              <p class="function-card-subtitle">{{ card.subtitle }}</p>
              <p class="function-card-description">{{ card.description }}</p>
            </div>
            <div class="function-card-footer">
              <div :class="['function-card-badge', badgeVariantClass(card)]">{{ card.badge }}</div>
              <span class="function-card-arrow">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.core-functions-section {
  padding: clamp(64px, 10vw, 128px) clamp(32px, 5vw, 80px);
  background: rgba(236, 239, 228, 0.3);
  scroll-margin-top: 96px;
}

.core-functions-section:focus {
  outline: none;
}

.core-functions-content {
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(0, 2.5fr);
  gap: clamp(32px, 8vw, 96px);
  align-items: start;
}

.core-functions-left {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 120px;
}

.core-functions-title {
  font-family: var(--font-display);
  font-size: clamp(3rem, 6vw, 5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  margin: 0;
}

.core-functions-divider {
  height: 6px;
  width: 96px;
  background: rgba(46, 93, 63, 0.4);
  border-radius: 999px;
}

.core-functions-description {
  font-size: 1.25rem;
  line-height: 1.6;
  color: var(--ink-600);
  margin: 0;
}

.core-functions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

.function-card {
  position: relative;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 32px;
  padding: 0;
  overflow: hidden;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  cursor: pointer;
  transform-style: preserve-3d;
  will-change: transform;
}

.function-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(46, 93, 63, 0.05) 0%, rgba(79, 141, 96, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.6s ease;
  border-radius: 32px;
}

.function-card:hover::before {
  opacity: 1;
}

.function-card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(46, 93, 63, 0.15) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
}

.function-card:hover .function-card-glow {
  opacity: 1;
  animation: glowPulse 2s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.6;
  }
}

.function-card-inner {
  position: relative;
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  z-index: 1;
  transform: translateZ(20px);
}

.function-card:focus-visible {
  outline: 3px solid rgba(46, 93, 63, 0.5);
  outline-offset: 4px;
}

.function-card-icon {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(46, 93, 63, 0.15) 0%, rgba(79, 141, 96, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  box-shadow: 0 8px 32px rgba(46, 93, 63, 0.1);
}

.function-card:hover .function-card-icon {
  transform: translateY(-8px) scale(1.1);
  box-shadow: 0 16px 48px rgba(46, 93, 63, 0.2);
}

.function-card-icon-image {
  position: relative;
  z-index: 1;
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.icon-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(46, 93, 63, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.6s ease;
}

.function-card:hover .icon-glow {
  opacity: 1;
  animation: iconGlowPulse 1.5s ease-in-out infinite;
}

@keyframes iconGlowPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
  }
}

.function-card-icon--secondary {
  background: linear-gradient(135deg, rgba(82, 96, 105, 0.15) 0%, rgba(82, 96, 105, 0.1) 100%);
}

.function-card--secondary .icon-glow {
  background: radial-gradient(circle, rgba(82, 96, 105, 0.4) 0%, transparent 70%);
}

.function-card-icon--tertiary {
  background: linear-gradient(135deg, rgba(79, 141, 96, 0.15) 0%, rgba(79, 141, 96, 0.1) 100%);
}

.function-card--tertiary .icon-glow {
  background: radial-gradient(circle, rgba(79, 141, 96, 0.4) 0%, transparent 70%);
}

.function-card-icon--charity {
  background: linear-gradient(135deg, rgba(119, 218, 16, 0.15) 0%, rgba(119, 218, 16, 0.1) 100%);
}

.function-card--charity .icon-glow {
  background: radial-gradient(circle, rgba(119, 218, 16, 0.4) 0%, transparent 70%);
}

.function-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.function-card-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ink-900);
  margin: 0;
  transition: all 0.4s ease;
}

.function-card:hover .function-card-title {
  color: var(--forest-700);
  transform: translateX(4px);
}

.function-card-subtitle {
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-500);
  margin: 0;
  transition: all 0.4s ease;
}

.function-card:hover .function-card-subtitle {
  color: var(--ink-600);
}

.function-card-description {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--ink-600);
  margin: 8px 0 0 0;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

.function-card:hover .function-card-description {
  opacity: 1;
  transform: translateY(0);
}

.function-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.function-card-badge {
  display: inline-flex;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: rgba(46, 93, 63, 0.12);
  color: var(--forest-700);
  width: fit-content;
  transition: all 0.4s ease;
  box-shadow: 0 4px 12px rgba(46, 93, 63, 0.1);
}

.function-card:hover .function-card-badge {
  background: rgba(46, 93, 63, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(46, 93, 63, 0.15);
}

.function-card-badge--secondary {
  background: rgba(82, 96, 105, 0.12);
  color: #526069;
  box-shadow: 0 4px 12px rgba(82, 96, 105, 0.1);
}

.function-card--secondary:hover .function-card-badge--secondary {
  background: rgba(82, 96, 105, 0.2);
  box-shadow: 0 8px 20px rgba(82, 96, 105, 0.15);
}

.function-card-badge--tertiary {
  background: rgba(79, 141, 96, 0.12);
  color: var(--moss-500);
  box-shadow: 0 4px 12px rgba(79, 141, 96, 0.1);
}

.function-card--tertiary:hover .function-card-badge--tertiary {
  background: rgba(79, 141, 96, 0.2);
  box-shadow: 0 8px 20px rgba(79, 141, 96, 0.15);
}

.function-card-badge--charity {
  background: rgba(119, 218, 16, 0.12);
  color: #366b00;
  box-shadow: 0 4px 12px rgba(119, 218, 16, 0.1);
}

.function-card--charity:hover .function-card-badge--charity {
  background: rgba(119, 218, 16, 0.2);
  box-shadow: 0 8px 20px rgba(119, 218, 16, 0.15);
}

.function-card-arrow {
  font-size: 1.5rem;
  color: var(--forest-700);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  font-weight: 300;
}

.function-card:hover .function-card-arrow {
  opacity: 1;
  transform: translateX(0);
}

.function-card--secondary:hover .function-card-title {
  color: #526069;
}

.function-card--secondary .function-card-arrow {
  color: #526069;
}

.function-card--tertiary:hover .function-card-title {
  color: var(--moss-500);
}

.function-card--tertiary .function-card-arrow {
  color: var(--moss-500);
}

.function-card--charity:hover .function-card-title {
  color: #366b00;
}

.function-card--charity .function-card-arrow {
  color: #366b00;
}

@media (prefers-reduced-motion: reduce) {
  .function-card {
    transition: none;
  }

  .function-card-glow,
  .icon-glow {
    animation: none !important;
  }
}

@media (max-width: 1180px) {
  .core-functions-content {
    grid-template-columns: 1fr;
  }

  .core-functions-left {
    position: static;
  }
}

@media (max-width: 960px) {
  .core-functions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
```

> 注:CSS 是原 HomePage.vue 内 `.core-functions-*` 和 `.function-card` 全套(4 种变体及其 hover 效果、3D 倾斜样式、glow 动画、`prefers-reduced-motion`、3 档响应式断点)。原文件 1583-1708 重复的 `@media` 块已合并,仅保留相关规则。

- [ ] **Step 4.2: 验证 build 不报错**

```bash
cd frontend && npm run build
```

Expected:build 成功。

- [ ] **Step 4.3: 提交**

```bash
git add frontend/src/components/client/home/HomeCoreFunctionsPanel.vue
git commit -m "refactor(home): extract HomeCoreFunctionsPanel

Core functions section with 4 inlined function-cards (no FunctionCard
subcomponent, props-driven by cards array). Uses useTilt3D(cards.length)
for hover state, emits navigate + ready (servicesSectionRef). Carries
all .core-functions-* and .function-card* CSS verbatim."
```

---

## Task 5: 抽出 `HomeWhyChoosePanel.vue`

**Files:**
- Create: `frontend/src/components/client/home/HomeWhyChoosePanel.vue`

品牌使命区。接 `stats` (4 条 stat 卡配置) + `imageUrl` + `imageAlt` props;emit `learn-more` 给 view 跳 `/science`。

- [ ] **Step 5.1: 创建文件**

创建 `frontend/src/components/client/home/HomeWhyChoosePanel.vue`:

```vue
<!-- HomeWhyChoosePanel.vue -->
<!-- 首页 "我们的品牌使命" 区。
     接 stats (4 条 stat 卡: icon / value / description) +
     imageUrl + imageAlt props。
     "了解更多" 按钮 emit learn-more,view 收到后 router.push('/science')。
     主图 hover scale(1.05) 通过 CSS :hover 实现,无需 JS 状态。
     所有 .why-choose-* 和 .stat-card* CSS 随 markup 搬入。 -->

<script setup>
defineProps({
  stats: {
    type: Array,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  imageAlt: {
    type: String,
    required: true,
  },
});

defineEmits(["learn-more"]);
</script>

<template>
  <section class="why-choose-section" data-reveal style="--reveal-delay: 100ms">
    <div class="why-choose-content">
      <div class="why-choose-header">
        <div>
          <span class="why-choose-label">Why Choose Us</span>
          <h2 class="why-choose-title">我们的品牌使命</h2>
        </div>
        <button class="why-choose-btn" type="button" @click="$emit('learn-more')">
          了解更多
        </button>
      </div>

      <div class="why-choose-grid">
        <div class="why-choose-stats">
          <div v-for="stat in stats" :key="stat.value" class="stat-card">
            <div class="stat-card-header">
              <span class="stat-icon">{{ stat.icon }}</span>
              <span class="stat-arrow">↗</span>
            </div>
            <div class="stat-value">{{ stat.value }}</div>
            <p class="stat-description">{{ stat.description }}</p>
          </div>
        </div>

        <div class="why-choose-image">
          <img :src="imageUrl" :alt="imageAlt" class="why-choose-img" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.why-choose-section {
  padding: clamp(64px, 10vw, 128px) clamp(32px, 5vw, 80px);
  background: var(--surface);
}

.why-choose-content {
  max-width: 1440px;
  margin: 0 auto;
}

.why-choose-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 64px;
  gap: 32px;
  flex-wrap: wrap;
}

.why-choose-label {
  font-family: var(--font-data);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--forest-700);
  display: block;
  margin-bottom: 16px;
}

.why-choose-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  margin: 0;
}

.why-choose-btn {
  background: var(--forest-700);
  color: white;
  padding: 16px 40px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 1.125rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 12px 24px rgba(46, 93, 63, 0.2);
}

.why-choose-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 16px 32px rgba(46, 93, 63, 0.3);
}

.why-choose-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 48px;
  align-items: stretch;
}

.why-choose-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.stat-card {
  padding: 32px;
  border-radius: 28px;
  border: 1px solid rgba(191, 202, 176, 0.3);
  background: rgba(236, 239, 228, 0.4);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(22, 53, 36, 0.1);
}

.stat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-icon {
  font-size: 1.75rem;
}

.stat-arrow {
  font-size: 1.25rem;
  color: var(--ink-500);
  transition: color 0.3s ease;
}

.stat-card:hover .stat-arrow {
  color: var(--forest-700);
}

.stat-value {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--ink-900);
}

.stat-description {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--ink-600);
  margin: 0;
}

.why-choose-image {
  position: relative;
  border-radius: 40px;
  overflow: hidden;
  box-shadow: 0 32px 64px rgba(22, 53, 36, 0.15);
  min-height: 400px;
}

.why-choose-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s ease;
}

.why-choose-image:hover .why-choose-img {
  transform: scale(1.05);
}

@media (max-width: 1180px) {
  .why-choose-grid {
    grid-template-columns: 1fr;
  }

  .why-choose-stats {
    order: 2;
  }

  .why-choose-image {
    order: 1;
  }
}

@media (max-width: 960px) {
  .why-choose-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 720px) {
  .why-choose-stats {
    grid-template-columns: 1fr;
  }
}
</style>
```

> 注:CSS 是原 HomePage.vue 内 `.why-choose-*` 和 `.stat-card*` 全套(主图 hover scale、stats hover translateY、3 档响应式断点)。原文件 1583-1708 / 1687-1775 重复的 `@media` 块已合并,仅保留相关规则。

- [ ] **Step 5.2: 验证 build 不报错**

```bash
cd frontend && npm run build
```

Expected:build 成功。

- [ ] **Step 5.3: 提交**

```bash
git add frontend/src/components/client/home/HomeWhyChoosePanel.vue
git commit -m "refactor(home): extract HomeWhyChoosePanel

Why-choose section with stats + image + learn-more CTA. Carries all
why-choose-* and stat-card* CSS verbatim from HomePage.vue."
```

---

## Task 6: 抽出 `HomeNewsPanel.vue`

**Files:**
- Create: `frontend/src/components/client/home/HomeNewsPanel.vue`

资讯堆叠区。接 `items` (4 条资讯配置) prop;4 张 `.news-stack-card` 写在 panel 模板内;**panel 内部**实现 scrollerRef + bindScroller (设 will-change / transform-origin / backface-visibility)+ handleNewsScroll (rAF + transform 计算)+ isNewsUpdating 自旋锁 + lastNewsTransforms Map + onUnmounted 清理。emit `navigate(to)`。

- [ ] **Step 6.1: 创建文件**

创建 `frontend/src/components/client/home/HomeNewsPanel.vue`:

```vue
<!-- HomeNewsPanel.vue -->
<!-- 首页 "动态资讯" 区,4 张卡片随滚动堆叠(stack)效果。
     接 items prop (4 条资讯: badge / date / title / text / icon /
     to / variant)。
     所有滚动堆叠逻辑(scrollerRef / bindScroller 设 will-change +
     transform-origin / handleNewsScroll + rAF / isNewsUpdating 自旋锁 /
     lastNewsTransforms Map / onUnmounted 清理)都内联在 panel 内,
     因为 .news-stack-card 选择器是 hardcoded,跨页复用价值低。
     emit navigate(to),view 收到后 router.push(to)。
     所有 .news-section / .news-stack-card* CSS 随 markup 搬入。 -->

<script setup>
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["navigate"]);

const newsScrollerRef = ref(null);
const newsCardsRef = ref([]);
const lastNewsTransforms = ref(new Map());
const isNewsUpdating = ref(false);

function handleCardClick(to) {
  emit("navigate", to);
}

function handleKeyboardNavigation(event, to) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  emit("navigate", to);
}

function cardClass(item) {
  return ["news-stack-card", `news-stack-card--${item.variant}`];
}

function badgeClass(item) {
  return ["news-stack-badge", `news-stack-badge--${item.variant}`];
}

function updateNewsCardTransforms() {
  const scroller = newsScrollerRef.value;
  if (!scroller || !newsCardsRef.value.length || isNewsUpdating.value) return;

  isNewsUpdating.value = true;

  const scrollTop = scroller.scrollTop;
  const containerHeight = scroller.clientHeight;
  const stackPosition = containerHeight * 0.2;
  const itemStackDistance = 30;
  const baseScale = 0.92;
  const itemScale = 0.02;

  newsCardsRef.value.forEach((card, i) => {
    if (!card) return;

    const cardTop = card.offsetTop;
    const triggerStart = cardTop - stackPosition - itemStackDistance * i;
    const triggerEnd = cardTop - containerHeight * 0.1;

    const progress = Math.max(0, Math.min(1, (scrollTop - triggerStart) / (triggerEnd - triggerStart)));
    const targetScale = baseScale + i * itemScale;
    const scale = 1 - progress * (1 - targetScale);

    let translateY = 0;
    const pinStart = cardTop - stackPosition - itemStackDistance * i;
    const isPinned = scrollTop >= pinStart;

    if (isPinned) {
      translateY = scrollTop - cardTop + stackPosition + itemStackDistance * i;
    }

    const newTransform = {
      translateY: Math.round(translateY * 100) / 100,
      scale: Math.round(scale * 1000) / 1000,
    };

    const lastTransform = lastNewsTransforms.value.get(i);
    const hasChanged =
      !lastTransform ||
      Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
      Math.abs(lastTransform.scale - newTransform.scale) > 0.001;

    if (hasChanged) {
      card.style.transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale})`;
      lastNewsTransforms.value.set(i, newTransform);
    }
  });

  isNewsUpdating.value = false;
}

function handleNewsScroll() {
  requestAnimationFrame(updateNewsCardTransforms);
}

function setupNewsScrollStack() {
  const scroller = newsScrollerRef.value;
  if (!scroller) return;

  const cards = Array.from(scroller.querySelectorAll(".news-stack-card"));
  newsCardsRef.value = cards;

  cards.forEach((card) => {
    card.style.willChange = "transform";
    card.style.transformOrigin = "top center";
    card.style.backfaceVisibility = "hidden";
  });

  updateNewsCardTransforms();
}

onMounted(() => {
  setupNewsScrollStack();
});

onUnmounted(() => {
  newsCardsRef.value = [];
  lastNewsTransforms.value.clear();
});
</script>

<template>
  <section class="news-section" data-reveal style="--reveal-delay: 140ms">
    <div class="news-content">
      <div class="news-header">
        <div>
          <h2 class="news-title">动态资讯</h2>
          <div class="news-divider"></div>
          <p class="news-description">及时了解我们的社区里程碑和环境影响倡议。</p>
        </div>
      </div>

      <div ref="newsScrollerRef" class="news-scroll-container" @scroll="handleNewsScroll">
        <div class="news-stack-wrapper">
          <div
            v-for="item in items"
            :key="item.to"
            :class="cardClass(item)"
            role="link"
            tabindex="0"
            @click="handleCardClick(item.to)"
            @keydown="handleKeyboardNavigation($event, item.to)"
          >
            <div class="news-stack-card-inner">
              <div class="news-stack-card-header">
                <span :class="badgeClass(item)">{{ item.badge }}</span>
                <span class="news-stack-date">{{ item.date }}</span>
              </div>
              <h3 class="news-stack-card-title">{{ item.title }}</h3>
              <p class="news-stack-card-text">{{ item.text }}</p>
              <div class="news-stack-card-footer">
                <span class="news-stack-icon">{{ item.icon }}</span>
                <span class="news-stack-arrow">→</span>
              </div>
            </div>
          </div>

          <div class="news-stack-spacer"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.news-section {
  padding: clamp(64px, 10vw, 96px) clamp(32px, 5vw, 80px);
  background: linear-gradient(180deg, rgba(236, 239, 228, 0.2) 0%, rgba(236, 239, 228, 0.5) 100%);
  overflow: hidden;
}

.news-content {
  max-width: 1440px;
  margin: 0 auto;
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 64px;
  gap: 32px;
}

.news-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  margin: 0 0 16px 0;
}

.news-divider {
  height: 6px;
  width: 96px;
  background: rgba(46, 93, 63, 0.4);
  border-radius: 999px;
  margin-bottom: 24px;
}

.news-description {
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--ink-600);
  margin: 0;
}

.news-scroll-container {
  position: relative;
  height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.news-scroll-container::-webkit-scrollbar {
  display: none;
}

.news-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.news-scroll-container::-webkit-scrollbar-track {
  background: rgba(191, 202, 176, 0.2);
  border-radius: 999px;
}

.news-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(46, 93, 63, 0.3);
  border-radius: 999px;
  transition: background 0.3s ease;
}

.news-scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(46, 93, 63, 0.5);
}

.news-stack-wrapper {
  position: relative;
  padding-bottom: 400px;
}

.news-stack-card {
  position: relative;
  margin-bottom: 120px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: top center;
  will-change: transform;
  backface-visibility: hidden;
}

.news-stack-card:last-of-type {
  margin-bottom: 0;
}

.news-stack-card-inner {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 32px;
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 20px 60px rgba(22, 53, 36, 0.08);
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  position: relative;
  overflow: hidden;
}

.news-stack-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(46, 93, 63, 0.03) 0%, rgba(79, 141, 96, 0.03) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
  border-radius: 32px;
  pointer-events: none;
}

.news-stack-card:hover::before {
  opacity: 1;
}

.news-stack-card:hover .news-stack-card-inner {
  box-shadow: 0 32px 80px rgba(22, 53, 36, 0.12);
  border-color: rgba(46, 93, 63, 0.2);
}

.news-stack-card:focus-visible {
  outline: 3px solid rgba(46, 93, 63, 0.5);
  outline-offset: 4px;
  border-radius: 32px;
}

.news-stack-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.news-stack-badge {
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.news-stack-badge--system {
  background: linear-gradient(135deg, rgba(46, 93, 63, 0.15) 0%, rgba(46, 93, 63, 0.1) 100%);
  color: var(--forest-700);
}

.news-stack-badge--community {
  background: linear-gradient(135deg, rgba(82, 96, 105, 0.15) 0%, rgba(82, 96, 105, 0.1) 100%);
  color: #526069;
}

.news-stack-badge--checkin {
  background: linear-gradient(135deg, rgba(94, 94, 92, 0.15) 0%, rgba(94, 94, 92, 0.1) 100%);
  color: #5e5e5c;
}

.news-stack-badge--knowledge {
  background: linear-gradient(135deg, rgba(119, 218, 16, 0.15) 0%, rgba(119, 218, 16, 0.1) 100%);
  color: #366b00;
}

.news-stack-card:hover .news-stack-badge {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.news-stack-date {
  font-family: var(--font-data);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--ink-500);
  font-weight: 600;
}

.news-stack-card-title {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  font-weight: 700;
  line-height: 1.3;
  color: var(--ink-900);
  margin: 0;
  transition: all 0.3s ease;
}

.news-stack-card:hover .news-stack-card-title {
  color: var(--forest-700);
  transform: translateX(4px);
}

.news-stack-card-text {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--ink-600);
  margin: 0;
  transition: all 0.3s ease;
}

.news-stack-card:hover .news-stack-card-text {
  color: var(--ink-700);
}

.news-stack-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.news-stack-icon {
  font-size: 2rem;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  filter: grayscale(0.3);
}

.news-stack-card:hover .news-stack-icon {
  transform: scale(1.15) rotate(5deg);
  filter: grayscale(0);
}

.news-stack-arrow {
  font-size: 2rem;
  color: var(--forest-700);
  opacity: 0;
  transform: translateX(-20px);
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  font-weight: 300;
}

.news-stack-card:hover .news-stack-arrow {
  opacity: 1;
  transform: translateX(0);
}

.news-stack-card--system:hover .news-stack-card-title {
  color: var(--forest-700);
}

.news-stack-card--community:hover .news-stack-card-title {
  color: #526069;
}

.news-stack-card--community .news-stack-arrow {
  color: #526069;
}

.news-stack-card--checkin:hover .news-stack-card-title {
  color: #5e5e5c;
}

.news-stack-card--checkin .news-stack-arrow {
  color: #5e5e5c;
}

.news-stack-card--knowledge:hover .news-stack-card-title {
  color: #366b00;
}

.news-stack-card--knowledge .news-stack-arrow {
  color: #366b00;
}

.news-stack-spacer {
  height: 200px;
}

@media (prefers-reduced-motion: reduce) {
  .news-scroll-container {
    scroll-behavior: auto;
  }

  .news-stack-card {
    transition: none;
  }
}

@media (max-width: 720px) {
  .news-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .news-scroll-container {
    height: 500px;
  }

  .news-stack-card-inner {
    padding: 32px;
  }

  .news-stack-card-title {
    font-size: 1.25rem;
  }

  .news-stack-card-text {
    font-size: 0.875rem;
  }
}

@media (max-width: 380px) {
  .news-stack-card-inner {
    padding: 24px;
  }
}
</style>
```

> 注:CSS 是原 HomePage.vue 内 `.news-section*` 和 `.news-stack-card*` 全套(4 种 variant、scrollbar 隐藏 + 显示规则、堆叠 hover 效果、`prefers-reduced-motion`、2 档响应式断点)。原文件 1583-1708 / 1687-1775 重复的 `@media` 块已合并,仅保留相关规则。**注意**:`.news-section` 的 `padding` / `background` 留在 panel,`overflow: hidden` 也搬入(防止堆叠 transform 影响外层)。

- [ ] **Step 6.2: 验证 build 不报错**

```bash
cd frontend && npm run build
```

Expected:build 成功。

- [ ] **Step 6.3: 提交**

```bash
git add frontend/src/components/client/home/HomeNewsPanel.vue
git commit -m "refactor(home): extract HomeNewsPanel

News section with 4 inlined stack-cards (scroll-stack effect inlined
since .news-stack-card selector is hardcoded). Owns scrollerRef /
rAF / isNewsUpdating / lastNewsTransforms state and cleanup. Carries
all news-section* and news-stack-card* CSS verbatim."
```

---

## Task 7: 重写 `HomePage.vue` 为薄编排器

**Files:**
- Modify: `frontend/src/views/client/HomePage.vue`(整体重写 1785 → ~110 行)

把所有 inline 的数据 / 状态 / 模板 / CSS 替换为 panel 编排:
- 持有 `pageRef` + `servicesSectionRef`(通过 panel `@ready` 接收)
- `loading` / `loadError` / `home` 三个 ref(从原 composable 吃掉的职责)
- `loadHome()` 函数
- `useTypewriter()` 实例 + `HERO_DESCRIPTION` 常量
- 4 个私有数据常量:`FUNCTION_CARDS` / `STATS` / `WHY_IMAGE` / `NEWS_ITEMS` + `DEFAULT_HOME_HERO`
- 3 个协调函数:`navigateTo` / `scrollToServices` / 接收 servicesSectionRef 的内联箭头
- 主页级响应式断点 + `.home-page` 容器 + `.state-error` 错误条

- [ ] **Step 7.1: 重写文件**

**整体替换** `frontend/src/views/client/HomePage.vue` 为以下内容(把现有 1785 行整文件覆盖):

```vue
<!-- HomePage.vue -->
<!-- 首页(view 层)。
     只做编排:
       - 实例化 useTypewriter + 内联 loading/loadError/home 状态
       - 持有 4 个私有数据常量(FUNCTION_CARDS / STATS / WHY_IMAGE / NEWS_ITEMS)
       - 持有 HERO_DESCRIPTION / DEFAULT_HOME_HERO 文案 + fallback
       - 渲染 4 个 panel: HomeHeroPanel / HomeCoreFunctionsPanel /
         HomeWhyChoosePanel / HomeNewsPanel
       - 3 个协调函数: navigateTo / scrollToServices / 接 servicesSectionRef
     所有业务状态 / 模板细节 / 滚动堆叠逻辑 / 3D 倾斜 / 打字机 都拆到
     composables(/) + components/client/home/。
     view 只保留布局容器、加载/错误状态、主页级响应式断点(影响多 section)。 -->

<script setup>
import { onMounted, ref, watch } from "vue";
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

const typewriter = useTypewriter({ delay: 58, startDelay: 320 });

const HERO_DESCRIPTION =
  "通过高精度AI和有机物流改变城市回收。我们不仅仅是处理废弃物；我们打造一个可持续发展与精致相遇的生态系统。";

const DEFAULT_HOME_HERO = Object.freeze({
  primaryCta: { to: "/ai-identify" },
});

const FUNCTION_CARDS = [
  {
    icon: imagePlusIcon,
    variant: "default",
    title: "AI识别",
    subtitle: "AI Identification",
    description: "智能识别废弃物类型，精准分类指导",
    badge: "Precision AI",
    to: "/ai-identify",
  },
  {
    icon: ghostIcon,
    variant: "secondary",
    title: "AI助手",
    subtitle: "Category Inquiry",
    description: "快速查询物品分类，获取回收建议",
    badge: "Smart Catalog",
    to: "/ai-qa",
  },
  {
    icon: blocksIcon,
    variant: "tertiary",
    title: "预约回收",
    subtitle: "Book Collection",
    description: "便捷预约上门回收，省时省力环保",
    badge: "Scheduled Flow",
    to: "/recycle-booking",
  },
  {
    icon: heartHandshakeIcon,
    variant: "charity",
    title: "公益捐赠",
    subtitle: "Public Welfare",
    description: "闲置物品捐赠，传递爱心与温暖",
    badge: "Ethereal Impact",
    to: "/charity",
  },
];

const STATS = [
  { icon: "✓", value: "600+", description: "成功落地的城市循环再生项目" },
  { icon: "🌿", value: "1.5万吨", description: "每年通过我们的生态系统处理的回收材料" },
  { icon: "👥", value: "98%", description: "在我们的无缝预约回收流程中的客户满意度" },
  { icon: "📊", value: "AI 优先", description: "自主研发的识别引擎，确保 99.9% 的分类准确率" },
];

const WHY_IMAGE = {
  url: "https://tse1.mm.bing.net/th/id/OIP.mEE_eLNmAV9iYl4IjM6wdAAAAA?rs=1&pid=ImgDetMain&o=7&rm=3",
  alt: "现代生态办公环境",
};

const NEWS_ITEMS = [
  {
    badge: "系统公告",
    date: "2025.03.18",
    title: "收智通全新升级，已上线ai大模型",
    text: "全新 UI 设计，更强大的 Qwen2.5 AI 识别引擎以及社区功能全面升级，带来更流畅的绿色生活体验。",
    icon: "🔬",
    to: "/ai-identify",
    variant: "system",
  },
  {
    badge: "活动",
    date: "2025.03.15",
    title: "AI 驱动灵感，定义你的绿色坐标",
    text: "提交废品，即刻开启 AI 协作模式。探索智能回收的无限可能，让每一次分类都成为环保创新的起点。",
    icon: "🌱",
    to: "/upcycle",
    variant: "community",
  },
  {
    badge: "签到",
    date: "2025.03.12",
    title: "本周你用了多少次收智通呢",
    text: "查看个人中心是否获得了新的成就或奖励。持续参与，解锁更多环保勋章，见证你的绿色足迹。",
    icon: "⭐",
    to: "/profile",
    variant: "checkin",
  },
  {
    badge: "环保知识",
    date: "2025.03.10",
    title: "如何正确进行垃圾分类？AI 助手来教你",
    text: "详细解析各类垃圾的分类标准与回收利用价值，让环保成为日常习惯。从源头做起，共建可持续未来。",
    icon: "📚",
    to: "/science",
    variant: "knowledge",
  },
];

function navigateTo(to) {
  if (!to) return;
  router.push(to);
}

function scrollToServices() {
  const node = servicesSectionRef.value;
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    node.focus({ preventScroll: true });
  }, 420);
}

onMounted(() => {
  loadHome();
  watch(
    () => home.value?.hero,
    (hero) => {
      if (hero) typewriter.start(HERO_DESCRIPTION);
    },
  );
});
</script>

<template>
  <section ref="pageRef" class="home-page">
    <template v-if="loading">
      <div class="loading-shell" data-reveal>
        <div class="loading-shimmer home-skeleton home-skeleton--hero" />
        <div class="loading-grid">
          <div class="loading-shimmer home-skeleton" />
          <div class="loading-shimmer home-skeleton" />
          <div class="loading-shimmer home-skeleton" />
          <div class="loading-shimmer home-skeleton" />
        </div>
      </div>
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
  </section>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: 0;
  padding-bottom: 0;
}

.loading-shell {
  display: grid;
  gap: 18px;
  padding: 0 clamp(32px, 5vw, 80px);
}

.loading-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.home-skeleton {
  min-height: 180px;
  border-radius: 28px;
}

.home-skeleton--hero {
  min-height: 430px;
}

/* View-level responsive breakpoints that span multiple sections.
   Section-specific media queries live in each panel. */

@media (max-width: 720px) {
  .home-skeleton--hero {
    min-height: 320px;
  }

  .loading-grid {
    grid-template-columns: 1fr;
  }
}

.state-error {
  border: 1px solid rgba(149, 73, 38, 0.32);
  border-radius: 12px;
  padding: 10px 12px;
  color: #8f431d;
  background: rgba(255, 242, 232, 0.9);
  font-size: 0.88rem;
  margin: 16px clamp(32px, 5vw, 80px);
}
</style>
```

> 注:view 只保留 `.home-page` 容器、加载 skeleton、`.state-error` 错误条 + 一档跨 section 的响应式断点(≤720px 调 skeleton 高度)。所有 section 专属 CSS 都跟随各自 panel 搬出。原文件 1583-1708 / 1687-1775 重复的 `@media` 块已整体删除。`.section-title-center` / `.section-description-center` 死样式删除。

- [ ] **Step 7.2: 验证 build 不报错**

```bash
cd frontend && npm run build
```

Expected:build 成功,无 import / 类型 / template 错误。

- [ ] **Step 7.3: 提交**

```bash
git add frontend/src/views/client/HomePage.vue
git commit -m "refactor(home): rewrite HomePage as thin orchestrator (1785 -> ~110)

Replaces monolithic template/script/style with panel orchestration:
- 4 panel components for hero / core-functions / why-choose / news
- inline loading/loadError/home state (was useHomeData.js, dropped in spec)
- 4 private data constants (was homeNewsConstants.js, dropped in spec)
- useTypewriter composable feeds HomeHeroPanel descriptionText
- 3 coord functions: navigateTo / scrollTo-services / ready handler
- view-level CSS only: .home-page container + loading skeleton + .state-error
  + 1 cross-section breakpoint (skeleton height at <=720px)
- removed dead code: impactPanel / getImpactPanelContent / HOME_SECTION_IDS /
  newsListRef / focusNewsItem / navigateNews / activeNewsIndex /
  newsTargets / syncLoginState / isLoggedIn
- removed duplicate media query blocks (1583-1708 == 1687-1775)
- removed .section-title-center / .section-description-center dead CSS"
```

---

## Task 8: 删除死文件 `utils/homePageContent.js`

**Files:**
- Delete: `frontend/src/utils/homePageContent.js`

整个文件只剩死代码 `getImpactPanelContent`(已经被 view 删) + `HOME_SECTION_IDS`(已经迁到 HomeCoreFunctionsPanel 局部 const)。其他文件无引用(grep 验证过)。

- [ ] **Step 8.1: 删除文件**

```bash
rm frontend/src/utils/homePageContent.js
```

- [ ] **Step 8.2: 验证无残留引用**

```bash
cd frontend && grep -r "homePageContent\|getImpactPanelContent\|HOME_SECTION_IDS" src/ 2>&1 | head -20
```

Expected:空输出(无匹配)。如果有匹配,检查是否遗漏 import,清理后再 grep 一次。

- [ ] **Step 8.3: 验证 build 不报错**

```bash
cd frontend && npm run build
```

Expected:build 成功。

- [ ] **Step 8.4: 提交**

```bash
git add -u frontend/src/utils/homePageContent.js
git commit -m "refactor(home): delete homePageContent.js (dead code)

The whole file was orphaned after the refactor:
- getImpactPanelContent was only consumed by the dead impactPanel computed
  in HomePage.vue (no panel used it after the split)
- HOME_SECTION_IDS.services moved to HomeCoreFunctionsPanel local const

Verified no remaining imports via grep -r across frontend/src/."
```

---

## Task 9: 完整视觉 + 功能验证

启动 dev server,逐项走查 spec 中的功能验证清单 + 响应式断点。

- [ ] **Step 9.1: 启动 dev server**

```bash
cd frontend && npm run dev
```

Expected:Vite 启动无报错,输出 `Local: http://localhost:5173/`。

- [ ] **Step 9.2: 浏览器走查**

打开 `http://localhost:5173/`,按以下顺序检查:

**功能验证清单(对照 spec 第 § 验证策略 节)**

| 场景 | 期望 | 通过 |
|---|---|---|
| 首次访问 | loading skeleton 出现 ~1s,被替换为完整首页;hero、4 张功能卡、品牌使命、4 张资讯卡全部可见 | ☐ |
| Hero 打字机 | hero 描述逐字出现(58ms / 字),结束后光标停止闪烁 | ☐ |
| prefers-reduced-motion(浏览器 DevTools → Rendering → Emulate CSS prefers-reduced-motion) | hero 描述直接显示完整文本,无打字机动画 | ☐ |
| Hero CTA "立即预约回收" | 跳 `/ai-identify` | ☐ |
| Hero CTA "探索功能" | 平滑滚到核心功能区,420ms 后 focus 到 section(可见 focus outline) | ☐ |
| 4 张功能卡 hover | 3D 倾斜 transform 应用,hover scale 1.05,描述淡入 | ☐ |
| 4 张功能卡 click | 分别跳 `/ai-identify` / `/ai-qa` / `/recycle-booking` / `/charity` | ☐ |
| 4 张功能卡 Enter/Space | 同上 | ☐ |
| 品牌使命 4 张 stat | 静态展示;hover translateY(-4px) + 阴影 + ↗ 变色 | ☐ |
| 品牌使命 "了解更多" | 跳 `/science` | ☐ |
| 主图 hover | 图片 scale(1.05) | ☐ |
| 4 张资讯卡滚动 | 堆叠 transform 计算:translate3d + scale 渐变;pin 到 stack position;cards 顺序叠放 | ☐ |
| 4 张资讯卡 click | 分别跳 `/ai-identify` / `/upcycle` / `/profile` / `/science` | ☐ |
| 4 张资讯卡 Enter/Space | 同上 | ☐ |
| reveal 动画 | 各 section 依序 reveal(滚到时 fade in) | ☐ |

**响应式断点验证**

打开 DevTools 设备工具栏,逐个测:

| 断点 | 期望 | 通过 |
|---|---|---|
| 桌面 (≥1180px) | 核心功能两栏 + 左侧 sticky 标题;品牌使命 grid 两栏(stats 左 + image 右);资讯 4 张卡堆叠正常 | ☐ |
| ≤ 1180px | 核心功能两栏变单列,左侧 sticky 失效;品牌使命 grid 单列(stats 下、image 上) | ☐ |
| ≤ 960px | 4 张功能卡变单列;品牌使命 header 垂直堆叠 | ☐ |
| ≤ 720px | Hero padding 缩小、actions 垂直堆叠;3 个 section padding 缩小;stats 单列;news header 垂直堆叠;news-scroll-container height=500px;news-stack-card-inner padding=32px;title/text 字号降级 | ☐ |
| ≤ 380px | hero-title 字号 1.65rem;news-stack-card-inner padding=24px | ☐ |

**视觉回归(对比 spec § 视觉回归 节)**

- [ ] hero 渐变文字(forest-700 → moss-500)
- [ ] 功能卡 4 种颜色变体的 hover 效果(标题变色 + translateX(4px)、badge 翻色 + translateY(-2px)、icon translateY(-8px) scale(1.1))
- [ ] 资讯卡 4 种 variant 的 hover 标题变色一致
- [ ] 滚动堆叠的 translate3d + scale 计算结果与原代码完全一致(`Math.round(translateY * 100) / 100`、`Math.round(scale * 1000) / 1000`)
- [ ] 3D 倾斜的 `perspective(1000px) rotateX(...) rotateY(...) scale(...)` 字符串拼装一致

- [ ] **Step 9.3: 模拟 fetchHomeData 失败**

临时改 `frontend/src/mock/clientApi.js` 的 `fetchHomeData` 抛错:

```javascript
export async function fetchHomeData() {
  throw new Error("test failure");
}
```

刷新页面,验证 `.state-error` 红条 + 中文提示 "首页数据加载失败，请稍后重试。" 显示。改回后再次验证。

- [ ] **Step 9.4: 验证 grep 无死代码**

```bash
cd frontend && grep -rn "impactPanel\|getImpactPanelContent\|HOME_SECTION_IDS\|newsListRef\|focusNewsItem\|navigateNews\|activeNewsIndex\|syncLoginState\|isLoggedIn\|section-title-center\|section-description-center\|newsTargets" src/views src/components src/composables src/utils 2>&1
```

Expected:空输出。

- [ ] **Step 9.5: 验证 view 行数**

```bash
wc -l frontend/src/views/client/HomePage.vue
```

Expected:110 行左右(允许 100-130 浮动)。

- [ ] **Step 9.6: 标记计划完成**

所有 checkbox 勾完即视为完成。如有任何不通过的项,**先修复再继续**,不要遗留。修复方式:重读相关 panel 的 CSS / script,对比 spec 找出偏差,直接改对应文件,无需新 commit(累积到最后一次 `refactor(home): post-split cleanup` 一起 commit)。

---

## 完成后清理

所有验证通过后,如在验证阶段有临时修复未 commit,按 `refactor(home): post-split cleanup` 风格合并 commit,然后开 PR。

参考提交信息模板(沿用 commit c811940 的合并 commit 风格):

```
refactor(home): split HomePage into 4 panels + 2 composables (1785 -> 110)

Replaces the monolithic HomePage.vue with a thin orchestrator + four
self-contained panel components + two reusable composables. Mirrors the
charity/appointment page-split pattern. Also deletes the now-dead
homePageContent.js, dedupes the duplicated responsive media queries,
and removes orphaned impactPanel / HOME_SECTION_IDS / login-sync code.

New files:
  composables/useTypewriter.js       generic typewriter + reduced-motion
  composables/useTilt3D.js           generic 3D card tilt
  components/client/home/HomeHeroPanel.vue
  components/client/home/HomeCoreFunctionsPanel.vue
  components/client/home/HomeWhyChoosePanel.vue
  components/client/home/HomeNewsPanel.vue

Modified:
  views/client/HomePage.vue          1785 -> ~110

Deleted:
  utils/homePageContent.js           orphaned after refactor

Verified via Vite dev server + browser walkthrough (see plan § Task 9).
```