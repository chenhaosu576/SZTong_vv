// useTypewriter.js
// 通用打字机 composable。
//
// 职责:
//   - 暴露 text ref(当前已显示的文本)
//   - start(fullText): 从头开始逐字渲染,间隔 delay ms(默认 58ms)
//   - start 接受 startDelay ms 启动延时(默认 320ms,等 hero 区淡入完再开始)
//   - stop(): 立即停止渲染(组件卸载时调用)
//   - 检测 prefers-reduced-motion:true 时 start 直接置完整文本不启动定时器
//   - 内部用闭包持有定时器 handle,onUnmounted 自动 stop()
//
// 不感知业务字段、不与具体页面耦合;跨页面可直接复用。

import { onUnmounted, ref } from "vue";

const DEFAULT_DELAY = 58;
const DEFAULT_START_DELAY = 320;

export function useTypewriter(options = {}) {
  const delay = options.delay ?? DEFAULT_DELAY;
  const startDelay = options.startDelay ?? DEFAULT_START_DELAY;

  const text = ref("");
  let timer = null;

  function clearTimer() {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function stop() {
    clearTimer();
  }

  function start(fullText) {
    clearTimer();

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      text.value = fullText;
      return;
    }

    text.value = "";
    let currentIndex = 0;

    const typeNextCharacter = () => {
      if (currentIndex >= fullText.length) {
        timer = null;
        return;
      }

      currentIndex += 1;
      text.value = fullText.slice(0, currentIndex);

      if (currentIndex < fullText.length) {
        timer = window.setTimeout(typeNextCharacter, delay);
        return;
      }

      timer = null;
    };

    timer = window.setTimeout(typeNextCharacter, startDelay);
  }

  onUnmounted(stop);

  return {
    text,
    start,
    stop,
  };
}
