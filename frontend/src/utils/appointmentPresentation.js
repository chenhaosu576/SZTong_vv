import { appointmentRequiredFields } from "./appointmentValidation.js";

const EMPTY_VALUE = "待填写";

function cleanValue(value) {
  return typeof value === "string" ? value.trim() : value;
}

function hasValue(value) {
  return Boolean(cleanValue(value));
}

export function getAppointmentStatus(form) {
  const missingFields = appointmentRequiredFields.filter((field) => field.isMissing(form[field.key]));

  if (missingFields.length === 0) {
    return {
      ready: true,
      missingCount: 0,
      badge: "可提交",
      title: "预约信息已齐全",
      detail: "确认无误后即可提交，平台会为你匹配附近可上门的回收机构。",
    };
  }

  const missingLabels = missingFields.map((field) => field.label).join("、");

  return {
    ready: false,
    missingCount: missingFields.length,
    badge: `待补 ${missingFields.length} 项`,
    title: "还有关键信息待填写",
    detail: `请先补全${missingLabels}，这样平台才能顺利安排上门回收。`,
  };
}

export function getAppointmentSummaryRows(form, estimatedPoints) {
  return [
    {
      label: "回收品类",
      value: hasValue(form.category) ? form.category : EMPTY_VALUE,
      isPending: !hasValue(form.category),
      tone: hasValue(form.category) ? "default" : "pending",
    },
    {
      label: "预估重量",
      value: hasValue(form.weight) ? form.weight : EMPTY_VALUE,
      isPending: !hasValue(form.weight),
      tone: hasValue(form.weight) ? "default" : "pending",
    },
    {
      label: "上门日期",
      value: hasValue(form.date) ? form.date : EMPTY_VALUE,
      isPending: !hasValue(form.date),
      tone: hasValue(form.date) ? "default" : "pending",
    },
    {
      label: "时间段",
      value: hasValue(form.period) ? form.period : EMPTY_VALUE,
      isPending: !hasValue(form.period),
      tone: hasValue(form.period) ? "default" : "pending",
    },
    {
      label: "联系电话",
      value: hasValue(form.phone) ? form.phone : EMPTY_VALUE,
      isPending: !hasValue(form.phone),
      tone: hasValue(form.phone) ? "default" : "pending",
    },
    {
      label: "上门地址",
      value: hasValue(form.address) ? form.address : EMPTY_VALUE,
      isPending: !hasValue(form.address),
      tone: hasValue(form.address) ? "default" : "pending",
    },
    {
      label: "预计积分",
      value: `${estimatedPoints} 积分`,
      isPending: false,
      tone: "accent",
    },
  ];
}

export function getAppointmentQuicklookSteps(form) {
  return [
    {
      label: "确认回收内容",
      done: hasValue(form.category) && hasValue(form.weight),
    },
    {
      label: "选择上门时间",
      done: hasValue(form.date) && hasValue(form.period),
    },
    {
      label: "填写电话和地址",
      done: hasValue(form.phone) && hasValue(form.address),
    },
  ];
}
