<!-- CharityDetailPanel.vue -->
<!-- 公益项目详情左栏。
     三张 detail card:描述 / 当前具体需求 / 物流指引。
     纯展示,接收 project,无交互无 emit。 -->

<script setup>
defineProps({
  project: { type: Object, required: true },
});
</script>

<template>
  <div class="detail-left">
    <div class="detail-card">
      <h2>{{ project.title }}</h2>
      <div class="detail-meta">
        <span><span class="material-symbols-outlined">location_on</span> {{ project.location }}</span>
        <span><span class="material-symbols-outlined">groups</span> 受助: {{ project.beneficiary }}</span>
      </div>
      <p>{{ project.description }}</p>
    </div>

    <div v-if="project.needs" class="detail-card needs-card">
      <h4><span class="material-symbols-outlined">fact_check</span> 当前具体需求</h4>
      <div class="needs-grid">
        <div v-for="need in project.needs" :key="need.title" class="need-item">
          <div class="need-dot"></div>
          <div>
            <p class="need-title">{{ need.title }}</p>
            <p class="need-desc">{{ need.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-card">
      <h4><span class="material-symbols-outlined">local_shipping</span> 捐赠指引及物流</h4>
      <div class="logistics-grid">
        <div>
          <p class="logistics-title">物流配送方式</p>
          <p class="logistics-desc">支持快递寄送至平台转运仓,或预约平台合作物流上门取件。上海、成都地区支持到指定社区站点投递。</p>
        </div>
        <div>
          <p class="logistics-title">全程透明追踪</p>
          <p class="logistics-desc">所有物流环节通过区块链存证,捐赠人可随时查看物资分发照片及受助学校签收单据。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-left {
  display: grid;
  gap: 32px;
}

.detail-card {
  background: white;
  padding: 32px;
  border-radius: 24px;
}

.detail-card h2 {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 800;
  color: var(--ink-900);
  margin: 0 0 16px;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 0.875rem;
  color: var(--ink-600);
  margin-bottom: 24px;
}

.detail-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-meta .material-symbols-outlined {
  font-size: 18px;
}

.detail-card p {
  color: var(--ink-600);
  line-height: 1.8;
  margin: 0;
}

.needs-card {
  border-left: 4px solid #154212;
}

.detail-card h4 {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--ink-900);
  margin: 0 0 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-card h4 .material-symbols-outlined {
  color: #154212;
}

.needs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.need-item {
  display: flex;
  align-items: start;
  gap: 12px;
}

.need-dot {
  width: 8px;
  height: 8px;
  background: #154212;
  border-radius: 50%;
  margin-top: 8px;
  flex-shrink: 0;
}

.need-title {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--ink-900);
  margin: 0 0 4px;
}

.need-desc {
  font-size: 0.75rem;
  color: var(--ink-600);
  margin: 0;
}

.logistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 32px;
}

.logistics-title {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--ink-900);
  margin: 0 0 8px;
}

.logistics-desc {
  font-size: 0.75rem;
  color: var(--ink-600);
  line-height: 1.6;
  margin: 0;
}
</style>