<script setup>
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useChatViewState } from "@/composables/useChatViewState";
import { useChatSessions } from "@/composables/useChatSessions";
import { useChatStream } from "@/composables/useChatStream";
import ChatMessagesPanel from "@/components/client/qa/ChatMessagesPanel.vue";
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

const messagesPanel = ref(null);

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
  chatContainerRef: () => messagesPanel.value?.rootRef ?? null,
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
        <ChatMessagesPanel
          ref="messagesPanel"
          :messages="messages"
          :suggestions="suggestions"
          :show-suggestions="showSuggestions"
          :is-thinking="isThinking"
          :icon-map="iconMap"
          @suggestion-click="handleSuggestionClick"
        />

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

@media (max-width: 768px) {
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-overlay {
    display: block;
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