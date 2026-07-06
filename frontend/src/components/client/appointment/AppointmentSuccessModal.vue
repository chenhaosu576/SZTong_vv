<!-- AppointmentSuccessModal.vue -->
<!-- 预约成功弹窗:展示订单号 / 核验码 / ETA;含"前往服务记录" RouterLink。 -->

<script setup>
import { RouterLink } from "vue-router";

defineProps({
  show: { type: Boolean, required: true },
  result: { type: Object, required: true }, // { orderId, pickupCode, etaMinutes } | null
});

defineEmits(["close"]);
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div
      class="success-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-success-title"
      aria-live="polite"
    >
      <button type="button" class="success-modal-close" @click="$emit('close')" aria-label="关闭成功提示">
        <span class="material-symbols-outlined">close</span>
      </button>
      <div class="success-modal-icon">
        <span class="material-symbols-outlined">check_circle</span>
      </div>
      <p class="success-modal-eyebrow">预约成功</p>
      <h3 id="appointment-success-title" class="success-modal-title">您的预约已提交，已同步到服务记录。</h3>
      <p class="success-modal-text">订单编号：{{ result?.orderId }}</p>
      <p class="success-modal-text">上门核验码：{{ result?.pickupCode }}</p>
      <p class="success-modal-text success-modal-text--emphasis">
        预计 {{ result?.etaMinutes }} 分钟内会有回收人员联系您。
      </p>
      <div class="success-modal-actions">
        <RouterLink to="/orders" class="success-modal-link">
          前往服务记录
        </RouterLink>
        <button type="button" class="success-modal-secondary" @click="$emit('close')">
          继续查看预约
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(20, 34, 29, 0.42);
  backdrop-filter: blur(6px);
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
  background: rgba(79, 141, 96, 0.12);
  color: #2e5d3f;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.success-modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto;
  border-radius: 50%;
  background: rgba(79, 141, 96, 0.12);
  color: #2e5d3f;
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
  color: #2e5d3f;
}

.success-modal-title {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: 1.45rem;
  line-height: 1.4;
}

.success-modal-text {
  margin: 0;
  color: var(--ink-600);
  font-size: 0.92rem;
  line-height: 1.7;
}

.success-modal-text--emphasis {
  color: var(--forest-700);
  font-weight: 700;
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
  background: linear-gradient(145deg, #4f8d60 0%, #2e5d3f 100%);
  color: #fff;
  box-shadow: 0 10px 30px rgba(79, 141, 96, 0.22);
}

.success-modal-secondary {
  background: rgba(79, 141, 96, 0.1);
  color: #2e5d3f;
}

@media (max-width: 720px) {
  .success-modal-actions {
    grid-template-columns: 1fr;
  }
}
</style>