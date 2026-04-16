export const appointmentRequiredFields = [
  {
    key: "date",
    label: "上门日期",
    message: "上门日期未填写",
    isMissing: (value) => !value,
  },
  {
    key: "period",
    label: "时间段",
    message: "时间段未填写",
    isMissing: (value) => !value,
  },
  {
    key: "address",
    label: "上门地址",
    message: "上门地址未填写",
    isMissing: (value) => !value || !value.trim(),
  },
  {
    key: "phone",
    label: "联系电话",
    message: "联系电话未填写",
    isMissing: (value) => !value || !value.trim(),
  },
];

export function getAppointmentValidationMessage(form) {
  for (const check of appointmentRequiredFields) {
    if (check.isMissing(form[check.key])) {
      return check.message;
    }
  }

  return "";
}
