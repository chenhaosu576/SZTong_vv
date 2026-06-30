// useDatePicker.js
// 预约页的日期选择状态机。
// 持有 currentMonth(指向当月 1 号 12:00)和 weekOffset,派生:
//   - appointmentDates: 当前周内 7 天的日期卡数据
//   - currentMonthText: "YYYY年M月" 标题文本
//   - dateRangeText:    "M/D-M/D" 周区间
//   - maxWeekIndex:     当月最多能切几周(0-based)
//
// 不感知 form;由 useAppointmentForm.loadMeta 在初始化时通过入参注入。

import { computed, ref } from "vue";
import { weekdayLabels } from "../utils/appointmentConstants";

export function useDatePicker() {
  // 月份切换状态:固定到当月 1 号 12:00,避免跨日/跨小时边界问题
  const currentMonth = ref(new Date());
  currentMonth.value.setDate(1);
  currentMonth.value.setHours(12, 0, 0, 0);

  // 周切换状态:0 表示当月第 1-7 天
  const weekOffset = ref(0);

  const currentMonthText = computed(() => {
    const d = new Date(currentMonth.value);
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  });

  const daysInCurrentMonth = computed(() => {
    const year = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth();
    return new Date(year, month + 1, 0).getDate();
  });

  const maxWeekIndex = computed(() => {
    return Math.ceil(daysInCurrentMonth.value / 7) - 1;
  });

  const dateRangeText = computed(() => {
    const year = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth();
    const daysInMonth = daysInCurrentMonth.value;
    const startDay = weekOffset.value * 7 + 1;
    const endDay = Math.min(startDay + 6, daysInMonth);
    return `${month + 1}/${startDay}-${month + 1}/${endDay}`;
  });

  const appointmentDates = computed(() => {
    const baseDate = new Date(currentMonth.value);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = daysInCurrentMonth.value;

    const startDay = weekOffset.value * 7 + 1;
    const endDay = Math.min(startDay + 6, daysInMonth);

    return Array.from({ length: endDay - startDay + 1 }, (_, index) => {
      const day = startDay + index;
      const date = new Date(year, month, day);
      return {
        value: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        weekday: weekdayLabels[date.getDay()],
        dayNumber: String(day).padStart(2, "0"),
        monthDay: `${month + 1}/${day}`,
        monthText: `${month + 1}月`,
        isFull: false,
      };
    });
  });

  function switchMonth(offset) {
    const next = new Date(currentMonth.value);
    next.setMonth(next.getMonth() + offset);
    currentMonth.value = next;
    weekOffset.value = 0; // 切换月份时重置周偏移
  }

  function switchWeek(offset) {
    const newOffset = weekOffset.value + offset;
    if (newOffset >= 0 && newOffset <= maxWeekIndex.value) {
      weekOffset.value = newOffset;
    }
  }

  return {
    currentMonth,
    weekOffset,
    currentMonthText,
    dateRangeText,
    appointmentDates,
    maxWeekIndex,
    switchMonth,
    switchWeek,
  };
}
