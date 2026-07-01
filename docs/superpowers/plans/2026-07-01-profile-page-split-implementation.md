# ProfilePage Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `frontend/src/views/client/ProfilePage.vue` into focused profile components and page-specific composables without changing visual behavior, route behavior, mock API contracts, or user-facing content.

**Architecture:** Keep `ProfilePage.vue` as the orchestration layer for loading, error display, reveal registration, and wiring composables to child components. Move UI markup and scoped CSS into `frontend/src/components/client/profile/`; move stateful page logic into `frontend/src/composables/useProfile*.js` plus `useBlurText.js`. Preserve current localStorage keys, random chart behavior, calendar generation behavior, and check-in side effects.

**Tech Stack:** Vue 3 `<script setup>`, Vite, Vitest, Vue Router, existing mock APIs in `frontend/src/mock/clientApi.js` and `frontend/src/mock/timeApi.js`.

---

## File Structure

Create:

- `frontend/src/components/client/profile/ProfileHeaderPanel.vue`: top profile section; owns avatar click/input DOM and emits profile message DOM via `blur-ready`.
- `frontend/src/components/client/profile/ProfileLevelBottle.vue`: level bottle markup, hover state, and bottle-scoped styles.
- `frontend/src/components/client/profile/ProfileStreakCard.vue`: compact check-in card, check-in button, and optional hidden debug reset.
- `frontend/src/components/client/profile/ProfileCheckInAlert.vue`: fixed-position duplicate check-in alert.
- `frontend/src/components/client/profile/ProfileCalendarSection.vue`: calendar section markup, month navigation, legend, tooltip, insight, and `ready(el)` DOM handoff.
- `frontend/src/components/client/profile/ProfileImpactDashboard.vue`: period tabs, metric card grid, and points card.
- `frontend/src/components/client/profile/ProfileMetricCard.vue`: reusable energy/CO2 metric card with chart hover state.
- `frontend/src/components/client/profile/ProfileTasksPanel.vue`: current task list rendering.
- `frontend/src/components/client/profile/ProfileAchievementsPanel.vue`: achievement badge rendering and `view-all` emit.
- `frontend/src/components/client/profile/ProfileActivityList.vue`: recent activity list rendering.
- `frontend/src/composables/useProfileData.js`: profile and initial date/order loading.
- `frontend/src/composables/useProfileAvatar.js`: avatar state, validation, FileReader, and `localStorage.userAvatar`.
- `frontend/src/composables/useProfileCheckIn.js`: check-in state, `guardianDays`, `lastCheckInDate`, alert timers, and animation flags.
- `frontend/src/composables/useProfileCalendar.js`: month state, order map, calendar generation, month switching, and today highlight.
- `frontend/src/composables/useProfileImpactMetrics.js`: period state, random chart data, and SVG path helper.
- `frontend/src/composables/useBlurText.js`: guardian-days text splitting and IntersectionObserver wiring.
- `frontend/src/composables/__tests__/useProfileImpactMetrics.test.js`
- `frontend/src/composables/__tests__/useProfileAvatar.test.js`
- `frontend/src/composables/__tests__/useProfileCheckIn.test.js`
- `frontend/src/composables/__tests__/useProfileCalendar.test.js`
- `frontend/src/composables/__tests__/useBlurText.test.js`

Modify:

- `frontend/src/views/client/ProfilePage.vue`: reduce to orchestration, constants, imports, and minimal page-level styles.

Do not modify:

- `frontend/src/mock/clientApi.js`
- `frontend/src/mock/timeApi.js`
- `frontend/src/router/index.js`
- `frontend/package.json`

---

## Shared Data Contracts

Use these exact constants in `ProfilePage.vue` when static sections are extracted:

```js
const PROFILE_TASKS = [
  {
    name: "废纸回收挑战",
    progressText: "6.0 / 10 kg",
    progress: 60,
    reward: "完成后可获得 200 积分",
  },
  {
    name: "低碳出行达人",
    progressText: "12 / 20 次",
    progress: 40,
    reward: "完成后可获得 150 积分",
  },
];

const PROFILE_ACHIEVEMENTS = [
  { icon: "🌿", name: "节能专家", unlocked: true },
  { icon: "♻️", name: "堆肥先锋", unlocked: true },
  { icon: "🌳", name: "植树大使", unlocked: true },
  { icon: "💧", name: "节水卫士", unlocked: false },
];

const PROFILE_ACTIVITIES = [
  {
    icon: "📦",
    title: "成功回收快递纸箱",
    description: "于 虹桥路 128 号完成回收",
    points: "+45 pts",
    pointsVariant: "positive",
    time: "今天 14:20",
  },
  {
    icon: "🎁",
    title: "兑换超市优惠券",
    description: "消费 500 积分兑换全家满减券",
    points: "-500 pts",
    pointsVariant: "negative",
    time: "昨天 09:15",
  },
  {
    icon: "👍",
    title: "社区点赞达人",
    description: "您的科普文章获得了 50 个赞",
    points: "+100 pts",
    pointsVariant: "positive",
    time: "2023.10.24",
  },
  {
    icon: "🍴",
    title: "提交自带餐具打卡",
    description: "减少了一次性餐具使用",
    points: "+10 pts",
    pointsVariant: "positive",
    time: "2023.10.23",
  },
];
```

Use these exact profile page handler shapes after extraction:

```js
async function handleCheckIn() {
  const result = triggerCheckIn();
  if (result?.checkedIn) {
    await highlightToday();
  }
}

function handleCalendarReady(el) {
  setCalendarSectionRef(el);
}

function handleBlurReady(el) {
  setBlurTextRef(el);
}
```

---

### Task 1: Extract Impact Metrics Logic

**Files:**

- Create: `frontend/src/composables/useProfileImpactMetrics.js`
- Create: `frontend/src/composables/__tests__/useProfileImpactMetrics.test.js`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Write the failing Vitest coverage**

Create `frontend/src/composables/__tests__/useProfileImpactMetrics.test.js`:

