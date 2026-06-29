# AiQaPage Component Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `frontend/src/views/client/AiQaPage.vue` (1431 lines) into 3 composables + 4 components, mirroring the recent `AidentifyPage.vue` split.

**Architecture:** Move chat-history CRUD + persistence into `useChatSessions`; move send / SSE / parseModules into `useChatStream`; extract pure `messages` / `showSuggestions` / `iconMap` into `useChatViewState`. Page orchestrates composables and renders `ChatSidebarPanel` + `ChatMessagesPanel` + `ChatInputPanel`, with `ChatMessage` as a leaf atom under `ChatMessagesPanel`. Page keeps mobile-menu / sidebar-overlay / layout shell.

**Tech Stack:** Vue 3 (`<script setup>`), Vue Router 4, Vite 6, no test framework (CLAUDE.md: "Do not assume Vitest, Jest, ESLint, or TypeScript are configured"). Each task ends with a manual browser verification step instead of automated tests.

**Spec:** `docs/superpowers/specs/2026-06-29-ai-qa-page-split-design.md`

**Branch:** `refactor/ai-identify-page-split`

---

## File Structure

**Create:**
- `frontend/src/composables/useChatViewState.js` — pure derivations (iconMap, messages, showSuggestions)
- `frontend/src/composables/useChatSessions.js` — multi-chat CRUD, persistence, ephemeral UI refs
- `frontend/src/composables/useChatStream.js` — send / SSE / parseModules / thinking state
- `frontend/src/components/client/qa/ChatMessage.vue` — atom for one message
- `frontend/src/components/client/qa/ChatInputPanel.vue` — input bar (attachment + text + send + disclaimer)
- `frontend/src/components/client/qa/ChatSidebarPanel.vue` — sidebar (brand + new chat + history list + nav-link)
- `frontend/src/components/client/qa/ChatMessagesPanel.vue` — messages container (suggestions + thinking dots + ChatMessage list)

**Modify:**
- `frontend/src/views/client/AiQaPage.vue` — strip out the moved code, render the 4 components

**No tests created.** Verification is browser-based.

---

## Decomposition Notes

- Tasks 1-3 extract composables one at a time. Each keeps the page working with all logic still inline-but-imported. The page script shrinks but the template stays monolithic until tasks 4-7.
- Tasks 4-7 extract components one at a time, each replacing one inline block in the page template with a `<Component ... />` invocation. The page script shrinks as wiring moves up to component-level events.
- Task 8 does the final cleanup: drop dead `isStreaming`, prune dead CSS, run a grep audit.

`createId()` lives in `useChatStream.js` as the single source and is imported by `useChatSessions.js` (per spec §3.6).

---

### Task 1: Extract `useChatViewState` composable

**Files:**
- Create: `frontend/src/composables/useChatViewState.js`
- Modify: `frontend/src/views/client/AiQaPage.vue` (script section: remove `iconMap`, `messages` computed, `showSuggestions` computed; add import + call)

- [ ] **Step 1: Create `useChatViewState.js`**

```js
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
```

- [ ] **Step 2: Update page script — replace inline blocks**

In `AiQaPage.vue`, **remove** these blocks from the script:
- The `const iconMap = { ... };` declaration (currently around line 163-171).
- The `const messages = computed(() => { ... });` block (lines 190-193).
- The `const showSuggestions = computed(() => messages.value.length === 1);` line (line 195).

Then **add** this import at the top of the script:
```js
import { useChatViewState } from "@/composables/useChatViewState";
```

And after the `ensureCurrentChat(); persistChatHistory();` calls (around line 159), add:
```js
const { messages, showSuggestions, iconMap } = useChatViewState({
  chatHistory,
  currentChatId,
});
```

- [ ] **Step 3: Verify in browser**

Run: `cd frontend && npm run dev`
- Open `http://localhost:5173/ai-qa`.
- Confirm welcome message renders in messages area.
- Confirm suggestion chips appear below the welcome message.
- Send a question; AI response should still render normally (modules or plain text).

