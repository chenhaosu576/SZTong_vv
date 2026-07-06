<!--
  OrdersHeaderPanel.vue
  服务记录中心 hero 整区:
    - 页面标题 + 副标题 + "开启新服务" 按钮
    - Tabs 切换 (全部记录 / 回收预约 / 公益捐赠)
    - 5 张状态卡片 (全部记录 / 进行中 / 待核验 / 已完成 / 已取消)
  Page 喂入 activeTab + tabs + statusStats, 经 update:active-tab / new-service
  emit 上抛; panel 内部不持有任何业务 ref, 不调 useOrdersList,
  不直接 import fetchOrders。
-->

<script setup>
defineProps({
  activeTab: { type: String, required: true },
  tabs: { type: Array, required: true },
  statusStats: { type: Object, required: true },
});

const emit = defineEmits(["update:active-tab", "new-service"]);

function selectTab(tab) {
  emit("update:active-tab", tab);
}

function handleNewService() {
  emit("new-service");
}
</script>

<template>
  <header class="orders-header" data-reveal>
    <div>
      <h1 class="page-title">服务记录中心</h1>
      <p class="page-subtitle">查看回收预约、公益捐赠等服务进度与环保结果</p>
    </div>
    <div class="header-actions">
      <button class="btn-new-service" @click="handleNewService">
        <span class="material-symbols-outlined">add_circle</span>
        开启新服务
      </button>
    </div>
  </header>

  <nav class="tabs-nav" data-reveal style="--reveal-delay: 60ms">
    <button
      v-for="tab in tabs"
      :key="tab"
      :class="['tab-btn', { active: activeTab === tab }]"
      @click="selectTab(tab)"
    >
      {{ tab }}
    </button>
  </nav>

  <div class="status-stats" data-reveal style="--reveal-delay: 80ms">
    <div class="stat-card stat-card--primary">
      <div class="stat-value">{{ statusStats.total }}</div>
      <div class="stat-label">全部记录</div>
      <div class="stat-desc">累计参与次数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ statusStats.processing }}</div>
      <div class="stat-label">进行中</div>
      <div class="stat-desc">等待处理的服务</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ statusStats.pending }}</div>
      <div class="stat-label">待核验</div>
      <div class="stat-desc">正在处理中心核对</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ statusStats.completed }}</div>
      <div class="stat-label">已完成</div>
      <div class="stat-desc">记录已存档</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ statusStats.cancelled }}</div>
      <div class="stat-label">已取消</div>
      <div class="stat-desc">已失效的申请</div>
    </div>
  </div>
</template>

<style scoped>
.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.page-title {
  margin: 0 0 0.5rem;
  font-family: "Manrope", var(--font-display);
  font-size: clamp(2.5rem, 5vw, 3rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #061b0e;
}

.page-subtitle {
  margin: 0;
  font-size: 1.125rem;
  line-height: 1.6;
  color: #434843;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-new-service {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 1rem;
  background: #061b0e;
  color: white;
  font-family: "Manrope", var(--font-body);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-new-service:hover {
  opacity: 0.9;
}

.tabs-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-bottom: 1px solid #e3e3de;
  overflow-x: auto;
}

.tab-btn {
  padding: 1rem 1.5rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #434843;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  border-bottom-color: #061b0e;
  color: #061b0e;
  font-weight: 700;
}

.tab-btn:hover {
  color: #061b0e;
}

.status-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1.25rem;
  border-radius: 1.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.stat-card:hover {
  background: #f4f4ef;
}

.stat-card--primary {
  background: #061b0e;
  color: white;
}

.stat-value {
  font-family: "Manrope", var(--font-data);
  font-size: 1.875rem;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-card .stat-value {
  color: #061b0e;
}

.stat-card.stat-card--primary .stat-value {
  color: #f6fff6;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.stat-card .stat-label {
  color: #434843;
}

.stat-desc {
  font-size: 0.625rem;
  opacity: 0.7;
}

.stat-card .stat-desc {
  color: #737973;
}

.stat-card.stat-card--primary .stat-label {
  color: #dcebdc;
  opacity: 1;
}

.stat-card.stat-card--primary .stat-desc {
  color: #b7cfb9;
  opacity: 1;
}

@media (max-width: 768px) {
  .orders-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .status-stats {
    grid-template-columns: 1fr;
  }
}
</style>
