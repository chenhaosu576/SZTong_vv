# ProfilePage Split Implementation Plan (7-file)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `frontend/src/views/client/ProfilePage.vue` (2958 lines) into 5 focused profile components and 2 page-specific composables, without changing visual behavior, route behavior, mock API contracts, or user-facing content.

**Architecture:** Keep `ProfilePage.vue` as a thin orchestrator (160-230 lines). 4 single-consumer composables (`useProfileData` / `useProfileAvatar` / `useProfileImpactMetrics` / `useBlurText`) are inlined into view / `ProfileHeaderPanel` / `ProfileImpactDashboard`. 3 single-consumer sub-panels (`ProfileLevelBottle` / `ProfileStreakCard` / `ProfileMetricCard`) are inlined into `ProfileHeaderPanel` / `ProfileImpactDashboard`. 3 static list panels (`ProfileTasksPanel` / `ProfileAchievementsPanel` / `ProfileActivityList`) are merged into `ProfileBottomSectionsPanel` as 3 sub-sections. Only 2 composables (`useProfileCheckIn` / `useProfileCalendar`) and 5 panels remain as separate files.

**Tech Stack:** Vue 3 `<script setup>`, Vite, Vitest, Vue Router, existing mock APIs in `frontend/src/mock/clientApi.js` and `frontend/src/mock/timeApi.js`.

---

## File Structure

Create:

- `frontend/src/components/client/profile/ProfileHeaderPanel.vue`: top profile section; inlines avatar (validation + FileReader + `localStorage.userAvatar`), blur text (IntersectionObserver + character highlighting), level bottle markup, streak card.
- `frontend/src/components/client/profile/ProfileCheckInAlert.vue`: fixed-position duplicate check-in alert.
- `frontend/src/components/client/profile/ProfileCalendarSection.vue`: calendar section markup, month navigation, legend, tooltip, insight, and `ready(el)` DOM handoff.
- `frontend/src/components/client/profile/ProfileImpactDashboard.vue`: period tabs, 2 inlined metric cards, points card, rewards banner; inlines `selectedPeriod` ref + `energyData` / `co2Data` computed + `generateRandomBars` / `generateLineChartPoints` / `generateLinePath` helpers.
- `frontend/src/components/client/profile/ProfileBottomSectionsPanel.vue`: 3 inlined sub-sections (tasks list, achievements list, activity list) and `view-all-achievements` emit.
- `frontend/src/composables/useProfileCheckIn.js`: check-in state, `guardianDays`, `lastCheckInDate`, alert timers, animation flags.
- `frontend/src/composables/useProfileCalendar.js`: month state, order map, calendar generation, month switching, today highlight.
- `frontend/src/composables/__tests__/useProfileCheckIn.test.js`
- `frontend/src/composables/__tests__/useProfileCalendar.test.js`

Modify:

- `frontend/src/views/client/ProfilePage.vue`: reduce to orchestration, `loadProfile` async (inlined from `useProfileData`), `levelProgress` computed, 3 static constants, imports, and minimal page-level styles.

Do not modify:

- `frontend/src/mock/clientApi.js`
- `frontend/src/mock/timeApi.js`
- `frontend/src/router/index.js`
- `frontend/package.json`

---

## Shared Data Contracts

Use these exact constants in `ProfilePage.vue`:

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
```

---

### Task 1: Extract Check-In and Calendar Composables

**Files:**

- Create: `frontend/src/composables/useProfileCheckIn.js`
- Create: `frontend/src/composables/__tests__/useProfileCheckIn.test.js`
- Create: `frontend/src/composables/useProfileCalendar.js`
- Create: `frontend/src/composables/__tests__/useProfileCalendar.test.js`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Write the failing `useProfileCheckIn` test**

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

- [ ] **Step 2: Run the focused test and verify it fails**

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

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
cd frontend
npm run test -- useProfileCheckIn
```

Expected: 5 tests pass.

