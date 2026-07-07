<!--
  ProfileImpactDashboard.vue
  环境足迹 (Impact Dashboard) 整区:
    - 周期 tabs: 本周 / 本月 / 季度
    - 能耗卡 + CO2 卡 (两张 metric 卡 inline, 通过 v-for 渲染避免模板重复)
    - 积分卡 + rewards banner
  Page 通过标量 prop 喂入 :points (积分) / :weekly-trend (周趋势数组);
  :selected-period / @update:selected-period 暴露周期状态 (v-model 写法)。
-->

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  points: { type: Number, default: 0 },
  weeklyTrend: { type: Array, default: () => [] },
  selectedPeriod: { type: String, default: "本月" },
});

const emit = defineEmits(["update:selected-period"]);

function setPeriod(value) {
  emit("update:selected-period", value);
}

const hoveredBarIndex = ref(null);
const hoveredPointIndex = ref(null);

// 能耗 / CO2 卡片配置: 共享 chart 模板, 通过 formatBar / formatPoint 函数
// 让单位 (kWh / kg × 0.15) 差异落到 panel 内部, page 不感知。
const METRIC_CONFIG = [
  {
    key: "energy",
    label: "已节约能源",
    gradientId: "energyGradient",
    formatBarValue: (v) => `${v} kWh`,
    formatPointValue: (v) => `${v} kWh`,
  },
  {
    key: "co2",
    label: "减少二氧化碳",
    gradientId: "co2Gradient",
    formatBarValue: (v) => `${(v * 0.15).toFixed(1)} kg`,
    formatPointValue: (v) => `${(v * 0.15).toFixed(1)} kg`,
  },
];

// 生成随机柱状图数据 (30% active, height 40-100%)
function generateRandomBars(count) {
  const bars = [];
  const activeCount = Math.floor(count * 0.3);
  const activeIndices = new Set();
  while (activeIndices.size < activeCount) {
    activeIndices.add(Math.floor(Math.random() * count));
  }
  for (let i = 0; i < count; i++) {
    const height = Math.floor(Math.random() * 60) + 40;
    const active = activeIndices.has(i);
    bars.push({
      height,
      active,
      value: active ? Math.floor(height * 0.8) : Math.floor(height * 0.5),
    });
  }
  return bars;
}

// 生成折线图数据点 (12 个, 略微上升趋势, yPercent 翻转)
function generateLineChartPoints(count) {
  const points = [];
  let lastValue = 50;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.3) * 20;
    lastValue = Math.max(30, Math.min(100, lastValue + change));
    points.push({
      x: (i / (count - 1)) * 100,
      y: 100 - lastValue,
      value: Math.floor(lastValue),
    });
  }
  return points;
}

// 生成 SVG path (M + L 命令)
function generateLinePath(points) {
  if (points.length === 0) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}

// 根据周期和 metric key 生成数据; 能耗和 CO2 仅 unit / 倍数不同, 这里
// 共享 data 结构, 单位差异由模板内的 format* 函数承担。
function metricData(metricKey) {
  if (props.selectedPeriod === "本周") {
    return {
      value: metricKey === "energy" ? 458 : 12.4,
      unit: metricKey === "energy" ? "kWh" : "kg",
      trend: metricKey === "energy" ? "+5.2%" : "+3.8%",
      chartType: "bar",
      bars: generateRandomBars(7),
      labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    };
  }
  if (props.selectedPeriod === "本月") {
    return {
      value: metricKey === "energy" ? 1842 : 48.6,
      unit: metricKey === "energy" ? "kWh" : "kg",
      trend: metricKey === "energy" ? "+8.3%" : "+6.5%",
      chartType: "bar",
      bars: generateRandomBars(30),
      labels: Array.from({ length: 30 }, (_, i) => `${i + 1}日`),
    };
  }
  return {
    value: metricKey === "energy" ? 5526 : 145.8,
    unit: metricKey === "energy" ? "kWh" : "kg",
    trend: metricKey === "energy" ? "+12.1%" : "+9.7%",
    chartType: "line",
    points: generateLineChartPoints(12),
    labels: ["第1周", "第2周", "第3周", "第4周", "第5周", "第6周", "第7周", "第8周", "第9周", "第10周", "第11周", "第12周"],
  };
}

