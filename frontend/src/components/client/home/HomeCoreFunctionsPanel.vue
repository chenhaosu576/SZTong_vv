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

.function-card--charity {
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