```js
import { describe, expect, it } from "vitest";
import { useProfileImpactMetrics } from "../useProfileImpactMetrics";

describe("useProfileImpactMetrics", () => {
  it("starts with monthly bar chart data for energy and CO2", () => {
    const metrics = useProfileImpactMetrics();

    expect(metrics.selectedPeriod.value).toBe("本月");
    expect(metrics.energyData.value.chartType).toBe("bar");
    expect(metrics.energyData.value.bars).toHaveLength(30);
    expect(metrics.co2Data.value.chartType).toBe("bar");
    expect(metrics.co2Data.value.bars).toHaveLength(30);
  });

  it("switches quarterly data to line charts", () => {
    const metrics = useProfileImpactMetrics();

    metrics.selectedPeriod.value = "季度";

    expect(metrics.energyData.value.chartType).toBe("line");
    expect(metrics.energyData.value.points).toHaveLength(12);
    expect(metrics.co2Data.value.chartType).toBe("line");
    expect(metrics.co2Data.value.points).toHaveLength(12);
  });

  it("generates the existing SVG line path format", () => {
    const { generateLinePath } = useProfileImpactMetrics();

    expect(generateLinePath([
      { x: 0, y: 25 },
      { x: 50, y: 40 },
      { x: 100, y: 15 },
    ])).toBe("M 0 25 L 50 40 L 100 15");
    expect(generateLinePath([])).toBe("");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd frontend
npm run test -- useProfileImpactMetrics
```

Expected: test run fails because `../useProfileImpactMetrics` does not exist.

- [ ] **Step 3: Create `useProfileImpactMetrics.js` by moving existing logic**

Create `frontend/src/composables/useProfileImpactMetrics.js`:

```js
import { computed, ref } from "vue";

export function useProfileImpactMetrics() {
  const selectedPeriod = ref("本月");

  const energyData = computed(() => {
    if (selectedPeriod.value === "本周") {
      return {
        value: 458,
        unit: "kWh",
        trend: "+5.2%",
        chartType: "bar",
        bars: generateRandomBars(7),
        labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      };
    }

    if (selectedPeriod.value === "本月") {
      return {
        value: 1842,
        unit: "kWh",
        trend: "+8.3%",
        chartType: "bar",
        bars: generateRandomBars(30),
        labels: Array.from({ length: 30 }, (_, i) => `${i + 1}日`),
      };
    }

    return {
      value: 5526,
      unit: "kWh",
      trend: "+12.1%",
      chartType: "line",
      points: generateLineChartPoints(12),
      labels: ["第1周", "第2周", "第3周", "第4周", "第5周", "第6周", "第7周", "第8周", "第9周", "第10周", "第11周", "第12周"],
    };
  });

  const co2Data = computed(() => {
    if (selectedPeriod.value === "本周") {
      return {
        value: 12.4,
        unit: "kg",
        trend: "+3.8%",
        chartType: "bar",
        bars: generateRandomBars(7),
        labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      };
    }

    if (selectedPeriod.value === "本月") {
      return {
        value: 48.6,
        unit: "kg",
        trend: "+6.5%",
        chartType: "bar",
        bars: generateRandomBars(30),
        labels: Array.from({ length: 30 }, (_, i) => `${i + 1}日`),
      };
    }

    return {
      value: 145.8,
      unit: "kg",
      trend: "+9.7%",
      chartType: "line",
      points: generateLineChartPoints(12),
      labels: ["第1周", "第2周", "第3周", "第4周", "第5周", "第6周", "第7周", "第8周", "第9周", "第10周", "第11周", "第12周"],
    };
  });

  return {
    selectedPeriod,
    energyData,
    co2Data,
    generateRandomBars,
    generateLineChartPoints,
    generateLinePath,
  };
}

export function generateRandomBars(count) {
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

export function generateLineChartPoints(count) {
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

export function generateLinePath(points) {
  if (points.length === 0) return "";

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }

  return path;
}
```

- [ ] **Step 4: Wire `ProfilePage.vue` to the composable without moving markup**

Modify the script section of `frontend/src/views/client/ProfilePage.vue`:

```js
import { computed, onMounted, ref, onBeforeUnmount, useTemplateRef } from "vue";
import { useProfileImpactMetrics } from "@/composables/useProfileImpactMetrics";

const {
  selectedPeriod,
  energyData,
  co2Data,
  generateLinePath,
} = useProfileImpactMetrics();
```

Remove the local definitions of `selectedPeriod`, `energyData`, `co2Data`, `generateRandomBars`, `generateLineChartPoints`, and `generateLinePath`. Keep `hoveredBarIndex` and `hoveredPointIndex` in `ProfilePage.vue` until `ProfileMetricCard.vue` is extracted.

- [ ] **Step 5: Run focused test and build**

Run:

```bash
cd frontend
npm run test -- useProfileImpactMetrics
npm run build
```

Expected: the focused Vitest file passes and Vite build exits with code 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/composables/useProfileImpactMetrics.js frontend/src/composables/__tests__/useProfileImpactMetrics.test.js frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract impact metrics logic"
```

---

### Task 2: Extract Avatar Logic

**Files:**

- Create: `frontend/src/composables/useProfileAvatar.js`
- Create: `frontend/src/composables/__tests__/useProfileAvatar.test.js`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Write avatar composable tests**

Create `frontend/src/composables/__tests__/useProfileAvatar.test.js`:

```js
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { useProfileAvatar } from "../useProfileAvatar";

class MockFileReader {
  readAsDataURL() {
    this.onload({ target: { result: "data:image/png;base64,abc" } });
  }
}

