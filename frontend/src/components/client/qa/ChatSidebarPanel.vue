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
  "update-rename-draft",
]);

const historyListRef = ref(null);
const renameInputRef = ref(null);

function focusRenameInput() {
  // Inside v-for, ref="renameInputRef" resolves to an array of inputs.
  const inputs = Array.isArray(renameInputRef.value)
    ? renameInputRef.value
    : [renameInputRef.value];
  const target = inputs.find((el) => el && typeof el.focus === "function");
  target?.focus();
  target?.select();
}

function onRenameStart(chat) {
  emit("begin-rename", chat);
  // After parent toggles renamingChatId, focus + select the input.
  // Use double-rAF to wait for both DOM update + paint.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      focusRenameInput();
    });
  });
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
              @input="(e) => emit('update-rename-draft', e.target.value)"
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