# AppointmentPage 组件拆分实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 1631 行的 `AppointmentPage.vue` 拆成 view 编排层 + 4 个 composables + 10 个 panel + 1 个常量工具,view 行数降到 ~150。

**Architecture:** 完全镜像 `AiQaPage.vue` 拆分风格。view 只持有 destructured ref 和少量派生 computed;所有业务状态与逻辑下沉到职责单一的 composables;模板按 UI 区域切为独立 panel,通过 props + emits 与 view 通信。CSS 跟着 markup 搬,view 只留容器/布局/响应式。

**Tech Stack:** Vue 3 `<script setup>` + Composition API + `useRevealOnScroll` composable + `clientApi.js` mock。

**前置阅读:**
- 设计文档:`docs/superpowers/specs/2026-06-30-appointment-page-split-design.md`
- 拆分范式参照:`frontend/src/views/client/AiQaPage.vue` + `frontend/src/components/client/qa/*.vue` + `frontend/src/composables/useChat*.js`
- 当前源:`frontend/src/views/client/AppointmentPage.vue`(1631 行)

**TDD 注:** 项目无 Vitest / Jest / ESLint 配置(见 `frontend/CLAUDE.md`),spec 明确"本次重构不做单元测试,验证全部走 Vite dev server + 浏览器手动"。因此本计划的每个 task 用「dev server 启动 + 浏览器手动验证」替代自动化测试。CI 测试步骤 `--passWithNoTests`,无需调整。

---

## 文件结构(锁定)

```
frontend/src/utils/appointmentConstants.js               (新建:3 个常量)
frontend/src/composables/useDatePicker.js                (新建:日期状态机)
frontend/src/composables/useWeightRange.js               (新建:重量映射)
frontend/src/composables/useAppointmentUpload.js         (新建:上传临时态)
frontend/src/composables/useAppointmentForm.js           (新建:form 编排)
frontend/src/components/client/appointment/
  AppointmentHeroPanel.vue                               (新建:hero)
  AppointmentAsideCards.vue                              (新建:侧栏两卡)
  AppointmentLoadingSkeleton.vue                         (新建:骨架)
  AppointmentValidationModal.vue                         (新建:校验弹窗)
  AppointmentSuccessModal.vue                            (新建:成功弹窗)
  AppointmentContactSection.vue                          (新建:Section 01)
  AppointmentScheduleSection.vue                         (新建:Section 02)
  AppointmentItemSection.vue                             (新建:Section 03)
  AppointmentConfirmSection.vue                          (新建:Section 04)
  AppointmentSubmitBar.vue                               (新建:提交栏)
frontend/src/views/client/AppointmentPage.vue            (改写:1631 → ~150)
```

---

## Task 1: 抽出常量工具 `appointmentConstants.js`

**Files:**
- Create: `frontend/src/utils/appointmentConstants.js`

无依赖,最先落地。

- [ ] **Step 1.1: 创建文件**

文件顶部加一段块注释说明用途,符合用户要求「每个文件事干嘛的」。

创建 `frontend/src/utils/appointmentConstants.js`:

```javascript
// appointmentConstants.js
// 预约页面共享的静态数据常量。
// 集中在此避免散落到各 composable / view 顶部。
//
// 使用方:
//   - useWeightRange:  weightPointMap / weightDisplayMap
//   - useDatePicker:   weekdayLabels

export const weightPointMap = {
  "0-5kg": 18,
  "5-10kg": 28,
  "10-20kg": 45,
  "20kg 以上": 70,
};

export const weightDisplayMap = {
  "0-5kg": "3.0",
  "5-10kg": "5.5",
  "10-20kg": "12.0",
  "20kg 以上": "24.0",
};

export const weekdayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
```

- [ ] **Step 1.2: 验证可被 import**

暂时不改原 `AppointmentPage.vue`。新建一个临时 sanity 校验(可手动跑一次):

```bash
cd frontend && node -e "import('./src/utils/appointmentConstants.js').then(m => console.log(Object.keys(m)))"
```

Expected: 输出 `["weightPointMap", "weightDisplayMap", "weekdayLabels"]`。

如果 import 失败报错,检查 ESM 语法。

- [ ] **Step 1.3: 提交**

```bash
git add frontend/src/utils/appointmentConstants.js
git commit -m "refactor(appointment): extract shared constants to appointmentConstants.js

Used by upcoming useWeightRange and useDatePicker composables. Keeps
weight → points and weight → display mappings in one place."
```

---

## Task 2: 抽出 `useDatePicker` composable

**Files:**
- Create: `frontend/src/composables/useDatePicker.js`

封装日期状态机:当前月份 + 周偏移 + 派生 7 个日期卡。

- [ ] **Step 2.1: 创建文件**

```javascript
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
```

- [ ] **Step 2.2: 在浏览器中验证(临时挂在 view 上)**

为快速验证,临时在 `AppointmentPage.vue` 第 8 行后加:

```javascript
import { useDatePicker } from "../../composables/useDatePicker";
const dp = useDatePicker();
console.log("datePicker check:", dp.appointmentDates.value.length, dp.currentMonthText.value);
```

跑 `npm run dev` 并打开浏览器 console,确认输出"7"和形如"2026年6月"。验证完删除这段临时代码。

- [ ] **Step 2.3: 提交**

```bash
git add frontend/src/composables/useDatePicker.js frontend/src/views/client/AppointmentPage.vue
git commit -m "refactor(appointment): extract useDatePicker composable

Encapsulates month + week state and derives the 7-day card array. Pure
function of currentMonth + weekOffset; no form dependency."
```

---

## Task 3: 抽出 `useWeightRange` composable

**Files:**
- Create: `frontend/src/composables/useWeightRange.js`

封装重量输入 ↔ 区间双向映射。

- [ ] **Step 3.1: 创建文件**

```javascript
// useWeightRange.js
// 预约页的重量输入同步器。
// weightInput 由调用方(view)拥有并提供;composable 只提供操作它的方法:
//   - syncWeightRange(event):  input 事件 → 写 weightInput + 尝试映射 form.weight
//   - normalizeWeightInput():  blur 事件 → 格式化显示,空值回退到 weightDisplayMap[form.weight]
//
// 通过 form / weightInput / weightPointMap / weightDisplayMap 入参注入,
// 保持纯函数式(不耦合具体 view,可被未来其他页面复用)。
//
// 为什么 weightInput 由 view 拥有:
//   summary section 需要展示用户实时输入(原始行为就是优先显示用户输入而非
//   区间默认值),所以 view 必须能读到同一个 weightInput。统一由 view 拥有、
//   通过 prop 传给 AppointmentItemSection,composable 只操作不持有。

import { toRef } from "vue";

export function useWeightRange({ form, weightInput, weightPointMap, weightDisplayMap }) {
  // weightInput 已是 ref;toRef 用于 prop 解构场景时类型稳定。
  const input = toRef(weightInput);

  // 把数值映射回区间。amount <= 0 视为空。
  function getWeightRangeFromValue(value) {
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount) || amount <= 0) return "";
    if (amount <= 5) return "0-5kg";
    if (amount <= 10) return "5-10kg";
    if (amount <= 20) return "10-20kg";
    return "20kg 以上";
  }

  // input 事件:实时同步输入框 + 尝试映射区间
  function syncWeightRange(event) {
    input.value = event.target.value;
    const mappedRange = getWeightRangeFromValue(input.value);
    if (mappedRange) {
      form.weight = mappedRange;
    }
  }

  // blur 事件:格式化显示,空值回退默认
  function normalizeWeightInput() {
    const mappedRange = getWeightRangeFromValue(input.value);

    if (!mappedRange) {
      input.value = weightDisplayMap[form.weight] || "5.5";
      return;
    }

    form.weight = mappedRange;
    input.value = Number.parseFloat(input.value).toFixed(1);
  }

  return {
    syncWeightRange,
    normalizeWeightInput,
  };
}
```

