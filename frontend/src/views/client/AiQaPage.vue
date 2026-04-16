<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { streamChat } from "@/mock/Aiapi";

const router = useRouter();

const STORAGE_KEY = "szt_ai_chat_history";
const DEFAULT_CHAT_TITLE = "当前对话";
const WELCOME_MESSAGE =
  "你好！我是您的环保智能助手，有什么关于废品回收、垃圾分类或收智通服务的问题想问我吗？";

function createId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function createWelcomeMessage() {
  return {
    id: createId(),
    type: "ai",
    content: WELCOME_MESSAGE,
    timestamp: "刚刚",
    parsedModules: null,
  };
}

function createDefaultChat(title = DEFAULT_CHAT_TITLE) {
  return {
    id: createId(),
    title,
    titleLocked: false,
    messages: [createWelcomeMessage()],
    createdAt: new Date().toISOString(),
  };
}

function loadStoredChatHistory() {
  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error("解析聊天历史失败:", error);
    return null;
  }
}

function normalizeMessage(message, index) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const type = message.type === "user" ? "user" : "ai";
  return {
    id: message.id ?? createId() + index,
    type,
    content: typeof message.content === "string" ? message.content : "",
    timestamp:
      typeof message.timestamp === "string" && message.timestamp.trim()
        ? message.timestamp
        : "刚刚",
    parsedModules: type === "ai" ? message.parsedModules ?? null : null,
  };
}

function normalizeChatHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  return rawHistory
    .map((chat, index) => {
      if (!chat || typeof chat !== "object") {
        return null;
      }

      const normalizedMessages = Array.isArray(chat.messages)
        ? chat.messages
            .map((message, messageIndex) => normalizeMessage(message, messageIndex))
            .filter(Boolean)
        : [];

      return {
        id: chat.id ?? createId() + index,
        title:
          typeof chat.title === "string" && chat.title.trim()
            ? chat.title.trim()
            : `${DEFAULT_CHAT_TITLE} ${index + 1}`,
        titleLocked: chat.titleLocked === true,
        messages: normalizedMessages.length ? normalizedMessages : [createWelcomeMessage()],
        createdAt:
          typeof chat.createdAt === "string" && chat.createdAt.trim()
            ? chat.createdAt
            : new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

const initialHistory = normalizeChatHistory(loadStoredChatHistory());
if (!initialHistory.length) {
  initialHistory.push(createDefaultChat());
}

const chatHistory = ref(initialHistory);
const currentChatId = ref(initialHistory[0]?.id ?? null);
const userInput = ref("");
const chatContainer = ref(null);
const fileInput = ref(null);
const renameInputRef = ref(null);
const historyListRef = ref(null);
const isThinking = ref(false);
const isStreaming = ref(false);
const sidebarOpen = ref(false);
const openMenuChatId = ref(null);
const renamingChatId = ref(null);
const renameDraft = ref("");
const deleteConfirmChatId = ref(null);

function persistChatHistory() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.value));
}

function getChatById(chatId) {
  return chatHistory.value.find((chat) => chat.id === chatId) ?? null;
}

function closeHistoryLayers() {
  openMenuChatId.value = null;
  deleteConfirmChatId.value = null;
}

function cancelRename() {
  renamingChatId.value = null;
  renameDraft.value = "";
}

function closeHistoryInteractions() {
  closeHistoryLayers();
  cancelRename();
}

function ensureCurrentChat() {
  if (chatHistory.value.length && getChatById(currentChatId.value)) {
    return;
  }

  if (!chatHistory.value.length) {
    chatHistory.value.unshift(createDefaultChat());
  }

  currentChatId.value = chatHistory.value[0]?.id ?? null;
}

ensureCurrentChat();
persistChatHistory();

const suggestions = ["如何预约上门回收？", "AI 识别垃圾分类怎么用？", "积分如何兑换？"];

const iconMap = {
  info: "info",
  recycling: "recycling",
  tips: "lightbulb",
  location: "location_on",
  time: "schedule",
  eco: "eco",
  help: "help",
};

function parseModules(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  try {
    const data = JSON.parse(jsonMatch[0]);
    if (data.modules && Array.isArray(data.modules)) {
      return data.modules;
    }
    return null;
  } catch {
    return null;
  }
}

const messages = computed(() => {
  const chat = getChatById(currentChatId.value);
  return chat ? chat.messages : [];
});

const showSuggestions = computed(() => messages.value.length === 1);

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
}

function handleNewChat() {
  const newChat = createDefaultChat(`对话 ${chatHistory.value.length + 1}`);
  chatHistory.value.unshift(newChat);
  currentChatId.value = newChat.id;
  sidebarOpen.value = false;
  closeHistoryInteractions();
  persistChatHistory();
  nextTick(() => scrollToBottom());
}

