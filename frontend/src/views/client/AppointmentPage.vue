<script setup>
import { computed, onMounted, reactive, ref } from "vue";

import { getAppointmentValidationMessage } from "../../utils/appointmentValidation";
import { useRevealOnScroll } from "../../composables/useRevealOnScroll";
import { fetchAppointmentMeta, submitAppointment } from "../../mock/clientApi";

const pageRef = ref(null);
const fileInputRef = ref(null);

useRevealOnScroll(pageRef);

const metaLoading = ref(true);
const submitLoading = ref(false);
const errorText = ref("");
const submitResult = ref(null);
const showSuccessModal = ref(false);
const showValidationModal = ref(false);
const validationMessage = ref("");

const itemImage = ref(null);
const itemImageName = ref("");
const weightInput = ref("5.5");

const meta = reactive({
  categories: [],
  weights: [],
  periods: [],
  tips: [],
});

const availableTimeSlots = computed(() => {
  return meta.periods.map((period) => ({
    value: period,
    label: period,
    disabled: false,
  }));
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

const weightPointMap = {
  "0-5kg": 18,
  "5-10kg": 28,
  "10-20kg": 45,
  "20kg 以上": 70,
};

const weightDisplayMap = {
  "0-5kg": "3.0",
  "5-10kg": "5.5",
  "10-20kg": "12.0",
  "20kg 以上": "24.0",
};

const referenceTimeSlots = [
  { value: "09:00", label: "09:00", disabled: false },
  { value: "11:30", label: "11:30", disabled: false },
  { value: "14:00", label: "14:00", disabled: false },
  { value: "16:30", label: "16:30（约满）", disabled: true },
];

const weekdayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const dateSeed = new Date();
dateSeed.setHours(12, 0, 0, 0);

// 月份切换状态
const currentMonth = ref(new Date());
currentMonth.value.setDate(1);
currentMonth.value.setHours(12, 0, 0, 0);

// 周切换状态
const weekOffset = ref(0);

const estimatedPoints = computed(() => weightPointMap[form.weight] || 0);

const appointmentDates = computed(() => {
  const baseDate = new Date(currentMonth.value);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
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

const currentMonthText = computed(() => {
  const d = new Date(currentMonth.value);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
});

const maxWeekIndex = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.ceil(daysInMonth / 7) - 1;
});

const dateRangeText = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const startDay = weekOffset.value * 7 + 1;
  const endDay = Math.min(startDay + 6, daysInMonth);

  return `${month + 1}/${startDay}-${month + 1}/${endDay}`;
});

const selectedDateCard = computed(() => {
  return appointmentDates.value.find((item) => item.value === form.date) || null;
});

const selectedDateText = computed(() => {
  if (!selectedDateCard.value) return "待选择";
  return `${selectedDateCard.value.monthText}${selectedDateCard.value.dayNumber}日（${selectedDateCard.value.weekday}）`;
});

const selectedTimeText = computed(() => {
  return form.period ? `${form.period} 上门` : "待选择";
});

const normalizedWeightText = computed(() => {
  if (weightInput.value?.trim()) return weightInput.value.trim();
  if (form.weight) return weightDisplayMap[form.weight] || "--";
  return "--";
});

const summaryMetrics = computed(() => {
  return [
    {
      label: "预约时间",
      value: selectedDateText.value,
      detail: selectedTimeText.value,
    },
    {
      label: "物品类型",
      value: form.category || "待选择",
      detail: form.category ? "常规可回收类型" : "请选择回收品类",
    },
    {
      label: "预计重量",
      value: `${normalizedWeightText.value} kg`,
      detail: "根据实际称重结果结算",
    },
  ];
});

const promiseItems = computed(() => {
  return [
    {
      title: "准时高效",
      detail: "专员会在预约时段前联系您，确保上门流程顺畅。",
    },
    {
      title: "规范回收",
      detail: "回收过程公开透明，分类、称重和结算信息一目了然。",
    },
    {
      title: "温馨提醒",
      detail: "请勿混入湿垃圾、危险品及国家明令禁止回收的违禁品。",
    },
  ];
});

function getWeightRangeFromValue(value) {
  const amount = Number.parseFloat(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }

  if (amount <= 5) return "0-5kg";
  if (amount <= 10) return "5-10kg";
  if (amount <= 20) return "10-20kg";
  return "20kg 以上";
}

