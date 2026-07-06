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