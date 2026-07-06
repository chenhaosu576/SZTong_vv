<!--
  OrdersSidePanel.vue
  右侧栏整区:
    - impact-card (4 行 impact 数据 + 积分商城按钮)
    - faq-card (3 条 FAQ 列表 + chevron 箭头)
  Page 喂入 impact (IMPACT_FALLBACK 形状) + faqItems (FAQ_ITEMS 形状),
  通过 enter-points-mall / faq-click 上抛 (目前无业务, 预留)。
-->

<script setup>
defineProps({
  impact: {
    type: Object,
    required: true,
    validator: (value) =>
      "totalRecycled" in value &&
      "totalDonations" in value &&
      "co2Reduced" in value &&
      "ecoPoints" in value,
  },
  faqItems: {
    type: Array,
    required: true,
    validator: (value) => value.every((item) => "id" in item && "question" in item),
  },
});

const emit = defineEmits(["enter-points-mall", "faq-click"]);
</script>

<template>
  <aside class="side-panel">
    <div class="impact-card">
      <h3 class="impact-title">全平台环境足迹</h3>
      <div class="impact-stats">
        <div class="impact-row">
          <span class="impact-label">总计回收</span>
          <span class="impact-value">{{ impact.totalRecycled }}</span>
        </div>
        <div class="impact-row">
          <span class="impact-label">公益贡献次数</span>
          <span class="impact-value">{{ impact.totalDonations }}</span>
        </div>
        <div class="impact-row">
          <span class="impact-label">CO2 减排</span>
          <span class="impact-value">{{ impact.co2Reduced }}</span>
        </div>
        <div class="impact-divider"></div>
        <div class="impact-row impact-row--highlight">
          <span class="impact-label">当前环保积分</span>
          <div class="points-display">
            <span class="material-symbols-outlined points-icon">workspace_premium</span>
            <span class="points-value">{{ impact.ecoPoints }}</span>
          </div>
        </div>
      </div>
      <button class="btn-points-mall" @click="emit('enter-points-mall')">进入积分商城</button>
    </div>

    <div class="faq-card">
      <h4 class="faq-title">快速帮助</h4>
      <ul class="faq-list">
        <li
          v-for="item in faqItems"
          :key="item.id"
          class="faq-item"
          @click="emit('faq-click', item)"
        >
          <span>{{ item.question }}</span>
          <span class="material-symbols-outlined">chevron_right</span>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.side-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.impact-card {
  padding: 2rem;
  border-radius: 2rem;
  background: #061b0e;
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

.impact-card::after {
  content: "";
  position: absolute;
  bottom: -2.5rem;
  right: -2.5rem;
  width: 8rem;
  height: 8rem;
  border-radius: 50%;
  background: rgba(198, 236, 201, 0.1);
  filter: blur(64px);
  pointer-events: none;
}

.impact-title {
  margin: 0 0 1.5rem;
  font-family: "Manrope", var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  position: relative;
  z-index: 1;
}

.impact-stats {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
  z-index: 1;
}

.impact-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.impact-label {
  font-size: 0.875rem;
  opacity: 0.8;
}

.impact-value {
  font-family: "Manrope", var(--font-data);
  font-size: 1.5rem;
  font-weight: 800;
}

.impact-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.impact-row--highlight {
  margin-top: 0;
}

.points-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.points-icon {
  color: #c6ecc9;
}

.points-value {
  font-family: "Manrope", var(--font-data);
  font-size: 1.875rem;
  font-weight: 800;
  color: #c6ecc9;
}

.btn-points-mall {
  width: 100%;
  margin-top: 2rem;
  padding: 0.75rem;
  border: none;
  border-radius: 1rem;
  background: #c6ecc9;
  color: #01210c;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s ease;
  position: relative;
  z-index: 1;
}

.btn-points-mall:hover {
  opacity: 0.9;
}

.faq-card {
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: white;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.faq-title {
  margin: 0 0 1rem;
  font-family: "Manrope", var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  color: #1a1c19;
}

.faq-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.faq-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: #1a1c19;
  cursor: pointer;
  transition: color 0.2s ease;
}

.faq-item:hover {
  color: #061b0e;
}

.faq-item .material-symbols-outlined {
  color: #737973;
  font-size: 1.125rem;
}
</style>