- [ ] **Step 5: Write the failing `useProfileCalendar` test**

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

- [ ] **Step 6: Run the focused test and verify it fails**

Run:

```bash
cd frontend
npm run test -- useProfileCalendar
```

Expected: test run fails because `../useProfileCalendar` does not exist.

- [ ] **Step 7: Create `useProfileCalendar.js`**

Create `frontend/src/composables/useProfileCalendar.js`:

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

- [ ] **Step 8: Run the focused tests and verify they pass**

Run:

```bash
cd frontend
npm run test -- useProfileCheckIn useProfileCalendar
```

Expected: 8 tests pass.

- [ ] **Step 9: Wire the composables into `ProfilePage.vue`**

Add imports:

```js
import { useProfileCheckIn } from "@/composables/useProfileCheckIn";
import { useProfileCalendar } from "@/composables/useProfileCalendar";
```

Add setup at top level (before any other code that uses these refs):

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

const {
  calendarDays,
  highlightedDay,
  monthText,
  setCalendarSectionRef,
  initializeCalendar,
  changeMonth,
  highlightToday,
} = useProfileCalendar();
```

Add handlers (still in `ProfilePage.vue` — used by `ProfileHeaderPanel` / `ProfileCalendarSection` in later tasks):

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
```

`loadProfile` (in `ProfilePage.vue`, to be inlined in Task 5) must call `initializeCalendar(calendarDate, ordersData)` and `checkTodayCheckIn()` at the end of the try block, before the loading ref is reset. Keep the existing `Promise.all([fetchProfileData(), fetchRealDate()])` + `fetchCalendarWithOrders(calendarDate.year, calendarDate.month)` order.

- [ ] **Step 10: Build**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite build exits with code 0.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/composables/useProfileCheckIn.js frontend/src/composables/useProfileCalendar.js frontend/src/composables/__tests__ frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract check-in and calendar composables"
```

---

### Task 2: Extract ProfileHeaderPanel (inlines avatar + blur text + bottle + streak card)

**Files:**

- Create: `frontend/src/components/client/profile/ProfileHeaderPanel.vue`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Create `ProfileHeaderPanel.vue`**

Move the entire `.profile-header` section from `ProfilePage.vue` into `ProfileHeaderPanel.vue`. The panel inlines 4 sub-blocks: avatar (validation + FileReader + `localStorage.userAvatar`), blur text (IntersectionObserver + character highlighting), level bottle (markup + CSS + keyframes), streak card (markup + CSS + keyframes).

Use this script contract:

```vue
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const AVATAR_STORAGE_KEY = "userAvatar";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const props = defineProps({
  profile: { type: Object, required: true },
  guardianDays: { type: Number, required: true },
  levelProgress: { type: Number, required: true },
  isGuardianDaysUpdating: { type: Boolean, required: true },
  streakDays: { type: Number, required: true },
  hasCheckedInToday: { type: Boolean, required: true },
  isStreakAnimating: { type: Boolean, required: true },
  showDebugReset: { type: Boolean, default: false },
});

const emit = defineEmits(["check-in", "reset-check-in"]);

// Avatar
const avatarUrl = ref(localStorage.getItem(AVATAR_STORAGE_KEY) || null);
const avatarFileInput = ref(null);

function triggerAvatarUpload() {
  avatarFileInput.value?.click();
}

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

// Blur text
const blurMessageRef = ref(null);
const blurTextInView = ref(true);
let blurTextObserver = null;

const blurTextContent = `你已通过回收行动累计为地球守护了 ${props.guardianDays} 天。感谢你的每一份坚持。`;

const blurTextElements = computed(() => {
  const text = blurTextContent;
  const highlight = String(props.guardianDays);
  const highlightIndex = text.indexOf(highlight);
  return text.split("").map((char, index) => ({
    char,
    isHighlighted: highlightIndex >= 0 && index >= highlightIndex && index < highlightIndex + highlight.length,
  }));
});

