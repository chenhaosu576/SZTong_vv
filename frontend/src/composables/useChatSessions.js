import { ref } from "vue";
import { createId } from "@/utils/chatId";

const STORAGE_KEY = "szt_ai_chat_history";
const DEFAULT_CHAT_TITLE = "当前对话";
const WELCOME_MESSAGE =
  "你好！我是您的环保智能助手，有什么关于废品回收、垃圾分类或收智通服务的问题想问我吗？";

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
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error("解析聊天历史失败:", error);
    return null;
  }
}

function normalizeMessage(message, index) {
  if (!message || typeof message !== "object") return null;
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
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .map((chat, index) => {
      if (!chat || typeof chat !== "object") return null;
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

export function useChatSessions() {
  const initialHistory = normalizeChatHistory(loadStoredChatHistory());
  if (!initialHistory.length) initialHistory.push(createDefaultChat());

  const chatHistory = ref(initialHistory);
  const currentChatId = ref(initialHistory[0]?.id ?? null);
  const sidebarOpen = ref(false);
  const openMenuChatId = ref(null);
  const renamingChatId = ref(null);
  const renameDraft = ref("");
  const deleteConfirmChatId = ref(null);

  function persistChatHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.value));
    } catch (error) {
      console.error("保存聊天历史失败:", error);
    }
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

  function closeAllLayers() {
    closeHistoryLayers();
    cancelRename();
  }

  function ensureCurrentChat() {
    if (chatHistory.value.length && getChatById(currentChatId.value)) return;
    if (!chatHistory.value.length) chatHistory.value.unshift(createDefaultChat());
    currentChatId.value = chatHistory.value[0]?.id ?? null;
  }

  function handleNewChat() {
    const newChat = createDefaultChat(`对话 ${chatHistory.value.length + 1}`);
    chatHistory.value.unshift(newChat);
    currentChatId.value = newChat.id;
    sidebarOpen.value = false;
    closeAllLayers();
    persistChatHistory();
  }

  function switchChat(chatId) {
    currentChatId.value = chatId;
    sidebarOpen.value = false;
    closeAllLayers();
  }

  function toggleChatMenu(chatId) {
    cancelRename();
    deleteConfirmChatId.value = null;
    openMenuChatId.value = openMenuChatId.value === chatId ? null : chatId;
  }

  function beginRename(chat) {
    openMenuChatId.value = null;
    deleteConfirmChatId.value = null;
    renamingChatId.value = chat.id;
    renameDraft.value = chat.title;
  }

  function commitRename(chatId) {
    if (renamingChatId.value !== chatId) return;
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
    if (index === -1) return;
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
    closeAllLayers();
    persistChatHistory();
  }

  ensureCurrentChat();
  persistChatHistory();

  return {
    chatHistory,
    currentChatId,
    sidebarOpen,
    openMenuChatId,
    renamingChatId,
    renameDraft,
    deleteConfirmChatId,
    persistChatHistory,
    getChatById,
    closeHistoryLayers,
    cancelRename,
    closeAllLayers,
    ensureCurrentChat,
    handleNewChat,
    switchChat,
    toggleChatMenu,
    beginRename,
    commitRename,
    confirmDelete,
    removeChat,
  };
}
