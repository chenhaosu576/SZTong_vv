// useDonationForm.js
// 公益捐赠表单的本地状态管理。
//
// 职责:
//   - 持有 donationForm ref(8 个字段)
//   - createDefaultDonationForm(): 工厂函数,返回表单默认值
//   - resetForm(): 提交成功后由 useDonationSubmit 回调,清空表单
//
// 不调用任何 API、不感知选中项目、不持有校验逻辑。

import { ref } from "vue";

export function createDefaultDonationForm() {
  return {
    itemType: "冬装外套",
    itemName: "",
    quantity: "",
    weight: "",
    condition: "8成新以上",
    logistics: "快递寄送",
    donorName: "",
    phone: "",
  };
}

export function useDonationForm() {
  const donationForm = ref(createDefaultDonationForm());

  function resetForm() {
    donationForm.value = createDefaultDonationForm();
  }

  return {
    donationForm,
    resetForm,
  };
}