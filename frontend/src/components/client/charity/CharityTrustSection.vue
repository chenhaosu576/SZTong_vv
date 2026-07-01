<!-- CharityTrustSection.vue -->
<!-- 公益平台的信任背书区。
     标题 + 承诺文案 + 4 个 feature 卡片。
     纯展示组件,接收 features,无交互无 emit。 -->

<script setup>
defineProps({
  features: { type: Array, required: true },
});
</script>

<template>
  <section class="trust-section">
    <div class="page-width trust-content">
      <div class="trust-text">
        <h2>每一份捐赠<br />都有迹可循</h2>
        <p>GreenArchive 致力于建立极致透明的物资捐赠流程,让捐赠人放心,让受助人暖心。</p>
        <button type="button" class="btn-trust">查看平台透明度报告</button>
      </div>
      <div class="trust-features">
        <div v-for="feature in features" :key="feature.title" class="trust-feature">
          <span class="material-symbols-outlined">{{ feature.icon }}</span>
          <h5>{{ feature.title }}</h5>
          <p>{{ feature.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.trust-section {
  color: white;
  padding: 96px 0;
}

.trust-content {
  background: linear-gradient(180deg, #154212 0%, #124012 100%);
  border-radius: 48px;
  border: 1px solid rgba(191, 237, 209, 0.12);
  box-shadow: 0 30px 80px rgba(6, 28, 9, 0.22);
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 56px;
  align-items: start;
  padding: 56px 64px;
  overflow: hidden;
}

.trust-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 560px;
  padding-top: 8px;
}

.trust-text h2 {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.2;
  color: #f8fff8;
  margin: 0 0 24px;
}

.trust-text p {
  font-size: 1.125rem;
  line-height: 1.8;
  color: rgba(231, 245, 234, 0.82);
  margin: 0 0 32px;
}

.btn-trust {
  padding: 16px 32px;
  background: #bfedd1;
  color: #002113;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-trust:hover {
  background: #a4d1b6;
  box-shadow: 0 8px 24px rgba(191, 237, 209, 0.3);
}

.trust-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.trust-feature {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  padding: 32px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 18px 40px rgba(3, 31, 9, 0.18);
}

.trust-feature .material-symbols-outlined {
  color: #c6ebd2;
  font-size: 24px;
  margin-bottom: 16px;
}

.trust-feature h5 {
  color: #f4fff6;
  font-weight: 700;
  margin: 0 0 8px;
}

.trust-feature p {
  font-size: 0.75rem;
  color: rgba(220, 239, 225, 0.78);
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 1024px) {
  .trust-content {
    grid-template-columns: 1fr;
    gap: 40px;
    padding: 48px 40px;
  }

  .trust-features {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .trust-section {
    padding: 72px 0;
  }

  .trust-content {
    border-radius: 32px;
    padding: 36px 24px;
    gap: 32px;
  }

  .trust-text h2 {
    font-size: 2.1rem;
  }

  .trust-text p {
    font-size: 1rem;
    margin-bottom: 24px;
  }

  .trust-feature {
    padding: 28px 24px;
  }
}
</style>