describe("useProfileAvatar", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("FileReader", MockFileReader);
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("reads the stored avatar", () => {
    localStorage.setItem("userAvatar", "stored-avatar");

    const { avatarUrl } = useProfileAvatar();

    expect(avatarUrl.value).toBe("stored-avatar");
  });

  it("rejects non-image files", () => {
    const { handleAvatarChange } = useProfileAvatar();

    handleAvatarChange({ target: { files: [{ type: "text/plain", size: 100 }] } });

    expect(window.alert).toHaveBeenCalledWith("请选择图片文件");
    expect(localStorage.getItem("userAvatar")).toBeNull();
  });

  it("rejects images larger than five megabytes", () => {
    const { handleAvatarChange } = useProfileAvatar();

    handleAvatarChange({ target: { files: [{ type: "image/png", size: 5 * 1024 * 1024 + 1 }] } });

    expect(window.alert).toHaveBeenCalledWith("图片大小不能超过5MB");
    expect(localStorage.getItem("userAvatar")).toBeNull();
  });

  it("stores valid images as data urls", async () => {
    const { avatarUrl, handleAvatarChange } = useProfileAvatar();

    handleAvatarChange({ target: { files: [{ type: "image/png", size: 1024 }] } });
    await nextTick();

    expect(avatarUrl.value).toBe("data:image/png;base64,abc");
    expect(localStorage.getItem("userAvatar")).toBe("data:image/png;base64,abc");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd frontend
npm run test -- useProfileAvatar
```

Expected: test run fails because `../useProfileAvatar` does not exist.

- [ ] **Step 3: Create `useProfileAvatar.js`**

Create `frontend/src/composables/useProfileAvatar.js`:

```js
import { ref } from "vue";

const AVATAR_STORAGE_KEY = "userAvatar";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function useProfileAvatar() {
  const avatarUrl = ref(localStorage.getItem(AVATAR_STORAGE_KEY) || null);

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      alert("图片大小不能超过5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      avatarUrl.value = base64;
      localStorage.setItem(AVATAR_STORAGE_KEY, base64);
    };
    reader.readAsDataURL(file);
  }

  return {
    avatarUrl,
    handleAvatarChange,
  };
}
```

- [ ] **Step 4: Wire `ProfilePage.vue` to the composable**

Modify imports and setup:

```js
import { useProfileAvatar } from "@/composables/useProfileAvatar";

const { avatarUrl, handleAvatarChange } = useProfileAvatar();
const avatarFileInput = ref(null);

function triggerAvatarUpload() {
  avatarFileInput.value?.click();
}
```

Remove the old local `avatarUrl` initialization and old `handleAvatarChange` body from `ProfilePage.vue`.

- [ ] **Step 5: Run focused test and build**

Run:

```bash
cd frontend
npm run test -- useProfileAvatar
npm run build
```

Expected: the focused Vitest file passes and Vite build exits with code 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/composables/useProfileAvatar.js frontend/src/composables/__tests__/useProfileAvatar.test.js frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract avatar state"
```

---

### Task 3: Extract Metric and Bottle Components

**Files:**

- Create: `frontend/src/components/client/profile/ProfileMetricCard.vue`
- Create: `frontend/src/components/client/profile/ProfileLevelBottle.vue`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Create `ProfileMetricCard.vue` with local hover state**

Move the duplicated metric-card chart markup from `ProfilePage.vue` into `ProfileMetricCard.vue`. Use this script contract:

```vue
<script setup>
import { ref } from "vue";

defineProps({
  metric: { type: Object, required: true },
  gradientId: { type: String, required: true },
  accentColor: { type: String, required: true },
  formatTooltipValue: { type: Function, required: true },
  generateLinePath: { type: Function, required: true },
});

const hoveredBarIndex = ref(null);
const hoveredPointIndex = ref(null);
</script>
```

Template rules:

- Use `metric.label` for header label.
- Use `metric.trend` for trend.
- Use `metric.value` and `metric.unit` for the large value.
- Use `metric.chartType === "bar"` to render bars.
- Use `formatTooltipValue(value)` for both bar and line tooltip values.
- Keep the current SVG area path shape: `generateLinePath(metric.points) + " L 100 100 L 0 100 Z"`.

- [ ] **Step 2: Create `ProfileLevelBottle.vue`**

Move bottle markup from `ProfilePage.vue` lines around the current `.bottle-container` section into `ProfileLevelBottle.vue`. Use this script contract:

```vue
<script setup>
import { ref } from "vue";

defineProps({
  levelProgress: { type: Number, required: true },
});

const isBottleHovered = ref(false);
</script>
```

Template rules:

- Preserve cap, neck, body, liquid, wave, bubble, and glass reflection markup.
- Rename tooltip classes to `bottle-tooltip-label` and `bottle-tooltip-progress`.
- Keep `:style="{ height: levelProgress + '%' }"` for `.bottle-liquid`.

- [ ] **Step 3: Wire both components into `ProfilePage.vue`**

Add imports:

```js
import ProfileLevelBottle from "@/components/client/profile/ProfileLevelBottle.vue";
import ProfileMetricCard from "@/components/client/profile/ProfileMetricCard.vue";
```

Replace the bottle container with:

```vue
<ProfileLevelBottle :level-progress="levelProgress" />
```

Replace the energy and CO2 metric card blocks with:

```vue
<ProfileMetricCard
  :metric="{ label: '已节约能源', ...energyData }"
  gradient-id="energyGradient"
  accent-color="#006418"
  :format-tooltip-value="(value) => `${value} kWh`"
  :generate-line-path="generateLinePath"
/>

<ProfileMetricCard
  :metric="{ label: '减少二氧化碳', ...co2Data }"
  gradient-id="co2Gradient"
  accent-color="#006418"
  :format-tooltip-value="(value) => `${(value * 0.15).toFixed(1)} kg`"
  :generate-line-path="generateLinePath"
/>
```

Remove `isBottleHovered`, `hoveredBarIndex`, and `hoveredPointIndex` from `ProfilePage.vue`.

- [ ] **Step 4: Move CSS into the new components**

Move bottle-related CSS and keyframes from `ProfilePage.vue` into `ProfileLevelBottle.vue`:

- `.bottle-container`
- `.bottle-tooltip`
- `.bottle-cap`
- `.bottle-neck`
- `.bottle-body`
- `.bottle-liquid`
- `.wave`
- `.bubble`
- `.glass-reflection`
- bottle keyframes currently named `tooltipSlideDown`, `intensiveWave1`, `intensiveWave2`, `intensiveWave3`, `intensiveWave4`, `fastBubbleRise1`, `fastBubbleRise2`, `fastBubbleRise3`, `fastBubbleRise4`, `reflectionShimmer`

Move metric-related CSS and keyframes from `ProfilePage.vue` into `ProfileMetricCard.vue`:

- `.metric-card`
- `.metric-header`
- `.metric-label`
- `.metric-trend`
- `.metric-value`
- `.metric-unit`
- `.mini-chart`
- `.bar`
- `.bar-tooltip`
- `.line-chart`
- `.line-tooltip`
- chart tooltip keyframe currently named `tooltipFadeIn`

Leave `.metrics-grid`, `.period-tabs`, `.metric-rank`, `.rewards-banner`, and `.metric-value.points` in `ProfilePage.vue` until `ProfileImpactDashboard.vue` is extracted.

- [ ] **Step 5: Build**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite build exits with code 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/client/profile/ProfileMetricCard.vue frontend/src/components/client/profile/ProfileLevelBottle.vue frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract metric and level displays"
```

---

### Task 4: Extract Calendar Logic and Calendar Section

**Files:**

- Create: `frontend/src/composables/useProfileCalendar.js`
- Create: `frontend/src/composables/__tests__/useProfileCalendar.test.js`
- Create: `frontend/src/components/client/profile/ProfileCalendarSection.vue`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Write calendar composable tests**

Create `frontend/src/composables/__tests__/useProfileCalendar.test.js`:

```js
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../mock/timeApi", () => ({
  fetchCalendarWithOrders: vi.fn(async () => ({ 8: [{ id: "order-8" }, { id: "order-9" }] })),
}));

