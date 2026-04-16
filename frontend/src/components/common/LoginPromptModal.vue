<script setup>
const emit = defineEmits(["close", "confirm"]);
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="dialog pop-in">
      <p class="tag">欢迎来到收智通</p>
      <h3>3 秒智能引导</h3>
      <p>
        登录后可同步预约记录、订单追踪与积分成长，直接进入 C 端用户界面。
      </p>

      <div class="dialog__actions">
        <button class="btn btn--ghost" @click="emit('close')">先逛逛</button>
        <button class="btn" @click="emit('confirm')">去登录 / 注册</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: rgba(20, 34, 29, 0.48);
  backdrop-filter: blur(6px);
}

.dialog {
  width: min(520px, calc(100vw - 36px));
  padding: 28px;
  border-radius: 24px;
  border: 1px solid var(--line-soft);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.tag {
  margin: 0;
  color: var(--green-600);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

h3 {
  margin: 8px 0 14px;
  font-family: var(--font-display);
  color: var(--ink-900);
  font-size: 1.7rem;
}

p {
  margin: 0;
  color: var(--ink-600);
  line-height: 1.7;
}

.dialog__actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
