<template>
  <div ref="containerRef" class="click-spark-container" @click="handleClick">
    <canvas ref="canvasRef" class="click-spark-canvas" />
    <slot />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';

const props = defineProps({
  sparkColor: {
    type: String,
    default: '#2e6950'
  },
  sparkSize: {
    type: Number,
    default: 10
  },
  sparkRadius: {
    type: Number,
    default: 15
  },
  sparkCount: {
    type: Number,
    default: 8
  },
  duration: {
    type: Number,
    default: 400
  },
  easing: {
    type: String,
    default: 'ease-out',
    validator: (value) => ['linear', 'ease-in', 'ease-out', 'ease-in-out'].includes(value)
  },
  extraScale: {
    type: Number,
    default: 1.0
  }
});

const containerRef = ref(null);
const canvasRef = ref(null);
const sparks = ref([]);
const startTimeRef = ref(null);
const animationId = ref(null);

const easeFunc = computed(() => {
  return (t) => {
    switch (props.easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t * (2 - t);
    }
  };
});

const handleClick = (e) => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const now = performance.now();

  const newSparks = Array.from({ length: props.sparkCount }, (_, i) => ({
    x,
    y,
    angle: (2 * Math.PI * i) / props.sparkCount,
    startTime: now
  }));

  sparks.value.push(...newSparks);
};

const draw = (timestamp) => {
  if (!startTimeRef.value) {
    startTimeRef.value = timestamp;
  }

  const canvas = canvasRef.value;
  const ctx = canvas?.getContext('2d');
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  sparks.value = sparks.value.filter((spark) => {
    const elapsed = timestamp - spark.startTime;
    if (elapsed >= props.duration) {
      return false;
    }

    const progress = elapsed / props.duration;
    const eased = easeFunc.value(progress);
    const distance = eased * props.sparkRadius * props.extraScale;
    const lineLength = props.sparkSize * (1 - eased);

    const x1 = spark.x + distance * Math.cos(spark.angle);
    const y1 = spark.y + distance * Math.sin(spark.angle);
    const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
    const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

    ctx.strokeStyle = props.sparkColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    return true;
  });

  animationId.value = requestAnimationFrame(draw);
};

const resizeCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const parent = canvas.parentElement;
  if (!parent) return;

  const { width, height } = parent.getBoundingClientRect();
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
};

let resizeTimeout;
const handleResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resizeCanvas, 100);
};

let resizeObserver = null;

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const parent = canvas.parentElement;
  if (!parent) return;

  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(parent);

  resizeCanvas();
  animationId.value = requestAnimationFrame(draw);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  clearTimeout(resizeTimeout);
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
  }
});

watch(
  [
    () => props.sparkColor,
    () => props.sparkSize,
    () => props.sparkRadius,
    () => props.sparkCount,
    () => props.duration,
    easeFunc,
    () => props.extraScale
  ],
  () => {
    if (animationId.value) {
      cancelAnimationFrame(animationId.value);
    }
    animationId.value = requestAnimationFrame(draw);
  }
);
</script>

<style scoped>
.click-spark-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.click-spark-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
}
</style>