onMounted(() => {
  if (!blurMessageRef.value || typeof IntersectionObserver === "undefined") return;
  blurTextObserver = new IntersectionObserver(
    ([entry]) => {
      blurTextInView.value = entry.isIntersecting;
    },
    { threshold: 0.1, rootMargin: "0px" },
  );
  blurTextObserver.observe(blurMessageRef.value);
});

onBeforeUnmount(() => {
  blurTextObserver?.disconnect();
});

// Bottle hover
const isBottleHovered = ref(false);
</script>
```

Template rules:

- Root is `<section class="profile-header">` with two children: `.header-left` (avatar + profile meta) and `.header-right` (bottle + streak card).
- Avatar: `.avatar-image` div calls `triggerAvatarUpload`. Hidden `<input ref="avatarFileInput" type="file" accept="image/*" @change="handleAvatarChange" class="avatar-input" />` after the image div.
- Profile message: `<p ref="blurMessageRef" class="profile-message" :class="{ 'is-blurred': !blurTextInView }">` with each character in `<span class="profile-message-char" :class="{ 'is-highlighted': item.isHighlighted }">{{ item.char }}</span>`.
- Level bottle: preserve cap/neck/body/liquid/wave/bubble/reflection markup with `:style="{ height: levelProgress + '%' }"` on `.bottle-liquid` and `@mouseenter="isBottleHovered = true"` / `@mouseleave="isBottleHovered = false"` on `.bottle-container`.
- Streak card: `<button class="streak-btn" :class="{ 'is-checked': hasCheckedInToday }" @click="emit('check-in')">打卡</button>`. Debug reset: `<button v-if="showDebugReset" class="streak-reset" @click="emit('reset-check-in')">重置</button>`.

CSS to move (preserve verbatim from `ProfilePage.vue`):

- `.profile-header` / `.header-left` / `.header-right`
- `.avatar-container` / `.avatar-image` / `.avatar-input` (hide) / `.avatar-upload` (if any) / `.avatar-badge`
- `.profile-meta` / `.profile-name` / `.profile-role` / `.profile-id`
- `.profile-message` / `.profile-message.is-blurred .profile-message-char:not(.is-highlighted)` (filter: blur) / `.profile-message-char` / `.profile-message-char.is-highlighted`
- `.bottle-container` / `.bottle-cap` / `.bottle-neck` / `.bottle-body` / `.bottle-liquid` / `.bottle-tooltip` / `.bottle-tooltip-label` / `.bottle-tooltip-progress` (rename from `.tooltip-label` / `.tooltip-progress`)
- `.wave` / `.bubble` / `.glass-reflection`
- All bottle keyframes: `tooltipSlideDown`, `intensiveWave1` through `intensiveWave4`, `fastBubbleRise1` through `fastBubbleRise4`, `reflectionShimmer`
- `.compact-streak` / `.streak-icon` / `.streak-info` / `.streak-label` / `.streak-days` / `.streak-btn` / `.streak-btn.is-checked` / `.streak-reset`
- All streak keyframes: `flameFlicker` (or whatever name the original file uses)
- `@media (prefers-reduced-motion: reduce) { .profile-message-char / .bottle-* / .streak-* }` rules that target inlined sub-blocks

Keep `page-level @media` (e.g., `≤ 1200px` header layout flip) in `ProfilePage.vue` — it coordinates across panels, not header-internal.

- [ ] **Step 2: Wire `ProfileHeaderPanel` into `ProfilePage.vue`**

Add import:

```js
import ProfileHeaderPanel from "@/components/client/profile/ProfileHeaderPanel.vue";
```

Replace the `<section class="profile-header">...</section>` block in `ProfilePage.vue` template with:

```vue
<ProfileHeaderPanel
  :profile="profile"
  :guardian-days="guardianDays"
  :level-progress="levelProgress"
  :is-guardian-days-updating="isGuardianDaysUpdating"
  :streak-days="streakDays"
  :has-checked-in-today="hasCheckedInToday"
  :is-streak-animating="isStreakAnimating"
  @check-in="handleCheckIn"
  @reset-check-in="resetCheckInForTesting"