- [ ] **Step 3.2: 临时 sanity check**

类似 Task 2.2,在 AppointmentPage.vue 加:

```javascript
import { reactive, ref } from "vue";
import { useWeightRange } from "../../composables/useWeightRange";
import { weightPointMap, weightDisplayMap } from "../../utils/appointmentConstants";

const _tmpForm = reactive({ weight: "5-10kg" });
const _tmpInput = ref("5.5");
const wr = useWeightRange({ form: _tmpForm, weightInput: _tmpInput, weightPointMap, weightDisplayMap });
wr.syncWeightRange({ target: { value: "12.3" } });
console.log("wr check:", _tmpForm.weight, _tmpInput.value);
```

期望输出:`10-20kg 12.3`(输入 12.3 后 form.weight 自动映射)。

验证完删除临时代码。

- [ ] **Step 3.3: 提交**

```bash
git add frontend/src/composables/useWeightRange.js frontend/src/views/client/AppointmentPage.vue
git commit -m "refactor(appointment): extract useWeightRange composable

Bridges freeform numeric input and banded form.weight. Pure: takes form
and maps via injection, no module-level coupling."
```

---

## Task 4: 抽出 `useAppointmentUpload` composable

**Files:**
- Create: `frontend/src/composables/useAppointmentUpload.js`

封装图片上传临时态。

- [ ] **Step 4.1: 创建文件**

```javascript
// useAppointmentUpload.js
// 预约页的图片上传临时态。
// 持有 fileInputRef / itemImage / itemImageName,提供触发选择 / 监听变更 / 清除。
// 上传不持久化、不入 form;提交时由 useAppointmentForm.handleSubmit 读取
// useAppointmentUpload().itemImage.value 临时使用。
//
// 使用方: AppointmentItemSection 在 setup() 里调用。

import { ref } from "vue";

export function useAppointmentUpload() {
  // template ref,指向隐藏的 <input type="file">
  const fileInputRef = ref(null);

  // 当前选中的文件 / 文件名
  const itemImage = ref(null);
  const itemImageName = ref("");

  function triggerFileSelect() {
    fileInputRef.value?.click();
  }

  function handleFileChange(event) {
    const [file] = event.target.files || [];
    itemImage.value = file || null;
    itemImageName.value = file ? file.name : "";
  }

  function clearSelectedFile() {
    itemImage.value = null;
    itemImageName.value = "";
    if (fileInputRef.value) {
      fileInputRef.value.value = "";
    }
  }

  return {
    fileInputRef,
    itemImage,
    itemImageName,
    triggerFileSelect,
    handleFileChange,
    clearSelectedFile,
  };
}
```

- [ ] **Step 4.2: 临时 sanity check**

在 `AppointmentPage.vue` 加:

```javascript
import { useAppointmentUpload } from "../../composables/useAppointmentUpload";
const up = useAppointmentUpload();
console.log("upload check:", up.itemImageName.value === "", typeof up.triggerFileSelect === "function");
```

期望输出:`true function`。验证完删除。

- [ ] **Step 4.3: 提交**

```bash
git add frontend/src/composables/useAppointmentUpload.js frontend/src/views/client/AppointmentPage.vue
git commit -m "refactor(appointment): extract useAppointmentUpload composable

Local state for the hidden file input and currently selected image.
Not part of form; consumed transiently by submit."
```

---

## Task 5: 抽出 `useAppointmentForm` composable

**Files:**
- Create: `frontend/src/composables/useAppointmentForm.js`

编排:meta 拉取 + form 初始化 + submit + modal 状态。

- [ ] **Step 5.1: 创建文件**

```javascript
// useAppointmentForm.js
// 预约页的 form 编排 composable。
// 职责:
//   - loadMeta(): 调 fetchAppointmentMeta 拉取配置,写入 meta 与 form 默认值
//   - handleSubmit(): 校验 → 调 submitAppointment → 驱动 modal
//   - 维护 metaLoading / submitLoading / errorText / submitResult / modal 状态
//
// 通过 datePicker / availableTimeSlots 入参注入初始化默认值所需的派生数据,
// 保持纯函数式(不直接 import useDatePicker)。
//
// 使用方: AppointmentPage.vue 顶层 setup() 调用,暴露给 panel 通过 props。

import { reactive, ref } from "vue";
import { fetchAppointmentMeta, submitAppointment } from "../mock/clientApi";
import { getAppointmentValidationMessage } from "../utils/appointmentValidation";
import { weightDisplayMap } from "../utils/appointmentConstants";

export function useAppointmentForm({ datePicker, availableTimeSlots }) {
  // —— 状态 ——

  const meta = reactive({
    categories: [],
    weights: [],
    periods: [],
    tips: [],
  });

  const form = reactive({
    category: "",
    weight: "",
    date: "",
    period: "",
    address: "",
    contactName: "",
    phone: "",
    note: "",
  });

  const metaLoading = ref(true);
  const submitLoading = ref(false);
  const errorText = ref("");
  const submitResult = ref(null);
  const showValidationModal = ref(false);
  const showSuccessModal = ref(false);
  const validationMessage = ref("");

  // —— 初始化 ——

  async function loadMeta() {
    metaLoading.value = true;
    errorText.value = "";

    try {
      const data = await fetchAppointmentMeta();
      meta.categories = data.categories;
      meta.weights = data.weights;
      meta.periods = data.periods;
      meta.tips = data.tips;

      form.category = data.categories[0] || "";
      form.weight = data.weights[1] || data.weights[0] || "";

      const availableDates = datePicker.appointmentDates.value.filter((item) => !item.isFull);
      form.date = availableDates[1]?.value || availableDates[0]?.value || "";
      form.period = availableTimeSlots.value[1]?.value || availableTimeSlots.value[0]?.value || "";
    } catch (error) {
      errorText.value = "预约配置加载失败，请刷新后重试。";
    } finally {
      metaLoading.value = false;
    }
  }

  // —— 提交 ——

  async function handleSubmit({ itemImage } = {}) {
    if (submitLoading.value) return;

    const nextValidationMessage = getAppointmentValidationMessage(form);
    if (nextValidationMessage) {
      validationMessage.value = nextValidationMessage;
      showValidationModal.value = true;
      return;
    }

    submitLoading.value = true;
    errorText.value = "";
    submitResult.value = null;
    showValidationModal.value = false;

    try {
      submitResult.value = await submitAppointment({
        category: form.category,
        weight: form.weight,
        date: form.date,
        period: form.period,
        address: form.address,
        contactName: form.contactName,
        phone: form.phone,
        note: form.note,
      });
      showSuccessModal.value = true;
    } catch (error) {
      errorText.value = "提交失败，请稍后重试。";
    } finally {
      submitLoading.value = false;
    }
  }

  function closeValidationModal() {
    showValidationModal.value = false;
  }

  function closeSuccessModal() {
    showSuccessModal.value = false;
  }

  return {
    // 状态
    form,
    meta,
    metaLoading,
    submitLoading,
    errorText,
    submitResult,
    showValidationModal,
    showSuccessModal,
    validationMessage,
    // 方法
    loadMeta,
    handleSubmit,
    closeValidationModal,
    closeSuccessModal,
  };
}
```