import { fetchCalendarWithOrders } from "../../mock/timeApi";
import { useProfileCalendar } from "../useProfileCalendar";

describe("useProfileCalendar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1));
  });

  it("initializes calendar from realDate and ordersData", () => {
    const calendar = useProfileCalendar();

    calendar.initializeCalendar({ year: 2026, month: 6, day: 1 }, { 1: [{ id: "a" }] });

    expect(calendar.monthText.value).toBe("2026年 7月");
    const today = calendar.calendarDays.value.find((day) => day.isToday);
    expect(today.day).toBe(1);
    expect(today.intensity).toBe(1);
  });

  it("changes month and fetches orders for the target month", async () => {
    const calendar = useProfileCalendar();
    calendar.initializeCalendar({ year: 2026, month: 6, day: 1 }, {});

    await calendar.changeMonth(1);

    expect(fetchCalendarWithOrders).toHaveBeenCalledWith(2026, 7);
    expect(calendar.monthText.value).toBe("2026年 8月");
  });

  it("highlights today and clears the highlight after three seconds", async () => {
    const calendar = useProfileCalendar();
    calendar.initializeCalendar({ year: 2026, month: 6, day: 1 }, {});
    calendar.setCalendarSectionRef({ scrollIntoView: vi.fn() });

    const promise = calendar.highlightToday();
    await vi.advanceTimersByTimeAsync(1100);
    await promise;

    expect(calendar.highlightedDay.value).not.toBeNull();
    await vi.advanceTimersByTimeAsync(3000);
    expect(calendar.highlightedDay.value).toBeNull();
  });
});
```

- [ ] **Step 2: Run focused test and verify it fails**

Run:

```bash
cd frontend
npm run test -- useProfileCalendar
```

Expected: test run fails because `../useProfileCalendar` does not exist.

- [ ] **Step 3: Create `useProfileCalendar.js`**

Create the composable by moving existing calendar functions. Use this public API:

```js
import { computed, ref } from "vue";
import { fetchCalendarWithOrders } from "@/mock/timeApi";

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
    orderMap.value = await fetchCalendarWithOrders(newMonth.getFullYear(), newMonth.getMonth());
    generateCalendar();
  }

  async function highlightToday() {
    await new Promise((resolve) => setTimeout(resolve, 300));
    calendarSectionRef.value?.scrollIntoView({ behavior: "smooth", block: "center" });
    await new Promise((resolve) => setTimeout(resolve, 800));

    const todayIndex = calendarDays.value.findIndex((day) => day.isToday);
    if (todayIndex === -1) return;

    highlightedDay.value = todayIndex;
    if (calendarDays.value[todayIndex].intensity === 0) {
      calendarDays.value[todayIndex].intensity = 1;
      calendarDays.value[todayIndex].emission = 2.5;
    }

    setTimeout(() => {
      highlightedDay.value = null;
    }, 3000);
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
```

- [ ] **Step 4: Create `ProfileCalendarSection.vue`**

Move the calendar section template and CSS into `ProfileCalendarSection.vue`. Use this script contract:

```vue
<script setup>
import { onMounted, ref } from "vue";

defineProps({
  calendarDays: { type: Array, required: true },
  monthText: { type: String, required: true },
  highlightedDay: { type: [Number, null], default: null },
});

const emit = defineEmits(["ready", "change-month"]);
const sectionRef = ref(null);

onMounted(() => {
  emit("ready", sectionRef.value);
});
</script>
```

Template root:

```vue
<section ref="sectionRef" class="calendar-section">
```

Month buttons:

```vue
<button class="nav-btn" @click="emit('change-month', -1)">‹</button>
<span class="month-text">{{ monthText }}</span>
<button class="nav-btn" @click="emit('change-month', 1)">›</button>
```

- [ ] **Step 5: Wire calendar composable and component into `ProfilePage.vue`**

Add imports:

```js
import { useProfileCalendar } from "@/composables/useProfileCalendar";
import ProfileCalendarSection from "@/components/client/profile/ProfileCalendarSection.vue";
```

Add setup:

```js
const {
  calendarDays,
  highlightedDay,
  setCalendarSectionRef,
  monthText,
  initializeCalendar,
  changeMonth,
  highlightToday,
} = useProfileCalendar();

function handleCalendarReady(el) {
  setCalendarSectionRef(el);
}
```

Replace the calendar section with:

```vue
<ProfileCalendarSection
  :calendar-days="calendarDays"
  :month-text="monthText"
  :highlighted-day="highlightedDay"
  @ready="handleCalendarReady"
  @change-month="changeMonth"
/>
```

Remove local `currentMonth`, `calendarDays`, `orderMap`, `calendarSectionRef`, `highlightedDay`, `generateCalendar`, `changeMonth`, `monthText`, and `scrollToCalendarAndHighlight`.

- [ ] **Step 6: Run focused test and build**

Run:

```bash
cd frontend
npm run test -- useProfileCalendar
npm run build
```

Expected: the focused Vitest file passes and Vite build exits with code 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/composables/useProfileCalendar.js frontend/src/composables/__tests__/useProfileCalendar.test.js frontend/src/components/client/profile/ProfileCalendarSection.vue frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract calendar logic"
```

---

### Task 5: Extract Data Loading Logic

**Files:**

- Create: `frontend/src/composables/useProfileData.js`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Create `useProfileData.js`**

Create `frontend/src/composables/useProfileData.js`:

```js
import { ref } from "vue";
import { fetchProfileData } from "@/mock/clientApi";
import { fetchCalendarWithOrders, fetchRealDate } from "@/mock/timeApi";

export function useProfileData({ onLoaded } = {}) {
  const loading = ref(true);
  const errorText = ref("");
  const profile = ref(null);

  async function loadProfile() {
    loading.value = true;
    errorText.value = "";

    try {
      const [profileData, realDate] = await Promise.all([
        fetchProfileData(),
        fetchRealDate(),
      ]);
      const calendarDate = realDate || {
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        day: new Date().getDate(),
      };
      const ordersData = await fetchCalendarWithOrders(calendarDate.year, calendarDate.month);

      profile.value = profileData;
      onLoaded?.({ realDate: calendarDate, ordersData });
    } catch {
      errorText.value = "个人信息加载失败，请稍后重试。";
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    errorText,
    profile,
    loadProfile,
  };
}
```

- [ ] **Step 2: Wire `ProfilePage.vue` to `useProfileData`**

Add import:

```js
import { useProfileData } from "@/composables/useProfileData";
```

Add setup after calendar/check-in functions exist:

```js
const { loading, errorText, profile, loadProfile } = useProfileData({
  onLoaded({ realDate, ordersData }) {
    initializeCalendar(realDate, ordersData);
    checkTodayCheckIn();
  },
});
```

Remove local `loading`, `errorText`, `profile`, local `loadProfile`, and direct imports of `fetchProfileData`, `fetchRealDate`, and `fetchCalendarWithOrders` from `ProfilePage.vue`.

- [ ] **Step 3: Build**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite build exits with code 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/composables/useProfileData.js frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract profile data loading"
```

---

### Task 6: Extract Check-In Logic and Check-In UI

**Files:**

- Create: `frontend/src/composables/useProfileCheckIn.js`
- Create: `frontend/src/composables/__tests__/useProfileCheckIn.test.js`
- Create: `frontend/src/components/client/profile/ProfileStreakCard.vue`
- Create: `frontend/src/components/client/profile/ProfileCheckInAlert.vue`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Write check-in composable tests**

Create `frontend/src/composables/__tests__/useProfileCheckIn.test.js`:

```js
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProfileCheckIn } from "../useProfileCheckIn";