/>
```

Pass `showDebugReset: false` by default; if the original `ProfilePage.vue` exposed the reset button, set it to `true` here. The page-level handler is `resetCheckInForTesting` (or `() => {}` if not wired — verify against the original markup).

- [ ] **Step 3: Build**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite build exits with code 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/client/profile/ProfileHeaderPanel.vue frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract header panel with inlined avatar/blur/bottle/streak"
```

---

### Task 3: Extract ProfileImpactDashboard (inlines 2 metric cards + generate helpers)

**Files:**

- Create: `frontend/src/components/client/profile/ProfileImpactDashboard.vue`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Create `ProfileImpactDashboard.vue`**

Move the entire `.impact-dashboard` section from `ProfilePage.vue` into `ProfileImpactDashboard.vue`. The panel inlines `selectedPeriod` ref + `energyData` / `co2Data` computed + `generateRandomBars` / `generateLineChartPoints` / `generateLinePath` helpers (the 2 metric cards are rendered via `v-for` over a local array to avoid template duplication).

Use this script contract:

```vue
<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  points: { type: Number, required: true },
});

const emit = defineEmits(["update:selected-period"]);

const selectedPeriod = ref("本月");

const metricsConfig = [
  {
    key: "energy",
    label: "已节约能源",
    accentColor: "#006418",
    gradientId: "energyGradient",
    formatTooltip: (value) => `${value} kWh`,
  },
  {
    key: "co2",
    label: "减少二氧化碳",
    accentColor: "#006418",
    gradientId: "co2Gradient",
    formatTooltip: (value) => `${(value * 0.15).toFixed(1)} kg`,
  },
];

function periodDatasets(period, baseValue, baseUnit, baseTrend, pointScale) {
  if (period === "本周") {
    return {
      value: baseValue.week,
      unit: baseUnit,
      trend: baseTrend.week,
      chartType: "bar",
      bars: generateRandomBars(7),
      labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    };
  }
  if (period === "本月") {
    return {
      value: baseValue.month,
      unit: baseUnit,
      trend: baseTrend.month,
      chartType: "bar",
      bars: generateRandomBars(30),
      labels: Array.from({ length: 30 }, (_, i) => `${i + 1}日`),
    };
  }
  return {
    value: baseValue.quarter,
    unit: baseUnit,
    trend: baseTrend.quarter,
    chartType: "line",
    points: generateLineChartPoints(12),
    labels: ["第1周", "第2周", "第3周", "第4周", "第5周", "第6周", "第7周", "第8周", "第9周", "第10周", "第11周", "第12周"],
  };
}

const energyData = computed(() => periodDatasets(selectedPeriod.value, { week: 458, month: 1842, quarter: 5526 }, "kWh", { week: "+5.2%", month: "+8.3%", quarter: "+12.1%" }));
const co2Data = computed(() => periodDatasets(selectedPeriod.value, { week: 12.4, month: 48.6, quarter: 145.8 }, "kg", { week: "+3.8%", month: "+6.5%", quarter: "+9.7%" }));

const metricCards = computed(() => [
  { config: metricsConfig[0], data: energyData.value },
  { config: metricsConfig[1], data: co2Data.value },
]);

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

function generateLinePath(points) {
  if (points.length === 0) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}
</script>
```

Template rules:

