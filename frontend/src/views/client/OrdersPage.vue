<script setup>
import { computed, onMounted, ref } from "vue";

import { useRevealOnScroll } from "../../composables/useRevealOnScroll";
import { fetchOrders } from "../../mock/clientApi";

const pageRef = ref(null);
useRevealOnScroll(pageRef);

const loading = ref(true);
const errorText = ref("");
const allOrders = ref([]);
const keyword = ref("");
const activeTab = ref("全部记录");
const serviceTypeFilter = ref("所有服务类型");
const timeFilter = ref("最近30天");

const tabs = ["全部记录", "回收预约", "公益捐赠"];

function getNormalizedType(item) {
  return String(item?.type || "").trim();
}

function isDonationOrder(item) {
  return getNormalizedType(item).includes("捐赠");
}

function isRecyclingOrder(item) {
  return getNormalizedType(item).includes("回收");
}

function getStatusStage(status) {
  const normalizedStatus = String(status || "").trim();

  if (!normalizedStatus) return "pending";
  if (normalizedStatus.includes("取消") || normalizedStatus.includes("失效")) return "cancelled";
  if (normalizedStatus.includes("完成") || normalizedStatus.includes("签收")) return "completed";
  if (
    normalizedStatus.includes("待") ||
    normalizedStatus.includes("确认") ||
    normalizedStatus.includes("核验")
  ) {
    return "pending";
  }
  if (
    normalizedStatus.includes("处理") ||
    normalizedStatus.includes("派送") ||
    normalizedStatus.includes("转运") ||
    normalizedStatus.includes("配送")
  ) {
    return "processing";
  }

  return "pending";
}

const filteredOrders = computed(() => {
  return allOrders.value.filter((item) => {
    const query = keyword.value.trim().toLowerCase();
    const passKeyword =
      !query ||
      String(item?.id || "").toLowerCase().includes(query) ||
      getNormalizedType(item).toLowerCase().includes(query) ||
      String(item?.station || "").toLowerCase().includes(query);
    const passTab =
      activeTab.value === "全部记录" ||
      (activeTab.value === "回收预约" && isRecyclingOrder(item)) ||
      (activeTab.value === "公益捐赠" && isDonationOrder(item));
    const passServiceType =
      serviceTypeFilter.value === "所有服务类型" ||
      (serviceTypeFilter.value === "回收预约" && isRecyclingOrder(item)) ||
      (serviceTypeFilter.value === "公益捐赠" && isDonationOrder(item)) ||
      (serviceTypeFilter.value === "旧物改造" && !isRecyclingOrder(item) && !isDonationOrder(item));

    return passKeyword && passTab && passServiceType;
  });
});

const statusStats = computed(() => {
  const stats = {
    total: allOrders.value.length,
    processing: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  };
  allOrders.value.forEach((item) => {
    const stage = getStatusStage(item.status);
    stats[stage]++;
  });
  return stats;
});

const totalRecycled = computed(() => "24.5 kg");
const totalDonations = computed(() => "5 次");
const co2Reduced = computed(() => "12.8 kg");
const ecoPoints = computed(() => "1,480");

const showDrawer = ref(false);
const selectedOrder = ref(null);
const selectedOrderIsDonation = computed(() => isDonationOrder(selectedOrder.value));

function splitOrderTime(time = "") {
  const [date = "", ...periodParts] = String(time || "").trim().split(" ");

  return {
    date: date.trim(),
    period: periodParts.join(" ").trim(),
  };
}

function getOrderDate(order) {
  if (!order) return "";
  if (order.date) return order.date;
  return splitOrderTime(order.time).date;
}

function getOrderPeriod(order) {
  if (!order) return "";
  if (order.period) return order.period;
  return splitOrderTime(order.time).period;
}

function getCategoryText(order) {
  if (!order) return "";
  if (order.category) return order.category;
  return String(order.type || "").replace(/回收预约$/, "").trim();
}