describe("useProfileCheckIn", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1, 9, 0, 0));
  });

  it("reads guardian days from localStorage", () => {
    localStorage.setItem("guardianDays", "420");

    const checkIn = useProfileCheckIn();

    expect(checkIn.guardianDays.value).toBe(420);
  });

  it("detects today's existing check-in", () => {
    localStorage.setItem("lastCheckInDate", new Date().toDateString());
    const checkIn = useProfileCheckIn();

    checkIn.checkTodayCheckIn();

    expect(checkIn.hasCheckedInToday.value).toBe(true);
  });

  it("increments guardian days once on a successful check-in", () => {
    const checkIn = useProfileCheckIn();

    const result = checkIn.triggerCheckIn();

    expect(result).toEqual({ checkedIn: true });
    expect(checkIn.guardianDays.value).toBe(366);
    expect(localStorage.getItem("guardianDays")).toBe("366");
    expect(checkIn.hasCheckedInToday.value).toBe(true);
  });

  it("shows alert and does not increment on duplicate check-in", async () => {
    const checkIn = useProfileCheckIn();
    checkIn.triggerCheckIn();

    const result = checkIn.triggerCheckIn();

    expect(result).toEqual({ checkedIn: false });
    expect(checkIn.guardianDays.value).toBe(366);
    expect(checkIn.showCheckInAlert.value).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(checkIn.showCheckInAlert.value).toBe(false);
  });

  it("resets check-in state for hidden debug controls", () => {
    const checkIn = useProfileCheckIn();
    checkIn.triggerCheckIn();

    checkIn.resetCheckInForTesting();

    expect(localStorage.getItem("lastCheckInDate")).toBeNull();
    expect(checkIn.hasCheckedInToday.value).toBe(false);
  });
});
```

- [ ] **Step 2: Run focused test and verify it fails**

Run:

```bash
cd frontend
npm run test -- useProfileCheckIn
```

Expected: test run fails because `../useProfileCheckIn` does not exist.

- [ ] **Step 3: Create `useProfileCheckIn.js`**

Create `frontend/src/composables/useProfileCheckIn.js`:

```js
import { ref } from "vue";

const GUARDIAN_DAYS_KEY = "guardianDays";
const LAST_CHECK_IN_KEY = "lastCheckInDate";

export function useProfileCheckIn() {
  const streakDays = ref(42);
  const totalRecycles = ref(156);
  const streakRecord = ref(58);
  const isStreakAnimating = ref(false);
  const hasCheckedInToday = ref(false);
  const showCheckInAlert = ref(false);
  const guardianDays = ref(parseInt(localStorage.getItem(GUARDIAN_DAYS_KEY), 10) || 365);
  const isGuardianDaysUpdating = ref(false);

  function checkTodayCheckIn() {
    const lastCheckInDate = localStorage.getItem(LAST_CHECK_IN_KEY);
    hasCheckedInToday.value = lastCheckInDate === new Date().toDateString();
  }

  function triggerCheckIn() {
    if (hasCheckedInToday.value) {
      showCheckInAlert.value = true;
      setTimeout(() => {
        showCheckInAlert.value = false;
      }, 3000);
      return { checkedIn: false };
    }

    isStreakAnimating.value = true;
    setTimeout(() => {
      isStreakAnimating.value = false;
    }, 1000);

    isGuardianDaysUpdating.value = true;
    guardianDays.value++;
    localStorage.setItem(GUARDIAN_DAYS_KEY, guardianDays.value.toString());
    setTimeout(() => {
      isGuardianDaysUpdating.value = false;
    }, 600);

    localStorage.setItem(LAST_CHECK_IN_KEY, new Date().toDateString());
    hasCheckedInToday.value = true;

    return { checkedIn: true };
  }

  function resetCheckInForTesting() {
    localStorage.removeItem(LAST_CHECK_IN_KEY);
    hasCheckedInToday.value = false;
  }

  return {
    streakDays,
    totalRecycles,
    streakRecord,
    guardianDays,
    hasCheckedInToday,
    isStreakAnimating,
    isGuardianDaysUpdating,
    showCheckInAlert,
    checkTodayCheckIn,
    triggerCheckIn,
    resetCheckInForTesting,
  };
}
```

- [ ] **Step 4: Create `ProfileStreakCard.vue`**

Move compact streak markup and CSS into `ProfileStreakCard.vue`. Use this script contract:

```vue
<script setup>
defineProps({
  streakDays: { type: Number, required: true },
  hasCheckedInToday: { type: Boolean, required: true },
  isStreakAnimating: { type: Boolean, required: true },
  showDebugReset: { type: Boolean, default: false },
});

const emit = defineEmits(["check-in", "reset-check-in"]);
</script>
```

Template rules:

- The main button emits `check-in`.
- The reset button is rendered only with `v-if="showDebugReset"` and emits `reset-check-in`.
- The default user path does not render the reset button.

- [ ] **Step 5: Create `ProfileCheckInAlert.vue`**

Create `frontend/src/components/client/profile/ProfileCheckInAlert.vue`:

```vue
<script setup>
defineProps({
  visible: { type: Boolean, required: true },
  message: { type: String, default: "今日已打卡，明天再来吧！" },
});
</script>