- Root is `<section class="impact-dashboard">`.
- Period tabs: 3 buttons for `本周` / `本月` / `季度` with `@click="emit('update:selected-period', label)"` and `:class="{ active: selectedPeriod === label }"`.
- Metric cards: `<div v-for="card in metricCards" :key="card.config.key" class="metric-card">` with header (`.metric-label` + `.metric-trend`), value (`.metric-value` + `.metric-unit`), chart (bar or line via `v-if="card.data.chartType === 'bar'"`), and tooltip. Hover state: `hoveredBarIndex` / `hoveredPointIndex` are scoped inside the v-for via a tiny inline helper or by using `data-index` + DOM event delegation — simplest is a `ref` Map of `Set<index>` keyed by card key.
- Points card: `.metric-value.points` block with `{{ points }}`.
- Rewards banner: `<div class="rewards-banner">...</div>` (preserve markup).

CSS to move (preserve verbatim):

- `.impact-dashboard` / `.impact-dashboard-content` / `.period-tabs` / `.period-tab` / `.period-tab.active`
- `.metrics-grid`
- `.metric-card` / `.metric-header` / `.metric-label` / `.metric-trend` / `.metric-value` / `.metric-unit` / `.metric-value.points`
- `.mini-chart` / `.bar` / `.bar.active` / `.bar-tooltip`
- `.line-chart` / `.line-chart-area` / `.line-tooltip`
- `linearGradient` defs (if any are inline `<defs>` in template, keep them; otherwise in CSS)
- `.rewards-banner`
- Keyframe `tooltipFadeIn` (chart tooltip)

- [ ] **Step 2: Wire `ProfileImpactDashboard` into `ProfilePage.vue`**

Add import:

```js
import ProfileImpactDashboard from "@/components/client/profile/ProfileImpactDashboard.vue";
```

Replace the `.impact-dashboard` block in template with:

```vue
<ProfileImpactDashboard
  :points="profile?.points ?? 0"
  @update:selected-period="() => {}"
/>
```

The `@update:selected-period` handler is a no-op in the page (the panel owns `selectedPeriod` internally now). If the original `ProfilePage.vue` synced period to `localStorage` or to other state, add the sync logic here. By default, the panel owns the period state and re-emits on tab click; the page just listens and discards.

- [ ] **Step 3: Build**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite build exits with code 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/client/profile/ProfileImpactDashboard.vue frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract impact dashboard with inlined metric cards"
```

---

### Task 4: Extract 3 Smaller Panels (Calendar / Alert / BottomSections)

**Files:**

- Create: `frontend/src/components/client/profile/ProfileCalendarSection.vue`
- Create: `frontend/src/components/client/profile/ProfileCheckInAlert.vue`
- Create: `frontend/src/components/client/profile/ProfileBottomSectionsPanel.vue`
- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Create `ProfileCalendarSection.vue`**

Move the entire `.calendar-section` from `ProfilePage.vue` into `ProfileCalendarSection.vue`. Use this script contract:

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

Render the calendar grid with `<div v-for="(day, i) in calendarDays" :key="i" :class="['calendar-day', day.empty && 'is-empty', day.isToday && 'is-today', highlightedDay === i && 'is-highlighted', day.intensity && `intensity-${day.intensity}`]">` — preserve all the original class logic and tooltip content verbatim.

CSS to move: `.calendar-section` / `.calendar-controls` / `.month-text` / `.nav-btn` / `.calendar-legend` / `.calendar-weekdays` / `.calendar-grid` / `.calendar-day` (all variants: empty, today, highlighted, intensity-1/2/3) / `.calendar-day-tooltip` / `.calendar-insight` / keyframes for highlight pulse.

- [ ] **Step 2: Create `ProfileCheckInAlert.vue`**

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

CSS to move: `.check-in-alert` (fixed position) / `.alert-content` / `.alert-icon` / `.alert-message` / keyframes (slide / pulse / shake).

- [ ] **Step 3: Create `ProfileBottomSectionsPanel.vue`**

Move `.tasks-section`, `.achievements-section`, `.activities-section` blocks (3 sub-sections) into one panel. Use this script contract:

```vue
<script setup>
defineProps({
  tasks: { type: Array, required: true },
  achievements: { type: Array, required: true },
  activities: { type: Array, required: true },
});

