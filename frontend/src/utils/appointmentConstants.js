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