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