function getDisplayText(value, fallback = "暂无") {
  const normalizedValue = String(value || "").trim();
  return normalizedValue || fallback;
}

function getNoteText(order) {
  const normalizedValue = String(order?.note || "").trim();
  return normalizedValue || "无";
}

function openProgressDrawer(item) {
  selectedOrder.value = item;
  showDrawer.value = true;
}

function closeDrawer() {
  showDrawer.value = false;
  setTimeout(() => {
    selectedOrder.value = null;
  }, 300);
}

async function loadOrders() {
  loading.value = true;
  errorText.value = "";
  try {
    allOrders.value = await fetchOrders();
  } catch (error) {
    errorText.value = "订单数据加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

function getServiceTypeClass(type) {
  const normalizedType = String(type || "").trim();
  if (normalizedType.includes("捐赠")) return "donation";
  if (normalizedType.includes("回收")) return "recycling";
  return "remaking";
}

function getStatusClass(status) {
  return getStatusStage(status);
}

onMounted(loadOrders);
</script>

<template>
  <div>
    <main ref="pageRef" class="orders-page page-width">
    <!-- Header Section -->
    <div class="orders-header" data-reveal>
      <div>
        <h1 class="page-title">服务记录中心</h1>
        <p class="page-subtitle">查看回收预约、公益捐赠等服务进度与环保结果</p>
      </div>
      <div class="header-actions">
        <button class="btn-new-service">
          <span class="material-symbols-outlined">add_circle</span>
          开启新服务
        </button>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="tabs-nav" data-reveal style="--reveal-delay: 60ms">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="['tab-btn', { active: activeTab === tab }]"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Status Stats -->
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

    <!-- Filter Toolbar -->
    <div class="filter-toolbar" data-reveal style="--reveal-delay: 100ms">
      <div class="search-box">
        <span class="material-symbols-outlined search-icon">search</span>
        <input v-model="keyword" type="text" placeholder="搜索订单号或服务项" />
      </div>
      <select v-model="serviceTypeFilter" class="filter-select">
        <option>所有服务类型</option>
        <option>回收预约</option>
        <option>公益捐赠</option>
        <option>旧物改造</option>
      </select>
      <select v-model="timeFilter" class="filter-select">
        <option>最近30天</option>
        <option>最近6个月</option>
      </select>
    </div>

    <!-- Main Content Grid -->
    <div class="content-grid" data-reveal style="--reveal-delay: 120ms">
      <!-- Record List -->
      <div class="record-list">
        <template v-if="loading">
          <div class="loading-shimmer record-skeleton" />
          <div class="loading-shimmer record-skeleton" />
          <div class="loading-shimmer record-skeleton" />
        </template>

        <template v-else>
          <p v-if="!filteredOrders.length" class="empty-state">当前筛选条件下还没有匹配的订单。</p>

          <article
            v-for="item in filteredOrders"
            :key="item.id"
            :class="['record-card', `border-${getServiceTypeClass(item.type)}`]"
          >
            <div class="record-icon" :class="`icon-${getServiceTypeClass(item.type)}`">
              <span class="material-symbols-outlined">
                {{ isDonationOrder(item) ? "volunteer_activism" : isRecyclingOrder(item) ? "checkroom" : "recycling" }}
              </span>
            </div>
            <div class="record-content">
              <div class="record-header">
                <span class="record-title">{{ item.type }}</span>
                <span :class="['badge', `badge-${getServiceTypeClass(item.type)}`]">
                  {{ isDonationOrder(item) ? "公益捐赠" : isRecyclingOrder(item) ? "回收预约" : "旧物改造" }}
                </span>
                <span :class="['badge', `badge-${getStatusClass(item.status)}`]">
                  {{ item.status }}
                </span>
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
              <button class="action-btn action-btn--secondary" @click="openProgressDrawer(item)">查看进度</button>
              <button class="action-btn action-btn--outline">联系站点</button>
            </div>
          </article>
        </template>
      </div>

      <!-- Right Side Panel -->
      <aside class="side-panel">
        <!-- Impact Summary -->
        <div class="impact-card">
          <h3 class="impact-title">全平台环境足迹</h3>
          <div class="impact-stats">
            <div class="impact-row">
              <span class="impact-label">总计回收</span>
              <span class="impact-value">{{ totalRecycled }}</span>
            </div>
            <div class="impact-row">
              <span class="impact-label">公益贡献次数</span>
              <span class="impact-value">{{ totalDonations }}</span>
            </div>
            <div class="impact-row">
              <span class="impact-label">CO2 减排</span>
              <span class="impact-value">{{ co2Reduced }}</span>
            </div>
            <div class="impact-divider"></div>
            <div class="impact-row impact-row--highlight">
              <span class="impact-label">当前环保积分</span>
              <div class="points-display">
                <span class="material-symbols-outlined points-icon">workspace_premium</span>
                <span class="points-value">{{ ecoPoints }}</span>
              </div>
            </div>
          </div>
          <button class="btn-points-mall">进入积分商城</button>
        </div>

        <!-- FAQ -->
        <div class="faq-card">
          <h4 class="faq-title">快速帮助</h4>
          <ul class="faq-list">
            <li class="faq-item">
              <span>如何查看捐赠物流信息？</span>
              <span class="material-symbols-outlined">chevron_right</span>
            </li>
            <li class="faq-item">
              <span>改造服务的工期多久？</span>
              <span class="material-symbols-outlined">chevron_right</span>
            </li>
            <li class="faq-item">
              <span>积分是如何计算的？</span>
              <span class="material-symbols-outlined">chevron_right</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <p v-if="errorText" class="state-error">{{ errorText }}</p>
  </main>

  <!-- Progress Drawer Overlay -->
  <Transition name="fade">
    <div v-if="showDrawer" class="drawer-overlay" @click="closeDrawer"></div>
  </Transition>

  <!-- Progress Drawer -->
  <Transition name="slide-right">
    <div v-if="showDrawer" class="progress-drawer">
      <div class="drawer-content">
        <div class="drawer-header">
          <h2 class="drawer-title">{{ selectedOrderIsDonation ? "捐赠详情" : "回收进度" }}</h2>
          <button class="btn-close" @click="closeDrawer">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Basic Info -->
        <div class="drawer-basic-info">
          <div>
            <div class="info-label">订单编号</div>
            <div class="info-value">{{ selectedOrder?.id }}</div>
          </div>
          <span :class="['badge', `badge-${getStatusClass(selectedOrder?.status)}`]">
            {{ selectedOrder?.status }}
          </span>
        </div>

        <!-- Timeline -->
        <div class="drawer-timeline">
          <div class="timeline-line"></div>
          <div class="timeline-items">
            <div class="timeline-item completed">
              <div class="timeline-icon">
                <span class="material-symbols-outlined">check</span>
              </div>
              <div class="timeline-content">
                <div class="timeline-title">已提交申请</div>
                <div class="timeline-time">{{ selectedOrder?.time }}</div>
              </div>
            </div>
            <div class="timeline-item completed">
              <div class="timeline-icon">
                <span class="material-symbols-outlined">check</span>
              </div>
              <div class="timeline-content">
                <div class="timeline-title">{{ selectedOrderIsDonation ? "项目已接收登记" : "站点已接收" }}</div>
                <div class="timeline-time">{{ selectedOrder?.time }}</div>
              </div>
            </div>
            <div class="timeline-item active">
              <div class="timeline-icon">
                <div class="pulse-dot"></div>
              </div>
              <div class="timeline-content">
                <div class="timeline-title">{{ selectedOrder?.status }}</div>
                <div class="timeline-time highlight">当前状态</div>
              </div>
            </div>
            <div class="timeline-item pending">
              <div class="timeline-icon"></div>
              <div class="timeline-content">
                <div class="timeline-title">已完成</div>
                <div class="timeline-time">等待最终确认</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Details Content -->
        <div class="drawer-details">
          <div class="details-card">
            <h3 class="details-card-title">详细信息</h3>
            <div class="details-row">
              <span class="details-label">服务项目</span>
              <span class="details-value">{{ getDisplayText(selectedOrder?.type) }}</span>
            </div>
            <div class="details-row">
              <span class="details-label">服务网点</span>
              <span class="details-value">{{ getDisplayText(selectedOrder?.station) }}</span>
            </div>
            <div class="details-row">
              <span class="details-label">服务地址</span>
              <span class="details-value details-value--multiline">
                {{ getDisplayText(selectedOrder?.address, "未填写") }}
              </span>
            </div>
          </div>

          <div class="details-card">
            <h3 class="details-card-title">{{ selectedOrderIsDonation ? "捐赠信息" : "预约详情" }}</h3>
            <div class="details-row">
              <span class="details-label">联系人</span>
              <span class="details-value">{{ getDisplayText(selectedOrder?.contactName, "未填写") }}</span>
            </div>
            <div class="details-row">
              <span class="details-label">联系电话</span>
              <span class="details-value">{{ getDisplayText(selectedOrder?.phone, "未填写") }}</span>
            </div>
            <div class="details-row">
              <span class="details-label">{{ selectedOrderIsDonation ? "提交日期" : "预约日期" }}</span>
              <span class="details-value">{{ getDisplayText(getOrderDate(selectedOrder)) }}</span>
            </div>
            <div class="details-row">
              <span class="details-label">{{ selectedOrderIsDonation ? "物流方式" : "时间段" }}</span>
              <span class="details-value">{{ getDisplayText(getOrderPeriod(selectedOrder)) }}</span>
            </div>
            <div class="details-row">
              <span class="details-label">{{ selectedOrderIsDonation ? "物资类型" : "回收品类" }}</span>
              <span class="details-value">{{ getDisplayText(getCategoryText(selectedOrder)) }}</span>
            </div>
            <div class="details-row">
              <span class="details-label">预估重量</span>
              <span class="details-value">{{ getDisplayText(selectedOrder?.weight, "未填写") }}</span>
            </div>
            <div class="details-row">
              <span class="details-label">备注</span>
              <span class="details-value details-value--multiline">{{ getNoteText(selectedOrder) }}</span>
            </div>
          </div>

          <div class="eco-card">
            <div class="eco-header">
              <span class="material-symbols-outlined">eco</span>
              <h3>环保贡献</h3>
            </div>
            <div class="eco-stats">
              <div class="eco-stat">
                <div class="eco-stat-label">公益成就</div>
                <div class="eco-stat-value">{{ selectedOrderIsDonation ? "助力乡村" : "低碳减排" }}</div>
              </div>
              <div class="eco-stat">
                <div class="eco-stat-label">预估积分</div>
                <div class="eco-stat-value">{{ selectedOrder?.points || 120 }} pts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="btn-footer btn-footer--primary">{{ selectedOrderIsDonation ? "查看感谢信" : "查看电子凭证" }}</button>
        <button class="btn-footer btn-footer--outline">联系机构</button>
      </div>
    </div>
  </Transition>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");

.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
  vertical-align: middle;
}

.orders-page {
  padding: 2rem 0 3rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Header Section */
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

/* Tabs Navigation */
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

/* Status Stats */
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

/* Filter Toolbar */
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

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr 24rem;
  }
}

