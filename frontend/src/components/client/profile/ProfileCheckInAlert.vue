<!--
  ProfileCheckInAlert.vue
  固定定位的"今日已打卡"提示浮层。
  与 ProfileHeaderPanel 解耦: 浮层定位逻辑独立, 不与 header 布局耦合。
  Page 通过 :visible prop 控制显示, 文案由 :message 传入 (默认文案)。
-->

<script setup>
defineProps({
  visible: { type: Boolean, required: true },
  message: { type: String, default: "今日已打卡，明天再来吧！" },
});
</script>

<template>
  <div v-if="visible" class="check-in-alert">
    <div class="alert-content">
      <span class="alert-icon">⚠️</span>
      <p class="alert-message">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.check-in-alert {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  animation: alertSlideDown 0.4s ease-out;
}

@keyframes alertSlideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #fff3cd, #ffeaa7);
  border: 2px solid #ffc107;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  animation: alertPulse 0.5s ease-out;
}

@keyframes alertPulse {
  0% {
    transform: scale(0.9);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.alert-icon {
  font-size: 1.5rem;
  animation: iconShake 0.5s ease-out;
}

@keyframes iconShake {
  0%, 100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-10deg);
  }
  75% {
    transform: rotate(10deg);
  }
}

.alert-message {
  font-size: 0.875rem;
  font-weight: 700;
  color: #856404;
  margin: 0;
  white-space: nowrap;
}
</style>