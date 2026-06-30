<!-- AppointmentScheduleSection.vue -->
<!-- Section 02 预约时间:月/周切换 + 日期卡 + 时段按钮。
     内部调用 useDatePicker() 持有日期状态机;
     selectedDate / selectedPeriod 由 view 传 form.date / form.period,
     用户操作通过 emit 回写。 -->

<script setup>
import { useDatePicker } from "@/composables/useDatePicker";

defineProps({
  selectedDate: { type: String, required: true },
  selectedPeriod: { type: String, required: true },
  timeSlots: { type: Array, required: true }, // [{ value, label, disabled }]
});

const emit = defineEmits([
  "select-date",
  "select-time",
  "switch-month",
  "switch-week",
]);

const {
  currentMonthText,
  dateRangeText,
  appointmentDates,
  maxWeekIndex,
  weekOffset,
  switchMonth,
  switchWeek,
} = useDatePicker();

function handleSelectDate(item) {
  if (item.isFull) return;
  emit("select-date", item);
}

function handleSelectTime(slot) {
  if (slot.disabled) return;
  emit("select-time", slot);
}
</script>

<template>
  <section class="section-card">
    <div class="section-head section-head--between">
      <div class="section-mark">
        <span class="section-badge">02</span>
        <div>
          <h2>预约时间</h2>
        </div>
      </div>
      <div class="month-switcher">
        <button type="button" class="month-btn" @click="switchMonth(-1)">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <span class="month-text">{{ currentMonthText }}</span>
        <button type="button" class="month-btn" @click="switchMonth(1)">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>

    <div class="week-switcher">
      <button
        type="button"
        class="week-btn"
        :disabled="weekOffset <= 0"
        @click="switchWeek(-1)"
      >
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
      <span class="week-range-text">{{ dateRangeText }}</span>
      <button
        type="button"
        class="week-btn"
        :disabled="weekOffset >= maxWeekIndex"
        @click="switchWeek(1)"
      >
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>

    <p class="section-helper">请选择上门日期与时间段</p>

    <div class="date-picker-grid">
      <button
        v-for="item in appointmentDates"
        :key="item.value"
        type="button"
        :disabled="item.isFull"
        :class="[
          'date-card',
          selectedDate === item.value ? 'is-active' : '',
          item.isFull ? 'is-full' : '',
        ]"
        @click="handleSelectDate(item)"
      >
        <span class="date-card__month">{{ item.monthDay }}</span>
        <strong>{{ item.isFull ? "约满" : item.dayNumber }}</strong>
        <span class="date-card__week">{{ item.weekday }}</span>
      </button>
    </div>

    <div class="time-slot-row">
      <button
        v-for="slot in timeSlots"
        :key="slot.label"
        type="button"
        :disabled="slot.disabled"
        :class="[
          'time-slot',
          selectedPeriod === slot.value ? 'is-active' : '',
          slot.disabled ? 'is-disabled' : '',
        ]"
        @click="handleSelectTime(slot)"
      >
        {{ slot.label }}
      </button>
    </div>
  </section>
</template>

<style scoped>
/* 月/周切换 + 日期卡 + 时段按钮:从原 AppointmentPage.vue 拆分 */

.section-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 22px rgba(36, 72, 50, 0.05);
  border: 1px solid rgba(79, 141, 96, 0.1);
  padding: 22px 24px;
  border-left: 3px solid rgba(79, 141, 96, 0.35);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 18px;
}

.section-head--between {
  justify-content: space-between;
  gap: 16px;
}

.section-mark {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-badge {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #4f8d60;
  color: #fff;
  font-family: var(--font-data);
  font-size: 0.75rem;
  font-weight: 700;
}

.section-head h2 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: 1.08rem;
}

.month-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(106, 131, 122, 0.25);
  border-radius: 8px;
  background: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--ink-600);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.month-btn:hover {
  border-color: #4f8d60;
  background: rgba(79, 141, 96, 0.05);
}

.month-btn :deep(.material-symbols-outlined) {
  font-size: 1.25rem;
}

.month-text {
  min-width: 90px;
  color: var(--ink-800);
  font-family: var(--font-data);
  font-size: 0.86rem;
  font-weight: 700;
  text-align: center;
}

.week-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.week-btn {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(106, 131, 122, 0.25);
  border-radius: 6px;
  background: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--ink-600);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.week-btn:hover:not(:disabled) {
  border-color: #4f8d60;
  background: rgba(79, 141, 96, 0.05);
}

.week-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.week-btn :deep(.material-symbols-outlined) {
  font-size: 1.1rem;
}

.week-range-text {
  min-width: 70px;
  color: var(--ink-700);
  font-family: var(--font-data);
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
  background: rgba(79, 141, 96, 0.08);
  padding: 4px 8px;
  border-radius: 4px;
}

.section-helper {
  margin: 12px 0 0;
  color: var(--ink-500);
  font-size: 0.72rem;
  letter-spacing: 0.03em;
}

.date-picker-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.date-card {
  min-height: 60px;
  border: 1px solid rgba(106, 131, 122, 0.18);
  border-radius: 10px;
  background: #f7f8f7;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 2px;
  color: var(--ink-600);
  font: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.date-card__month {
  font-size: 0.58rem;
  color: var(--ink-500);
}

.date-card__week {
  font-size: 0.58rem;
  letter-spacing: 0.04em;
}

.date-card span {
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.date-card strong {
  color: var(--ink-900);
  font-family: var(--font-data);
  font-size: 1rem;
  line-height: 1;
}

.date-card:hover:not(:disabled),
.time-slot:hover:not(:disabled) {
  transform: translateY(-1px);
}

.date-card.is-active {
  border-width: 2px;
  border-color: #4f8d60;
  background: rgba(79, 141, 96, 0.05);
}

.date-card.is-full {
  background: #f1f3f2;
  color: #a0b0ab;
  cursor: not-allowed;
  opacity: 0.8;
}

.date-card.is-full strong {
  color: #a0b0ab;
}

.time-slot-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.time-slot {
  min-height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid rgba(79, 141, 96, 0.2);
  background: #fff;
  color: #4f8d60;
  font-family: var(--font-data);
  font-size: 0.86rem;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.time-slot.is-active {
  border-width: 2px;
  border-color: #4f8d60;
  background: rgba(79, 141, 96, 0.05);
  color: var(--ink-900);
  font-weight: 700;
}

.time-slot.is-disabled {
  background: #f1f3f2;
  border-color: #e2e8e6;
  color: #a0b0ab;
  cursor: not-allowed;
}

@media (max-width: 860px) {
  .date-picker-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .section-card {
    padding: 18px;
  }

  .section-head,
  .section-head--between {
    flex-direction: column;
    align-items: flex-start;
  }

  .date-picker-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
