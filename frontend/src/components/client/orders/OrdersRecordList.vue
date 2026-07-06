<!--
  OrdersRecordList.vue
  订单列表 + 顶部筛选:
    - FilterToolbar: 搜索框 (双向绑定 keyword) + service-type select
    - loading 骨架 (3 个 shimmer) / 空态文案
    - record-card 列表: icon + 标题 + 双 badge + meta + 双 action-btn
  Page 喂入 filteredOrders / keyword / serviceTypeFilter / serviceTypes /
  loading, 通过 update:keyword / update:service-type-filter /
  view-progress / contact-station 上抛。
  命名函数 (isDonationOrder / isRecyclingOrder / getServiceTypeClass /
  getStatusStage) 直接从 useOrdersList.js 顶部 import, 不通过 emit 二次
  传递 (按 spec "OrdersRecordList" 一节)。
-->

<script setup>
import {
  getServiceTypeClass,
  getStatusStage,
  isDonationOrder,
  isRecyclingOrder,
} from "@/composables/useOrdersList";

const props = defineProps({
  orders: { type: Array, required: true },
  keyword: { type: String, required: true },
  serviceTypeFilter: { type: String, required: true },
  serviceTypes: { type: Array, required: true },
  loading: { type: Boolean, required: true },
});

const emit = defineEmits(["update:keyword", "update:service-type-filter", "view-progress", "contact-station"]);

function recordIconName(item) {
  if (isDonationOrder(item)) return "volunteer_activism";
  if (isRecyclingOrder(item)) return "checkroom";
  return "recycling";
}

function recordServiceLabel(item) {
  if (isDonationOrder(item)) return "公益捐赠";
  if (isRecyclingOrder(item)) return "回收预约";
  return "旧物改造";
}
</script>

<template>
  <!-- Single root so OrdersRecordList occupies exactly one .content-grid cell;
       without this wrapper, filter-toolbar + record-list become 2 siblings
       and break the 2-column layout in OrdersPage. -->
  <section class="orders-record-list">
    <div class="filter-toolbar" data-reveal style="--reveal-delay: 100ms">
    <div class="search-box">
      <span class="material-symbols-outlined search-icon">search</span>
      <input
        type="text"
        placeholder="搜索订单号或服务项"
        :value="keyword"
        @input="emit('update:keyword', $event.target.value)"
      />
    </div>
    <select
      class="filter-select"
      :value="serviceTypeFilter"
      @change="emit('update:service-type-filter', $event.target.value)"
    >
      <option v-for="type in serviceTypes" :key="type">{{ type }}</option>
    </select>
  </div>

  <div class="record-list" data-reveal style="--reveal-delay: 120ms">
    <template v-if="loading">
      <div class="loading-shimmer record-skeleton"></div>
      <div class="loading-shimmer record-skeleton"></div>
      <div class="loading-shimmer record-skeleton"></div>
    </template>

    <template v-else>
      <p v-if="!orders.length" class="empty-state">当前筛选条件下还没有匹配的订单。</p>

      <article
        v-for="item in orders"
        :key="item.id"
        :class="['record-card', `border-${getServiceTypeClass(item.type)}`]"
      >
        <div class="record-icon" :class="`icon-${getServiceTypeClass(item.type)}`">
          <span class="material-symbols-outlined">{{ recordIconName(item) }}</span>
        </div>
        <div class="record-content">
          <div class="record-header">
            <span class="record-title">{{ item.type }}</span>
            <span :class="['badge', `badge-${getServiceTypeClass(item.type)}`]">{{ recordServiceLabel(item) }}</span>
            <span :class="['badge', `badge-${getStatusStage(item.status)}`]">{{ item.status }}</span>
          </div>
          <div class="record-meta">
            <span>编号: {{ item.id }}</span>
            <span class="meta-item">
              <span class="material-symbols-outlined">calendar_today</span>
              {{ item.time }}
            </span>
            <span class="meta-item">
              <span class="material-symbols-outlined">location_on</span>
              {{ item.station }}
            </span>
          </div>
        </div>
        <div class="record-actions">
          <button class="action-btn action-btn--secondary" @click="emit('view-progress', item)">查看进度</button>
          <button class="action-btn action-btn--outline" @click="emit('contact-station', item)">联系站点</button>
        </div>
      </article>
    </template>
  </div>
  </section>
</template>

<style scoped>
.orders-record-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #737973;
  pointer-events: none;
}

.search-box input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border: none;
  border-radius: 1rem;
  background: #e8e8e3;
  font-family: inherit;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.search-box input:focus {
  outline: none;
  background: white;
  box-shadow: 0 0 0 2px #061b0e;
}

.filter-select {
  min-width: 140px;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 1rem;
  background: #e8e8e3;
  font-family: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-select:focus {
  outline: none;
  background: white;
  box-shadow: 0 0 0 2px #061b0e;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.record-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  border-radius: 1.5rem;
  border-left: 4px solid;
  background: white;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.record-card:hover {
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  transform: translateY(-2px);
}

.record-card.border-donation {
  border-left-color: #d0e9d4;
}

.record-card.border-recycling {
  border-left-color: #061b0e;
}

.record-card.border-remaking {
  border-left-color: #061b0e;
}

.record-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.record-icon .material-symbols-outlined {
  font-size: 1.875rem;
}

.icon-donation {
  background: #e9f5ed;
  color: #2d4e34;
}

.icon-recycling {
  background: #eeeee9;
  color: #061b0e;
}

.icon-remaking {
  background: #eeeee9;
  color: #061b0e;
}

.record-content {
  flex: 1;
  min-width: 0;
}

.record-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
}

.record-title {
  font-family: "Manrope", var(--font-display);
  font-size: 1.125rem;
  font-weight: 800;
  color: #1a1c19;
}

.badge {
  padding: 0.125rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.badge-donation {
  background: #e9f5ed;
  color: #2d4e34;
}

.badge-recycling {
  background: #c6ecc9;
  color: #2d4e34;
}

.badge-remaking {
  background: #c6ecc9;
  color: #2d4e34;
}

.badge-completed {
  background: #e8e8e3;
  color: #434843;
}

.badge-processing {
  background: #d0e9d4;
  color: #364c3c;
}

.badge-pending {
  background: #d0e9d4;
  color: #364c3c;
}

.badge-cancelled {
  background: #e8e8e3;
  color: #434843;
}

.record-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: #434843;
  font-weight: 500;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-item .material-symbols-outlined {
  font-size: 0.875rem;
}

.record-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.action-btn--secondary {
  border: none;
  background: #061b0e;
  color: white;
}

.action-btn--secondary:hover {
  opacity: 0.9;
}

.action-btn--outline {
  border: 1px solid #c3c8c1;
  background: transparent;
  color: #061b0e;
}

.action-btn--outline:hover {
  background: #f4f4ef;
}

.record-skeleton {
  height: 120px;
  border-radius: 1.5rem;
}

.empty-state {
  padding: 3rem 1.5rem;
  text-align: center;
  color: #434843;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .record-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .record-actions {
    width: 100%;
  }

  .action-btn {
    flex: 1;
  }
}
</style>
