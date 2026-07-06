import { computed } from "vue";

const ICON_MAP = Object.freeze({
  info: "info",
  recycling: "recycling",
  tips: "lightbulb",
  location: "location_on",
  time: "schedule",
  eco: "eco",
  help: "help",
});

/**
 * Pure derivations over the chat-history refs owned by useChatSessions.
 * Never mutates the input refs and never holds source data of its own.
 */
export function useChatViewState({ chatHistory, currentChatId }) {
  const messages = computed(() => {
    const chat = chatHistory.value.find((c) => c.id === currentChatId.value);
    return chat ? chat.messages : [];
  });

  const showSuggestions = computed(() => messages.value.length === 1);

  return {
    iconMap: ICON_MAP,
    messages,
    showSuggestions,
  };
}
