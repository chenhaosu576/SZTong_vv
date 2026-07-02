<!-- OrdersPage.vue -->
<!-- 服务记录中心 view 层。
     只做编排:
       - 调 useOrdersList() 拿到 fetch / 筛选 / 状态统计
       - 持有 selectedOrder + showDrawer 两个 drawer 本地 ref
       - 持有 drawer 辅助函数: splitOrderTime / getOrderDate /
         getOrderPeriod / getCategoryText / getDisplayText
       - 持有 openProgressDrawer / closeDrawer 两个 drawer 方法
       - 渲染 3 个 panel: OrdersHeaderPanel / OrdersRecordList /
         OrdersSidePanel
       - 渲染 drawer overlay + drawer content + drawer footer +
         errorText
     业务状态(loading/errorText/keyword/activeTab/serviceTypeFilter/
     filteredOrders/statusStats/loadOrders) 全部在
     composables/useOrdersList.js。 硬编码 impact / FAQ 在
     constants/ordersPage.js。 Tabs / StatusStats / 筛选 / record-card /
     impact-card / faq-card 的 markup 与样式在
     components/client/orders/ 下三个 panel 内部。
     view 只保留: page 容器 padding / content-grid 两栏布局 /
     errorText 样式 / drawer 完整样式 / fade + slide-right 过渡。 -->

<script setup>
import { computed, onMounted, ref } from "vue";

import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import {
  getStatusStage,
  isDonationOrder,
  ORDER_TABS,
  ORDER_SERVICE_TYPES,
  useOrdersList,
} from "@/composables/useOrdersList";
import { FAQ_ITEMS, IMPACT_FALLBACK } from "@/constants/ordersPage";

import OrdersHeaderPanel from "@/components/client/orders/OrdersHeaderPanel.vue";
import OrdersRecordList from "@/components/client/orders/OrdersRecordList.vue";
import OrdersSidePanel from "@/components/client/orders/OrdersSidePanel.vue";

const pageRef = ref(null);
useRevealOnScroll(pageRef);

const {
  loading,
  errorText,
  keyword,
  activeTab,
  serviceTypeFilter,
  filteredOrders,
  statusStats,
  loadOrders,
} = useOrdersList();

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

onMounted(loadOrders);
</script>

<template>
  <div>
    <main ref="pageRef" class="orders-page page-width">
      <OrdersHeaderPanel
        :active-tab="activeTab"
        :tabs="ORDER_TABS"
        :status-stats="statusStats"
        @update:active-tab="activeTab = $event"
      />

      <div class="content-grid" data-reveal style="--reveal-delay: 120ms">
        <OrdersRecordList
          :orders="filteredOrders"
          :keyword="keyword"
          :service-type-filter="serviceTypeFilter"
          :service-types="ORDER_SERVICE_TYPES"
          :loading="loading"
          @update:keyword="keyword = $event"
          @update:service-type-filter="serviceTypeFilter = $event"
          @view-progress="openProgressDrawer"
        />

        <OrdersSidePanel :impact="IMPACT_FALLBACK" :faq-items="FAQ_ITEMS" />
      </div>

      <p v-if="errorText" class="state-error">{{ errorText }}</p>
    </main>

    <!-- Drawer Overlay -->
    <Transition name="fade">
      <div v-if="showDrawer" class="drawer-overlay" @click="closeDrawer"></div>
    </Transition>

    <!-- Drawer -->
    <Transition name="slide-right">
      <div v-if="showDrawer" class="progress-drawer">
        <div class="drawer-content">
          <div class="drawer-header">
            <h2 class="drawer-title">{{ selectedOrderIsDonation ? "捐赠详情" : "回收进度" }}</h2>
            <button class="btn-close" @click="closeDrawer">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="drawer-basic-info">
            <div>
              <div class="info-label">订单编号</div>
              <div class="info-value">{{ selectedOrder?.id }}</div>
            </div>
            <span class="badge" :class="`badge-${getStatusStage(selectedOrder?.status)}`">
              {{ selectedOrder?.status }}
            </span>
          </div>

          <div class="drawer-timeline">
            <div class="timeline-line"></div>
            <div class="timeline-items">
              <div class="timeline-item completed">
                <div class="timeline-icon"><span class="material-symbols-outlined">check</span></div>
                <div class="timeline-content">
                  <div class="timeline-title">已提交申请</div>
                  <div class="timeline-time">{{ selectedOrder?.time }}</div>
                </div>
              </div>
              <div class="timeline-item completed">
                <div class="timeline-icon"><span class="material-symbols-outlined">check</span></div>
                <div class="timeline-content">
                  <div class="timeline-title">{{ selectedOrderIsDonation ? "项目已接收登记" : "站点已接收" }}</div>
                  <div class="timeline-time">{{ selectedOrder?.time }}</div>
                </div>
              </div>
              <div class="timeline-item active">
                <div class="timeline-icon"><div class="pulse-dot"></div></div>
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
                <span class="details-value details-value--multiline">
                  {{ getDisplayText(selectedOrder?.note, "暂无") }}
                </span>
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
          <button class="btn-footer btn-footer--primary">
            {{ selectedOrderIsDonation ? "查看感谢信" : "查看电子凭证" }}
          </button>
          <button class="btn-footer btn-footer--outline">联系机构</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.orders-page {
  padding: 2rem 0 3rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
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

/* Error State */
.state-error {
  text-align: center;
  color: #b91c1c;
  font-size: 0.875rem;
  padding: 1rem 0;
}

/* Drawer status badge: 复用 record-card 的 badge 配色。
   这些类在 OrdersRecordList 的 scoped style 中,但 scoped 选择器只匹配
   自己的 data-v-hash; drawer badge 渲染在 OrdersPage 内, 因此必须
   在本页重复定义 (与 .timeline-icon 等 drawer 局部类同理)。 */
.badge {
  padding: 0.125rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
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

/* Responsive (drawer details-row stacking only; panel responsive lives in panels) */
@media (max-width: 768px) {
  .orders-page {
    padding: 1rem 0 2rem;
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