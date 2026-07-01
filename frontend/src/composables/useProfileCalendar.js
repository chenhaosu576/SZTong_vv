// useProfileCalendar.js
// Encapsulates calendar UI state for the personal profile page:
// current month, day grid (with order-based intensity), month switching
// (with refetch via fetchCalendarWithOrders), and the post-check-in
// "highlight today" pulse that scrolls the section into view.

import { computed, ref } from "vue";
import { fetchCalendarWithOrders } from "@/mock/timeApi";

const HIGHLIGHT_SCROLL_DELAY_MS = 300;
const HIGHLIGHT_PULSE_DELAY_MS = 800;
const HIGHLIGHT_DISPLAY_MS = 3000;

export function useProfileCalendar() {
  const currentMonth = ref(new Date());
  const calendarDays = ref([]);
  const orderMap = ref({});
  const highlightedDay = ref(null);
  const calendarSectionRef = ref(null);

  function setCalendarSectionRef(el) {
    calendarSectionRef.value = el;
  }

  function initializeCalendar(realDate, ordersData) {
    currentMonth.value = realDate
      ? new Date(realDate.year, realDate.month, 1)
      : new Date();
    orderMap.value = ordersData || {};
    generateCalendar();
  }

  function generateCalendar() {
    const days = [];
    const year = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayAdjusted; i++) {
      days.push({ empty: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const orders = orderMap.value[day] || [];
      const intensity = orders.length > 0 ? Math.min(orders.length, 3) : 0;

      days.push({
        date: date.toISOString().split("T")[0],
        day,
        month: month + 1,
        year,
        intensity,
        emission: intensity * (Math.random() * 4 + 2),
        isToday: date.toDateString() === new Date().toDateString(),
      });
    }

    calendarDays.value = days;
  }

  async function changeMonth(offset) {
    const newMonth = new Date(currentMonth.value);
    newMonth.setMonth(newMonth.getMonth() + offset);
    currentMonth.value = newMonth;

    const year = newMonth.getFullYear();
    const month = newMonth.getMonth();
    orderMap.value = await fetchCalendarWithOrders(year, month);

    generateCalendar();
  }

  async function highlightToday() {
    await new Promise((resolve) => setTimeout(resolve, HIGHLIGHT_SCROLL_DELAY_MS));

    if (calendarSectionRef.value) {
      calendarSectionRef.value.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    await new Promise((resolve) => setTimeout(resolve, HIGHLIGHT_PULSE_DELAY_MS));

    const todayIndex = calendarDays.value.findIndex((day) => day.isToday);
    if (todayIndex === -1) return;

    highlightedDay.value = todayIndex;
    if (calendarDays.value[todayIndex].intensity === 0) {
      calendarDays.value[todayIndex].intensity = 1;
      calendarDays.value[todayIndex].emission = 2.5;
    }

    setTimeout(() => {
      highlightedDay.value = null;
    }, HIGHLIGHT_DISPLAY_MS);
  }

  const monthText = computed(() => {
    const year = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth() + 1;
    return `${year}年 ${month}月`;
  });

  return {
    currentMonth,
    calendarDays,
    orderMap,
    highlightedDay,
    calendarSectionRef,
    setCalendarSectionRef,
    monthText,
    initializeCalendar,
    generateCalendar,
    changeMonth,
    highlightToday,
  };
}
