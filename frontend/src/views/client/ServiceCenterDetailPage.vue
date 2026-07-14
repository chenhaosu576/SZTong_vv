<script setup>
// frontend/src/views/client/ServiceCenterDetailPage.vue
// 服务网点详情页 —— 通过 serviceCentersStore 调 /api/v1/client/service-centers/:code。
// 路由 param 名为 siteId,实际取值是服务站 code(如 "xuhui-caohejing"),对齐 seeders/001-demo-data.js。
//
// 字段映射说明:旧 mock 字段 hours/services/distance/ctaTo 不在新接口返回里;页面按后端
// 实际字段渲染(status/businessHours/city/district/phone),缺数据的 fact 行降级隐藏。
//
// 进入页面同时拉详情与可预约时段,两条链路在 store 内 loading/errorText 互相独立;
// 时段区块按 serviceDate 分组,available=false 的 slot 渲染为"已约满"。

import { computed, onMounted, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { useServiceCentersStore } from "../../stores/serviceCenters";

const route = useRoute();
const centersStore = useServiceCentersStore();

const loading = computed(() => centersStore.loading);
const errorText = computed(() => centersStore.errorText);
const center = computed(() => centersStore.current);

const slots = computed(() => centersStore.slots);
const slotsLoading = computed(() => centersStore.slotsLoading);
const slotsErrorText = computed(() => centersStore.slotsErrorText);

const displayStatus = computed(() => {
  if (!center.value) return "";
  return center.value.status === 1 ? "营业中" : "已下线";
});

const detailFacts = computed(() => {
  if (!center.value) return [];
  const facts = [];
  if (displayStatus.value) {
    facts.push({ label: "营业状态", value: displayStatus.value });
  }
  if (center.value.businessHours) {
    facts.push({ label: "服务时段", value: center.value.businessHours });
  }
  const region = [center.value.city, center.value.district]
    .filter(Boolean)
    .join(" · ");
  if (region) {
    facts.push({ label: "所在区域", value: region });
  }
  return facts;
});

const regionText = computed(() => {
  if (!center.value) return "";
  return [center.value.city, center.value.district]
    .filter(Boolean)
    .join(" · ");
});

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const slotsByDate = computed(() => {
  const groups = new Map();
  for (const slot of slots.value) {
    if (!groups.has(slot.date)) groups.set(slot.date, []);
    groups.get(slot.date).push(slot);
  }
  return Array.from(groups, ([date, items]) => ({ date, items }));
});

function formatSlotDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = WEEKDAY_LABELS[dt.getDay()];
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${weekday} · ${mm}月${dd}日`;
}

async function loadCenter(siteId = route.params.siteId) {
  await Promise.all([
    centersStore.fetchDetail(siteId),
    centersStore.fetchSlots(siteId),
  ]);
}

onMounted(() => {
  loadCenter();
});

watch(
  () => route.params.siteId,
  (siteId) => {
    loadCenter(siteId);
  },
);
</script>

<template>
  <section class="service-detail-page">
    <template v-if="loading">
      <div class="loading-shimmer detail-skeleton detail-skeleton--hero" />
      <div class="loading-shimmer detail-skeleton" />
    </template>

    <template v-else-if="center">
      <header class="detail-hero">
        <div>
          <p class="eyebrow">服务网点详情</p>
          <h1>{{ center.name }}</h1>
          <p class="detail-address">{{ center.address }}</p>
        </div>
        <RouterLink class="btn" to="/recycle-booking">去预约回收</RouterLink>
      </header>

      <section class="detail-grid">
        <article class="detail-card">
          <p class="card-label">网点概况</p>
          <div class="fact-list">
            <article
              v-for="item in detailFacts"
              :key="item.label"
              class="fact-item"
            >
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </article>

        <article class="detail-card">
          <p class="card-label">覆盖区域</p>
          <p class="detail-description">{{ regionText }}</p>
        </article>
      </section>

      <section class="detail-card detail-card--wide">
        <p class="card-label">可预约时段</p>
        <template v-if="slotsLoading">
          <div class="slots-skeleton">
            <div class="loading-shimmer slot-skeleton" />
            <div class="loading-shimmer slot-skeleton" />
            <div class="loading-shimmer slot-skeleton" />
          </div>
        </template>
        <template v-else-if="slotsByDate.length">
          <div class="slot-day-list">
            <article
              v-for="day in slotsByDate"
              :key="day.date"
              class="slot-day"
            >
              <p class="slot-day-label">{{ formatSlotDate(day.date) }}</p>
              <div class="slot-pills">
                <div
                  v-for="slot in day.items"
                  :key="slot.id"
                  class="slot-pill"
                  :class="{ 'slot-pill--full': !slot.available }"
                >
                  <span class="slot-period">{{ slot.period }}</span>
                  <span class="slot-meta">
                    <template v-if="slot.available">
                      余 {{ slot.capacity - slot.reservedCount }} / {{ slot.capacity }}
                    </template>
                    <template v-else>已约满</template>
                  </span>
                </div>
              </div>
            </article>
          </div>
        </template>
        <p v-else-if="slotsErrorText" class="state-error">
          {{ slotsErrorText }}
        </p>
        <p v-else class="slot-empty">近期没有可预约时段</p>
      </section>

      <section class="detail-card detail-card--wide">
        <p class="card-label">服务说明</p>
        <p class="detail-description">{{ center.description }}</p>
        <p v-if="center.phone" class="detail-contact">
          联系方式：{{ center.phone }}
        </p>
      </section>
    </template>

    <section v-else class="empty-state">
      <p class="eyebrow">未找到网点</p>
      <h1>这个服务网点暂时不存在或已下线</h1>
      <p>你可以先返回首页查看其他精选网点，或直接前往预约页继续发起回收。</p>
      <div class="empty-actions">
        <RouterLink class="btn" to="/">返回首页</RouterLink>
        <RouterLink class="btn btn--ghost" to="/recycle-booking">去预约回收</RouterLink>
      </div>
    </section>

    <p v-if="errorText" class="state-error">{{ errorText }}</p>
  </section>
</template>

<style scoped>
.service-detail-page {
  display: grid;
  gap: 22px;
  padding-bottom: 14px;
}

.detail-skeleton {
  min-height: 220px;
  border-radius: 30px;
}

.detail-skeleton--hero {
  min-height: 260px;
}

.detail-hero,
.detail-card,
.empty-state {
  border-radius: 30px;
  border: 1px solid rgba(36, 78, 54, 0.14);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(247, 245, 237, 0.9)),
    #fffdf8;
  box-shadow: 0 24px 70px rgba(20, 48, 32, 0.1);
}

.detail-hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: end;
  padding: clamp(24px, 4vw, 36px);
}

.detail-hero h1 {
  margin: 12px 0 0;
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 4vw, 3.8rem);
  line-height: 1.08;
  color: var(--ink-900);
}

.detail-address,
.detail-description,
.detail-contact,
.empty-state p:last-of-type {
  color: var(--ink-600);
  line-height: 1.8;
}

.detail-address {
  margin: 16px 0 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.detail-card {
  display: grid;
  gap: 18px;
  padding: 24px;
}

.detail-card--wide {
  gap: 12px;
}

.card-label {
  margin: 0;
  color: var(--forest-600);
  font-family: var(--font-data);
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.fact-list {
  display: grid;
  gap: 12px;
}

.fact-item {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(34, 78, 54, 0.1);
}

.fact-item span {
  color: var(--ink-600);
  font-size: 0.86rem;
}

.fact-item strong {
  color: var(--ink-900);
  font-size: 1rem;
}

.detail-description,
.detail-contact {
  margin: 0;
}

.empty-state {
  display: grid;
  gap: 14px;
  padding: clamp(24px, 4vw, 40px);
  text-align: center;
}

.empty-state h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3.2rem);
  color: var(--ink-900);
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 900px) {
  .detail-hero,
  .detail-grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .detail-hero {
    align-items: start;
  }
}

@media (max-width: 640px) {
  .detail-card,
  .detail-hero,
  .empty-state {
    padding: 20px;
    border-radius: 24px;
  }

  .empty-actions {
    flex-direction: column;
  }

  .empty-actions > * {
    width: 100%;
  }

  .slot-pill {
    min-width: 0;
    flex: 1 1 calc(50% - 5px);
  }
}

.slot-day-list {
  display: grid;
  gap: 14px;
}

.slot-day {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(34, 78, 54, 0.1);
}

.slot-day-label {
  margin: 0;
  font-family: var(--font-data);
  font-size: 0.86rem;
  color: var(--ink-600);
  letter-spacing: 0.04em;
}

.slot-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.slot-pill {
  display: grid;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(246, 232, 199, 0.5);
  border: 1px solid rgba(34, 78, 54, 0.12);
  min-width: 140px;
}

.slot-pill--full {
  background: rgba(220, 220, 220, 0.5);
  border-color: rgba(120, 120, 120, 0.18);
  color: rgba(60, 60, 60, 0.55);
}

.slot-period {
  font-family: var(--font-data);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink-900);
}

.slot-pill--full .slot-period {
  color: inherit;
}

.slot-meta {
  font-size: 0.78rem;
  color: var(--ink-600);
}

.slot-pill--full .slot-meta {
  color: inherit;
}

.slot-skeleton {
  height: 56px;
  border-radius: 14px;
}

.slots-skeleton {
  display: grid;
  gap: 10px;
}

.slot-empty {
  margin: 0;
  color: var(--ink-600);
  font-size: 0.92rem;
}
</style>