const emit = defineEmits(["view-all-achievements"]);
</script>
```

Template structure (preserve all original markup verbatim, including Chinese text and class names):

```vue
<section class="bottom-sections">
  <section class="tasks-section">
    <h2 class="section-title">进行中的任务</h2>
    <div v-for="task in tasks" :key="task.name" class="task-card">
      <h3>{{ task.name }}</h3>
      <p>{{ task.progressText }}</p>
      <div class="progress-bar"><div class="progress-fill" :style="{ width: `${task.progress}%` }"></div></div>
      <p>{{ task.reward }}</p>
    </div>
  </section>

  <section class="achievements-section">
    <h2 class="section-title">成就勋章</h2>
    <div class="achievement-grid">
      <div
        v-for="ach in achievements"
        :key="ach.name"
        :class="['achievement-card', ach.unlocked ? 'unlocked' : 'locked']"
      >
        <span class="achievement-icon">{{ ach.icon }}</span>
        <span>{{ ach.name }}</span>
      </div>
    </div>
    <button class="btn-view-all" @click="emit('view-all-achievements')">查看全部</button>
  </section>

  <section class="activities-section">
    <h2 class="section-title">最近动态</h2>
    <div v-for="(item, i) in activities" :key="i" class="activity-item">
      <span class="activity-icon">{{ item.icon }}</span>
      <div class="activity-content">
        <h3>{{ item.title }}</h3>
        <p>{{ item.description }}</p>
      </div>
      <span :class="['activity-points', `is-${item.pointsVariant}`]">{{ item.points }}</span>
      <span class="activity-time">{{ item.time }}</span>
    </div>
  </section>
</section>
```

CSS to move: all `.tasks-section` / `.task-card` / `.progress-bar` / `.progress-fill` rules; all `.achievements-section` / `.achievement-grid` / `.achievement-card` (with `unlocked` / `locked` variants) / `.achievement-icon` / `.btn-view-all` rules; all `.activities-section` / `.activity-item` / `.activity-icon` / `.activity-content` / `.activity-points.is-positive` / `.activity-points.is-negative` / `.activity-time` rules. Also `.section-title` (shared across 3 sub-sections) lives in this panel.

- [ ] **Step 4: Wire all 3 panels into `ProfilePage.vue`**

Add imports:

```js
import ProfileCalendarSection from "@/components/client/profile/ProfileCalendarSection.vue";
import ProfileCheckInAlert from "@/components/client/profile/ProfileCheckInAlert.vue";
import ProfileBottomSectionsPanel from "@/components/client/profile/ProfileBottomSectionsPanel.vue";
```

Replace `.calendar-section` block with:

```vue
<ProfileCalendarSection
  :calendar-days="calendarDays"
  :month-text="monthText"
  :highlighted-day="highlightedDay"
  @ready="handleCalendarReady"
  @change-month="changeMonth"
/>
```

Inside the page-level root container (right before the bottom sections), add:

```vue
<ProfileCheckInAlert :visible="showCheckInAlert" />
```

Replace `.tasks-section` + `.achievements-section` + `.activities-section` blocks with:

```vue
<ProfileBottomSectionsPanel
  :tasks="PROFILE_TASKS"
  :achievements="PROFILE_ACHIEVEMENTS"
  :activities="PROFILE_ACTIVITIES"
  @view-all-achievements="() => {}"
/>
```

The `@view-all-achievements` handler is a no-op (matches the original behavior — no real navigation).

- [ ] **Step 5: Build**

Run:

```bash
cd frontend
npm run build
```

Expected: Vite build exits with code 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/client/profile/ProfileCalendarSection.vue frontend/src/components/client/profile/ProfileCheckInAlert.vue frontend/src/components/client/profile/ProfileBottomSectionsPanel.vue frontend/src/views/client/ProfilePage.vue
git commit -m "refactor(profile): extract calendar, alert, and bottom sections panels"
```

---

### Task 5: Final Page Cleanup and Verification

**Files:**