<template>
  <div v-if="visible" class="check-in-alert">
    <div class="alert-content">
      <span class="alert-icon">⚠️</span>
      <p class="alert-message">{{ message }}</p>
    </div>
  </div>
</template>
```

Move `.check-in-alert`, `.alert-content`, `.alert-icon`, `.alert-message`, and alert keyframes into the component.

- [ ] **Step 6: Wire check-in composable and UI into `ProfilePage.vue`**

Add imports:

```js
import { useProfileCheckIn } from "@/composables/useProfileCheckIn";
import ProfileStreakCard from "@/components/client/profile/ProfileStreakCard.vue";
import ProfileCheckInAlert from "@/components/client/profile/ProfileCheckInAlert.vue";
```

Add setup:

```js
const {
  streakDays,
  guardianDays,
  hasCheckedInToday,
  isStreakAnimating,
  isGuardianDaysUpdating,
  showCheckInAlert,
  checkTodayCheckIn,
  triggerCheckIn,
  resetCheckInForTesting,
} = useProfileCheckIn();

async function handleCheckIn() {
  const result = triggerCheckIn();
  if (result?.checkedIn) {
    await highlightToday();
  }
}
```

Replace the compact streak block with:

```vue
<ProfileStreakCard
  :streak-days="streakDays"
  :has-checked-in-today="hasCheckedInToday"
  :is-streak-animating="isStreakAnimating"
  @check-in="handleCheckIn"
  @reset-check-in="resetCheckInForTesting"
/>
```

Replace alert markup with:

```vue
<ProfileCheckInAlert :visible="showCheckInAlert" />
```

- [ ] **Step 7: Run focused test and build**

Run:

```bash
cd frontend
npm run test -- useProfileCheckIn
npm run build
```

Expected: the focused Vitest file passes and Vite build exits with code 0.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/composables/useProfileCheckIn.js frontend/src/composables/__tests__/useProfileCheckIn.test.js frontend/src/components/client/profile/ProfileStreakCard.vue frontend/src/components/client/profile/ProfileCheckInAlert.vue frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract check-in logic"
```

---

### Task 7: Extract Blur Text and Header Panel

**Files:**

- Create: `frontend/src/composables/useBlurText.js`
- Create: `frontend/src/composables/__tests__/useBlurText.test.js`
- Create: `frontend/src/components/client/profile/ProfileHeaderPanel.vue`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Write blur text tests**

Create `frontend/src/composables/__tests__/useBlurText.test.js`:

```js
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useBlurText } from "../useBlurText";

describe("useBlurText", () => {
  it("marks highlighted characters", () => {
    const days = ref(365);
    const blur = useBlurText({
      text: () => `你已通过回收行动累计为地球守护了 ${days.value} 天。感谢你的每一份坚持。`,
      highlightText: () => days.value.toString(),
    });

    const highlighted = blur.blurTextElements.value.filter((item) => item.isHighlighted);

    expect(highlighted.map((item) => item.char).join("")).toBe("365");
  });

  it("registers an observer when a DOM node is provided", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", vi.fn(() => ({ observe, disconnect })));
    const blur = useBlurText({ text: "abc", highlightText: "b" });
    const el = document.createElement("p");

    blur.setBlurTextRef(el);

    expect(observe).toHaveBeenCalledWith(el);
  });
});
```

- [ ] **Step 2: Run focused test and verify it fails**

Run:

```bash
cd frontend
npm run test -- useBlurText
```

Expected: test run fails because `../useBlurText` does not exist.

- [ ] **Step 3: Create `useBlurText.js`**

Create `frontend/src/composables/useBlurText.js`:

```js
import { computed, onBeforeUnmount, ref, unref } from "vue";

function resolveInput(value) {
  return typeof value === "function" ? value() : unref(value);
}

export function useBlurText({ text, highlightText }) {
  const blurTextRef = ref(null);
  const blurTextInView = ref(true);
  let blurTextObserver = null;

  const blurTextElements = computed(() => {
    const resolvedText = String(resolveInput(text) || "");
    const resolvedHighlight = String(resolveInput(highlightText) || "");
    const highlightIndex = resolvedHighlight ? resolvedText.indexOf(resolvedHighlight) : -1;

    return resolvedText.split("").map((char, index) => ({
      char,
      isHighlighted: highlightIndex >= 0 && index >= highlightIndex && index < highlightIndex + resolvedHighlight.length,
    }));
  });

  function setBlurTextRef(el) {
    blurTextObserver?.disconnect();
    blurTextRef.value = el;
    if (!el || typeof IntersectionObserver === "undefined") return;

    blurTextObserver = new IntersectionObserver(
      ([entry]) => {
        blurTextInView.value = entry.isIntersecting;
      },
      { threshold: 0.1, rootMargin: "0px" },
    );
    blurTextObserver.observe(el);
  }

  onBeforeUnmount(() => {
    blurTextObserver?.disconnect();
  });

  return {
    blurTextRef,
    blurTextInView,
    blurTextElements,
    setBlurTextRef,
  };
}
```

- [ ] **Step 4: Create `ProfileHeaderPanel.vue`**

Move profile header markup and CSS into `ProfileHeaderPanel.vue`. Use this script contract:

```vue
<script setup>
import { onMounted, ref } from "vue";
import ProfileLevelBottle from "./ProfileLevelBottle.vue";
import ProfileStreakCard from "./ProfileStreakCard.vue";

defineProps({
  profile: { type: Object, required: true },
  avatarUrl: { type: String, default: null },
  guardianDays: { type: Number, required: true },
  levelProgress: { type: Number, required: true },
  blurTextElements: { type: Array, required: true },
  blurTextInView: { type: Boolean, required: true },
  isGuardianDaysUpdating: { type: Boolean, required: true },
  streakDays: { type: Number, required: true },
  hasCheckedInToday: { type: Boolean, required: true },
  isStreakAnimating: { type: Boolean, required: true },
  showDebugReset: { type: Boolean, default: false },
});

const emit = defineEmits(["avatar-change", "check-in", "reset-check-in", "blur-ready"]);
const avatarFileInput = ref(null);
const blurMessageRef = ref(null);

function triggerAvatarUpload() {
  avatarFileInput.value?.click();
}

onMounted(() => {
  emit("blur-ready", blurMessageRef.value);
});
</script>
```

Template rules:

- The avatar `.avatar-image` calls `triggerAvatarUpload`.
- The hidden file input emits `avatar-change` with `$event`.
- The profile message `ref` is `blurMessageRef`.
- Character class uses `item.isHighlighted` instead of old `item.isDays`.
- Use `<ProfileLevelBottle :level-progress="levelProgress" />`.
- Use `<ProfileStreakCard ... @check-in="emit('check-in')" @reset-check-in="emit('reset-check-in')" />`.

- [ ] **Step 5: Wire header and blur composable into `ProfilePage.vue`**

Add imports:

```js
import { useBlurText } from "@/composables/useBlurText";
import ProfileHeaderPanel from "@/components/client/profile/ProfileHeaderPanel.vue";
```

Add setup:

```js
const {
  blurTextInView,
  blurTextElements,
  setBlurTextRef,
} = useBlurText({
  text: () => `你已通过回收行动累计为地球守护了 ${guardianDays.value} 天。感谢你的每一份坚持。`,
  highlightText: () => guardianDays.value.toString(),
});

function handleBlurReady(el) {
  setBlurTextRef(el);
}
```

Replace the header section with:

```vue
<ProfileHeaderPanel
  :profile="profile"
  :avatar-url="avatarUrl"
  :guardian-days="guardianDays"
  :level-progress="levelProgress"
  :blur-text-elements="blurTextElements"
  :blur-text-in-view="blurTextInView"
  :is-guardian-days-updating="isGuardianDaysUpdating"
  :streak-days="streakDays"
  :has-checked-in-today="hasCheckedInToday"
  :is-streak-animating="isStreakAnimating"
  @avatar-change="handleAvatarChange"
  @check-in="handleCheckIn"
  @reset-check-in="resetCheckInForTesting"
  @blur-ready="handleBlurReady"
/>
```

Remove `avatarFileInput`, `triggerAvatarUpload`, `useTemplateRef`, `blurTextRef`, `blurTextObserver`, `blurTextContent`, `blurTextElements`, and local `onBeforeUnmount` blur cleanup from `ProfilePage.vue`.

- [ ] **Step 6: Run focused test and build**

Run:

```bash
cd frontend
npm run test -- useBlurText
npm run build
```

Expected: the focused Vitest file passes and Vite build exits with code 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/composables/useBlurText.js frontend/src/composables/__tests__/useBlurText.test.js frontend/src/components/client/profile/ProfileHeaderPanel.vue frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract profile header"
```

---

### Task 8: Extract Impact Dashboard and Static Panels

**Files:**

- Create: `frontend/src/components/client/profile/ProfileImpactDashboard.vue`
- Create: `frontend/src/components/client/profile/ProfileTasksPanel.vue`
- Create: `frontend/src/components/client/profile/ProfileAchievementsPanel.vue`
- Create: `frontend/src/components/client/profile/ProfileActivityList.vue`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Create `ProfileImpactDashboard.vue`**

Use this script contract:

```vue
<script setup>
import ProfileMetricCard from "./ProfileMetricCard.vue";

defineProps({
  selectedPeriod: { type: String, required: true },
  energyData: { type: Object, required: true },
  co2Data: { type: Object, required: true },
  points: { type: Number, required: true },
  generateLinePath: { type: Function, required: true },
});

const emit = defineEmits(["update:selected-period"]);
</script>
```

Template rules:

- Render tabs for `本周`, `本月`, `季度`.
- Each tab emits `update:selected-period` with its label.
- Render the two `ProfileMetricCard` instances with the exact props from Task 3.
- Move the points metric card and rewards banner into this component.

- [ ] **Step 2: Create `ProfileTasksPanel.vue`**

Use this script contract:

```vue
<script setup>
defineProps({
  tasks: { type: Array, required: true },
});
</script>
```

Template rules:

- Use `task.name`, `task.progressText`, `task.progress`, and `task.reward`.
- Preserve section title `进行中的任务`.
- Use `:style="{ width: `${task.progress}%` }"` for `.progress-fill`.

- [ ] **Step 3: Create `ProfileAchievementsPanel.vue`**

Use this script contract:

```vue
<script setup>
defineProps({
  achievements: { type: Array, required: true },
});

const emit = defineEmits(["view-all"]);
</script>
```

Template rules:

- Card class is `["achievement-card", achievement.unlocked ? "unlocked" : "locked"]`.
- Preserve section title `成就勋章`.
- The button emits `view-all`.

- [ ] **Step 4: Create `ProfileActivityList.vue`**

Use this script contract:

```vue
<script setup>
defineProps({
  activities: { type: Array, required: true },
});
</script>
```

Template rules:

- Use `activity.icon`, `activity.title`, `activity.description`, `activity.points`, `activity.pointsVariant`, and `activity.time`.
- Preserve section title `最近动态`.

- [ ] **Step 5: Wire components and constants into `ProfilePage.vue`**

Add imports:

```js
import ProfileImpactDashboard from "@/components/client/profile/ProfileImpactDashboard.vue";
import ProfileTasksPanel from "@/components/client/profile/ProfileTasksPanel.vue";
import ProfileAchievementsPanel from "@/components/client/profile/ProfileAchievementsPanel.vue";
import ProfileActivityList from "@/components/client/profile/ProfileActivityList.vue";
```

Add the shared constants from this plan near other page-level constants.

Replace dashboard and lower sections with:

```vue
<ProfileImpactDashboard
  :selected-period="selectedPeriod"
  :energy-data="energyData"
  :co2-data="co2Data"
  :points="profile.points"
  :generate-line-path="generateLinePath"
  @update:selected-period="selectedPeriod = $event"
/>

<div class="tasks-achievements-grid">
  <ProfileTasksPanel :tasks="PROFILE_TASKS" />
  <ProfileAchievementsPanel :achievements="PROFILE_ACHIEVEMENTS" />
</div>

<ProfileActivityList :activities="PROFILE_ACTIVITIES" />
```

- [ ] **Step 6: Move CSS into components**

Move these CSS groups out of `ProfilePage.vue`:

- Impact dashboard section styles into `ProfileImpactDashboard.vue`.
- Task section styles into `ProfileTasksPanel.vue`.
- Achievement section styles into `ProfileAchievementsPanel.vue`.
- Activity section styles into `ProfileActivityList.vue`.

Keep `.tasks-achievements-grid` in `ProfilePage.vue` because it coordinates two child components.

- [ ] **Step 7: Build**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite build exits with code 0.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/client/profile/ProfileImpactDashboard.vue frontend/src/components/client/profile/ProfileTasksPanel.vue frontend/src/components/client/profile/ProfileAchievementsPanel.vue frontend/src/components/client/profile/ProfileActivityList.vue frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract profile dashboard panels"
```