function normalizeWeightInput() {
  const mappedRange = getWeightRangeFromValue(weightInput.value);

  if (!mappedRange) {
    weightInput.value = weightDisplayMap[form.weight] || "5.5";
    return;
  }

  form.weight = mappedRange;
  weightInput.value = Number.parseFloat(weightInput.value).toFixed(1);
}

function syncWeightRange(event) {
  weightInput.value = event.target.value;
  const mappedRange = getWeightRangeFromValue(weightInput.value);

  if (mappedRange) {
    form.weight = mappedRange;
  }
}

function selectDate(item) {
  if (item.isFull) return;
  form.date = item.value;
}

function selectTime(slot) {
  if (slot.disabled) return;
  form.period = slot.value;
}

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

function closeSuccessModal() {
  showSuccessModal.value = false;
}

function closeValidationModal() {
  showValidationModal.value = false;
}

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
    weightInput.value = weightDisplayMap[form.weight] || "5.5";

    const availableDates = appointmentDates.value.filter((item) => !item.isFull);
    form.date = availableDates[1]?.value || availableDates[0]?.value || "";
    form.period = availableTimeSlots.value[1]?.value || availableTimeSlots.value[0]?.value || "";
  } catch (error) {
    errorText.value = "预约配置加载失败，请刷新后重试。";
  } finally {
    metaLoading.value = false;
  }
}

async function handleSubmit() {
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

onMounted(loadMeta);
</script>

<template>
  <section ref="pageRef" class="appointment-page">
    <header class="reference-hero" data-reveal>
      <h1>预约上门回收</h1>
      <p>专业团队准时上门，规范回收，透明结算，为您提供一站式环保服务。</p>
    </header>

    <section class="booking-shell booking-shell--reference" data-reveal style="--reveal-delay: 90ms">
      <form class="booking-main" @submit.prevent="handleSubmit">
        <template v-if="metaLoading">
          <div class="loading-stack">
            <div class="loading-card loading-card--hero" />
            <div class="loading-card" />
            <div class="loading-card" />
            <div class="loading-card loading-card--summary" />
          </div>
        </template>

        <template v-else>
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
                  v-model="form.address"
                  type="text"
                  placeholder="请输入详细街道、楼号、门牌号"
                />
              </label>

              <label class="field">
                <span>联系人姓名</span>
                <input v-model="form.contactName" type="text" placeholder="姓名" />
              </label>

              <label class="field">
                <span>电话号码</span>
                <input
                  v-model="form.phone"
                  type="tel"
                  inputmode="tel"
                  placeholder="请输入 11 位手机号（如 1xx-xxxx-xxxx）"
                />
              </label>
            </div>
          </section>

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
                  form.date === item.value ? 'is-active' : '',
                  item.isFull ? 'is-full' : '',
                ]"
                @click="selectDate(item)"
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
                  form.period === slot.value ? 'is-active' : '',
                  slot.disabled ? 'is-disabled' : '',
                ]"
                @click="selectTime(slot)"
              >
                {{ slot.label }}
              </button>
            </div>
          </section>

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
                <select v-model="form.category">
                  <option v-for="item in meta.categories" :key="item">{{ item }}</option>
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
                v-model="form.note"
                rows="3"
                placeholder="可补充上门提醒、物品数量、电梯/楼层等信息"
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

          <div class="submit-panel">
            <button type="submit" class="submit-btn" :disabled="submitLoading">
              {{ submitLoading ? "提交中..." : "确认提交预约申请" }}
            </button>
            <p class="submit-note">
              点击提交即代表您已阅读并同意《预约回收服务协议》
            </p>
            <p class="submit-caption">专业回收 · 准时上门 · 价格透明</p>
          </div>

          <p v-if="errorText" class="state-error">{{ errorText }}</p>
        </template>
      </form>

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
                预约成功后，如需修改时间请至少提前 4 小时在“我的订单”中操作。
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
    </section>

    <div v-if="showValidationModal" class="modal-overlay" @click.self="closeValidationModal">
      <div class="modal-card">
        <div class="modal-icon modal-icon--warning">!</div>
        <p class="modal-tag modal-tag--warning">信息未完成</p>
        <h3>{{ validationMessage }}</h3>
        <p>请先补全这项信息，再继续提交预约。</p>
        <button class="modal-btn" @click="closeValidationModal">我知道了</button>
      </div>
    </div>

    <div v-if="showSuccessModal" class="modal-overlay" @click.self="closeSuccessModal">
      <div
        class="success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-success-title"
        aria-live="polite"
      >
        <button type="button" class="success-modal-close" @click="closeSuccessModal" aria-label="关闭成功提示">
          <span class="material-symbols-outlined">close</span>
        </button>
        <div class="success-modal-icon">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <p class="success-modal-eyebrow">预约成功</p>
        <h3 id="appointment-success-title" class="success-modal-title">您的预约已提交，已同步到服务记录。</h3>
        <p class="success-modal-text">订单编号：{{ submitResult?.orderId }}</p>
        <p class="success-modal-text">上门核验码：{{ submitResult?.pickupCode }}</p>
        <p class="success-modal-text success-modal-text--emphasis">
          预计 {{ submitResult?.etaMinutes }} 分钟内会有回收人员联系您。
        </p>
        <div class="success-modal-actions">
          <RouterLink to="/orders" class="success-modal-link">
            前往服务记录
          </RouterLink>
          <button type="button" class="success-modal-secondary" @click="closeSuccessModal">
            继续查看预约
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.appointment-page {
  display: grid;
  gap: 22px;
  padding: clamp(18px, 2vw, 28px);
  background:
    radial-gradient(circle at top left, rgba(79, 141, 96, 0.08), transparent 24%),
    linear-gradient(180deg, #faf8f1 0%, #f8f4eb 100%);
  border-radius: 30px;
}

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

.booking-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 318px);
  gap: 22px;
  align-items: start;
}

