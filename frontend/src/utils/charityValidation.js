// charityValidation.js
// 公益捐赠表单的校验纯函数。
//
// 职责:
//   - getDonationValidationMessage(donationForm, selectedProject)
//     返回空字符串表示通过;返回非空字符串表示第一条校验失败信息。
//
// 校验顺序:
//   1. 必须先选中项目
//   2. 物品名称必填
//   3. 数量 / 重量至少填一项
//   4. 捐赠者姓名必填
//   5. 联系电话必填且必须为 11 位 1 开头的手机号
//
// 使用方:
//   - useDonationSubmit.js: handleSubmit 提交前调用

export function getDonationValidationMessage(donationForm, selectedProject) {
  if (!selectedProject) {
    return "请先选择一个公益项目后再提交。";
  }

  if (!String(donationForm.itemName || "").trim()) {
    return "请填写具体物品名称。";
  }

  const quantity = String(donationForm.quantity || "").trim();
  const weight = String(donationForm.weight || "").trim();
  if (!quantity && !weight) {
    return "请至少填写数量或预估重量。";
  }

  if (!String(donationForm.donorName || "").trim()) {
    return "请填写捐赠者姓名。";
  }

  const phone = String(donationForm.phone || "").trim();
  if (!phone) {
    return "请填写联系电话。";
  }

  if (!/^1\d{10}$/.test(phone)) {
    return "请输入有效的 11 位手机号。";
  }

  return "";
}