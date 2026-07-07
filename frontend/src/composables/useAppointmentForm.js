// useAppointmentForm.js
// 预约页的 form 编排 composable。
// 职责:
//   - loadMeta(): 用本地常量初始化 meta 与 form 默认值
//   - handleSubmit(): 校验 → 调 ordersStore.submitRecycle → 驱动 modal
//   - 维护 metaLoading / submitLoading / errorText / submitResult / modal 状态
//
// 通过 datePicker / availableTimeSlots 入参注入初始化默认值所需的派生数据,
// 保持纯函数式(不直接 import useDatePicker)。
//
// 使用方: AppointmentPage.vue 顶层 setup() 调用,暴露给 panel 通过 props。

import { reactive, ref } from "vue";
import { useOrdersStore } from "../stores/orders";
import { getAppointmentValidationMessage } from "../utils/appointmentValidation";
import { weightDisplayMap } from "../utils/appointmentConstants";

const APPOINTMENT_CATEGORIES = ["小家电", "纸塑金属", "纺织旧衣", "有害垃圾", "大件家具"];
const APPOINTMENT_WEIGHTS = Object.keys(weightDisplayMap);
const APPOINTMENT_PERIODS = ["09:00-12:00", "13:00-16:00", "18:00-21:00"];
const APPOINTMENT_TIPS = [
  "请提前将可回收物打包，并保持表面干燥。",
  "玻璃、刀具等尖锐物请单独标记，便于上门人员安全处理。",
  "大件家具建议在备注里补充尺寸、电梯情况和搬运路径。",
];

export function useAppointmentForm({ datePicker, availableTimeSlots }) {
  const ordersStore = useOrdersStore();

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
      meta.categories = APPOINTMENT_CATEGORIES;
      meta.weights = APPOINTMENT_WEIGHTS;
      meta.periods = APPOINTMENT_PERIODS;
      meta.tips = APPOINTMENT_TIPS;

      form.category = APPOINTMENT_CATEGORIES[0] || "";
      form.weight = APPOINTMENT_WEIGHTS[1] || APPOINTMENT_WEIGHTS[0] || "";

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
      const result = await ordersStore.submitRecycle({
        category: form.category,
        weightBand: form.weight,
        estimatedWeight: Number(weightDisplayMap[form.weight]) || 0,
        scheduledDate: form.date,
        scheduledPeriod: form.period,
        contactName: form.contactName,
        contactPhone: form.phone,
        addressSnapshot: form.address,
        note: form.note,
      });
      submitResult.value = {
        orderId: result.orderNo,
        pickupCode: result.pickupCode,
        estimatedPoints: result.estimatedPoints,
        status: result.status,
      };
      showSuccessModal.value = true;
    } catch (error) {
      errorText.value = error?.message || "提交失败，请稍后重试。";
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