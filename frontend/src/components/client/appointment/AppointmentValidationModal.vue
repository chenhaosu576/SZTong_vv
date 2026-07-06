<!-- AppointmentValidationModal.vue -->
<!-- 校验失败弹窗:展示未填字段名,提供"我知道了"关闭。 -->

<script setup>
defineProps({
  show: { type: Boolean, required: true },
  message: { type: String, required: true },
});

defineEmits(["close"]);
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-icon modal-icon--warning">!</div>
      <p class="modal-tag modal-tag--warning">信息未完成</p>
      <h3>{{ message }}</h3>
      <p>请先补全这项信息，再继续提交预约。</p>
      <button class="modal-btn" @click="$emit('close')">我知道了</button>
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

.modal-card {
  width: min(420px, calc(100vw - 32px));
  padding: 28px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid rgba(79, 141, 96, 0.12);
  box-shadow: 0 22px 46px rgba(20, 43, 31, 0.14);
  text-align: center;
}

.modal-icon {
  width: 54px;
  height: 54px;
  margin: 0 auto 14px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 1.6rem;
  font-weight: 700;
}

.modal-icon--warning {
  background: linear-gradient(145deg, #c2832f, #d7a45c);
}

.modal-tag {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
}

.modal-tag--warning {
  color: #c2832f;
}

.modal-card h3 {
  margin: 8px 0 14px;
  font-size: 1.6rem;
  color: var(--ink-900);
  font-family: var(--font-display);
}

.modal-card p {
  margin: 0;
  line-height: 1.7;
  color: var(--ink-600);
}

.modal-btn {
  margin-top: 20px;
  min-width: 116px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(79, 141, 96, 0.2);
  background: #fff;
  color: var(--forest-700);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  justify-self: center;
}
</style>