function switchChat(chatId) {
  currentChatId.value = chatId;
  sidebarOpen.value = false;
  closeHistoryInteractions();
  nextTick(() => scrollToBottom());
}

function toggleChatMenu(chatId) {
  cancelRename();
  deleteConfirmChatId.value = null;
  openMenuChatId.value = openMenuChatId.value === chatId ? null : chatId;
}

async function beginRename(chat) {
  openMenuChatId.value = null;
  deleteConfirmChatId.value = null;
  renamingChatId.value = chat.id;
  renameDraft.value = chat.title;
  await nextTick();
  renameInputRef.value?.focus();
  renameInputRef.value?.select();
}

function commitRename(chatId) {
  if (renamingChatId.value !== chatId) {
    return;
  }

  const chat = getChatById(chatId);
  const nextTitle = renameDraft.value.trim();

  if (chat && nextTitle && nextTitle !== chat.title) {
    chat.title = nextTitle;
    chat.titleLocked = true;
    persistChatHistory();
  }

  cancelRename();
}

function confirmDelete(chatId) {
  cancelRename();
  openMenuChatId.value = null;
  deleteConfirmChatId.value = chatId;
}

function removeChat(chatId) {
  const index = chatHistory.value.findIndex((chat) => chat.id === chatId);
  if (index === -1) {
    return;
  }

  const removingCurrentChat = currentChatId.value === chatId;
  chatHistory.value.splice(index, 1);

  if (!chatHistory.value.length) {
    const fallbackChat = createDefaultChat();
    chatHistory.value.unshift(fallbackChat);
    currentChatId.value = fallbackChat.id;
  } else if (removingCurrentChat) {
    const nextChat =
      chatHistory.value[index] ?? chatHistory.value[index - 1] ?? chatHistory.value[0];
    currentChatId.value = nextChat.id;
  }

  closeHistoryInteractions();
  persistChatHistory();
  nextTick(() => scrollToBottom());
}

function handleSuggestionClick(suggestion) {
  userInput.value = suggestion;
  handleSend();
}

async function handleSend() {
  const trimmedInput = userInput.value.trim();
  if (!trimmedInput || isThinking.value) {
    return;
  }

  ensureCurrentChat();
  const currentChat = getChatById(currentChatId.value);
  if (!currentChat) {
    return;
  }

  const userMessage = {
    id: createId(),
    type: "user",
    content: trimmedInput,
    timestamp: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  currentChat.messages.push(userMessage);

  const userMessageCount = currentChat.messages.filter((message) => message.type === "user").length;
  if (userMessageCount === 1 && currentChat.titleLocked !== true) {
    currentChat.title = trimmedInput.slice(0, 20) + (trimmedInput.length > 20 ? "..." : "");
  }

  userInput.value = "";
  isThinking.value = true;
  isStreaming.value = true;
  persistChatHistory();

  await nextTick();
  scrollToBottom();

  const aiMessage = {
    id: createId(),
    type: "ai",
    content: "",
    timestamp: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    parsedModules: null,
  };
  currentChat.messages.push(aiMessage);

  streamChat(
    userMessage.content,
    currentChat.messages,
    (chunk) => {
      aiMessage.content += chunk;
      const modules = parseModules(aiMessage.content);
      if (modules) {
        aiMessage.parsedModules = modules;
      }
      nextTick(() => scrollToBottom());
    },
    (fullContent) => {
      isThinking.value = false;
      isStreaming.value = false;
      const modules = parseModules(fullContent);
      if (modules) {
        aiMessage.parsedModules = modules;
      }
      persistChatHistory();
      nextTick(() => scrollToBottom());
    },
    (errorMsg) => {
      aiMessage.content = `抱歉，发生了错误：${errorMsg}。请稍后重试。`;
      aiMessage.parsedModules = null;
      isThinking.value = false;
      isStreaming.value = false;
      persistChatHistory();
      nextTick(() => scrollToBottom());
    }
  );
}

function handleInputKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
}

function handleAttachment() {
  fileInput.value?.click();
}

function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  console.log("选择的文件:", file.name);
  alert(`已选择文件: ${file.name}\n（文件上传功能待实现）`);
}

function navigateTo(path) {
  closeHistoryInteractions();
  router.push(path);
}

function toggleSidebar() {
  const nextOpenState = !sidebarOpen.value;
  sidebarOpen.value = nextOpenState;
  if (!nextOpenState) {
    closeHistoryInteractions();
  }
}

function handleDocumentClick(event) {
  if (!historyListRef.value?.contains(event.target)) {
    closeHistoryLayers();
  }
}

function handleDocumentKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  if (renamingChatId.value !== null) {
    cancelRename();
    return;
  }

  closeHistoryLayers();
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
  nextTick(() => scrollToBottom());
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleDocumentKeydown);
});
</script>