/* Record List */
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

/* Side Panel */
.side-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Impact Card */
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

/* FAQ Card */
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

/* Loading & Empty States */
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

/* Responsive */
@media (max-width: 768px) {
  .orders-page {
    padding: 1rem 0 2rem;
  }

  .orders-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .status-stats {
    grid-template-columns: 1fr;
  }

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

  .content-grid {
    grid-template-columns: 1fr;
  }

  .details-row {
    flex-direction: column;
    gap: 0.35rem;
  }

  .details-value,
  .details-value--multiline {
    max-width: none;
    text-align: left;
  }
}

/* Drawer Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

/* Drawer Overlay */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 50;
}

/* Progress Drawer */
.progress-drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  width: 100%;
  max-width: 500px;
  background: white;
  z-index: 60;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.1);
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.drawer-title {
  font-family: "Manrope", var(--font-display);
  font-size: 1.875rem;
  font-weight: 800;
  color: #061b0e;
  margin: 0;
}

.btn-close {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: #f4f4ef;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #061b0e;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-close:hover {
  background: #e8e8e3;
}

.drawer-basic-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.info-label {
  font-size: 0.75rem;
  color: #737973;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.info-value {
  font-family: "Manrope", var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  color: #1a1c19;
}

/* Timeline */
.drawer-timeline {
  position: relative;
  margin-bottom: 2.5rem;
}

