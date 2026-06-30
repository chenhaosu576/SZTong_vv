<!-- AppointmentSubmitBar.vue -->
<!-- 提交栏:按钮 + 错误条 + 底部备注。
     按钮点击 emit submit 事件,由 view 调用 useAppointmentForm.handleSubmit。 -->

<script setup>
defineProps({
  submitLoading: { type: Boolean, required: true },
  errorText: { type: String, required: true },
});

defineEmits(["submit"]);
</script>

<template>
  <div class="submit-panel">
    <button type="submit" class="submit-btn" :disabled="submitLoading" @click="$emit('submit')">
      {{ submitLoading ? "提交中..." : "确认提交预约申请" }}
    </button>
    <p class="submit-note">
      点击提交即代表您已阅读并同意《预约回收服务协议》
    </p>
    <p class="submit-caption">专业回收 · 准时上门 · 价格透明</p>

    <p v-if="errorText" class="state-error">{{ errorText }}</p>
  </div>
</template>

<style scoped>
.submit-panel {
  display: grid;
  gap: 10px;
}

.submit-btn {
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(145deg, #4f8d60 0%, #2e5d3f 100%);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(79, 141, 96, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.submit-note,
.submit-caption {
  text-align: center;
  margin: 0;
  color: var(--ink-600);
}

.submit-note {
  font-size: 0.7rem;
}

.submit-caption {
  font-size: 0.58rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.state-error {
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #9a6124;
}
</style>