<template>
  <div class="ai-qa-chat-wrapper">
    <div class="ai-qa-chat">
      <button class="mobile-menu-btn" @click="toggleSidebar" aria-label="切换侧边栏">
        <span class="material-symbols-outlined">menu</span>
      </button>

      <div v-if="sidebarOpen" class="sidebar-overlay" @click="toggleSidebar"></div>

      <aside class="chat-sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <div class="eco-badge">
            <span class="material-symbols-outlined">eco</span>
          </div>
          <div class="sidebar-title">
            <h2>收智通</h2>
            <p>收智通专门的 AI 助手</p>
          </div>
        </div>

        <button class="new-chat-btn" @click="handleNewChat">
          <span class="material-symbols-outlined">add</span>
          新对话
        </button>

        <nav class="sidebar-nav">
          <p class="nav-section-title">最近历史</p>

          <div ref="historyListRef" class="history-list">
            <div
              v-for="chat in chatHistory"
              :key="chat.id"
              :class="[
                'history-item',
                {
                  active: chat.id === currentChatId,
                  renaming: renamingChatId === chat.id,
                  'menu-open': openMenuChatId === chat.id,
                  'confirm-open': deleteConfirmChatId === chat.id,
                  'layer-open':
                    openMenuChatId === chat.id || deleteConfirmChatId === chat.id,
                },
              ]"
            >
              <button
                v-if="renamingChatId !== chat.id"
                type="button"
                class="history-main"
                @click="switchChat(chat.id)"
              >
                <span class="history-title">{{ chat.title }}</span>
              </button>

              <div v-else class="history-main history-main-renaming">
                <input
                  ref="renameInputRef"
                  v-model="renameDraft"
                  type="text"
                  class="history-rename-input"
                  maxlength="40"
                  @click.stop
                  @keydown.enter.prevent="commitRename(chat.id)"
                  @keydown.esc.prevent="cancelRename"
                  @blur="commitRename(chat.id)"
                />
              </div>

              <div class="history-actions">
                <button
                  type="button"
                  class="history-more-btn"
                  :aria-expanded="openMenuChatId === chat.id"
                  aria-label="更多操作"
                  @click.stop="toggleChatMenu(chat.id)"
                >
                  <span class="material-symbols-outlined">more_horiz</span>
                </button>

                <div
                  v-if="openMenuChatId === chat.id"
                  class="history-popover history-menu"
                  @click.stop
                >
                  <button type="button" class="history-menu-btn" @click="beginRename(chat)">
                    重命名
                  </button>
                  <button
                    type="button"
                    class="history-menu-btn history-menu-btn-danger"
                    @click="confirmDelete(chat.id)"
                  >
                    删除
                  </button>
                </div>

                <div
                  v-if="deleteConfirmChatId === chat.id"
                  class="history-popover history-delete-confirm"
                  @click.stop
                >
                  <p>删除这条会话？</p>
                  <div class="history-confirm-actions">
                    <button type="button" class="history-confirm-btn" @click="closeHistoryLayers">
                      取消
                    </button>
                    <button
                      type="button"
                      class="history-confirm-btn history-confirm-btn-danger"
                      @click="removeChat(chat.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </nav>

        <a href="#" class="nav-link nav-link-static" @click.prevent="navigateTo('/faq')">
          <span class="material-symbols-outlined">help</span>
          帮助中心
        </a>
      </aside>

      <section class="chat-main">
        <div ref="chatContainer" class="chat-messages">
          <div
            v-for="message in messages"
            :key="message.id"
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

        <div class="chat-input-wrapper">
          <div class="chat-input-container">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleFileChange"
            />

            <button class="input-action-btn" aria-label="附件" @click="handleAttachment">
              <span class="material-symbols-outlined">attachment</span>
            </button>

            <input
              v-model="userInput"
              type="text"
              class="chat-input"
              placeholder="输入您想咨询的问题..."
              @keydown="handleInputKeydown"
            />

            <button class="send-btn" aria-label="发送" @click="handleSend">
              <span class="material-symbols-outlined">send</span>
            </button>
          </div>

          <p class="input-disclaimer">
            AI 结果可能有所不同。关键分类请咨询当地指南。
          </p>
        </div>
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

.chat-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 20px;
  background: rgba(244, 243, 242, 0.95);
  border-right: 1px solid rgba(46, 93, 80, 0.08);
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.eco-badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--forest-700), #5e9a71);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f7fff9;
}

.eco-badge .material-symbols-outlined {
  font-size: 24px;
  font-variation-settings: "FILL" 1;
}

.sidebar-title h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--forest-700);
  font-family: var(--font-display);
}

.sidebar-title p {
  margin: 2px 0 0;
  font-size: 0.7rem;
  color: var(--ink-600);
  opacity: 0.7;
}