.timeline-line {
  position: absolute;
  left: 11px;
  top: 1rem;
  bottom: 1rem;
  width: 2px;
  background: #e3e3de;
}

.timeline-items {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: relative;
}

.timeline-item {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.timeline-icon {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border: 4px solid white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  background: #e8e8e3;
  flex-shrink: 0;
}

.timeline-item.completed .timeline-icon {
  background: #061b0e;
  color: white;
}

.timeline-item.completed .timeline-icon .material-symbols-outlined {
  font-size: 0.75rem;
  font-variation-settings: 'FILL' 1;
}

.timeline-item.active .timeline-icon {
  background: #c6ecc9;
}

.pulse-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #061b0e;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6, 27, 14, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(6, 27, 14, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6, 27, 14, 0); }
}

.timeline-content {
  flex: 1;
}

.timeline-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1a1c19;
  margin-bottom: 0.25rem;
}

.timeline-item.pending {
  opacity: 0.4;
}

.timeline-time {
  font-size: 0.6875rem;
  color: #737973;
}

.timeline-time.highlight {
  color: #061b0e;
  font-weight: 700;
}

/* Details Content */
.drawer-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.details-card {
  background: #f4f4ef;
  padding: 1.5rem;
  border-radius: 1.5rem;
}

.details-card-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #737973;
  margin: 0 0 1rem;
}