- [ ] **Step 5.2: 临时 sanity check**

注意:`weightDisplayMap` 在 loadMeta 里没有直接用了(那段被 weightInput 的初始化替代)。改成 loadMeta 不再设置 `weightInput` —— `weightInput` 由 `useWeightRange` 独立初始化,form.composable 只负责 `form.weight` 的区间默认值。

在 `AppointmentPage.vue` 加:

```javascript
import { useAppointmentForm } from "../../composables/useAppointmentForm";
const _af = useAppointmentForm({ datePicker: dp, availableTimeSlots: computed(() => []) });
console.log("form check:", typeof _af.loadMeta === "function", typeof _af.handleSubmit === "function");
console.log("initial form:", JSON.stringify(_af.form));
```

期望:`function function` + `{ category: "", weight: "", date: "", ... }`。验证完删除。

- [ ] **Step 5.3: 提交**

```bash
git add frontend/src/composables/useAppointmentForm.js frontend/src/views/client/AppointmentPage.vue
git commit -m "refactor(appointment): extract useAppointmentForm composable

Orchestrates meta fetch + form defaults + submit + modals. Pure: takes
datePicker and availableTimeSlots as injection."
```

---

## Task 6: 抽取 5 个 leaf panel(无 composable 依赖)

**Files:**
- Create: `frontend/src/components/client/appointment/AppointmentHeroPanel.vue`
- Create: `frontend/src/components/client/appointment/AppointmentAsideCards.vue`
- Create: `frontend/src/components/client/appointment/AppointmentLoadingSkeleton.vue`
- Create: `frontend/src/components/client/appointment/AppointmentValidationModal.vue`
- Create: `frontend/src/components/client/appointment/AppointmentSuccessModal.vue`

这 5 个 panel 不依赖任何 composable,只接受 props / 触发 emit。

- [ ] **Step 6.1: 创建 `AppointmentHeroPanel.vue`**

```vue
<!-- AppointmentHeroPanel.vue -->
<!-- Hero 区:标题 + 副标题。仅展示,无 props/emits。 -->

<script setup>
</script>

<template>
  <header class="reference-hero" data-reveal>
    <h1>预约上门回收</h1>
    <p>专业团队准时上门，规范回收，透明结算，为您提供一站式环保服务。</p>
  </header>
</template>

<style scoped>
.reference-hero {
  display: grid;
  gap: 10px;
  padding-top: 6px;
}

.reference-hero h1 {
  margin: 0;
  color: var(--forest-700);
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 4vw, 3.25rem);
  line-height: 1.04;
  letter-spacing: -0.04em;
}

.reference-hero p {
  margin: 0;
  max-width: 42rem;
  color: var(--ink-600);
  font-size: 0.95rem;
  line-height: 1.8;
}
</style>
```

- [ ] **Step 6.2: 创建 `AppointmentAsideCards.vue`**

```vue
<!-- AppointmentAsideCards.vue -->
<!-- 侧栏两张卡:服务承诺(promise-card)+ 官方保障(trust-card)。
     同布局合并成单文件以保持样式内聚;后续若需独立演化再拆。 -->

<script setup>
const promiseItems = [
  { title: "准时高效", detail: "专员会在预约时段前联系您，确保上门流程顺畅。" },
  { title: "规范回收", detail: "回收过程公开透明，分类、称重和结算信息一目了然。" },
  { title: "温馨提醒", detail: "请勿混入湿垃圾、危险品及国家明令禁止回收的违禁品。" },
];
</script>

<template>
  <aside class="booking-aside" data-reveal style="--reveal-delay: 150ms">
    <section class="section-card">
      <div class="promise-card">
        <h3>服务承诺</h3>

        <div class="promise-list">
          <article v-for="item in promiseItems" :key="item.title" class="promise-item">
            <span class="promise-dot" />
            <div>
              <h4>{{ item.title }}</h4>
              <p>{{ item.detail }}</p>
            </div>
          </article>
        </div>

        <div class="promise-policy">
          <p>
            <strong>改签政策：</strong>
            预约成功后，如需修改时间请至少提前 4 小时在"我的订单"中操作。
          </p>
        </div>
      </div>
    </section>

    <section class="section-card">
      <div class="trust-card">
        <div class="trust-label">
          <span class="trust-dot" />
          <span>官方保障</span>
        </div>
        <h3>专业回收、准时上门、价格透明。</h3>
        <p>
          我们坚持通过专业化流程，让每一份废弃物都能焕发新生，守护绿色家园。
        </p>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.section-card,
.promise-card,
.trust-card {
  /* 容器基础样式:沿用原 AppointmentPage 中的 scoped 规则 */
}

.section-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 22px rgba(36, 72, 50, 0.05);
  border: 1px solid rgba(79, 141, 96, 0.1);
  padding: 22px 24px;
  border-left: 3px solid rgba(79, 141, 96, 0.35);
}

.booking-aside {
  display: grid;
  gap: 16px;
}

.promise-card,
.trust-card {
  display: grid;
  gap: 18px;
}

.promise-card h3,
.trust-card h3 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: 1.1rem;
}

.promise-card h3 {
  margin: 0 0 2px;
  color: var(--forest-700);
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.35;
}

.promise-list {
  display: grid;
  gap: 16px;
}

.promise-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.promise-dot,
.trust-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #4f8d60;
  margin-top: 7px;
}

.promise-item h4 {
  margin: 0 0 6px;
  color: var(--ink-800);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.promise-item p {
  margin: 0;
  color: var(--ink-700);
  font-size: 0.76rem;
  line-height: 1.72;
}

.promise-policy {
  padding: 12px 14px;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(79, 141, 96, 0.1) 0%, rgba(79, 141, 96, 0.06) 100%);
  border: 1px solid rgba(36, 72, 50, 0.12);
}

.promise-policy p {
  margin: 0;
  color: var(--ink-700);
  font-size: 0.7rem;
  line-height: 1.7;
}

.promise-policy strong {
  color: var(--forest-700);
  font-weight: 800;
}

.trust-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4f8d60;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.trust-card {
  background: rgba(79, 141, 96, 0.05);
  border-radius: 12px;
  padding: 2px 0;
}

.trust-card p {
  font-size: 0.72rem;
  line-height: 1.8;
  margin: 0;
  color: var(--ink-600);
}
</style>
```

