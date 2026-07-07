// useProfileCalendar.js
// 个人中心日历:取本月订单(走 ordersStore),按日聚合,渲染网格。
// 公开 monthBounds / groupByDay 工具给上层 reload / 翻月复用。

import { computed, ref } from "vue";
import { useOrdersStore } from "@/stores/orders";

const HIGHLIGHT_SCROLL_DELAY_MS = 300;
const HIGHLIGHT_PULSE_DELAY_MS = 800;
const HIGHLIGHT_DISPLAY_MS = 3000;

function monthBounds(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { dateFrom: fmt(start), dateTo: fmt(end) };
}

function groupByDay(list) {
  const map = {};
  for (const o of list) {
    if (!o.scheduledDate) continue;
    const day = Number(o.scheduledDate.split("-")[2]);
    if (!map[day]) map[day] = [];
    map[day].push(o);
  }
  return map;
}

export function useProfileCalendar() {
  const ordersStore = useOrdersStore();

  const currentMonth = ref(new Date());
  const calendarDays = ref([]);
  const orderMap = ref({});
  const highlightedDay = ref(null);
  const calendarSectionRef = ref(null);

  function setCalendarSectionRef(el) {
    calendarSectionRef.value = el;
  }

  async function loadMonth(year, month) {
    const { dateFrom, dateTo } = monthBounds(year, month);
    const data = await ordersStore.fetchList({ dateFrom, dateTo, pageSize: 100 });
    orderMap.value = groupByDay(data.list);
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

  // 保留旧签名 compatible caller;内部调用 loadMonth
  async function initializeCalendar(realDate, _ordersData) {
    const target = realDate ? new Date(realDate.year, realDate.month, 1) : new Date();
    currentMonth.value = target;
    await loadMonth(target.getFullYear(), target.getMonth());
    generateCalendar();
  }

  async function changeMonth(offset) {
    const newMonth = new Date(currentMonth.value);
    newMonth.setMonth(newMonth.getMonth() + offset);
    currentMonth.value = newMonth;
    await loadMonth(newMonth.getFullYear(), newMonth.getMonth());
    generateCalendar();
  }

  async function highlightToday() {
    await new Promise((resolve) => setTimeout(resolve, HIGHLIGHT_SCROLL_DELAY_MS));
    if (calendarSectionRef.value) {
      calendarSectionRef.value.scrollIntoView({ behavior: "smooth", block: "center" });
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
