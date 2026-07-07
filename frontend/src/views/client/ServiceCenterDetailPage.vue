<script setup>
// frontend/src/views/client/ServiceCenterDetailPage.vue
// 服务网点详情页 —— 通过 serviceCentersStore 调 /api/v1/client/service-centers/:code。
// 路由 param 名为 siteId,实际取值是服务站 code(如 "xuhui-caohejing"),对齐 seeders/001-demo-data.js。
//
// 字段映射说明:旧 mock 字段 hours/services/distance/ctaTo 不在新接口返回里;页面按后端
// 实际字段渲染(status/businessHours/city/district/phone),缺数据的 fact 行降级隐藏。

import { computed, onMounted, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { useServiceCentersStore } from "../../stores/serviceCenters";

const route = useRoute();
const centersStore = useServiceCentersStore();

const loading = computed(() => centersStore.loading);
const errorText = computed(() => centersStore.errorText);
const center = computed(() => centersStore.current);

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

async function loadCenter(siteId = route.params.siteId) {
  await centersStore.fetchDetail(siteId);
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
}
</style>