---

### Task 9: Final Page Cleanup and Verification

**Files:**

- Modify: `frontend/src/views/client/ProfilePage.vue`
- Modify as needed: profile components created in earlier tasks

- [ ] **Step 1: Remove unused script symbols**

Run:

```bash
cd frontend
npm run build
```

If Vue/Vite reports unused or undefined symbols, remove the unused imports/refs/computed values from `ProfilePage.vue` and the extracted components. The expected final import shape in `ProfilePage.vue` is:

```js
import { computed, onMounted, ref } from "vue";

import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import { useBlurText } from "@/composables/useBlurText";
import { useProfileAvatar } from "@/composables/useProfileAvatar";
import { useProfileCalendar } from "@/composables/useProfileCalendar";
import { useProfileCheckIn } from "@/composables/useProfileCheckIn";
import { useProfileData } from "@/composables/useProfileData";
import { useProfileImpactMetrics } from "@/composables/useProfileImpactMetrics";

import ProfileHeaderPanel from "@/components/client/profile/ProfileHeaderPanel.vue";
import ProfileCheckInAlert from "@/components/client/profile/ProfileCheckInAlert.vue";
import ProfileCalendarSection from "@/components/client/profile/ProfileCalendarSection.vue";
import ProfileImpactDashboard from "@/components/client/profile/ProfileImpactDashboard.vue";
import ProfileTasksPanel from "@/components/client/profile/ProfileTasksPanel.vue";
import ProfileAchievementsPanel from "@/components/client/profile/ProfileAchievementsPanel.vue";
import ProfileActivityList from "@/components/client/profile/ProfileActivityList.vue";
```

- [ ] **Step 2: Reduce `ProfilePage.vue` CSS**

The final scoped style in `ProfilePage.vue` should only keep:

- `.profile-page`
- `.loading-state`
- `.error-state`
- `.spinner`
- `@keyframes spin`
- `.btn-retry`
- `.profile-content`
- `.tasks-achievements-grid`
- page-level media rules that coordinate child sections

Move any remaining component-owned classes to their component file.

- [ ] **Step 3: Check line count**

Run:

```bash
cd ..
(Get-Content -Encoding UTF8 -LiteralPath 'frontend/src/views/client/ProfilePage.vue').Count
```

Expected: count is between 160 and 260. If it is above 260 because static constants are long, keep constants in `ProfilePage.vue` only if the page remains readable; otherwise create `frontend/src/components/client/profile/profileStaticData.js` and import `PROFILE_TASKS`, `PROFILE_ACHIEVEMENTS`, and `PROFILE_ACTIVITIES` from there.

- [ ] **Step 4: Run all composable tests and build**

Run:

```bash
cd frontend
npm run test -- useProfile
npm run test -- useBlurText
npm run build
```

Expected: both Vitest commands pass and Vite build exits with code 0.

- [ ] **Step 5: Browser verification**

Run the dev server:

```bash
cd frontend
npm run dev
```

Open the local Vite URL and verify:

- `/profile` while logged out redirects to `/auth?redirect=/profile`.
- Logging in with the demo credentials still returns to `/profile`.
- `/profile` loads profile content after loading state.
- Retry button still calls `loadProfile` when error state is forced by temporarily throwing inside `useProfileData.loadProfile`; revert the throw immediately after the check.
- Avatar click opens the file picker.
- Non-image avatar selection shows `请选择图片文件`.
- Image larger than 5 MB shows `图片大小不能超过5MB`.
- Valid image persists after refresh.
- First check-in increments guardian days by 1, animates the flame, changes button state, scrolls to calendar, and highlights today.
- Second check-in on the same day shows the alert and does not increment guardian days.
- Month navigation changes the calendar month.
- Period tabs switch energy and CO2 chart type between bar and line behavior as before.
- Metric chart hover tooltips render.
- Level bottle hover tooltip renders.
- Tasks, achievements, and recent activities match the old content.
- Desktop width and mobile width have no obvious layout overlap.

- [ ] **Step 6: Final diff review**

Run:

```bash
git diff --stat
git diff -- frontend/src/views/client/ProfilePage.vue
```

Expected:

- `ProfilePage.vue` contains orchestration only.
- No direct `localStorage` calls remain in `ProfilePage.vue`.
- No direct `fetchProfileData`, `fetchRealDate`, or `fetchCalendarWithOrders` imports remain in `ProfilePage.vue`.
- No chart generation helpers remain in `ProfilePage.vue`.
- No calendar generation helpers remain in `ProfilePage.vue`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/client/ProfilePage.vue frontend/src/components/client/profile frontend/src/composables
git commit -m "refactor(profile): slim profile page"
```

---

## Self-Review

Spec coverage:

- Thin `ProfilePage.vue`: covered by Tasks 5, 7, 8, and 9.
- Profile child components under `components/client/profile/`: covered by Tasks 3, 4, 6, 7, and 8.
- Page-specific composables under `composables/`: covered by Tasks 1, 2, 4, 5, 6, and 7.
- No visual redesign: every component task moves existing markup/CSS and preserves current text/classes unless the spec requested clearer tooltip names.
- Mock API unchanged: file structure explicitly excludes mock API edits.
- No Pinia/Vuex: no task introduces state management packages.
- Static tasks, achievements, and activities remain static: Task 8 moves them to page constants.
- Initial calendar month/order source consistency: Task 5 fetches orders with `calendarDate.year` and `calendarDate.month`.
- Blur text DOM contract: Task 7 uses `blur-ready` and `setBlurTextRef`.
- Debug reset hidden by default: Task 6 uses `showDebugReset: false`.
- Verification: Task 9 includes tests, build, and browser checks.

Placeholder scan:

- No placeholder markers or open-ended implementation instructions remain.
- Every created file has a public contract and concrete code shape.
- Browser verification has explicit behaviors to check.

Type consistency:

- `blurTextElements` uses `{ char, isHighlighted }` in `useBlurText` and `ProfileHeaderPanel`.
- Check-in success path returns `{ checkedIn: true }` and duplicate path returns `{ checkedIn: false }`.
- Calendar DOM handoff uses `ready(el)` from `ProfileCalendarSection` and `setCalendarSectionRef(el)` in `useProfileCalendar`.
- Header DOM handoff uses `blur-ready(el)` from `ProfileHeaderPanel` and `setBlurTextRef(el)` in `useBlurText`.
- Impact dashboard period updates use `update:selected-period`.