.booking-main,
.booking-aside {
  display: grid;
  gap: 16px;
}

.section-card,
.reference-summary,
.reference-confirm {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 22px rgba(36, 72, 50, 0.05);
}

.section-card,
.reference-confirm {
  border: 1px solid rgba(79, 141, 96, 0.1);
}

.section-card {
  padding: 22px 24px;
  border-left: 3px solid rgba(79, 141, 96, 0.35);
}

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

.section-head h2,
.promise-card h3,
.trust-card h3,
.modal-card h3 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
}

.section-head h2 {
  font-size: 1.08rem;
}

.section-helper {
  margin: 0;
  color: var(--ink-500);
  font-size: 0.72rem;
  letter-spacing: 0.03em;
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

.month-btn .material-symbols-outlined {
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

.week-btn .material-symbols-outlined {
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

.section-grid {
  display: grid;
  gap: 16px;
}

.section-grid--contact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.field input::placeholder {
  color: rgba(106, 131, 122, 0.55);
}

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

.date-picker-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
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
.time-slot:hover:not(:disabled),
.submit-btn:hover:not(:disabled),
.upload-trigger:hover,
.upload-clear:hover {
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
.upload-clear,
.modal-btn {
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

.reference-summary {
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

.summary-card p,
.summary-card span,
.promise-item p,
.trust-card p,
.modal-card p,
.submit-note,
.submit-caption,
.state-error {
  margin: 0;
  color: var(--ink-600);
}

.summary-card p {
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
  font-size: 0.74rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #4f8d60;
  box-shadow: 0 0 0 5px rgba(79, 141, 96, 0.12);
}

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

.submit-note,
.submit-caption {
  text-align: center;
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
  font-size: 0.85rem;
  font-weight: 700;
  color: #9a6124;
}

.promise-card,
.trust-card {
  display: grid;
  gap: 18px;
}

.promise-card h3,
.trust-card h3 {
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
}

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

.modal-icon--success {
  background: linear-gradient(145deg, #2e5d3f, #4f8d60);
}

.modal-tag {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.modal-tag--warning {
  color: #c2832f;
}

.modal-tag--success {
  color: #2e5d3f;
}

.modal-card h3 {
  margin: 8px 0 14px;
  font-size: 1.6rem;
}

.modal-card p {
  line-height: 1.7;
}

.modal-emphasis {
  color: var(--forest-700) !important;
  font-weight: 700;
}

.modal-btn {
  margin-top: 20px;
  min-width: 116px;
  justify-self: center;
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

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}

@media (max-width: 1180px) {
  .booking-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .date-picker-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .summary-metrics {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .appointment-page {
    padding: 16px;
    border-radius: 20px;
  }

  .section-card {
    padding: 18px;
  }

  .section-grid--contact,
  .section-grid--items {
    grid-template-columns: 1fr;
  }

  .section-head,
  .section-head--between {
    flex-direction: column;
    align-items: flex-start;
  }

  .date-picker-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .upload-actions {
    flex-wrap: wrap;
    justify-content: center;
  }

  .success-modal-actions {
    grid-template-columns: 1fr;
  }
}
</style>
