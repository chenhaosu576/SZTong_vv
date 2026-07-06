<!-- CharityHeroPanel.vue -->
<!-- 公益页 hero 区。
     包含标题、副标题、两个 CTA 按钮、3 个 feature 条、右侧装饰图。
     两个 CTA 按钮通过 emit('projects-click') / emit('process-click')
     把滚动控制权交给 view(避免反射式 DOM 查询 + 手动事件清理)。
     所有 scoped 样式随 markup 一起搬入。 -->

<script setup>
defineEmits(["projects-click", "process-click"]);
</script>

<template>
  <section class="hero-section">
    <div class="page-width hero-content">
      <div class="hero-text">
        <div class="hero-badge">
          <span class="material-symbols-outlined">favorite</span>
          Digital Curator for Stewardship
        </div>
        <h1 class="hero-title">
          看看哪里正在需要<br /><span class="hero-highlight">书籍、衣物</span>和生活物资
        </h1>
        <p class="hero-desc">
          选择一个正在募集的公益项目,完成本次捐赠,让每一份善意精准送达。
        </p>
        <div class="hero-actions">
          <button type="button" class="hero-btn hero-btn-primary" @click="$emit('projects-click')">立即捐赠</button>
          <button type="button" class="hero-btn hero-btn-secondary" @click="$emit('process-click')">查看项目</button>
        </div>
        <div class="hero-features">
          <div class="feature-item">
            <span class="material-symbols-outlined">verified</span>
            <span>真实需求项目</span>
          </div>
          <div class="feature-item">
            <span class="material-symbols-outlined">visibility</span>
            <span>募集信息透明</span>
          </div>
          <div class="feature-item">
            <span class="material-symbols-outlined">view_object_track</span>
            <span>捐赠进度可追踪</span>
          </div>
        </div>
      </div>
      <div class="hero-image">
        <div class="image-decoration"></div>
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_landxi8cNfe8zj9YpUcgoSOVbL-9o60Cc-cnXf8VqWSOMoFYyHwvfVtGagVTd4LHuEChcmRmDAlhOjKK3t-yE7no2m4pI7rRLmQpxph1JXSNaC00mIKyB6jdrtsZl4xmTuOmE6szpFdLSdfWN9MjUFAuyBzyffLlReMQqznVWWhbanftZoFh2npUN9OccklW9aCtNNcxsGgaK3UefN4ClQJmx43E8_umaNJtwTNOo_O2UpUilfnZFjexuW06KPNrW4rAT6bd0L4"
          alt="志愿者整理捐赠物资"
          class="hero-img"
        />
        <div class="hero-stat">
          <div class="stat-icon">
            <span class="material-symbols-outlined">volunteer_activism</span>
          </div>
          <div>
            <div class="stat-number">12,482+</div>
            <div class="stat-label">物资已成功捐赠</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  padding: 48px 0;
  min-height: 640px;
  display: flex;
  align-items: center;
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}

.hero-text {
  z-index: 10;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(191, 237, 209, 0.6);
  color: var(--forest-700);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 24px;
}

.hero-badge .material-symbols-outlined {
  font-size: 14px;
  font-variation-settings: "FILL" 1;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 3.75rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  margin: 0 0 32px;
}

.hero-highlight {
  color: #154212;
  font-style: italic;
}

.hero-desc {
  font-size: 1.25rem;
  line-height: 1.8;
  color: var(--ink-600);
  max-width: 540px;
  margin: 0 0 40px;
}

.hero-actions {
  margin-bottom: 48px;
}

.hero-features {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding-top: 32px;
  border-top: 1px solid rgba(66, 73, 62, 0.3);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #154212;
  font-weight: 600;
}

.feature-item .material-symbols-outlined {
  font-size: 20px;
}

.hero-image {
  position: relative;
  height: 540px;
}

.image-decoration {
  position: absolute;
  inset: 0;
  background: rgba(21, 66, 18, 0.05);
  border-radius: 48px;
  transform: rotate(-3deg) scale(1.05);
}

.hero-img {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 48px;
  box-shadow: 0 24px 60px rgba(21, 66, 18, 0.2);
}

.hero-stat {
  position: absolute;
  bottom: -32px;
  left: -32px;
  z-index: 20;
  background: white;
  padding: 24px;
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(21, 66, 18, 0.15);
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(66, 73, 62, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: rgba(140, 51, 21, 0.1);
  color: #8c3315;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon .material-symbols-outlined {
  font-variation-settings: "FILL" 1;
}

.stat-number {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--ink-900);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--ink-600);
}

@media (max-width: 1024px) {
  .hero-content {
    grid-template-columns: 1fr;
  }

  .hero-image {
    height: 400px;
  }
}
</style>