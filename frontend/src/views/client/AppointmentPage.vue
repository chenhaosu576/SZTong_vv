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