- [ ] **Step 6.3: 创建 `AppointmentLoadingSkeleton.vue`**

```vue
<!-- AppointmentLoadingSkeleton.vue -->
<!-- metaLoading 时的主区骨架:4 个 shimmer 卡片。 -->

<template>
  <div class="loading-stack">
    <div class="loading-card loading-card--hero" />
    <div class="loading-card" />
    <div class="loading-card" />
    <div class="loading-card loading-card--summary" />
  </div>
</template>

<style scoped>
.loading-stack {
  display: grid;
  gap: 16px;
}

.loading-card {
  min-height: 140px;
  border-radius: 20px;
  background:
    linear-gradient(90deg, rgba(79, 141, 96, 0.08) 25%, rgba(79, 141, 96, 0.16) 37%, rgba(79, 141, 96, 0.08) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.loading-card--hero {
  min-height: 176px;
}

.loading-card--summary {
  min-height: 120px;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
```

- [ ] **Step 6.4: 创建 `AppointmentValidationModal.vue`**

```vue
<!-- AppointmentValidationModal.vue -->
<!-- 校验失败弹窗:展示未填字段名,提供"我知道了"关闭。 -->

<script setup>
defineProps({
  show: { type: Boolean, required: true },
  message: { type: String, required: true },
});

defineEmits(["close"]);
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-icon modal-icon--warning">!</div>
      <p class="modal-tag modal-tag--warning">信息未完成</p>
      <h3>{{ message }}</h3>
      <p>请先补全这项信息，再继续提交预约。</p>
      <button class="modal-btn" @click="$emit('close')">我知道了</button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(20, 34, 29, 0.42);
  backdrop-filter: blur(6px);
}

.modal-card {
  width: min(420px, calc(100vw - 32px));
  padding: 28px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid rgba(79, 141, 96, 0.12);
  box-shadow: 0 22px 46px rgba(20, 43, 31, 0.14);
  text-align: center;
}

.modal-icon {
  width: 54px;
  height: 54px;
  margin: 0 auto 14px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 1.6rem;
  font-weight: 700;
}

.modal-icon--warning {
  background: linear-gradient(145deg, #c2832f, #d7a45c);
}

.modal-tag {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
}

.modal-tag--warning {
  color: #c2832f;
}

.modal-card h3 {
  margin: 8px 0 14px;
  font-size: 1.6rem;
  color: var(--ink-900);
  font-family: var(--font-display);
}

.modal-card p {
  margin: 0;
  line-height: 1.7;
  color: var(--ink-600);
}

.modal-btn {
  margin-top: 20px;
  min-width: 116px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(79, 141, 96, 0.2);
  background: #fff;
  color: var(--forest-700);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  justify-self: center;
}
</style>
```

- [ ] **Step 6.5: 创建 `AppointmentSuccessModal.vue`**

```vue
<!-- AppointmentSuccessModal.vue -->
<!-- 预约成功弹窗:展示订单号 / 核验码 / ETA;含"前往服务记录" RouterLink。 -->

<script setup>
import { RouterLink } from "vue-router";

defineProps({
  show: { type: Boolean, required: true },
  result: { type: Object, required: true }, // { orderId, pickupCode, etaMinutes } | null
});

defineEmits(["close"]);
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div
      class="success-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-success-title"
      aria-live="polite"
    >
      <button type="button" class="success-modal-close" @click="$emit('close')" aria-label="关闭成功提示">
        <span class="material-symbols-outlined">close</span>
      </button>
      <div class="success-modal-icon">
        <span class="material-symbols-outlined">check_circle</span>
      </div>
      <p class="success-modal-eyebrow">预约成功</p>
      <h3 id="appointment-success-title" class="success-modal-title">您的预约已提交，已同步到服务记录。</h3>
      <p class="success-modal-text">订单编号：{{ result?.orderId }}</p>
      <p class="success-modal-text">上门核验码：{{ result?.pickupCode }}</p>
      <p class="success-modal-text success-modal-text--emphasis">
        预计 {{ result?.etaMinutes }} 分钟内会有回收人员联系您。
      </p>
      <div class="success-modal-actions">
        <RouterLink to="/orders" class="success-modal-link">
          前往服务记录
        </RouterLink>
        <button type="button" class="success-modal-secondary" @click="$emit('close')">
          继续查看预约
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(20, 34, 29, 0.42);
  backdrop-filter: blur(6px);
}

.success-modal {
  width: min(100%, 460px);
  position: relative;
  background: #f8f4ec;
  border-radius: 28px;
  padding: 32px 28px 28px;
  box-shadow: 0 24px 80px rgba(16, 24, 20, 0.18);
  display: grid;
  gap: 14px;
  text-align: center;
}

.success-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(79, 141, 96, 0.12);
  color: #2e5d3f;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.success-modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto;
  border-radius: 50%;
  background: rgba(79, 141, 96, 0.12);
  color: #2e5d3f;
  display: grid;
  place-items: center;
}

.success-modal-icon .material-symbols-outlined {
  font-size: 34px;
}

.success-modal-eyebrow {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2e5d3f;
}

.success-modal-title {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: 1.45rem;
  line-height: 1.4;
}

.success-modal-text {
  margin: 0;
  color: var(--ink-600);
  font-size: 0.92rem;
  line-height: 1.7;
}

.success-modal-text--emphasis {
  color: var(--forest-700);
  font-weight: 700;
}

.success-modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 6px;
}

.success-modal-link,
.success-modal-secondary {
  min-height: 48px;
  border-radius: 14px;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  font-size: 0.92rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.success-modal-link {
  background: linear-gradient(145deg, #4f8d60 0%, #2e5d3f 100%);
  color: #fff;
  box-shadow: 0 10px 30px rgba(79, 141, 96, 0.22);
}

.success-modal-secondary {
  background: rgba(79, 141, 96, 0.1);
  color: #2e5d3f;
}

@media (max-width: 720px) {
  .success-modal-actions {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 6.6: dev server smoke test**

```bash
cd frontend && npm run dev
```

打开浏览器访问预约页(如果之前还在做 Step 5.2 的临时 sanity 代码,先删除)。**这 5 个 panel 暂时还没被任何地方 import**——不会影响页面。等 Task 11 串起来后再做实际渲染验证。

可以快速 grep 确认文件没语法错误:

```bash
cd frontend && grep -c "</template>" src/components/client/appointment/AppointmentHeroPanel.vue src/components/client/appointment/AppointmentAsideCards.vue src/components/client/appointment/AppointmentLoadingSkeleton.vue src/components/client/appointment/AppointmentValidationModal.vue src/components/client/appointment/AppointmentSuccessModal.vue
```

期望每行输出 `1`。

- [ ] **Step 6.7: 提交**

```bash
git add frontend/src/components/client/appointment/AppointmentHeroPanel.vue \
        frontend/src/components/client/appointment/AppointmentAsideCards.vue \
        frontend/src/components/client/appointment/AppointmentLoadingSkeleton.vue \
        frontend/src/components/client/appointment/AppointmentValidationModal.vue \
        frontend/src/components/client/appointment/AppointmentSuccessModal.vue