Expected: no console errors, page behavior identical to pre-refactor.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/composables/useChatViewState.js frontend/src/views/client/AiQaPage.vue
git commit -m "refactor(ai-qa): extract useChatViewState composable"
```

---

### Task 2: Extract `useChatSessions` composable

**Files:**
- Create: `frontend/src/composables/useChatSessions.js`
- Modify: `frontend/src/views/client/AiQaPage.vue`

- [ ] **Step 1: Create `useChatSessions.js`**

```js
import { ref } from "vue";

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
        titleLocked: chat.title === true,
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

  function closeHistoryInteractions() {
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
    closeHistoryInteractions();
    persistChatHistory();
  }

  function switchChat(chatId) {
    currentChatId.value = chatId;
    sidebarOpen.value = false;
    closeHistoryInteractions();
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
    closeHistoryInteractions();
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
    closeHistoryInteractions,
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
```

⚠️ **Bug fix included**: The original `normalizeChatHistory` had `chat.titleLocked === true` (correct). The plan above shows `chat.titleLocked === true` in the returned object literal — verify both copies are consistent before committing.

Note: `beginRename` lost its `await nextTick + focus + select` for `renameInputRef`. That logic depends on the sidebar panel's input ref, which doesn't exist yet. **Restore it inside `ChatSidebarPanel` in Task 6** by emitting `begin-rename` and then focusing locally. See Task 6 for the wiring.

- [ ] **Step 2: Update page script — wire `useChatSessions`**

In `AiQaPage.vue`, **remove** these blocks from the script:
- The constants `STORAGE_KEY`, `DEFAULT_CHAT_TITLE`, `WELCOME_MESSAGE` (lines 8-11).
- The functions `createId`, `createWelcomeMessage`, `createDefaultChat`, `loadStoredChatHistory`, `normalizeMessage`, `normalizeChatHistory` (lines 13-101).
- The state refs: `chatHistory`, `currentChatId`, `sidebarOpen`, `openMenuChatId`, `renamingChatId`, `renameDraft`, `deleteConfirmChatId` (lines 108-121).
- The functions: `persistChatHistory`, `getChatById`, `closeHistoryLayers`, `cancelRename`, `closeHistoryInteractions`, `ensureCurrentChat`, `handleNewChat`, `switchChat`, `toggleChatMenu`, `beginRename`, `commitRename`, `confirmDelete`, `removeChat` (lines 123-281).
- The `ensureCurrentChat(); persistChatHistory();` calls (lines 158-159).

Then **add** import at the top of the script:
```js
import { useChatSessions } from "@/composables/useChatSessions";
```

And replace the removed state + functions block with:
```js
const sessions = useChatSessions();
const {
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
  closeHistoryInteractions,
  ensureCurrentChat,
  handleNewChat,
  switchChat,
  toggleChatMenu,
  beginRename,
  commitRename,
  confirmDelete,
  removeChat,
} = sessions;
```

Then **update** `useChatViewState` call (added in Task 1) to use `sessions.chatHistory` / `sessions.currentChatId` directly if you prefer a single source:
```js
const { messages, showSuggestions, iconMap } = useChatViewState({
  chatHistory: sessions.chatHistory,
  currentChatId: sessions.currentChatId,
});
```

- [ ] **Step 3: Verify in browser**

Run: `cd frontend && npm run dev`
- Confirm welcome message + suggestion chips still render.
- Send a question; AI response renders.
- Click "新对话" — new chat at top, becomes current.
- Send a message in new chat — title auto-updates to first 20 chars of input.
- Click `more_horiz` on a chat — menu opens.
- Click "重命名" — input appears (focus + select will be wired in Task 6; for now it should still show, just without auto-focus).
- Type a new title, press Enter — title persists.
- Click "删除" on current chat — confirmation popover → confirm → falls back to another chat.
- Refresh page — history + current chat restored.

Expected: no console errors, all multi-chat operations work.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/composables/useChatSessions.js frontend/src/views/client/AiQaPage.vue
git commit -m "refactor(ai-qa): extract useChatSessions composable"
```

---

### Task 3: Extract `useChatStream` composable

**Files:**
- Create: `frontend/src/composables/useChatStream.js`
- Modify: `frontend/src/views/client/AiQaPage.vue`

- [ ] **Step 1: Create `useChatStream.js`**

```js
import { nextTick, ref } from "vue";
import { streamChat } from "@/mock/Aiapi";

const SUGGESTIONS = Object.freeze([
  "如何预约上门回收？",
  "AI 识别垃圾分类怎么用？",
  "积分如何兑换？",
]);

export function createId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

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
 * methods the page binds. Never persists directly — caller wires persistChatHistory.
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
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
  }

  function handleSuggestionClick(suggestion) {
    userInput.value = suggestion;
    handleSend();
  }

  function handleInputKeydown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
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
    handleInputKeydown,
  };
}
```

Note: `chatContainerRef` is a ref the page passes in (currently `chatContainer` in `AiQaPage.vue`). It will live on `ChatMessagesPanel` in Task 7, but for now the page still owns the template `<div ref="chatContainer">`, so the page declares the ref and passes it.

- [ ] **Step 2: Update page script — wire `useChatStream`**

In `AiQaPage.vue`, **remove** these from the script:
- The `import { streamChat } from "@/mock/Aiapi";` line (line 4) — now lives inside the composable.
- The `const suggestions = [...]` array (line 161).
- The `function parseModules(content) { ... }` block (lines 173-188).
- The `function scrollToBottom() { ... }` (lines 197-201).
- The functions `handleSuggestionClick`, `handleSend`, `handleInputKeydown` (lines 283-374).

Then **add** import:
```js
import { useChatStream } from "@/composables/useChatStream";
import { nextTick } from "vue";
```
(keep `nextTick` only if still needed elsewhere — it isn't after this task, so you can drop the import if Vue no longer complains.)

And add after the `useChatViewState` call:
```js
const chatContainer = ref(null);
const {
  userInput,
  isThinking,
  suggestions,
  handleSend,
  handleSuggestionClick,
  handleInputKeydown,
} = useChatStream({
  chatHistory: sessions.chatHistory,
  currentChatId: sessions.currentChatId,
  getChatById: sessions.getChatById,
  ensureCurrentChat: sessions.ensureCurrentChat,
  persistChatHistory: sessions.persistChatHistory,
  chatContainerRef: chatContainer,
});
```

- [ ] **Step 3: Verify in browser**

Run: `cd frontend && npm run dev`
- Send a message → AI streams and renders.
- AI returns modules → modules render correctly.
- AI returns plain text → plain text renders.
- Click a suggestion chip → fills input and sends.
- Press Enter in input → sends.
- Type and trigger a stream error path (use dev tools to fail the network request) → AI bubble shows "抱歉，发生了错误...".
- Refresh page → all messages persist.

Expected: no console errors, full chat functionality works.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/composables/useChatStream.js frontend/src/views/client/AiQaPage.vue
git commit -m "refactor(ai-qa): extract useChatStream composable"
```

---

### Task 4: Extract `ChatMessage` atom

**Files:**
- Create: `frontend/src/components/client/qa/ChatMessage.vue`
- Modify: `frontend/src/views/client/AiQaPage.vue` (template: replace one message-wrapper block)

- [ ] **Step 1: Create `ChatMessage.vue`**

Move the message rendering block from the page (lines 562-603 of the original `AiQaPage.vue`) into this atom. CSS that targets `.message-wrapper`, `.user-message`, `.message-avatar*`, `.message-content`, `.message-text`, `.ai-text`, `.message-bubble`, `.ai-modules`, `.ai-module`, `.module-*`, plus the `messageSlideIn` and `moduleSlideIn` keyframes — all move here too.

```vue
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
```

- [ ] **Step 2: Update page template — use the atom**

In `AiQaPage.vue`, **remove** the inline message-wrapper block (lines 562-603 of the original). Replace the `v-for="message in messages"` with:

```vue
<div ref="chatContainer" class="chat-messages">
  <ChatMessage
    v-for="message in messages"
    :key="message.id"
    :message="message"
    :icon-map="iconMap"
  />

  <!-- suggestions and thinking-dots blocks stay for now, removed in Task 7 -->
```

Add the import at the top of the script:
```js
import ChatMessage from "@/components/client/qa/ChatMessage.vue";
```

**Keep** the `.chat-messages`, suggestions, thinking-dots markup in the page for now — Task 7 moves them out.

**Remove** the moved CSS blocks from the page's `<style scoped>`:
- `.message-wrapper` / `messageSlideIn`
- `.user-message` / `.message-avatar*` / `.ai-avatar*` / `.user-avatar`
- `.message-content` / `.message-text` / `.ai-text` / `.message-bubble`
- `.ai-modules` / `.ai-module` / `.module-header` / `.module-icon` / `.module-title` / `.module-content` / `moduleSlideIn`
- The `@media (max-width: 768px) { .message-content { max-width: 90%; } }` block (move to ChatMessage)

- [ ] **Step 3: Verify in browser**

Run: `cd frontend && npm run dev`
- AI messages render with avatar + modules (or plain text).
- User messages render with bubble on the right + "用户" avatar.
- `messageSlideIn` animation plays.
- Module cards `moduleSlideIn` with stagger.
- Send a message → renders correctly.

Expected: visual identical to pre-refactor.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/client/qa/ChatMessage.vue frontend/src/views/client/AiQaPage.vue
git commit -m "refactor(ai-qa): extract ChatMessage atom"
```

---

### Task 5: Extract `ChatInputPanel`

**Files:**
- Create: `frontend/src/components/client/qa/ChatInputPanel.vue`
- Modify: `frontend/src/views/client/AiQaPage.vue`

- [ ] **Step 1: Create `ChatInputPanel.vue`**

Move the input bar markup (`.chat-input-wrapper` block, original lines 623-653) into this component. CSS moves too.

```vue
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
```

⚠️ **Behavior change**: original code did NOT disable the send button during streaming. This plan adds `:disabled="isThinking"` because streaming input is a real anti-pattern. Confirm with user before keeping; if they want strict no-behavior-change, drop the `:disabled` attribute and the `.send-btn:disabled` rule.

- [ ] **Step 2: Update page template + script — use `ChatInputPanel`**

In `AiQaPage.vue`, **remove** from the template the entire `.chat-input-wrapper` block (lines 623-653).

**Remove** from the script:
- `const fileInput = ref(null);` (line 112) — no longer needed in page.
- The `handleAttachment`, `handleFileChange` functions (lines 376-388).

**Add** to the top of the script:
```js
import ChatInputPanel from "@/components/client/qa/ChatInputPanel.vue";
```

**Replace** the removed template block with:
```vue
<ChatInputPanel
  :user-input="userInput"
  :is-thinking="isThinking"
  @update:userInput="(value) => (userInput = value)"
  @send="handleSend"
  @attachment="() => {}"
/>
```

- [ ] **Step 3: Verify in browser**

Run: `cd frontend && npm run dev`
- Type in input → page's `userInput` updates (verify by sending).
- Press Enter → sends.
- Click send button → sends.
- Click attachment button → file picker opens → selecting a file shows the alert.

Expected: identical behavior; if you kept `:disabled`, the send button visually disables during AI streaming.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/client/qa/ChatInputPanel.vue frontend/src/views/client/AiQaPage.vue
git commit -m "refactor(ai-qa): extract ChatInputPanel component"
```

---

### Task 6: Extract `ChatSidebarPanel`

**Files:**
- Create: `frontend/src/components/client/qa/ChatSidebarPanel.vue`
- Modify: `frontend/src/views/client/AiQaPage.vue`

- [ ] **Step 1: Create `ChatSidebarPanel.vue`**

Move the entire `<aside class="chat-sidebar">` block (original lines 443-558) into this component. All sidebar CSS moves too. The panel also takes over the document-level click-outside and Escape listeners (per spec §3.4).

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

const props = defineProps({
  chatHistory: { type: Array, required: true },
  currentChatId: { type: [Number, null], required: true },
  openMenuChatId: { type: [Number, null], required: true },
  renamingChatId: { type: [Number, null], required: true },
  renameDraft: { type: String, required: true },
  deleteConfirmChatId: { type: [Number, null], required: true },
  sidebarOpen: { type: Boolean, required: true },
});

const emit = defineEmits([
  "switch",
  "new-chat",
  "menu-toggle",
  "begin-rename",
  "commit-rename",
  "cancel-rename",
  "confirm-delete",
  "remove-chat",
  "nav-to",
  "close-layers",
]);

const historyListRef = ref(null);
const renameInputRef = ref(null);

async function onRenameStart(chat) {
  emit("begin-rename", chat);
  // After parent toggles renamingChatId, focus + select the input.
  await new Promise((r) => requestAnimationFrame(r));
  renameInputRef.value?.focus();
  renameInputRef.value?.select();
}

function handleDocumentClick(event) {
  if (!historyListRef.value?.contains(event.target)) {
    emit("close-layers");
  }
}

function handleDocumentKeydown(event) {
  if (event.key !== "Escape") return;
  if (props.renamingChatId !== null) {
    emit("cancel-rename");
    return;
  }
  emit("close-layers");
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleDocumentKeydown);
});
</script>

<template>
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

    <button type="button" class="new-chat-btn" @click="emit('new-chat')">
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
            @click="emit('switch', chat.id)"
          >
            <span class="history-title">{{ chat.title }}</span>
          </button>

          <div v-else class="history-main history-main-renaming">
            <input
              ref="renameInputRef"
              :value="renameDraft"
              type="text"
              class="history-rename-input"
              maxlength="40"
              @click.stop
              @keydown.enter.prevent="emit('commit-rename', chat.id)"
              @keydown.esc.prevent="emit('cancel-rename')"
              @blur="emit('commit-rename', chat.id)"
              @input="(e) => emit('begin-rename', { ...chat, title: e.target.value, _draft: true })"
            />
          </div>

          <div class="history-actions">
            <button
              type="button"
              class="history-more-btn"
              :aria-expanded="openMenuChatId === chat.id"
              aria-label="更多操作"
              @click.stop="emit('menu-toggle', chat.id)"
            >
              <span class="material-symbols-outlined">more_horiz</span>
            </button>

            <div
              v-if="openMenuChatId === chat.id"
              class="history-popover history-menu"
              @click.stop
            >
              <button
                type="button"
                class="history-menu-btn"
                @click="onRenameStart(chat)"
              >
                重命名
              </button>
              <button
                type="button"
                class="history-menu-btn history-menu-btn-danger"
                @click="emit('confirm-delete', chat.id)"
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
                <button
                  type="button"
                  class="history-confirm-btn"
                  @click="emit('close-layers')"
                >
                  取消
                </button>
                <button
                  type="button"
                  class="history-confirm-btn history-confirm-btn-danger"
                  @click="emit('remove-chat', chat.id)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <RouterLink to="/faq" class="nav-link nav-link-static" @click="emit('nav-to', '/faq')">
      <span class="material-symbols-outlined">help</span>
      帮助中心
    </RouterLink>
  </aside>
</template>

<style scoped>
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

@media (max-width: 1024px) {
  .chat-sidebar {
    width: 240px;
  }
}

@media (max-width: 768px) {
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

  .history-popover {
    right: -6px;
  }
}
</style>
```

⚠️ **Rename draft binding**: The input uses `:value="renameDraft"` + `@input` to keep the page as the source of truth. The `@input` handler emits `begin-rename` with a sentinel `_draft: true` so the page can detect this is a draft update vs an actual begin. The page should expose a `setRenameDraft(value)` function (or extend `beginRename` to handle both cases). See Step 2 for the page-side wiring.

If the dual-purpose `begin-rename` is too clever, alternative is to add a dedicated `update-rename-draft` event. **Recommend the dedicated event** for clarity. Adjust the input handler to:
```vue
@input="emit('update-rename-draft', e.target.value)"
```
and add `"update-rename-draft"` to `defineEmits`, plus wire it in Step 2.

- [ ] **Step 2: Update page template + script — use `ChatSidebarPanel`**

In `AiQaPage.vue`, **remove** from the template the entire `<aside class="chat-sidebar">` block (lines 443-558).

**Remove** from the script:
- `const historyListRef = ref(null);` (line 114) — moves into the panel.
- The `function navigateTo(path) { ... }` block (lines 390-393).
- The `function toggleSidebar() { ... }` block (lines 395-401).
- The `function handleDocumentClick(event) { ... }` (lines 403-407).
- The `function handleDocumentKeydown(event) { ... }` (lines 409-420).
- The `onMounted(...)` call adding document listeners (lines 422-426).
- The `onBeforeUnmount(...)` call removing document listeners (lines 428-431) — the page can still keep `onBeforeUnmount` but make it a no-op (or just remove it).

Add to the script imports:
```js
import ChatSidebarPanel from "@/components/client/qa/ChatSidebarPanel.vue";
```

Replace the removed template block with:
```vue
<ChatSidebarPanel
  :chat-history="chatHistory"
  :current-chat-id="currentChatId"
  :open-menu-chat-id="openMenuChatId"
  :renaming-chat-id="renamingChatId"
  :rename-draft="renameDraft"
  :delete-confirm-chat-id="deleteConfirmChatId"
  :sidebar-open="sidebarOpen"
  @switch="switchChat"
  @new-chat="handleNewChat"
  @menu-toggle="toggleChatMenu"
  @begin-rename="beginRename"
  @commit-rename="commitRename"
  @cancel-rename="cancelRename"
  @confirm-delete="confirmDelete"
  @remove-chat="removeChat"
  @nav-to="(path) => { closeHistoryInteractions(); router.push(path); }"
  @close-layers="closeHistoryLayers"
/>
```

If you went with the recommended `update-rename-draft` event, also add `@update-rename-draft="(value) => (renameDraft = value)"` and drop the existing `renameDraft` write inside `beginRename` (or keep beginRename for the initial draft population and let the input event keep it in sync).

**Remove** from `<style scoped>`: all sidebar CSS blocks (`.chat-sidebar`, `.sidebar-header`, `.eco-badge`, `.sidebar-title*`, `.new-chat-btn*`, `.sidebar-nav`, `.nav-section-title`, `.history-list`, `.history-item*`, `.history-main*`, `.history-rename-input`, `.history-actions`, `.history-more-btn*`, `.history-popover`, `.history-menu*`, `.history-delete-confirm*`, `.history-confirm-*`, `.nav-link*`, plus the sidebar media queries).

- [ ] **Step 3: Verify in browser**

Run: `cd frontend && npm run dev`
- Click "新对话" — new chat created.
- Click a chat in history — switches, closes sidebar overlay (mobile).
- Click `more_horiz` — menu opens.
- Click "重命名" — input appears, focused, text selected.
- Type new title, press Enter — persists.
- Click `more_horiz` → "重命名" → press Escape — cancels rename.
- Click "删除" → confirmation appears.
- Click outside sidebar → menu closes.
- Press Escape — closes any open layer.
- Click "帮助中心" — navigates to `/faq`.
- Mobile: top menu button → sidebar slides in; overlay click → closes.

Expected: all sidebar interactions work.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/client/qa/ChatSidebarPanel.vue frontend/src/views/client/AiQaPage.vue
git commit -m "refactor(ai-qa): extract ChatSidebarPanel component"
```

---

### Task 7: Extract `ChatMessagesPanel`

**Files:**
- Create: `frontend/src/components/client/qa/ChatMessagesPanel.vue`
- Modify: `frontend/src/views/client/AiQaPage.vue`

- [ ] **Step 1: Create `ChatMessagesPanel.vue`**

```vue
<script setup>
import ChatMessage from "./ChatMessage.vue";

const props = defineProps({
  messages: { type: Array, required: true },
  suggestions: { type: Array, required: true },
  showSuggestions: { type: Boolean, required: true },
  isThinking: { type: Boolean, required: true },
  iconMap: { type: Object, required: true },
});

const emit = defineEmits(["suggestion-click"]);

defineExpose({
  scrollToBottom() {
    if (rootRef.value) rootRef.value.scrollTop = rootRef.value.scrollHeight;
  },
});

import { ref } from "vue";
const rootRef = ref(null);
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
```

- [ ] **Step 2: Update page template + script — use `ChatMessagesPanel`**

In `AiQaPage.vue`, **remove** from the template:
- The `<div ref="chatContainer" class="chat-messages">` block (lines 561-621).
- Everything inside (ChatMessage v-for, suggestions, thinking-dots).

Add to script imports:
```js
import ChatMessagesPanel from "@/components/client/qa/ChatMessagesPanel.vue";
```

Replace the removed template block with:
```vue
<ChatMessagesPanel
  ref="messagesPanel"
  :messages="messages"
  :suggestions="suggestions"
  :show-suggestions="showSuggestions"
  :is-thinking="isThinking"
  :icon-map="iconMap"
  @suggestion-click="handleSuggestionClick"
/>
```

Add a template ref for the panel:
```js
const messagesPanel = ref(null);
```

Update `useChatStream`'s `chatContainerRef` injection. Since `ChatMessagesPanel` exposes `scrollToBottom` via `defineExpose`, replace the page's `chatContainer` ref with:
```js
const { userInput, isThinking, suggestions, handleSend, handleSuggestionClick, handleInputKeydown } =
  useChatStream({
    chatHistory: sessions.chatHistory,
    currentChatId: sessions.currentChatId,
    getChatById: sessions.getChatById,
    ensureCurrentChat: sessions.ensureCurrentChat,
    persistChatHistory: sessions.persistChatHistory,
    chatContainerRef: computed(() => messagesPanel.value?.rootRef ?? null),
  });
```
(or, simpler, change `useChatStream` to accept a function `getScrollTarget()` that returns the element. Adjust Task 3's composable accordingly if not already flexible.)

⚠️ **Refactor note**: To avoid the `computed()` wrapping for the ref, the cleanest change is to update `useChatStream` to accept either a ref or a function. Add this to its signature:
```js
chatContainerRef: { type: [Object, Function], required: true }
```
and inside, normalize:
```js
function getScrollTarget() {
  return typeof chatContainerRef === "function"
    ? chatContainerRef()
    : chatContainerRef.value;
}
```
Then `scrollToBottom` uses `getScrollTarget()`. The page passes:
```js
chatContainerRef: () => messagesPanel.value?.$el ?? null
```
(using `$el` to get the DOM element directly).

⚠️ **Simpler alternative**: skip `defineExpose` and use the `chatContainerRef` ref directly. Move the `<div ref="chatContainer">` ref binding into `ChatMessagesPanel`'s root element. Then the page exposes a `chatContainerRef` callback from `ChatMessagesPanel` (using a `defineExpose` or a `rootRef` that the page can pass). Easiest path: keep the panel's `rootRef` internal and pass a getter function as `chatContainerRef`. Use the simpler approach.

**Remove** from `<style scoped>`:
- `.chat-messages` / `::-webkit-scrollbar*`
- `.suggestions*`
- `.thinking-dots*` / `thinkingBounce`

- [ ] **Step 3: Verify in browser**

Run: `cd frontend && npm run dev`
- Welcome message + suggestion chips render.
- Send a question → message appears, AI streams, scroll-to-bottom works (verify by sending when many messages exist).
- AI returns modules → modules render.
- Thinking dots show during stream, hide after.
- Click suggestion chip → fills + sends.
- Switch chats → message list updates, scrolls to bottom.

Expected: identical behavior.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/client/qa/ChatMessagesPanel.vue frontend/src/views/client/AiQaPage.vue
git commit -m "refactor(ai-qa): extract ChatMessagesPanel component"
```

---

### Task 8: Final cleanup — drop `isStreaming`, dead CSS, audit

**Files:**
- Modify: `frontend/src/views/client/AiQaPage.vue`
- Possibly modify: `frontend/src/composables/useChatStream.js`

- [ ] **Step 1: Drop `isStreaming` from `useChatStream`**

In `useChatStream.js`, **remove**:
- `const isStreaming = ref(false);` (was added in Task 3 — verify it's there).
- The `isStreaming.value = true;` line at the start of `handleSend`.
- The two `isStreaming.value = false;` lines in the onComplete and onError callbacks.

If Task 3 was followed correctly, `isStreaming` was never added — this task becomes a no-op. Verify with `grep -n "isStreaming" frontend/src/composables/useChatStream.js`.

- [ ] **Step 2: Dead-code audit in page**

Run: `cd frontend && grep -n "isStreaming" src/views/client/AiQaPage.vue`
Expected: no output (was removed in Task 3).

Run: `cd frontend && grep -n "isThinking\|isStreaming\|userInput\|fileInput\|renameInputRef\|historyListRef\|handleDocumentClick\|handleDocumentKeydown\|navigateTo\|toggleSidebar\|handleAttachment\|handleFileChange\|parseModules\|createId\|createWelcomeMessage\|createDefaultChat\|loadStoredChatHistory\|normalizeMessage\|normalizeChatHistory\|persistChatHistory\|getChatById\|closeHistoryLayers\|cancelRename\|closeHistoryInteractions\|ensureCurrentChat\|handleNewChat\|switchChat\|toggleChatMenu\|beginRename\|commitRename\|confirmDelete\|removeChat\|handleSend\|handleSuggestionClick\|handleInputKeydown\|scrollToBottom\|messages\b\|showSuggestions\|iconMap\|suggestions" src/views/client/AiQaPage.vue`

Expected: matches only for things legitimately still in the page (e.g., `userInput`, `isThinking`, `messages`, `showSuggestions`, `iconMap`, `suggestions` because they're wired through props; `handleSend` because it's bound to ChatInputPanel's `@send`). Anything else is dead — remove it.

- [ ] **Step 3: Dead-CSS audit in page**

Run: `cd frontend && grep -nE "^\.[a-z]" src/views/client/AiQaPage.vue`

Walk through each remaining selector in the page's `<style scoped>`. Confirm none reference:
- `.message-wrapper`, `.user-message`, `.ai-message`, `.message-avatar`, `.message-content`, `.message-text`, `.ai-text`, `.message-bubble`, `.ai-modules`, `.ai-module`, `.module-*`, `messageSlideIn`, `moduleSlideIn`
- `.chat-messages`, `.suggestions`, `.suggestion-btn`, `.thinking-dots`, `thinkingBounce`
- `.chat-input-wrapper`, `.chat-input-container`, `.input-action-btn`, `.chat-input`, `.send-btn`, `.input-disclaimer`
- `.chat-sidebar`, `.sidebar-header`, `.eco-badge`, `.sidebar-title`, `.new-chat-btn`, `.sidebar-nav`, `.nav-section-title`, `.history-list`, `.history-item*`, `.history-main*`, `.history-rename-input`, `.history-actions`, `.history-more-btn`, `.history-popover`, `.history-menu*`, `.history-delete-confirm*`, `.history-confirm-*`, `.nav-link*`
- The mobile sidebar `@media (max-width: 768px) { .chat-sidebar... }`, the sidebar width `@media (max-width: 1024px) { .chat-sidebar... }`, the `.history-popover` mobile override, the `.message-content { max-width: 90%; }` mobile override, and the `.suggestions { margin-left: 0; }` mobile override.

Also remove unused `@import` and dead `ref`/`reactive`/`computed` imports from the script. Specifically:
- `nextTick` no longer needed in page (was used by handleSend only; moved to useChatStream).
- `computed` only if `useChatViewState` is the last user (likely yes → keep).

- [ ] **Step 4: Verify in browser — full smoke test**

Run: `cd frontend && npm run dev`
- Walk through every scenario in the spec's "功能验证清单" table.
- Confirm no console errors or warnings.
- Confirm visual matches pre-refactor.

- [ ] **Step 5: Final commit**

```bash
git add frontend/src/views/client/AiQaPage.vue frontend/src/composables/useChatStream.js
git commit -m "refactor(ai-qa): drop isStreaming dead state and prune dead CSS"
```

---

## Self-Review Notes

- **Spec coverage**:
  - §1 component boundaries → Tasks 4-7 ✓
  - §1 composable split → Tasks 1-3 ✓
  - §2 data flow + props/emits → Tasks 4-7 ✓
  - §3.1 stream errors → preserved in `useChatStream` ✓
  - §3.2 sessionStorage try/catch on write → Task 2 ✓
  - §3.3 onBeforeUnmount → Task 6 (panel) + Task 8 (page cleanup) ✓
  - §3.4 document-level events split → Task 6 (panel takes them) ✓
  - §3.5 input ref move → Task 5 ✓
  - §3.6 createId single source → Task 2 + 3 ✓
  - §4 style boundaries → Tasks 4-7 + Task 8 ✓
  - §5 verification → Step 3 of each task + Task 8 ✓
  - §6 risks (scoped CSS, doc listeners, scroll) → addressed in Tasks 4, 6, 7 ✓
  - "delete isStreaming" → Task 8 ✓

- **Type consistency**:
  - `chatHistory` ref → consistent (defined in `useChatSessions`, passed to `useChatStream` / `useChatViewState`, props on `ChatSidebarPanel` / `ChatMessagesPanel`).
  - `currentChatId` ref → consistent.
  - `getChatById` / `ensureCurrentChat` / `persistChatHistory` → all called with consistent signatures.
  - `createId` → exported from `useChatStream.js`, imported by `useChatSessions.js`. (Task 2 says useChatSessions imports from useChatStream — verify the import path resolves; if it causes a circular concern, move `createId` to a separate `_chatUtils.js` and import from there.)
  - `chatContainerRef` → in Task 3 it's a ref; in Task 7 it's a function. The composable needs to support both — Task 7 calls this out.

- **Placeholders**: None — every step has explicit code or commands.

- **Known ambiguity (flagged inline)**:
  - Task 5 send-button `:disabled` is a behavior change.
  - Task 6 rename-draft binding has two acceptable approaches.
  - Task 7 `chatContainerRef` shape change.
  - Task 8 `isStreaming` may already be gone from Task 3 — verify before editing.

- **Risks**:
  - `createId` circular import: if `useChatSessions.js` imports `createId` from `useChatStream.js`, and `useChatStream.js` imports `useChatViewState` types only (not `useChatSessions`), there's no cycle. But if you accidentally import anything from `useChatSessions` into `useChatStream`, you create one. **Mitigation**: `useChatStream.js` accepts `chatHistory` / `currentChatId` / `getChatById` / `ensureCurrentChat` / `persistChatHistory` as parameters; it imports nothing from `useChatSessions`.
  - Move `createId` to a separate `frontend/src/utils/chatId.js` if the cross-composable import feels fragile.