.details-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.25rem;
  margin-bottom: 1rem;
}

.details-row:last-child {
  margin-bottom: 0;
}

.details-label {
  font-size: 0.875rem;
  color: #434843;
}

.details-value {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1a1c19;
  text-align: right;
  word-break: break-word;
}

.details-value--multiline {
  max-width: 16rem;
  white-space: normal;
}

.eco-card {
  background: #1b3022;
  color: #819986;
  padding: 1.5rem;
  border-radius: 1.5rem;
}

.eco-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.eco-header .material-symbols-outlined {
  color: #c6ecc9;
}

.eco-header h3 {
  font-family: "Manrope", var(--font-display);
  font-size: 1rem;
  font-weight: 800;
  color: white;
  margin: 0;
}

.eco-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.eco-stat-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  opacity: 0.7;
  margin-bottom: 0.25rem;
}

.eco-stat-value {
  font-family: "Manrope", var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  color: white;
}

/* Drawer Footer */
.drawer-footer {
  padding: 2rem;
  background: #f4f4ef;
  display: flex;
  gap: 0.75rem;
}

.btn-footer {
  flex: 1;
  padding: 1rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.btn-footer--primary {
  background: #061b0e;
  color: white;
  border: none;
}

.btn-footer--primary:hover {
  opacity: 0.9;
}

.btn-footer--outline {
  background: transparent;
  color: #061b0e;
  border: 1px solid #c3c8c1;
}

.btn-footer--outline:hover {
  background: white;
}
</style>
