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
