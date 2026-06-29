import { nextTick, ref } from "vue";
import { streamChat } from "@/mock/Aiapi";
import { createId } from "@/utils/chatId";

const SUGGESTIONS = Object.freeze([
  "如何预约上门回收？",
  "AI 识别垃圾分类怎么用？",
  "积分如何兑换？",
]);

function parseModules(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const data = JSON.parse(jsonMatch[0]);
    if (data.modules && Array.isArray(data.modules)) return data.modules;
    return null;
  } catch {
    return null;
  }
}

/**
 * Owns user input, thinking indicator, send / SSE orchestration, module parsing.
 * Takes chatHistory + currentChatId refs (from useChatSessions) plus a couple of
 * methods the page binds. scrollToBottom is exposed so the page can call it
 * after chat-history operations (new / switch / remove) that originate from
 * page-level handlers.
 */
export function useChatStream({
  chatHistory,
  currentChatId,
  getChatById,
  ensureCurrentChat,
  persistChatHistory,
  chatContainerRef,
}) {
  const userInput = ref("");
  const isThinking = ref(false);

  function scrollToBottom() {
    const el = typeof chatContainerRef === "function"
      ? chatContainerRef()
      : chatContainerRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  }

  function handleSuggestionClick(suggestion) {
    userInput.value = suggestion;
    handleSend();
  }

  async function handleSend() {
    const trimmedInput = userInput.value.trim();
    if (!trimmedInput || isThinking.value) return;

    ensureCurrentChat();
    const currentChat = getChatById(currentChatId.value);
    if (!currentChat) return;

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

    const userMessageCount = currentChat.messages.filter((m) => m.type === "user").length;
    if (userMessageCount === 1 && currentChat.titleLocked !== true) {
      currentChat.title =
        trimmedInput.slice(0, 20) + (trimmedInput.length > 20 ? "..." : "");
    }

    userInput.value = "";
    isThinking.value = true;
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
        if (modules) aiMessage.parsedModules = modules;
        nextTick(() => scrollToBottom());
      },
      (fullContent) => {
        isThinking.value = false;
        const modules = parseModules(fullContent);
        if (modules) aiMessage.parsedModules = modules;
        persistChatHistory();
        nextTick(() => scrollToBottom());
      },
      (errorMsg) => {
        aiMessage.content = `抱歉，发生了错误：${errorMsg}。请稍后重试。`;
        aiMessage.parsedModules = null;
        isThinking.value = false;
        persistChatHistory();
        nextTick(() => scrollToBottom());
      }
    );
  }

  return {
    userInput,
    isThinking,
    suggestions: SUGGESTIONS,
    handleSend,
    handleSuggestionClick,
    scrollToBottom,
  };
}