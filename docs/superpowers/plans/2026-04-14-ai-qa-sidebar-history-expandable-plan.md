# AI 问答页面侧边栏历史记录展开/收起功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 AI 问答页面的侧边栏中添加可展开/收起的历史记录功能，默认显示最近 5 条历史

**Architecture:** 在现有 AiQaPage.vue 组件中添加响应式状态控制历史列表的显示数量，使用计算属性动态渲染

**Tech Stack:** Vue 3 Composition API

---

## 任务总览

需要修改的文件：
- `frontend/src/views/client/AiQaPage.vue`

## 实现步骤

### Task 1: 添加响应式状态和计算属性

**Files:**
- Modify: `frontend/src/views/client/AiQaPage.vue:46-52`

- [ ] **Step 1: 添加状态变量和常量**

在 `const sidebarOpen = ref(false)` 后面添加：

```javascript
// 历史记录展开/收起控制
const historyExpanded = ref(false);
const DISPLAY_LIMIT = 5;

// 判断是否有更多历史需要展开
const hasMoreHistory = computed(() => chatHistory.value.length > DISPLAY_LIMIT);

// 根据展开状态返回显示的历史
const displayedHistory = computed(() => {
  return historyExpanded.value
    ? chatHistory.value
    : chatHistory.value.slice(0, DISPLAY_LIMIT);
});

// 切换展开/收起状态
function toggleHistoryExpand() {
  historyExpanded.value = !historyExpanded.value;
}
```

- [ ] **Step 2: 提交变更**

---

### Task 2: 修改模板中的历史列表渲染

**Files:**
- Modify: `frontend/src/views/client/AiQaPage.vue:307-319`

- [ ] **Step 1: 修改历史列表的 v-for**

找到侧边栏中的历史列表部分：
```vue
<a
  v-for="chat in chatHistory"
  :key="chat.id"
  href="#"
  :class="['nav-link', { active: chat.id === currentChatId }]"
  @click.prevent="switchChat(chat.id)"
>
  <span class="material-symbols-outlined">chat_bubble</span>
  {{ chat.title }}
</a>
```

将 `v-for="chat in chatHistory"` 改为 `v-for="chat in displayedHistory"`：
```vue
<a
  v-for="chat in displayedHistory"
  :key="chat.id"
  href="#"
  :class="['nav-link', { active: chat.id === currentChatId }]"
  @click.prevent="switchChat(chat.id)"
>
  <span class="material-symbols-outlined">chat_bubble</span>
  {{ chat.title }}
</a>
```

- [ ] **Step 2: 添加展开/收起按钮**

在历史列表后面、导航链接之前添加：

```vue
<button
  v-if="hasMoreHistory"
  class="history-toggle-btn"
  @click="toggleHistoryExpand"
>
  <span class="material-symbols-outlined">
    {{ historyExpanded ? 'expand_less' : 'expand_more' }}
  </span>
  {{ historyExpanded ? '收起历史' : '展开历史' }}
</button>
```

- [ ] **Step 3: 提交变更**

---

### Task 3: 添加展开/收起按钮样式

**Files:**
- Modify: `frontend/src/views/client/AiQaPage.vue:640-650`

- [ ] **Step 1: 添加按钮样式**

在 `.sidebar-footer` 样式之前添加：

```css
/* 历史记录展开/收起按钮 */
.history-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 16px;
  margin: 8px 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--forest-600);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.history-toggle-btn:hover {
  background: rgba(227, 226, 225, 0.6);
  color: var(--forest-700);
}

.history-toggle-btn .material-symbols-outlined {
  font-size: 18px;
}
```

- [ ] **Step 2: 提交变更**

---

### Task 4: 测试功能

**Files:**
- Test: 手动测试

- [ ] **Step 1: 启动开发服务器**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: 验证功能**

1. 打开 AI 问答页面 `/ai-qa`
2. 侧边栏应该只显示最近 5 条历史记录
3. 如果有超过 5 条历史，应该看到"展开历史"按钮
4. 点击按钮展开历史，按钮变为"收起历史"
5. 再次点击可收起
6. 切换对话功能正常
7. 移动端响应式正常

- [ ] **Step 3: 提交最终变更**

---

## 验收标准

- [ ] 默认只显示最近 5 条历史
- [ ] 存在更多历史时显示"展开历史"按钮
- [ ] 点击按钮可展开显示全部历史
- [ ] 展开后按钮变为"收起历史"
- [ ] 再次点击可收起历史
- [ ] 切换对话功能正常
- [ ] 移动端响应式行为正常
