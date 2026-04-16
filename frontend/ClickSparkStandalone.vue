<script setup>
/**
 * ClickSpark - 全局点击火花效果组件（独立版本）
 * 
 * 功能：在页面任意位置点击时产生线条火花扩散动画
 * 基于 Canvas 绘制，性能优异
 * 
 * 使用方法：
 * 1. 将此组件导入到 App.vue 或主布局组件中
 * 2. 在 template 中添加 <ClickSpark />
 * 
 * 示例：
 * import ClickSpark from './components/ClickSpark.vue';
 * 
 * <template>
 *   <div id="app">
 *     <RouterView />
 *     <ClickSpark />
 *   </div>
 * </template>
 */

import { ref, onMounted, onUnmounted, computed } from 'vue';

// ========== 配置项（可自定义） ==========
const CONFIG = {
  sparkColor: '#4f8d60',      // 火花颜色（绿色主题）
  sparkSize: 10,              // 火花线条长度（px）- 调小
  sparkRadius: 18,            // 火花扩散半径（px）- 调小
  sparkCount: 12,             // 每次点击产生的火花数量
  duration: 600,              // 动画持续时间（ms）
  easing: 'ease-out',         // 缓动函数：linear | ease-in | ease-out | ease-in-out
  extraScale: 1.0,            // 额外缩放系数 - 调小
  lineWidth: 2,               // 线条宽度（px）
};

// ========== 响应式数据 ==========
const canvasRef = ref(null);
const sparks = ref([]);
const animationId = ref(null);

// ========== 缓动函数 ==========
const easeFunc = computed(() => {
  return (t) => {
    switch (CONFIG.easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default: // ease-out
        return t * (2 - t);
    }
  };
});

// ========== 处理点击事件 ==========
const handleClick = (e) => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const now = performance.now();

  // 创建新的火花（均匀分布在圆周上）
  const newSparks = Array.from({ length: CONFIG.sparkCount }, (_, i) => ({
    x,
    y,
    angle: (2 * Math.PI * i) / CONFIG.sparkCount,
    startTime: now,
  }));

  sparks.value.push(...newSparks);
};

// ========== 绘制动画帧 ==========
const draw = (timestamp) => {
  const canvas = canvasRef.value;
  const ctx = canvas?.getContext('2d');
  if (!ctx || !canvas) return;

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 过滤并绘制火花
  sparks.value = sparks.value.filter((spark) => {
    const elapsed = timestamp - spark.startTime;
    
    // 移除已完成的火花
    if (elapsed >= CONFIG.duration) {
      return false;
    }

    // 计算动画进度（0-1）
    const progress = elapsed / CONFIG.duration;
    const eased = easeFunc.value(progress);

    // 计算火花位置
    const distance = eased * CONFIG.sparkRadius * CONFIG.extraScale;
    const lineLength = CONFIG.sparkSize * (1 - eased); // 线条逐渐缩短

    // 线条起点
    const x1 = spark.x + distance * Math.cos(spark.angle);
    const y1 = spark.y + distance * Math.sin(spark.angle);
    
    // 线条终点
    const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
    const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

    // 绘制线条
    ctx.strokeStyle = CONFIG.sparkColor;
    ctx.lineWidth = CONFIG.lineWidth;
    ctx.lineCap = 'round'; // 圆角端点
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    return true; // 保留此火花
  });

  // 继续下一帧
  animationId.value = requestAnimationFrame(draw);
};

// ========== 调整画布大小 ==========
const resizeCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  // 设置画布尺寸为窗口大小
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

let resizeTimeout;
const handleResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resizeCanvas, 100);
};

// ========== 生命周期 ==========
onMounted(() => {
  resizeCanvas();
  window.addEventListener('resize', handleResize);
  document.addEventListener('click', handleClick);
  animationId.value = requestAnimationFrame(draw);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('click', handleClick);
  clearTimeout(resizeTimeout);
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
  }
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="click-spark-canvas"
  />
</template>

<style scoped>
.click-spark-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 不阻挡鼠标事件 */
  z-index: 9999;        /* 显示在最上层 */
}
</style>
