<script setup>
import { ref } from "vue";
import ChatMessage from "./ChatMessage.vue";

const props = defineProps({
  messages: { type: Array, required: true },
  suggestions: { type: Array, required: true },
  showSuggestions: { type: Boolean, required: true },
  isThinking: { type: Boolean, required: true },
  iconMap: { type: Object, required: true },
});

const emit = defineEmits(["suggestion-click"]);

const rootRef = ref(null);

function scrollToBottom() {
  if (rootRef.value) {
    rootRef.value.scrollTop = rootRef.value.scrollHeight;
  }
}

defineExpose({ scrollToBottom });
</script>

<template>
  <div ref="rootRef" class="chat-messages">
    <ChatMessage
      v-for="message in messages"
      :key="message.id"
      :message="message"
      :icon-map="iconMap"
    />

    <div v-if="showSuggestions" class="suggestions">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        class="suggestion-btn"
        @click="emit('suggestion-click', suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>

    <div v-if="isThinking" class="thinking-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
</template>

<style scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 32px 48px 160px;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(227, 226, 225, 0.6);
  border-radius: 10px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-left: 56px;
  margin-top: -16px;
}

.suggestion-btn {
  padding: 10px 18px;
  border: 1px solid rgba(46, 105, 80, 0.2);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--forest-700);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-btn:hover {
  background: rgba(233, 244, 233, 0.9);
  border-color: rgba(46, 105, 80, 0.4);
  transform: translateY(-1px);
}

.thinking-dots {
  display: flex;
  gap: 6px;
  padding: 16px 0;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(129, 189, 160, 0.6);
  animation: thinkingBounce 1.4s infinite ease-in-out;
}

.thinking-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.thinking-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes thinkingBounce {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@media (max-width: 1024px) {
  .chat-messages {
    padding: 24px 32px 160px;
  }
}

@media (max-width: 768px) {
  .chat-messages {
    padding: 20px 16px 160px;
  }

  .suggestions {
    margin-left: 0;
  }
}
</style>