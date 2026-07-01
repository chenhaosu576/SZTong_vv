<!--
  ProfileCalendarSection.vue
  减排日历 section:
    - section header (legend + month navigation)
    - weekday header (Mon-Sun)
    - 日历格子 (intensity / activity icon / tooltip / highlight animation)
    - 本月 insight 文案
  Page 通过 :calendar-days / :month-text / :highlighted-day 喂入数据,
  通过 @ready(el) 拿到 section DOM (用于 scrollIntoView 滚动),
  通过 @change-month(offset) 通知 page 切换月份 (page 再调 useProfileCalendar.changeMonth)。
-->

<script setup>
import { onMounted, ref } from "vue";

defineProps({
  calendarDays: { type: Array, required: true },
  monthText: { type: String, required: true },
  highlightedDay: { type: Number, default: null },
});

const emit = defineEmits(["ready", "change-month"]);

const sectionRef = ref(null);

onMounted(() => {
  if (sectionRef.value) {
    emit("ready", sectionRef.value);
  }
});

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
</script>

<template>
  <section ref="sectionRef" class="calendar-section">
    <div class="section-header">
      <h2 class="section-title">减排日历</h2>
      <div class="calendar-controls">
        <div class="legend">
          <div class="legend-item">
            <div class="legend-dot light"></div>
            <span>轻度</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot medium"></div>
            <span>中度</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot heavy"></div>
            <span>显著</span>
          </div>
        </div>
        <div class="month-nav">
          <button class="nav-btn" @click="emit('change-month', -1)">‹</button>
          <span class="month-text">{{ monthText }}</span>
          <button class="nav-btn" @click="emit('change-month', 1)">›</button>
        </div>
      </div>
    </div>

    <div class="calendar-grid">
      <div v-for="day in WEEKDAYS" :key="day" class="calendar-weekday">{{ day }}</div>

      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        :class="[
          'calendar-day',
          {
            'empty': day.empty,
            'today': day.isToday,
            'has-activity': day.intensity > 0,
            'intensity-1': day.intensity === 1,
            'intensity-2': day.intensity === 2,
            'intensity-3': day.intensity === 3,
            'highlighted': highlightedDay === index,
          },
        ]"
      >
        <span v-if="!day.empty" class="day-number">{{ day.day }}</span>
        <div v-if="day.intensity > 0" class="activity-icon">
          <span v-if="day.intensity === 3">🌿</span>
          <span v-else-if="day.intensity === 2">🍃</span>
          <span v-else>🌱</span>
        </div>
        <div v-if="day.intensity > 0" class="day-tooltip">
          {{ day.emission.toFixed(1) }}kg CO2 Reduced
        </div>
      </div>
    </div>

    <div class="calendar-insight">
      <span class="insight-icon">💡</span>
      <p class="insight-text">
        本月精彩：你已经累计挽救了相当于 <span class="highlight">3 棵成年大树</span> 的碳减排量。
      </p>
    </div>
  </section>
</template>

<style scoped>
.calendar-section {
  margin-bottom: 6rem;
  animation: fadeInUp 0.5s ease forwards;
  animation-delay: 0.1s;
  opacity: 0;
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

.calendar-controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.legend {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition: background 0.3s;
}

.legend-item:hover {
  background: rgba(0, 100, 24, 0.05);
}

.legend-item span {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: #40493d;
}

.legend-dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  transition: transform 0.3s;
}

.legend-item:hover .legend-dot {
  transform: scale(1.25);
}

.legend-dot.light {
  background: rgba(0, 100, 24, 0.2);
}

.legend-dot.medium {
  background: rgba(0, 100, 24, 0.6);
}

.legend-dot.heavy {
  background: #006418;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn {
  color: #40493d;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.3s;
}

.nav-btn:hover {
  color: #006418;
}

.month-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1a1c19;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.3s;
}

.month-text:hover {
  color: #006418;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: transparent;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid rgba(64, 73, 61, 0.2);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  margin-bottom: 2rem;
}

