<script setup>
import { ref } from "vue";

const props = defineProps({
  userInput: { type: String, required: true },
  isThinking: { type: Boolean, required: true },
});

const emit = defineEmits(["update:userInput", "send", "attachment"]);

const fileInput = ref(null);

function handleAttachment() {
  fileInput.value?.click();
}

function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  console.log("选择的文件:", file.name);
  alert(`已选择文件: ${file.name}\n（文件上传功能待实现）`);
}

function handleInputKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    emit("send");
  }
}

function onInput(event) {
  emit("update:userInput", event.target.value);
}
</script>

<template>
  <div class="chat-input-wrapper">
    <div class="chat-input-container">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleFileChange"
      />

      <button
        type="button"
        class="input-action-btn"
        aria-label="附件"
        @click="handleAttachment"
      >
        <span class="material-symbols-outlined">attachment</span>
      </button>

      <input
        type="text"
        class="chat-input"
        :value="userInput"
        placeholder="输入您想咨询的问题..."
        @input="onInput"
        @keydown="handleInputKeydown"
      />

      <button
        type="button"
        class="send-btn"
        aria-label="发送"
        :disabled="isThinking"
        @click="emit('send')"
      >
        <span class="material-symbols-outlined">send</span>
      </button>
    </div>

    <p class="input-disclaimer">
      AI 结果可能有所不同。关键分类请咨询当地指南。
    </p>
  </div>
</template>

<style scoped>
.chat-input-wrapper {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 48px 40px;
  background: linear-gradient(to top, var(--surface) 70%, transparent);
  pointer-events: none;
}

.chat-input-container {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(46, 105, 80, 0.15);
  box-shadow: 0 16px 40px rgba(23, 52, 36, 0.12);
  pointer-events: auto;
}

.input-action-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: rgba(129, 189, 160, 0.8);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease, background 0.2s ease;
}

.input-action-btn:hover {
  color: var(--forest-700);
  background: rgba(233, 244, 233, 0.5);
}

.chat-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 16px;
  font-size: 0.95rem;
  color: var(--ink-900);
  outline: none;
  font-family: var(--font-body);
}

.chat-input::placeholder {
  color: var(--ink-600);
  opacity: 0.6;
}

.send-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(140deg, #214f37, #4b855e 58%, #5d9a74);
  color: #f7fff9;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 8px 20px rgba(31, 89, 57, 0.25);
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 10px 24px rgba(31, 89, 57, 0.35);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.send-btn .material-symbols-outlined {
  font-size: 20px;
  font-variation-settings: "FILL" 1;
}

.input-disclaimer {
  margin: 12px 0 0;
  text-align: center;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-600);
  opacity: 0.7;
  font-family: var(--font-data);
  pointer-events: none;
}

@media (max-width: 1024px) {
  .chat-input-wrapper {
    padding: 20px 32px 32px;
  }
}

@media (max-width: 768px) {
  .chat-input-wrapper {
    padding: 16px 16px 24px;
  }
}
</style>