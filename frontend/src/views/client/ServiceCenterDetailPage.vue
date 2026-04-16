<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { fetchServiceCenterById } from "../../mock/clientApi";

const route = useRoute();

const loading = ref(true);
const errorText = ref("");
const center = ref(null);

const detailFacts = computed(() => {
  if (!center.value) return [];

  return [
    { label: "营业状态", value: center.value.status },
    { label: "服务时段", value: center.value.hours },
    { label: "距离参考", value: center.value.distance },
  ];
});

async function loadCenter(siteId = route.params.siteId) {
  loading.value = true;
  errorText.value = "";

  try {
    center.value = await fetchServiceCenterById(siteId);
  } catch {
    errorText.value = "服务网点信息加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
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
        <RouterLink class="btn" :to="center.ctaTo">去预约回收</RouterLink>
      </header>

      <section class="detail-grid">
        <article class="detail-card">
          <p class="card-label">网点概况</p>
          <div class="fact-list">
            <article v-for="item in detailFacts" :key="item.label" class="fact-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </article>

        <article class="detail-card">
          <p class="card-label">服务范围</p>
          <div class="service-tags">
            <span v-for="item in center.services" :key="item">{{ item }}</span>
          </div>
        </article>
      </section>

      <section class="detail-card detail-card--wide">
        <p class="card-label">服务说明</p>
        <p class="detail-description">{{ center.description }}</p>
        <p v-if="center.contact" class="detail-contact">联系方式：{{ center.contact }}</p>
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

.service-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.service-tags span {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(240, 245, 238, 0.94);
  color: var(--forest-700);
  border: 1px solid rgba(36, 80, 56, 0.12);
  font-size: 0.84rem;
  font-weight: 700;
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
