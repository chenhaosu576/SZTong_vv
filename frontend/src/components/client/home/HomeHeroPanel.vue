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