- Modify: `frontend/src/views/client/ProfilePage.vue`

- [ ] **Step 1: Inline `loadProfile` into `ProfilePage.vue`**

Remove the dependency on `useProfileData` (which we never created). The `loadProfile` async function in `ProfilePage.vue` directly imports the 3 mock fetch functions and owns `loading` / `errorText` / `profile` refs:

```js
import { ref, computed, onMounted } from "vue";
import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import { useProfileCheckIn } from "@/composables/useProfileCheckIn";
import { useProfileCalendar } from "@/composables/useProfileCalendar";

import { fetchProfileData } from "@/mock/clientApi";
import { fetchRealDate, fetchCalendarWithOrders } from "@/mock/timeApi";

import ProfileHeaderPanel from "@/components/client/profile/ProfileHeaderPanel.vue";
import ProfileCheckInAlert from "@/components/client/profile/ProfileCheckInAlert.vue";
import ProfileCalendarSection from "@/components/client/profile/ProfileCalendarSection.vue";
import ProfileImpactDashboard from "@/components/client/profile/ProfileImpactDashboard.vue";
import ProfileBottomSectionsPanel from "@/components/client/profile/ProfileBottomSectionsPanel.vue";

const pageRef = ref(null);
useRevealOnScroll(pageRef);

const loading = ref(true);
const errorText = ref("");
const profile = ref(null);

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

const {
  calendarDays,
  highlightedDay,
  monthText,
  setCalendarSectionRef,
  initializeCalendar,
  changeMonth,
  highlightToday,
} = useProfileCalendar();

const levelProgress = computed(() => {
  const points = profile.value?.points ?? 0;
  return Math.min(100, Math.max(0, (points % 1000) / 10));
});

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
    initializeCalendar(calendarDate, ordersData);
    checkTodayCheckIn();
  } catch {
    errorText.value = "个人信息加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

async function handleCheckIn() {
  const result = triggerCheckIn();
  if (result?.checkedIn) {
    await highlightToday();
  }
}

function handleCalendarReady(el) {
  setCalendarSectionRef(el);
}

onMounted(() => {
  loadProfile();
});
```

- [ ] **Step 2: Confirm no `useProfileData` / `useProfileAvatar` / `useProfileImpactMetrics` / `useBlurText` references remain in `ProfilePage.vue`**

Run:

```bash
cd frontend
grep -nE "useProfileData|useProfileAvatar|useProfileImpactMetrics|useBlurText|useTemplateRef" src/views/client/ProfilePage.vue
```

Expected: no output (no matches).

- [ ] **Step 3: Confirm no `useBeforeUnmount` in `ProfilePage.vue`**

Run:

```bash
cd frontend
grep -n "onBeforeUnmount" src/views/client/ProfilePage.vue
```

Expected: no output (the blur observer cleanup moved to `ProfileHeaderPanel`).

- [ ] **Step 4: Reduce `ProfilePage.vue` CSS**

The final scoped style in `ProfilePage.vue` should only keep:

- `.profile-page`
- `.loading-state` / `.error-state` / `.spinner` + `@keyframes spin` / `.btn-retry`
- `.profile-content` (page-level container with all panels)
- `@media (max-width: 1200px / 768px / 480px)` page-level rules that coordinate multiple sections (header layout flip, period tabs horizontal scroll, alert width)

Move any remaining component-owned classes to their respective panel.

- [ ] **Step 5: Check line count**

Run from `frontend/`:

```bash
(Get-Content -Encoding UTF8 -LiteralPath 'src/views/client/ProfilePage.vue').Count
```

Expected: 160-260. The page is intentionally a bit thicker than home's 110 lines because of the 3 static constants + `loadProfile` async + `levelProgress` computed.

- [ ] **Step 6: Run all composable tests and build**

Run:

```bash
cd frontend
npm run test -- useProfileCheckIn useProfileCalendar
npm run build
```

Expected: 8 tests pass, Vite build exits with code 0.