const metricCards = computed(() =>
  METRIC_CONFIG.map((config) => ({ ...config, data: metricData(config.key) })),
);

function metricConfig(key) {
  return METRIC_CONFIG.find((config) => config.key === key);
}
</script>

<template>
  <section class="impact-dashboard">
    <div class="section-header">
      <h2 class="section-title">环境足迹</h2>
      <div class="period-tabs">
        <button
          :class="['tab', { active: selectedPeriod === '本周' }]"
          @click="setPeriod('本周')"
        >本周</button>
        <button
          :class="['tab', { active: selectedPeriod === '本月' }]"
          @click="setPeriod('本月')"
        >本月</button>
        <button
          :class="['tab', { active: selectedPeriod === '季度' }]"
          @click="setPeriod('季度')"
        >季度</button>
      </div>
    </div>

    <div class="metrics-grid">
      <div
        v-for="metric in metricCards"
        :key="metric.key"
        class="metric-card"
      >
        <div class="metric-header">
          <span class="metric-label">{{ metric.label }}</span>
          <span class="metric-trend">
            <span class="trend-icon">↑</span>{{ metric.data.trend }}
          </span>
        </div>
        <div class="metric-value">
          {{ metric.data.value }} <span class="metric-unit">{{ metric.data.unit }}</span>
        </div>

        <!-- 柱状图 -->
        <div v-if="metric.data.chartType === 'bar'" class="mini-chart">
          <div
            v-for="(bar, index) in metric.data.bars"
            :key="index"
            class="bar"
            :class="{ active: bar.active, hovered: hoveredBarIndex === index }"
            :style="{ height: bar.height + '%' }"
            @mouseenter="hoveredBarIndex = index"
            @mouseleave="hoveredBarIndex = null"
          >
            <div v-if="hoveredBarIndex === index" class="bar-tooltip">
              <div class="tooltip-label">{{ metric.data.labels[index] }}</div>
              <div class="tooltip-value">{{ metric.formatBarValue(bar.value) }}</div>
            </div>
          </div>
        </div>

        <!-- 折线图 -->
        <div v-else class="line-chart">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient :id="metric.gradientId" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#006418;stop-opacity:0.2" />
                <stop offset="100%" style="stop-color:#006418;stop-opacity:0" />
              </linearGradient>
            </defs>
            <path
              :d="generateLinePath(metric.data.points) + ' L 100 100 L 0 100 Z'"
              :fill="`url(#${metric.gradientId})`"
            />
            <path
              :d="generateLinePath(metric.data.points)"
              fill="none"
              stroke="#006418"
              stroke-width="2"
              vector-effect="non-scaling-stroke"
            />
            <circle
              v-for="(point, index) in metric.data.points"
              :key="index"
              :cx="point.x"
              :cy="point.y"
              :r="hoveredPointIndex === index ? 4 : 2"
              :fill="hoveredPointIndex === index ? '#2a6b2c' : '#006418'"
              @mouseenter="hoveredPointIndex = index"
              @mouseleave="hoveredPointIndex = null"
              style="cursor: pointer; transition: all 0.2s;"
            />
          </svg>
          <div
            v-if="hoveredPointIndex !== null"
            class="line-tooltip"
            :style="{
              left: metric.data.points[hoveredPointIndex].x + '%',
              top: metric.data.points[hoveredPointIndex].y + '%',
            }"
          >
            <div class="tooltip-label">{{ metric.data.labels[hoveredPointIndex] }}</div>
            <div class="tooltip-value">{{ metric.formatPointValue(metric.data.points[hoveredPointIndex].value) }}</div>
          </div>
        </div>
      </div>

      <!-- Metric 3: Points -->
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">当前累计积分</span>
          <span class="metric-rank">月度排行 #42</span>
        </div>
        <div class="metric-value points">
          {{ points }} <span class="metric-unit">pts</span>
        </div>
        <div class="rewards-banner">
          <span class="rewards-icon">🎁</span>
          <span class="rewards-text">您有 2 个可兑换奖励</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.impact-dashboard {
  margin-bottom: 6rem;
  animation: fadeInUp 0.5s ease forwards;
  animation-delay: 0.2s;
  opacity: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 3rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(64, 73, 61, 0.1);
}