.new-chat-btn {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(140deg, #214f37, #4b855e 58%, #5d9a74);
  color: #f7fff9;
  font-weight: 600;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-bottom: 24px;
}

.new-chat-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(31, 89, 57, 0.3);
}

.new-chat-btn .material-symbols-outlined {
  font-size: 18px;
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.nav-section-title {
  margin: 0;
  padding: 0 12px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--forest-600);
  font-family: var(--font-data);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.history-item {
  position: relative;
  z-index: 0;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 0;
  min-height: 52px;
  padding: 3px 6px 3px 14px;
  border-radius: 16px;
  background: rgba(227, 226, 225, 0.92);
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.history-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: #1f1f1f;
  font-size: 0.89rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: color 0.2s ease;
}

.history-item:hover,
.history-item.renaming {
  background: rgba(233, 232, 231, 0.98);
  box-shadow: 0 7px 16px rgba(64, 72, 68, 0.055);
  transform: translateY(-0.5px);
}

.history-item.active {
  background: rgba(232, 231, 230, 0.98);
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 80, 0.12),
    0 7px 18px rgba(64, 72, 68, 0.065);
}

.history-item.layer-open {
  z-index: 12;
}

.history-item.menu-open,
.history-item.confirm-open {
  background: rgba(236, 235, 233, 0.98);
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 80, 0.08),
    0 8px 18px rgba(64, 72, 68, 0.075);
}

.history-item.active .history-main {
  color: #1a2d23;
  font-weight: 600;
}

.history-actions .material-symbols-outlined {
  font-size: 18px;
}

.history-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.history-main-renaming {
  cursor: default;
}

.history-rename-input {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font-size: inherit;
  font-weight: inherit;
  outline: none;
  font-family: var(--font-body);
}

.history-actions {
  position: relative;
  width: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-more-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: rgba(28, 37, 33, 0.72);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.history-item:hover .history-more-btn,
.history-item.active .history-more-btn,
.history-item.layer-open .history-more-btn,
.history-more-btn[aria-expanded="true"] {
  background: rgba(255, 255, 255, 0.48);
  color: #22352b;
}

.history-more-btn:hover {
  transform: scale(1.03);
}

.history-popover {
  position: absolute;
  top: calc(100% + 3px);
  right: -2px;
  z-index: 24;
  min-width: 136px;
  padding: 6px;
  border-radius: 16px;
  background: rgba(249, 248, 247, 0.98);
  border: 1px solid rgba(74, 86, 77, 0.08);
  box-shadow: 0 14px 28px rgba(46, 52, 48, 0.11);
  backdrop-filter: blur(14px);
}

.history-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-menu-btn,
.history-confirm-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--ink-800);
  font-size: 0.8rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.history-menu-btn {
  padding: 10px 12px;
}

.history-menu-btn:hover,
.history-confirm-btn:hover {
  background: rgba(233, 232, 231, 0.92);
}

.history-menu-btn-danger,
.history-confirm-btn-danger {
  color: #b33444;
}

.history-menu-btn-danger:hover,
.history-confirm-btn-danger:hover {
  background: rgba(179, 52, 68, 0.1);
}

.history-delete-confirm {
  min-width: 176px;
}

.history-delete-confirm p {
  margin: 4px 4px 10px;
  color: var(--ink-800);
  font-size: 0.78rem;
  line-height: 1.5;
}

.history-confirm-actions {
  display: flex;
  gap: 8px;
}

.history-confirm-btn {
  padding: 9px 12px;
  text-align: center;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--ink-700);
  font-size: 0.88rem;
  font-weight: 500;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-link:hover {
  background: rgba(227, 226, 225, 0.6);
}

.nav-link-static {
  margin-top: 12px;
  flex-shrink: 0;
}

.nav-link .material-symbols-outlined {
  font-size: 20px;
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

.send-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 24px rgba(31, 89, 57, 0.35);
}

.send-btn:active {
  transform: scale(0.95);
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
  .chat-sidebar {
    width: 240px;
  }

  .chat-messages {
    padding: 24px 32px 160px;
  }

  .chat-input-wrapper {
    padding: 20px 32px 32px;
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

  .chat-sidebar {
    position: fixed;
    left: -280px;
    top: 72px;
    bottom: 0;
    z-index: 100;
    transition: left 0.3s ease;
    box-shadow: 4px 0 12px rgba(23, 52, 36, 0.15);
  }

  .chat-sidebar.open {
    left: 0;
  }

  .chat-messages {
    padding: 20px 16px 160px;
  }

  .chat-input-wrapper {
    padding: 16px 16px 24px;
  }

  .message-content {
    max-width: 90%;
  }

  .suggestions {
    margin-left: 0;
  }

  .history-popover {
    right: -6px;
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