- [ ] **Step 7: Browser verification**

Run the dev server:

```bash
cd frontend
npm run dev
```

Open the local Vite URL and verify:

- `/profile` while logged out redirects to `/auth?redirect=/profile`.
- Logging in with the demo credentials still returns to `/profile`.
- `/profile` loads profile content after loading state.
- Retry button still calls `loadProfile` when error state is forced by temporarily throwing inside `loadProfile`; revert the throw immediately after the check.
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

- [ ] **Step 8: Final diff review**

Run:

```bash
git diff --stat
git diff -- frontend/src/views/client/ProfilePage.vue
```

Expected:

- `ProfilePage.vue` contains orchestration only.
- No `useProfileData` / `useProfileAvatar` / `useProfileImpactMetrics` / `useBlurText` import remains.
- No `onBeforeUnmount` / `useTemplateRef` import remains.
- No `localStorage.` calls remain in `ProfilePage.vue`.
- No chart generation helpers remain in `ProfilePage.vue`.
- No calendar generation helpers remain in `ProfilePage.vue`.
- No avatar / blur text / bottle / streak card markup remains in `ProfilePage.vue`.
- `PROFILE_TASKS` / `PROFILE_ACHIEVEMENTS` / `PROFILE_ACTIVITIES` constants are at the top of `ProfilePage.vue` script.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/views/client/ProfilePage.vue frontend/src/components/client/profile frontend/src/composables
git commit -m "refactor(profile): slim profile page to thin orchestrator"
```

---

## Self-Review

Spec coverage:

- Thin `ProfilePage.vue` (160-230 lines): covered by Task 5.
- 5 profile panels under `components/client/profile/`: covered by Tasks 2, 3, 4.
- 2 page-specific composables under `composables/`: covered by Task 1.
- 4 single-consumer composables inlined (`useProfileData` → view; `useProfileAvatar` / `useBlurText` → `ProfileHeaderPanel`; `useProfileImpactMetrics` → `ProfileImpactDashboard`): covered by Tasks 2, 3, 5.
- 3 single-consumer sub-panels inlined (`ProfileLevelBottle` / `ProfileStreakCard` → `ProfileHeaderPanel`; `ProfileMetricCard` → `ProfileImpactDashboard`): covered by Tasks 2, 3.
- 3 static list panels merged into `ProfileBottomSectionsPanel`: covered by Task 4.
- No visual redesign: every task moves existing markup/CSS verbatim from `ProfilePage.vue`.
- Mock API unchanged: file structure explicitly excludes mock API edits.
- No Pinia/Vuex: no task introduces state management packages.
- Static tasks, achievements, and activities remain static: Tasks 4 + 5 keep them as page constants passed via props.
- Initial calendar month/order source consistency: Task 5 step 1 fetches orders with `calendarDate.year` and `calendarDate.month` and reuses the same `calendarDate` object for `initializeCalendar`.
- Blur text DOM contract: Task 2 uses `IntersectionObserver` inside the panel, no DOM handoff to page; cleanup in panel's own `onBeforeUnmount`.
- Debug reset hidden by default: Task 2 uses `showDebugReset: false` default in `ProfileHeaderPanel`.
- Verification: Task 5 includes tests, build, and browser checks.

Placeholder scan:

- No placeholder markers or open-ended implementation instructions remain.
- Every created file has a public contract and concrete code shape.
- Browser verification has explicit behaviors to check.

Type consistency:

- `blurTextElements` uses `{ char, isHighlighted }` in `ProfileHeaderPanel`.
- Check-in success path returns `{ checkedIn: true }` and duplicate path returns `{ checkedIn: false }`.
- Calendar DOM handoff uses `ready(el)` from `ProfileCalendarSection` and `setCalendarSectionRef(el)` in `useProfileCalendar`.
- Impact dashboard period updates use `update:selected-period`.
- Bottom sections uses `view-all-achievements` for the achievements "view all" button.