git commit -m "refactor(appointment): extract 5 leaf panels

Hero / AsideCards (combined promise + trust) / LoadingSkeleton /
ValidationModal / SuccessModal. No composable dependencies."
```

---

## Task 7: 创建 `AppointmentContactSection`(Section 01)

**Files:**
- Create: `frontend/src/components/client/appointment/AppointmentContactSection.vue`

仅展示联系信息 3 字段。

- [ ] **Step 7.1: 创建文件**

```vue
<!-- AppointmentContactSection.vue -->
<!-- Section 01 联系信息:address / contactName / phone 三字段。
     双向同步通过 update:xxx 事件回写到 view 的 form。 -->

<script setup>
defineProps({
  address: { type: String, required: true },
  contactName: { type: String, required: true },
  phone: { type: String, required: true },
});

defineEmits(["update:address", "update:contact-name", "update:phone"]);
</script>

<template>
  <section class="section-card">
    <div class="section-head">
      <div class="section-mark">
        <span class="section-badge">01</span>
        <div>
          <h2>联系信息</h2>
        </div>
      </div>
    </div>

    <div class="section-grid section-grid--contact">
      <label class="field field--full">
        <span>服务地址</span>
        <input
          :value="address"
          type="text"
          placeholder="请输入详细街道、楼号、门牌号"
          @input="$emit('update:address', $event.target.value)"
        />
      </label>

      <label class="field">
        <span>联系人姓名</span>
        <input
          :value="contactName"
          type="text"
          placeholder="姓名"
          @input="$emit('update:contact-name', $event.target.value)"
        />
      </label>

      <label class="field">
        <span>电话号码</span>
        <input
          :value="phone"
          type="tel"
          inputmode="tel"
          placeholder="请输入 11 位手机号（如 1xx-xxxx-xxxx）"
          @input="$emit('update:phone', $event.target.value)"
        />
      </label>
    </div>
  </section>
</template>

<style scoped>
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

.section-grid {
  display: grid;
  gap: 16px;
}

.section-grid--contact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 8px;
}

.field--full {
  grid-column: 1 / -1;
}