.section-title {
  font-size: 1.875rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.period-tabs {
  display: flex;
  gap: 2rem;
}

.tab {
  font-size: 0.875rem;
  font-weight: 500;
  color: #40493d;
  background: none;
  border: none;
  padding-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 2px solid transparent;
}

.tab.active {
  font-weight: 700;
  color: #006418;
  border-bottom-color: #006418;
}

.tab:hover:not(.active) {
  color: #1a1c19;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4rem;
  align-items: flex-end;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  color: #40493d;
  font-weight: 500;
}

.metric-trend {
  color: #006418;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.metric-rank {
  color: #40493d;
  font-size: 0.75rem;
  font-weight: 500;
}

.metric-value {
  font-size: 3.75rem;
  font-weight: 900;
  letter-spacing: -0.05em;
}

.metric-value.points {
  color: #006418;
}

.metric-unit {
  font-size: 1.25rem;
  font-weight: 500;
  color: #40493d;
  margin-left: 0.25rem;
}

.mini-chart {
  height: 6rem;
  display: flex;
  align-items: flex-end;
  gap: 0.375rem;
  position: relative;
}

.mini-chart .bar {
  flex: 1;
  background: #eeeee9;
  border-radius: 0.125rem 0.125rem 0 0;
  transition: all 0.3s;
  position: relative;
  cursor: pointer;
}

.mini-chart .bar:hover {
  opacity: 0.8;
}

.mini-chart .bar.active {
  background: #006418;
}

.mini-chart .bar.hovered {
  transform: scaleY(1.05);
  filter: brightness(1.1);
}

.bar-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: linear-gradient(135deg, #2f5f43, #006418);
  color: white;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 100, 24, 0.3);
  z-index: 100;
  animation: tooltipFadeIn 0.2s ease;
  pointer-events: none;
}

.bar-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #006418;
}

.tooltip-label {
  font-size: 0.625rem;
  opacity: 0.9;
  margin-bottom: 0.125rem;
}

.tooltip-value {
  font-size: 0.875rem;
  font-weight: 700;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.line-chart {
  height: 6rem;
  width: 100%;
  position: relative;
}

.line-chart svg {
  width: 100%;
  height: 100%;
}

.line-chart path {
  transition: stroke-dashoffset 0.5s ease;
}

.line-chart circle {
  transition: all 0.3s ease;
}

.line-tooltip {
  position: absolute;
  transform: translate(-50%, -120%);
  padding: 0.375rem 0.625rem;
  background: linear-gradient(135deg, #2f5f43, #006418);
  color: white;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 100, 24, 0.3);
  z-index: 100;
  animation: tooltipFadeIn 0.2s ease;
  pointer-events: none;
}

.line-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #006418;
}

.rewards-banner {
  height: 6rem;
  display: flex;
  align-items: center;
  padding: 1.25rem;
  background: rgba(0, 100, 24, 0.05);
  border-radius: 1rem;
  gap: 1rem;
  border: 1px solid rgba(0, 100, 24, 0.1);
}

.rewards-icon {
  font-size: 1.5rem;
}

.rewards-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #006418;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1024px) {
  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
}
</style>