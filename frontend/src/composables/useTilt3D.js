// useTilt3D.js
// 通用 3D 卡片倾斜 composable。
//
// 职责:
//   - 接受卡片数量 count,初始化 cardRefs (DOM 数组) +
//     cardHoverStates (数组,每项 { x, y, isHovered })
//   - setCardRef(el, index): panel 模板用 :ref="el => setCardRef(el, i)" 注册
//   - onMove(event, index): 鼠标移动时计算 rotateX / rotateY + 写 hover 状态
//     (rotateX = (mouseY - centerY) / 10; rotateY = (centerX - mouseX) / 10;
//      state.x 存 rotateY, state.y 存 rotateX — 与原 HomePage 行为完全一致,
//      模板直接用 perspective(...) rotateX(state.y) rotateY(state.x) ...)
//   - onLeave(index): 鼠标离开时重置 hover 状态
//
// 模板用法:
//   :ref="el => setCardRef(el, i)"
//   @mousemove="onMove($event, i)"
//   @mouseleave="onLeave(i)"
//   :style="{ transform: \`perspective(1000px) rotateX(\${cardHoverStates[i].y}deg) rotateY(\${cardHoverStates[i].x}deg) scale(\${cardHoverStates[i].isHovered ? 1.05 : 1})\` }"
//
// 不持有路由、不感知跳转目标;panel / view 自己处理 navigate 逻辑。

import { reactive, ref } from "vue";

function createInitialStates(count) {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, isHovered: false }));
}

export function useTilt3D(count) {
  const cardRefs = ref([]);
  const cardHoverStates = reactive(createInitialStates(count));

  function setCardRef(el, index) {
    if (el) {
      cardRefs.value[index] = el;
    }
  }

  function onMove(event, index) {
    const card = cardRefs.value[index];
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (mouseY - centerY) / 10;
    const rotateY = (centerX - mouseX) / 10;

    cardHoverStates[index] = {
      x: rotateY,
      y: rotateX,
      isHovered: true,
    };
  }

  function onLeave(index) {
    cardHoverStates[index] = {
      x: 0,
      y: 0,
      isHovered: false,
    };
  }

  return {
    cardRefs,
    cardHoverStates,
    setCardRef,
    onMove,
    onLeave,
  };
}