.field span {
  color: var(--ink-500);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.field input {
  width: 100%;
  min-height: 44px;
  border: 1px solid rgba(106, 131, 122, 0.25);
  border-radius: 8px;
  padding: 0.75rem 0.95rem;
  background: #fff;
  color: var(--ink-800);
  font: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input::placeholder {
  color: rgba(106, 131, 122, 0.55);
}

.field input:focus {
  outline: none;
  border-color: #4f8d60;
  box-shadow: 0 0 0 3px rgba(79, 141, 96, 0.08);
}

@media (max-width: 720px) {
  .section-card {
    padding: 18px;
  }

  .section-grid--contact {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 7.2: 提交**

```bash
git add frontend/src/components/client/appointment/AppointmentContactSection.vue
git commit -m "refactor(appointment): extract AppointmentContactSection (Section 01)

Three-field contact info form. Update events bubble form writes back
to the page-level form reactive."
```

---

## Task 8: 创建 `AppointmentScheduleSection`(Section 02)

**Files:**
- Create: `frontend/src/components/client/appointment/AppointmentScheduleSection.vue`

内部调用 `useDatePicker()`,emit 选择日期/时段/切换月份/切换周。

- [ ] **Step 8.1: 创建文件**

```vue
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
        v-for="slot in availableTimeSlots"
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
```

注:模板里引用了 `availableTimeSlots` 但本组件没有声明——需要从 view 通过 prop 传入时段列表。在 Task 11 串接时会修改为 prop 传入(本 Task 内暂时把 slot 列表写死会让 wire-up 时多一步)。

修正:把模板改成接收 `timeSlots` prop:

```vue
defineProps({
  selectedDate: { type: String, required: true },
  selectedPeriod: { type: String, required: true },
  timeSlots: { type: Array, required: true }, // [{ value, label, disabled }]
});
```

模板里相应把 `v-for="slot in availableTimeSlots"` 改成 `v-for="slot in timeSlots"`。

- [ ] **Step 8.2: 修正 prop(见上)**

把 `availableTimeSlots` 替换成 `timeSlots` prop。

- [ ] **Step 8.3: 提交**

```bash
git add frontend/src/components/client/appointment/AppointmentScheduleSection.vue
git commit -m "refactor(appointment): extract AppointmentScheduleSection (Section 02)

Date picker UI: month/week switcher, 7-day card grid, time slot row.
Internally calls useDatePicker; emits selection events for page to
write back to form."
```

---

## Task 9: 创建 `AppointmentItemSection`(Section 03)

**Files:**
- Create: `frontend/src/components/client/appointment/AppointmentItemSection.vue`

内部调用 `useWeightRange` + `useAppointmentUpload`,emit 分类/备注更新。

- [ ] **Step 9.1: 创建文件**

```vue
<!-- AppointmentItemSection.vue -->
<!-- Section 03 物品详情:分类 + 重量输入 + 备注 + 图片上传。
     内部调用 useWeightRange 和 useAppointmentUpload。
     weightInput 由 view 拥有并通过 prop 传入(供 summary 展示用户实时输入);
     上传是临时态,view 不感知;
     分类与备注通过 update:xxx 事件回写 form。 -->

<script setup>
import { useWeightRange } from "@/composables/useWeightRange";
import { useAppointmentUpload } from "@/composables/useAppointmentUpload";
import { weightPointMap, weightDisplayMap } from "@/utils/appointmentConstants";

const props = defineProps({
  categories: { type: Array, required: true },
  selectedCategory: { type: String, required: true },
  weightInput: { type: String, required: true }, // 由 view 拥有,见 useWeightRange.js 注释
  form: { type: Object, required: true }, // form reactive,由 useAppointmentForm 提供
});

const emit = defineEmits(["update:category", "update:note"]);

const { syncWeightRange, normalizeWeightInput } = useWeightRange({
  form: props.form,
  weightInput: props.weightInput,
  weightPointMap,
  weightDisplayMap,
});

const {
  fileInputRef,
  itemImageName,
  triggerFileSelect,
  handleFileChange,
  clearSelectedFile,
} = useAppointmentUpload();
</script>

<template>
  <section class="section-card">
    <div class="section-head">
      <div class="section-mark">
        <span class="section-badge">03</span>
        <div>
          <h2>物品详情</h2>
        </div>
      </div>
    </div>

    <div class="section-grid section-grid--items">
      <label class="field">
        <span>物品分类</span>
        <select
          :value="selectedCategory"
          @change="$emit('update:category', $event.target.value)"
        >
          <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>

      <label class="field">
        <span>预估重量（kg）</span>
        <div class="weight-input">
          <input
            :value="weightInput"
            type="number"
            min="0"
            step="0.1"
            placeholder="5.5"
            @input="syncWeightRange"
            @blur="normalizeWeightInput"
          />
          <span>KG</span>
        </div>
      </label>
    </div>

    <div class="field field--full upload-field">
      <span>物品备注与图片</span>

      <textarea
        :value="form.note"
        rows="3"
        placeholder="可补充上门提醒、物品数量、电梯/楼层等信息"
        @input="$emit('update:note', $event.target.value)"
      />

      <div class="upload-box" :class="itemImageName ? 'has-file' : ''">
        <input
          ref="fileInputRef"
          class="upload-input"
          type="file"
          accept="image/*"
          @change="handleFileChange"
        />

        <div class="upload-icon">+</div>
        <p class="upload-title">{{ itemImageName || "上传物品图片" }}</p>
        <p class="upload-note">
          {{ itemImageName || "支持拖拽图片至此处（JPG/PNG，最多 3 张）" }}
        </p>

        <div class="upload-actions">
          <button type="button" class="upload-trigger" @click="triggerFileSelect">
            {{ itemImageName ? "重新选择" : "选择图片" }}
          </button>
          <button v-if="itemImageName" type="button" class="upload-clear" @click="clearSelectedFile">
            移除
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
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

.section-grid {
  display: grid;
  gap: 16px;
}

.section-grid--items {
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  margin-bottom: 16px;
}

.field {
  display: grid;
  gap: 8px;
}

.field--full {
  grid-column: 1 / -1;
}

.field span {
  color: var(--ink-500);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.field input,
.field select {
  width: 100%;
  min-height: 44px;
  border: 1px solid rgba(106, 131, 122, 0.25);
  border-radius: 8px;
  padding: 0.75rem 0.95rem;
  background: #fff;
  color: var(--ink-800);
  font: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field textarea {
  width: 100%;
  min-height: 96px;
  border: 1px solid rgba(106, 131, 122, 0.25);
  border-radius: 8px;
  padding: 0.85rem 0.95rem;
  background: #fff;
  color: var(--ink-800);
  font: inherit;
  line-height: 1.7;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input::placeholder,
.field textarea::placeholder {
  color: rgba(106, 131, 122, 0.55);
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: #4f8d60;
  box-shadow: 0 0 0 3px rgba(79, 141, 96, 0.08);
}

.field select {
  appearance: none;
  padding-right: 2.75rem;
  background-image: linear-gradient(45deg, transparent 50%, #4c675d 50%), linear-gradient(135deg, #4c675d 50%, transparent 50%);
  background-position: calc(100% - 18px) calc(50% - 2px), calc(100% - 12px) calc(50% - 2px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}

.weight-input {
  display: flex;
}

.weight-input input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: 0;
}

.weight-input span {
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border: 1px solid rgba(106, 131, 122, 0.25);
  border-left: 0;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  background: #f6f7f6;
  color: var(--ink-500);
  font-family: var(--font-data);
  font-size: 0.74rem;
}

.upload-field {
  gap: 10px;
}

.upload-box {
  border: 2px dashed rgba(79, 141, 96, 0.18);
  border-radius: 12px;
  background: rgba(247, 248, 247, 0.68);
  min-height: 138px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 22px 18px;
}

.upload-box.has-file {
  border-style: solid;
  background: rgba(79, 141, 96, 0.05);
}

.upload-input {
  display: none;
}

.upload-icon {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(79, 141, 96, 0.12);
  color: #4f8d60;
  font-size: 1.35rem;
  line-height: 1;
  margin-bottom: 4px;
}

.upload-title {
  margin: 0;
  color: var(--ink-700);
  font-size: 0.9rem;
  font-weight: 700;
}

.upload-note {
  margin: 0;
  color: var(--ink-500);
  font-size: 0.68rem;
  line-height: 1.7;
}

.upload-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.upload-trigger,
.upload-clear {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(79, 141, 96, 0.2);
  background: #fff;
  color: var(--forest-700);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.upload-trigger {
  background: rgba(79, 141, 96, 0.08);
}

.upload-trigger:hover,
.upload-clear:hover {
  transform: translateY(-1px);
}

@media (max-width: 720px) {
  .section-card {
    padding: 18px;
  }

  .section-grid--items {
    grid-template-columns: 1fr;
  }

  .upload-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
```

- [ ] **Step 9.2: 提交**

```bash
git add frontend/src/components/client/appointment/AppointmentItemSection.vue
git commit -m "refactor(appointment): extract AppointmentItemSection (Section 03)

Category select + weight input + textarea + upload box. Internally
uses useWeightRange + useAppointmentUpload; emits category/note writes
back to form."
```

---

## Task 10: 创建 `AppointmentConfirmSection` + `AppointmentSubmitBar`

**Files:**
- Create: `frontend/src/components/client/appointment/AppointmentConfirmSection.vue`
- Create: `frontend/src/components/client/appointment/AppointmentSubmitBar.vue`

- [ ] **Step 10.1: 创建 `AppointmentConfirmSection.vue`**

```vue
<!-- AppointmentConfirmSection.vue -->
<!-- Section 04 信息确认:3 个 summary 指标卡。
     summaryMetrics 由 view 派生好后通过 prop 传入(纯展示)。 -->

<script setup>
defineProps({
  summaryMetrics: {
    type: Array, // [{ label, value, detail }]
    required: true,
  },
});
</script>

<template>
  <section class="reference-confirm">
    <div class="section-head section-head--between">
      <div class="section-mark">
        <span class="section-badge">04</span>
        <div class="section-title-inline">
          <h2>信息确认</h2>
          <span class="status-dot" />
        </div>
      </div>
      <p class="section-helper">请在提交前确认以上预约信息</p>
    </div>

    <div class="reference-summary">
      <div class="summary-metrics">
        <article v-for="item in summaryMetrics" :key="item.label" class="summary-card">
          <p>{{ item.label }}</p>
          <strong>{{ item.value }}</strong>
          <span>{{ item.detail }}</span>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reference-confirm {
  display: grid;
  gap: 16px;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
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

.section-mark,
.section-title-inline {
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

.section-helper {
  margin: 0;
  color: var(--ink-500);
  font-size: 0.72rem;
  letter-spacing: 0.03em;
}

.reference-summary {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 22px rgba(36, 72, 50, 0.05);
  padding: 20px 22px;
  border: 1px solid rgba(79, 141, 96, 0.14);
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.summary-card {
  position: relative;
  padding-left: 14px;
  display: grid;
  gap: 6px;
}

.summary-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 2px;
  border-radius: 999px;
  background: rgba(79, 141, 96, 0.2);
}

.summary-card p {
  margin: 0;
  color: var(--ink-600);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.summary-card strong {
  color: var(--forest-700);
  font-family: var(--font-display);
  font-size: 1.1rem;
  line-height: 1.25;
}

.summary-card span {
  margin: 0;
  color: var(--ink-600);
  font-size: 0.74rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #4f8d60;
  box-shadow: 0 0 0 5px rgba(79, 141, 96, 0.12);
}

@media (max-width: 860px) {
  .summary-metrics {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .section-head,
  .section-head--between {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
```

- [ ] **Step 10.2: 创建 `AppointmentSubmitBar.vue`**

```vue
<!-- AppointmentSubmitBar.vue -->
<!-- 提交栏:按钮 + 错误条 + 底部备注。
     按钮点击 emit submit 事件,由 view 调用 useAppointmentForm.handleSubmit。 -->

<script setup>
defineProps({
  submitLoading: { type: Boolean, required: true },
  errorText: { type: String, required: true },
});

defineEmits(["submit"]);
</script>

<template>
  <div class="submit-panel">
    <button type="submit" class="submit-btn" :disabled="submitLoading" @click="$emit('submit')">
      {{ submitLoading ? "提交中..." : "确认提交预约申请" }}
    </button>
    <p class="submit-note">
      点击提交即代表您已阅读并同意《预约回收服务协议》
    </p>
    <p class="submit-caption">专业回收 · 准时上门 · 价格透明</p>

    <p v-if="errorText" class="state-error">{{ errorText }}</p>
  </div>
</template>

<style scoped>
.submit-panel {
  display: grid;
  gap: 10px;
}

.submit-btn {
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(145deg, #4f8d60 0%, #2e5d3f 100%);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(79, 141, 96, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.submit-note,
.submit-caption {
  text-align: center;
  margin: 0;
  color: var(--ink-600);
}

.submit-note {
  font-size: 0.7rem;
}

.submit-caption {
  font-size: 0.58rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.state-error {
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #9a6124;
}
</style>
```

- [ ] **Step 10.3: 提交**

```bash
git add frontend/src/components/client/appointment/AppointmentConfirmSection.vue \
        frontend/src/components/client/appointment/AppointmentSubmitBar.vue
git commit -m "refactor(appointment): extract ConfirmSection (04) and SubmitBar

Summary metrics from view-derived prop; submit button emits up to page."
```

---

## Task 11: 重写 `AppointmentPage.vue` 串联所有 panel

**Files:**
- Modify: `frontend/src/views/client/AppointmentPage.vue`(1631 → ~150)

把所有 panel 串起来,view 只做编排。

- [ ] **Step 11.1: 重写 view**

完整替换原文件内容:

```vue
<!-- AppointmentPage.vue -->
<!-- 预约上门回收页(view 层)。
     只做编排:实例化 composables、计算派生 prop、把 props/emits 转发到 panel。
     所有业务状态 / 业务逻辑 / 模板细节都拆到 composables + components/client/appointment/。 -->

<script setup>
import { computed, onMounted, ref, watch } from "vue";

import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import { useDatePicker } from "@/composables/useDatePicker";
import { useAppointmentForm } from "@/composables/useAppointmentForm";
import { useAppointmentUpload } from "@/composables/useAppointmentUpload";
import { weightDisplayMap } from "@/utils/appointmentConstants";

import AppointmentHeroPanel from "@/components/client/appointment/AppointmentHeroPanel.vue";
import AppointmentContactSection from "@/components/client/appointment/AppointmentContactSection.vue";
import AppointmentScheduleSection from "@/components/client/appointment/AppointmentScheduleSection.vue";
import AppointmentItemSection from "@/components/client/appointment/AppointmentItemSection.vue";
import AppointmentConfirmSection from "@/components/client/appointment/AppointmentConfirmSection.vue";
import AppointmentSubmitBar from "@/components/client/appointment/AppointmentSubmitBar.vue";
import AppointmentLoadingSkeleton from "@/components/client/appointment/AppointmentLoadingSkeleton.vue";
import AppointmentAsideCards from "@/components/client/appointment/AppointmentAsideCards.vue";
import AppointmentValidationModal from "@/components/client/appointment/AppointmentValidationModal.vue";
import AppointmentSuccessModal from "@/components/client/appointment/AppointmentSuccessModal.vue";

const pageRef = ref(null);
useRevealOnScroll(pageRef);

// 1. 日期状态机
const datePicker = useDatePicker();

// 2. 时段列表:meta.periods 的一次包装,view 派生
const availableTimeSlots = computed(() =>
  meta.periods.map((period) => ({
    value: period,
    label: period,
    disabled: false,
  })),
);

// 3. form 编排
const {
  form,
  meta,
  metaLoading,
  submitLoading,
  errorText,
  submitResult,
  showValidationModal,
  showSuccessModal,
  validationMessage,
  loadMeta,
  handleSubmit,
  closeValidationModal,
  closeSuccessModal,
} = useAppointmentForm({ datePicker, availableTimeSlots });

// 4. 上传临时态(提交时用,view 不感知细节)
const upload = useAppointmentUpload();

// 5. weightInput 由 view 拥有,传给 AppointmentItemSection 双向操作。
//    初始值与 meta 加载后的 form.weight 默认值("5-10kg" → "5.5")对齐。
const weightInput = ref("5.5");

// 6. summary metrics 派生
const selectedDateText = computed(() => {
  const card = datePicker.appointmentDates.value.find((item) => item.value === form.date);
  if (!card) return "待选择";
  return `${card.monthText}${card.dayNumber}日（${card.weekday}）`;
});

const selectedTimeText = computed(() =>
  form.period ? `${form.period} 上门` : "待选择",
);

const normalizedWeightText = computed(() => {
  if (weightInput.value?.trim()) return weightInput.value.trim();
  if (form.weight) return weightDisplayMap[form.weight] || "--";
  return "--";
});

const summaryMetrics = computed(() => [
  { label: "预约时间", value: selectedDateText.value, detail: selectedTimeText.value },
  { label: "物品类型", value: form.category || "待选择", detail: form.category ? "常规可回收类型" : "请选择回收品类" },
  { label: "预计重量", value: `${normalizedWeightText.value} kg`, detail: "根据实际称重结果结算" },
]);

function onSubmit() {
  handleSubmit({ itemImage: upload.itemImage.value });
}

function onSelectDate(item) {
  form.date = item.value;
}

function onSelectTime(slot) {
  form.period = slot.value;
}

onMounted(loadMeta);
</script>

<template>
  <section ref="pageRef" class="appointment-page">
    <AppointmentHeroPanel />

    <section class="booking-shell booking-shell--reference" data-reveal style="--reveal-delay: 90ms">
      <form class="booking-main" @submit.prevent="onSubmit">
        <template v-if="metaLoading">
          <AppointmentLoadingSkeleton />
        </template>

        <template v-else>
          <AppointmentContactSection
            :address="form.address"
            :contact-name="form.contactName"
            :phone="form.phone"
            @update:address="(v) => (form.address = v)"
            @update:contact-name="(v) => (form.contactName = v)"
            @update:phone="(v) => (form.phone = v)"
          />

          <AppointmentScheduleSection
            :selected-date="form.date"
            :selected-period="form.period"
            :time-slots="availableTimeSlots"
            @select-date="onSelectDate"
            @select-time="onSelectTime"
          />

          <AppointmentItemSection
            :categories="meta.categories"
            :selected-category="form.category"
            :weight-input="weightInput"
            :form="form"
            @update:category="(v) => (form.category = v)"
            @update:note="(v) => (form.note = v)"
          />

          <AppointmentConfirmSection :summary-metrics="summaryMetrics" />

          <AppointmentSubmitBar
            :submit-loading="submitLoading"
            :error-text="errorText"
            @submit="onSubmit"
          />
        </template>
      </form>

      <AppointmentAsideCards />
    </section>

    <AppointmentValidationModal
      :show="showValidationModal"
      :message="validationMessage"
      @close="closeValidationModal"
    />

    <AppointmentSuccessModal
      :show="showSuccessModal"
      :result="submitResult"
      @close="closeSuccessModal"
    />
  </section>
</template>

<style scoped>
/* view 只保留布局 / 容器 / 响应式。所有 panel / modal 自带 scoped 样式。 */

.appointment-page {
  display: grid;
  gap: 22px;
  padding: clamp(18px, 2vw, 28px);
  background:
    radial-gradient(circle at top left, rgba(79, 141, 96, 0.08), transparent 24%),
    linear-gradient(180deg, #faf8f1 0%, #f8f4eb 100%);
  border-radius: 30px;
}

.booking-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 318px);
  gap: 22px;
  align-items: start;
}

.booking-main {
  display: grid;
  gap: 16px;
}

@media (max-width: 1180px) {
  .booking-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .appointment-page {
    padding: 16px;
    border-radius: 20px;
  }
}
</style>
```

- [ ] **Step 11.2: 启动 dev server 做端到端验证**

```bash
cd frontend && npm run dev
```

打开浏览器访问 `/appointment`(或实际路由),逐项对照 `docs/superpowers/specs/2026-06-30-appointment-page-split-design.md` 中「功能验证清单」表格 17 项,全部勾完。

特别关注:
- 切月份 / 切周时日期默认初始化逻辑(`useAppointmentForm.loadMeta` 取 `availableDates[1]?.value`,meta 加载后 form.date 应该是后天,form.weight 应该是 "5-10kg")。
- 重量输入实时显示在 summary "预计重量":输入数字 → summary 同步刷新(因为 view 拥有 weightInput)。
- 重量输入 blur 时是否能正确回填默认值。
- 上传图片后点击「移除」是否清空 fileInput.value。
- 校验失败弹窗是否只显示第一个缺失字段。
- 成功弹窗「前往服务记录」RouterLink 是否能跳转。
- 移动端 ≤ 720px 响应式断点是否正常。

如发现任何回归,定位是哪个 panel 的问题,改对应 panel 而非 view(避免再膨胀 view)。

- [ ] **Step 11.3: grep 死代码**

```bash
cd frontend && grep -E "(referenceTimeSlots|dateSeed)" src/views/client/AppointmentPage.vue src/composables/*.js src/components/client/appointment/*.vue
```

期望:无输出。如果有,删除。

- [ ] **Step 11.4: 提交**

```bash
git add frontend/src/views/client/AppointmentPage.vue
git commit -m "refactor(appointment): rewrite view as thin orchestrator (1631 → ~150 lines)

Instantiates composables, derives availableTimeSlots + summaryMetrics,
wires all panels via props/emits. Keeps only layout container +
responsive breakpoints. Manual e2e verification passed."
```

---

## Task 12: 视觉回归与最终验收

**Files:**
- Modify: 任何仍残留问题的小修(大概率不需要)

- [ ] **Step 12.1: 视觉回归全项**

打开浏览器,逐项核对 spec 的「视觉回归」清单:
- 月/周切换按钮 hover 高亮
- 日期卡 / 时段按钮 hover 上抬 1px
- 日期卡 `.is-active` 高亮(边框 2px + 浅绿背景)
- 时段按钮 `.is-active` 高亮
- 提交按钮 hover 阴影增强
- 校验 / 成功 modal 居中、背景模糊(`backdrop-filter: blur(6px)`)
- 三档响应式断点:`max-width: 1180px` / `860px` / `720px`
- `.material-symbols-outlined` 图标字体正常显示(关键风险点)

特别检查 `.material-symbols-outlined`:这个类原本在 AppointmentPage 的 scoped 内,如果全局 CSS 中没有同名规则,迁移到 panel 后会失效。需要时在每个用到的 panel 内添加:

```css
:deep(.material-symbols-outlined) {
  font-family: "Material Symbols Outlined";
  font-weight: normal;
  font-style: normal;
  /* ...其他字体规则 */
}
```

或者直接在 `App.vue` / 全局 CSS 中确保有该规则。

- [ ] **Step 12.2: 跑完整 build**

```bash
cd frontend && npm run build
```

期望:构建无报错,产物在 `frontend/dist/` 出现新的 hashed assets。

- [ ] **Step 12.3: 提交(如有问题)**

如有视觉问题修复,提交:

```bash
git add frontend/src/components/client/appointment/*.vue frontend/src/views/client/AppointmentPage.vue
git commit -m "fix(appointment): visual regression fixes after split"
```

如无问题,跳过此步。

---

## Task 13: 合并到 main 前的清理

- [ ] **Step 13.1: 跑一遍死代码检查**

```bash
cd frontend && \
  grep -rn "referenceTimeSlots\|dateSeed" src/ 2>/dev/null; \
  echo "---"; \
  grep -rn "weightPointMap\|weightDisplayMap\|weekdayLabels" src/views/ 2>/dev/null
```

期望:第一段无输出(死代码已删);第二段无输出(常量已搬出 view)。

- [ ] **Step 13.2: 最终行数确认**

```bash
cd frontend && wc -l src/views/client/AppointmentPage.vue
```

期望:120-180 行之间。

- [ ] **Step 13.3: 最终提交(若有遗漏清理)**

```bash
git add -A
git commit -m "chore(appointment): post-refactor cleanup" --allow-empty
```

---

## 验证清单(自检)

| 项目 | 期望 | Task |
|---|---|---|
| `useAppointmentForm.loadMeta` 注入依赖 | `useAppointmentForm({ datePicker, availableTimeSlots })` | Task 5 |
| `useWeightRange` 接收 form 注入 | `useWeightRange({ form, defaultWeight, ... })` | Task 3 |
| `useAppointmentUpload` 与 form 解耦 | composable 不 import `useAppointmentForm` | Task 4 |
| view 仍派生 `availableTimeSlots` / `summaryMetrics` | computed in setup | Task 11 |
| 10 个 panel 文件齐全 | `components/client/appointment/Appointment*.vue` 各 1 | Task 6/7/8/9/10 |
| `AppointmentSuccessModal` 用 RouterLink | `import { RouterLink } from "vue-router"` | Task 6 |
| 校验 / 成功 modal 独立文件 | `AppointmentValidationModal.vue` / `AppointmentSuccessModal.vue` | Task 6 |
| `.material-symbols-outlined` scoped 处理 | `:deep(...)` 或全局兜底 | Task 8/12 |
| 死代码 `referenceTimeSlots` / `dateSeed` 删除 | grep 无结果 | Task 11/13 |
| view 行数 120-180 | `wc -l` | Task 13 |

## 完成判定

- 所有 13 个 Task 完成
- `npm run dev` 启动无报错
- `npm run build` 构建通过
- 功能验证清单(17 项)全部通过
- 视觉无回归
- 无死代码 / 死 import / 死 CSS
- view 行数在 120-180 之间