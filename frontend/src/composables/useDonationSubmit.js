// useDonationSubmit.js
// 公益捐赠的提交编排 composable。
//
// 职责:
//   - 持有 submitLoading / errorText / submitResult 3 个 ref
//   - handleSubmit(): 校验 → 调 submitDonationRequest → 驱动 submitResult
//     → 触发 onSuccess 回调(由 view 注入,通常是 donationForm.resetForm)
//   - closeSuccessModal(): 清空 submitResult
//
// 通过入参注入 donationForm / getSelectedProject / onSuccess,
// 不直接 import useDonationForm / useCharityFilters(保持纯函数式)。
//
// 使用方:
//   - CharityPage.vue: 实例化,把 submitLoading/errorText/submitResult
//     透传给 CharityDonationForm 和 CharitySuccessModal。

import { ref } from "vue";
import { submitDonation as submitDonationRequest } from "../mock/clientApi";
import { getDonationValidationMessage } from "../utils/charityValidation";

export function useDonationSubmit({ donationForm, getSelectedProject, onSuccess }) {
  const submitLoading = ref(false);
  const errorText = ref("");
  const submitResult = ref(null);

  function resetSubmitState() {
    errorText.value = "";
    submitResult.value = null;
  }

  async function handleSubmit() {
    if (submitLoading.value) {
      return;
    }

    resetSubmitState();

    const form = donationForm.value;
    const selectedProject = getSelectedProject();

    const validationMessage = getDonationValidationMessage(form, selectedProject);
    if (validationMessage) {
      errorText.value = validationMessage;
      return;
    }

    submitLoading.value = true;

    try {
      const payload = {
        projectId: selectedProject.id,
        projectTitle: selectedProject.title,
        projectLocation: selectedProject.location,
        itemType: String(form.itemType || "").trim(),
        itemName: String(form.itemName || "").trim(),
        quantity: String(form.quantity || "").trim(),
        weight: String(form.weight || "").trim(),
        condition: String(form.condition || "").trim(),
        logistics: String(form.logistics || "").trim(),
        donorName: String(form.donorName || "").trim(),
        phone: String(form.phone || "").trim(),
      };
      const result = await submitDonationRequest(payload);

      submitResult.value = {
        message: "捐赠信息提交成功,已同步到服务记录。",
        orderId: result.orderId,
        syncedToOrders: result.syncedToOrders,
      };

      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (error) {
      errorText.value = "提交失败,请稍后重试。";
    } finally {
      submitLoading.value = false;
    }
  }

  function closeSuccessModal() {
    submitResult.value = null;
  }

  return {
    submitLoading,
    errorText,
    submitResult,
    handleSubmit,
    closeSuccessModal,
  };
}
