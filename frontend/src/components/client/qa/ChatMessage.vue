<script setup>
defineProps({
  message: { type: Object, required: true },
  iconMap: { type: Object, required: true },
});
</script>

<template>
  <div
    :class="['message-wrapper', message.type === 'user' ? 'user-message' : 'ai-message']"
  >
    <div v-if="message.type === 'ai'" class="message-avatar ai-avatar">
      <span class="material-symbols-outlined">smart_toy</span>
    </div>

    <div class="message-content">
      <div v-if="message.type === 'ai'" class="message-text">
        <div v-if="message.parsedModules" class="ai-modules">
          <div
            v-for="(module, index) in message.parsedModules"
            :key="index"
            class="ai-module"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="module-header">
              <span class="module-icon material-symbols-outlined">
                {{ iconMap[module.icon] || "info" }}
              </span>
              <span class="module-title">{{ module.title }}</span>
            </div>
            <div class="module-content">{{ module.content }}</div>
          </div>
        </div>

        <div v-else class="ai-text">
          {{ message.content }}
        </div>
      </div>

      <div v-else class="message-bubble">
        {{ message.content }}
      </div>
    </div>

    <div v-if="message.type === 'user'" class="message-avatar user-avatar">
      <span>用户</span>
    </div>
  </div>
</template>

<style scoped>
.message-wrapper {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  animation: messageSlideIn 0.4s ease;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-message {
  flex-direction: row-reverse;
}

.user-message .message-avatar {
  order: -1;
}

.message-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.ai-avatar {
  background: rgba(129, 189, 160, 0.2);
  color: var(--forest-700);
}

.ai-avatar .material-symbols-outlined {
  font-size: 24px;
  font-variation-settings: "FILL" 1;
}

.user-avatar {
  background: linear-gradient(145deg, rgba(38, 92, 62, 0.98), rgba(126, 171, 135, 0.95));
  color: #f7fff8;
}

.message-content {
  flex: 1;
  max-width: 85%;
}

.message-text,
.ai-text {
  line-height: 1.6;
  font-size: 0.95rem;
}

.user-message .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.user-message .message-bubble {
  padding: 18px 24px;
  border-radius: 24px 0 24px 24px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink-900);
  box-shadow: 0 4px 12px rgba(23, 52, 36, 0.08);
  line-height: 1.6;
  font-size: 0.95rem;
}

.ai-modules {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-module {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  padding: 16px 20px;
  border: 1px solid rgba(46, 105, 80, 0.12);
  animation: moduleSlideIn 0.4s ease forwards;
  opacity: 0;
}

@keyframes moduleSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.module-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.module-icon {
  font-size: 20px;
  color: var(--forest-700);
  font-variation-settings: "FILL" 1;
}

.module-title {
  font-weight: 600;
  color: var(--forest-700);
  font-size: 0.95rem;
}

.module-content {
  color: var(--ink-800);
  line-height: 1.7;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .message-content {
    max-width: 90%;
  }
}
</style>