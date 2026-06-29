<script setup>
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useChatViewState } from "@/composables/useChatViewState";
import { useChatSessions } from "@/composables/useChatSessions";
import { useChatStream } from "@/composables/useChatStream";
import ChatMessage from "@/components/client/qa/ChatMessage.vue";
import ChatInputPanel from "@/components/client/qa/ChatInputPanel.vue";
import ChatSidebarPanel from "@/components/client/qa/ChatSidebarPanel.vue";

const router = useRouter();

const sessions = useChatSessions();
const {
  chatHistory,
  currentChatId,
  sidebarOpen,
  openMenuChatId,
  renamingChatId,
  renameDraft,
  deleteConfirmChatId,
  closeHistoryInteractions,
} = sessions;

const chatContainer = ref(null);

const { messages, showSuggestions, iconMap } = useChatViewState({
  chatHistory: sessions.chatHistory,
  currentChatId: sessions.currentChatId,
});

const {
  userInput,
  isThinking,
  suggestions,
  handleSend,
  handleSuggestionClick,
  scrollToBottom,
} = useChatStream({
  chatHistory: sessions.chatHistory,
  currentChatId: sessions.currentChatId,
  getChatById: sessions.getChatById,
  ensureCurrentChat: sessions.ensureCurrentChat,
  persistChatHistory: sessions.persistChatHistory,
  chatContainerRef: chatContainer,
});

function toggleSidebar() {
  const nextOpenState = !sidebarOpen.value;
  sidebarOpen.value = nextOpenState;
  if (!nextOpenState) {
    closeHistoryInteractions();
  }
}

onMounted(() => {
  nextTick(() => scrollToBottom());
});
</script>

<template>
  <div class="ai-qa-chat-wrapper">
    <div class="ai-qa-chat">
      <button class="mobile-menu-btn" @click="toggleSidebar" aria-label="切换侧边栏">
        <span class="material-symbols-outlined">menu</span>
      </button>

      <div v-if="sidebarOpen" class="sidebar-overlay" @click="toggleSidebar"></div>

      <ChatSidebarPanel
        :chat-history="chatHistory"
        :current-chat-id="currentChatId"
        :open-menu-chat-id="openMenuChatId"
        :renaming-chat-id="renamingChatId"
        :rename-draft="renameDraft"
        :delete-confirm-chat-id="deleteConfirmChatId"
        :sidebar-open="sidebarOpen"
        @switch="sessions.switchChat"
        @new-chat="sessions.handleNewChat"
        @menu-toggle="sessions.toggleChatMenu"
        @begin-rename="sessions.beginRename"
        @commit-rename="sessions.commitRename"
        @cancel-rename="sessions.cancelRename"
        @confirm-delete="sessions.confirmDelete"
        @remove-chat="sessions.removeChat"
        @update-rename-draft="(value) => (renameDraft = value)"
        @nav-to="(path) => { sessions.closeHistoryInteractions(); router.push(path); }"
        @close-layers="sessions.closeHistoryLayers"
      />

      <section class="chat-main">
        <div ref="chatContainer" class="chat-messages">
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
              @click="handleSuggestionClick(suggestion)"
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

        <ChatInputPanel
          :user-input="userInput"
          :is-thinking="isThinking"
          @update:userInput="(value) => (userInput = value)"
          @send="handleSend"
          @attachment="() => {}"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.ai-qa-chat-wrapper {
  margin: -32px calc(-50vw + 50%) 0;
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
}

.ai-qa-chat {
  display: flex;
  height: calc(100vh - 72px);
  overflow: hidden;
  position: relative;
}

.mobile-menu-btn {
  display: none;
  position: fixed;
  top: 84px;
  left: 16px;
  z-index: 101;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(140deg, #214f37, #4b855e 58%, #5d9a74);
  color: #f7fff9;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(31, 89, 57, 0.3);
  transition: transform 0.2s ease;
}

.mobile-menu-btn:hover {
  transform: scale(1.05);
}

.mobile-menu-btn .material-symbols-outlined {
  font-size: 24px;
}

.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(16, 32, 24, 0.5);
  backdrop-filter: blur(4px);
  z-index: 99;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

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
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-overlay {
    display: block;
  }

  .chat-messages {
    padding: 20px 16px 160px;
  }

  .suggestions {
    margin-left: 0;
  }
}

.material-symbols-outlined {
  font-family: "Material Symbols Outlined";
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
}
</style>