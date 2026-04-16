<script setup>
import { onMounted, ref } from "vue";

import { fetchTopMetrics } from "../../mock/clientApi";

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["goto-auth", "logout"]);

const loading = ref(true);
const metrics = ref({
  processedToday: 0,
  activeSites: 0,
  avgResponseHour: 0,
  carbonReducedKg: 0,
});

async function loadMetrics() {
  loading.value = true;
  try {
    metrics.value = await fetchTopMetrics();
  } finally {
    loading.value = false;
  }
}

onMounted(loadMetrics);
</script>

<template>
  <div class="top-bar">
    <div class="top-bar__inner page-width">
      <p class="top-bar__notice">
        <template v-if="loading">
          城市回收网络数据加载中...
        </template>
        <template v-else>
          今日处理 {{ metrics.processedToday }} 单 · 覆盖 {{ metrics.activeSites }} 个网点 · 平均上门响应
          {{ metrics.avgResponseHour }} 小时 · 今日减排 {{ metrics.carbonReducedKg }} kgCO2
        </template>
      </p>

      <div class="top-bar__actions">
        <template v-if="props.user">
          <span class="top-bar__user">{{ props.user.displayName }}</span>
          <button class="text-btn" @click="emit('logout')">退出</button>
        </template>
        <button v-else class="text-btn" @click="emit('goto-auth')">登录 / 注册</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-bar {
  position: relative;
  border-bottom: 1px solid rgba(214, 233, 217, 0.18);
  background: linear-gradient(92deg, #0f1f19, #1f3a30 55%, #143025);
  color: #effbf3;
}

.top-bar::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 20% 0%, rgba(152, 199, 160, 0.18), transparent 32%);
}

.top-bar__inner {
  position: relative;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.top-bar__notice {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: rgba(240, 252, 244, 0.9);
}

.top-bar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-bar__user {
  font-size: 0.82rem;
  color: rgba(240, 252, 244, 0.85);
}

.text-btn {
  border: none;
  padding: 2px 0;
  background: transparent;
  color: #b9e8c6;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.82rem;
}

.text-btn:hover {
  color: #f6fff8;
}

.text-btn:focus-visible {
  outline: 2px solid #f6fff8;
  outline-offset: 3px;
  border-radius: 4px;
}

@media (max-width: 900px) {
  .top-bar__notice {
    display: none;
  }

  .top-bar__inner {
    justify-content: flex-end;
  }
}
</style>
