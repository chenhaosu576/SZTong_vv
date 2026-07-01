<!-- CharitySuccessModal.vue -->
<!-- 公益捐赠提交成功 modal。
     订单号 + RouterLink 跳 /orders + 关闭按钮。
     内部包 <Transition name="fade">,保持与原 view 视觉一致。
     接收 show / result,emit close。 -->

<script setup>
import { RouterLink } from "vue-router";

defineProps({
  show: { type: Boolean, required: true },
  result: { type: Object, default: null },
});

defineEmits(["close"]);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="success-modal-overlay"
      @click.self="$emit('close')"
    >
      <div
        class="success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-success-title"
        aria-live="polite"
      >
        <button type="button" class="success-modal-close" @click="$emit('close')" aria-label="关闭成功提示">
          <span class="material-symbols-outlined">close</span>
        </button>
        <div class="success-modal-icon">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <p class="success-modal-eyebrow">提交成功</p>
        <h3 id="donation-success-title" class="success-modal-title">
          {{ result?.message }}
        </h3>
        <p class="success-modal-text">
          服务单号:{{ result?.orderId }}
        </p>
        <div class="success-modal-actions">
          <RouterLink
            v-if="result?.syncedToOrders"
            to="/orders"
            class="success-modal-link"
          >
            前往服务记录
          </RouterLink>
          <button type="button" class="success-modal-secondary" @click="$emit('close')">
            继续浏览项目
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.success-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 20, 0.45);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 30;
}

.success-modal {
  width: min(100%, 460px);
  position: relative;
  background: #f8f4ec;
  border-radius: 28px;
  padding: 32px 28px 28px;
  box-shadow: 0 24px 80px rgba(16, 24, 20, 0.18);
  display: grid;
  gap: 14px;
  text-align: center;
}

.success-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(21, 66, 18, 0.08);
  color: #154212;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.success-modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto;
  border-radius: 50%;
  background: rgba(21, 66, 18, 0.1);
  color: #154212;
  display: grid;
  place-items: center;
}

.success-modal-icon .material-symbols-outlined {
  font-size: 34px;
}

.success-modal-eyebrow {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2d5a27;
}

.success-modal-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.45rem;
  line-height: 1.4;
  color: var(--ink-900);
}

.success-modal-text {
  margin: 0;
  font-size: 0.92rem;
  color: var(--ink-600);
}

.success-modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 6px;
}

.success-modal-link,
.success-modal-secondary {
  min-height: 48px;
  border-radius: 14px;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  font-size: 0.92rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.success-modal-link {
  background: linear-gradient(135deg, #154212, #2d5a27);
  color: white;
  box-shadow: 0 10px 30px rgba(21, 66, 18, 0.22);
}

.success-modal-secondary {
  background: rgba(21, 66, 18, 0.08);
  color: #154212;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>