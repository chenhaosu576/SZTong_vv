// useWeightRange.js
// 预约页的重量输入同步器。
// weightInput 由调用方(view)拥有并提供;composable 只提供操作它的方法:
//   - syncWeightRange(event):  input 事件 → 写 weightInput + 尝试映射 form.weight
//   - normalizeWeightInput():  blur 事件 → 格式化显示,空值回退到 weightDisplayMap[form.weight]
//
// 通过 form / weightInput / weightPointMap / weightDisplayMap 入参注入,
// 保持纯函数式(不耦合具体 view,可被未来其他页面复用)。
//
// 为什么 weightInput 由 view 拥有:
//   summary section 需要展示用户实时输入(原始行为就是优先显示用户输入而非
//   区间默认值),所以 view 必须能读到同一个 weightInput。统一由 view 拥有、
//   通过 prop 传给 AppointmentItemSection,composable 只操作不持有。

import { toRef } from "vue";

export function useWeightRange({ form, weightInput, weightPointMap, weightDisplayMap }) {
  // weightInput 已是 ref;toRef 用于 prop 解构场景时类型稳定。
  const input = toRef(weightInput);

  // 把数值映射回区间。amount <= 0 视为空。
  function getWeightRangeFromValue(value) {
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount) || amount <= 0) return "";
    if (amount <= 5) return "0-5kg";
    if (amount <= 10) return "5-10kg";
    if (amount <= 20) return "10-20kg";
    return "20kg 以上";
  }

  // input 事件:实时同步输入框 + 尝试映射区间
  function syncWeightRange(event) {
    input.value = event.target.value;
    const mappedRange = getWeightRangeFromValue(input.value);
    if (mappedRange) {
      form.weight = mappedRange;
    }
  }

  // blur 事件:格式化显示,空值回退默认
  function normalizeWeightInput() {
    const mappedRange = getWeightRangeFromValue(input.value);

    if (!mappedRange) {
      input.value = weightDisplayMap[form.weight] || "5.5";
      return;
    }

    form.weight = mappedRange;
    input.value = Number.parseFloat(input.value).toFixed(1);
  }

  return {
    syncWeightRange,
    normalizeWeightInput,
  };
}