.calendar-grid::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(#2E7D32 0.5px, transparent 0.5px);
  background-size: 20px 20px;
  opacity: 0.05;
  pointer-events: none;
}

.calendar-weekday {
  background: rgba(250, 250, 245, 0.6);
  backdrop-filter: blur(4px);
  padding: 0.625rem;
  text-align: center;
  font-size: 0.625rem;
  font-weight: 900;
  color: #40493d;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 1px solid rgba(64, 73, 61, 0.1);
  z-index: 10;
}

.calendar-day {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.02);
  height: 5rem;
  padding: 0.5rem;
  position: relative;
  transition: all 0.3s;
  z-index: 10;
}

.calendar-day.empty {
  background: rgba(238, 238, 233, 0.1);
}

.calendar-day.has-activity {
  cursor: pointer;
}

.calendar-day.has-activity:hover {
  background: white;
  transform: scale(1.05);
  border-color: rgba(0, 100, 24, 0.5);
  z-index: 20;
}

.calendar-day.highlighted {
  animation: highlightPulse 2s ease-in-out;
  position: relative;
  z-index: 30;
}

@keyframes highlightPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(0, 100, 24, 0.7);
  }
  10% {
    transform: scale(1.15);
    box-shadow: 0 0 0 10px rgba(0, 100, 24, 0);
  }
  20% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(0, 100, 24, 0);
  }
  30% {
    transform: scale(1.15);
    box-shadow: 0 0 0 10px rgba(0, 100, 24, 0);
  }
  40% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  60% {
    transform: scale(1);
  }
  70% {
    transform: scale(1.08);
  }
  80%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 16px rgba(0, 100, 24, 0.4);
  }
}

.calendar-day.highlighted::before {
  content: '';
  position: absolute;
  inset: -4px;
  border: 3px solid #006418;
  border-radius: 10px;
  animation: borderGlow 2s ease-in-out;
}

@keyframes borderGlow {
  0%, 100% {
    opacity: 0;
  }
  10%, 30% {
    opacity: 1;
    box-shadow: 0 0 20px rgba(0, 100, 24, 0.6);
  }
  40% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
  60% {
    opacity: 0.8;
  }
}

.calendar-day.highlighted::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  color: #006418;
  font-weight: 900;
  animation: checkmarkPop 1s ease-out;
  text-shadow: 0 2px 8px rgba(0, 100, 24, 0.3);
  z-index: 2;
}

@keyframes checkmarkPop {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0) rotate(-180deg);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.3) rotate(10deg);
  }
  70% {
    transform: translate(-50%, -50%) scale(0.9) rotate(-5deg);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
}

.calendar-day.highlighted .activity-icon {
  animation: iconBounce 1s ease-out 0.5s;
}

@keyframes iconBounce {
  0%, 100% {
    transform: translateY(0);
  }
  25% {
    transform: translateY(-10px);
  }
  50% {
    transform: translateY(0);
  }
  75% {
    transform: translateY(-5px);
  }
}

.calendar-day.intensity-1 {
  background: rgba(0, 100, 24, 0.2);
}

.calendar-day.intensity-2 {
  background: rgba(0, 100, 24, 0.2);
}

.calendar-day.intensity-3 {
  background: rgba(0, 100, 24, 0.2);
}

.day-number {
  font-size: 0.625rem;
  font-weight: 700;
  color: rgba(64, 73, 61, 0.4);
}

.calendar-day.has-activity .day-number {
  color: #1a1c19;
  opacity: 1;
  font-weight: 900;
}

.activity-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.day-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #006418;
  color: white;
  font-size: 0.625rem;
  border-radius: 0.25rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.calendar-day:hover .day-tooltip {
  opacity: 1;
}

.calendar-insight {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 100, 24, 0.05);
  border-radius: 9999px;
  border: 1px solid rgba(0, 100, 24, 0.1);
  margin: 0 auto;
  justify-content: center;
}

.insight-icon {
  font-size: 1.25rem;
}

.insight-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #40493d;
  margin: 0;
}

.insight-text .highlight {
  color: #006418;
  font-weight: 700;
}

@media (max-width: 768px) {
  .calendar-controls {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>