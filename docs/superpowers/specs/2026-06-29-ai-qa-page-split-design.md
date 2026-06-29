# AiQaPage 组件拆分设计

**状态**: 待用户审阅
**日期**: 2026-06-29
**分支**: refactor/ai-identify-page-split(借用分支名;本次也归属此线)
**参照**: `AidentifyPage.vue` 在 `refactor/ai-identify-page-split` 分支上的最近拆分
(commit a24d78b / 11d0677 / fdd5d3c / c1afcbd / 090c528)。

## 背景与目标

`frontend/src/views/client/AiQaPage.vue` 当前 1431 行,模板、脚本、CSS 全部塞在一个
文件里;且 `AidentifyPage.vue` 已在同分支上完成了相同风格的拆分(4 个组件 +
2 个 composable)。本次目标是把 `AiQaPage.vue` 按相同约定拆开,便于 review 和
后续单独改动 sidebar / messages / input 任一部分。

**不在范围**:流式接口 (`streamChat`)、API 协议、UI 视觉调整、动效改写、CSS 视觉回归修复。

## 总体方案

完全镜像 `AidentifyPage.vue` 的拆分风格:

- `components/client/identify/` → `components/client/qa/`(新建子目录)
- 顶层 3 个 panel 组件 + 1 个原子组件
- `composables/` 下新增 2 个业务 composable + 1 个纯派生 composable

```
frontend/src/components/client/qa/
  ChatSidebarPanel.vue       sidebar(brand + 新建 + history list + nav-link)
  ChatMessagesPanel.vue      消息流容器(suggestions + thinking-dots + 消息 v-for)
  ChatInputPanel.vue         输入栏(attachment + text + send + disclaimer)
  ChatMessage.vue            原子:单条消息(ai/user 分支 + parsedModules + 头像)

frontend/src/composables/
  useChatSessions.js         多会话 CRUD + 持久化 + ephemeral UI refs
  useChatStream.js           发送 / SSE / parseModules / thinking 状态
  useChatViewState.js        纯派生:messages / showSuggestions / iconMap
```

## 组件职责与不做什么

| 单元 | 职责 | 不做什么 |
|---|---|---|
| AiQaPage.vue | 编排 composables、传递 props、绑定 events、持有 sidebarOpen、document 级 click/esc 监听 | 不持有聊天业务状态、不渲染消息 / 输入 UI |
| useChatSessions.js | sessionStorage 读写、chatHistory / currentChatId ref、normalize、createDefaultChat、handleNewChat / switchChat / beginRename / commitRename / confirmDelete / removeChat、sidebarOpen + 重命名 / 菜单 / 确认等 ephemeral UI refs、persistChatHistory | 不调用 streamChat、不做派生 |
| useChatStream.js | userInput / isThinking ref、scrollToBottom、handleSend / handleSuggestionClick / handleInputKeydown、parseModules、createId | 不持久化 chatHistory、不做 per-chat CRUD |
| useChatViewState.js | 纯派生:messages(基于 currentChatId)、showSuggestions、iconMap。只读 | 不持有任何可变状态、不调用 API |
| ChatSidebarPanel.vue | 渲染 sidebar 全部内容;接收数据 + UI 状态 refs、emit 一组 sidebar 事件;内部监听 document click-outside 和 Escape | 不持有状态、不调 stream |
| ChatMessagesPanel.vue | 渲染消息流容器;接收 messages / suggestions / showSuggestions / isThinking / iconMap、emit suggestion-click | 不持有消息列表 |
| ChatInputPanel.vue | 渲染输入栏;接收 userInput / isThinking、emit update:userInput / send / attachment;内部 fileInput ref + handleFileChange 占位 + handleAttachment + handleInputKeydown | 不调 stream |
| ChatMessage.vue | 渲染单条消息;接收 message | 无 |

## 数据流与事件契约

所有 props 沿用 AidentifyPage 风格(`type` 声明 + `required: true` 或默认值)。
组件之间无双向 v-model 同步,所有变化都通过 emit 暴露给 page。

### ChatSidebarPanel

Props:
- `chatHistory: Array` (required)
- `currentChatId: Number | null` (required)
- `openMenuChatId: Number | null` (required)
- `renamingChatId: Number | null` (required)
- `renameDraft: String` (required)
- `deleteConfirmChatId: Number | null` (required)
- `sidebarOpen: Boolean` (required)

Emits:
- `switch(chatId: number)`
- `new-chat()`
- `menu-toggle(chatId: number)`
- `begin-rename(chat: object)`
- `commit-rename(chatId: number)`
- `cancel-rename()`
- `confirm-delete(chatId: number)`
- `remove-chat(chatId: number)`
- `nav-to(path: string)`
- `close-layers()` — document click-outside 或 Escape 命中"非重命名"分支

### ChatMessagesPanel

Props:
- `messages: Array` (required)
- `suggestions: Array` (required)
- `showSuggestions: Boolean` (required)
- `isThinking: Boolean` (required)
- `iconMap: Object` (required)

Emits:
- `suggestion-click(suggestion: string)`

### ChatInputPanel

Props:
- `userInput: String` (required)
- `isThinking: Boolean` (required)

Emits:
- `update:userInput(value: string)` — page 端直接 `userInput.value = value`
- `send()`
- `attachment()`

### ChatMessage

Props:
- `message: Object` (required, 形状见 `useChatSessions.normalizeMessage`)

无 emit。

### Page 持有的状态

全部为 `ref`,来源标注:

来自 `useChatSessions`:`chatHistory`、`currentChatId`、`openMenuChatId`、
`renamingChatId`、`renameDraft`、`deleteConfirmChatId`、`sidebarOpen`。

来自 `useChatStream`:`userInput`、`isThinking`。

来自 `useChatViewState`:`messages`、`showSuggestions`(派生,不存)。

独立:`无`(全部由 composables 返回)。

### Composable 耦合

- `useChatStream` 接受外部传入的 `chatHistory` / `currentChatId` ref(像
  `useRecognitionViewState` 接受 `recognitionMode` 那样),不直接 import
  `useChatSessions`,保持纯函数式。
- `useChatViewState` 只读取,不写。

## 错误处理 / 持久化 / 生命周期

### 流式错误

`streamChat` 的 `onError` 回调把错误写进 AI 消息的 `content`(`"抱歉，发生了错
误：xxx。请稍后重试。"`),并清空 `parsedModules`、复位 `isThinking`、
`persistChatHistory()`。这条路径继续留在 `useChatStream.handleSend` 里,不变。

60 秒超时由 `streamChat` 内部 AbortController 处理,页面无需额外管理。

**已知遗留(本次不修复)**:`streamChat` 返回的 `{ abort }` 函数当前不被引用,
组件卸载时无法中止未完成的请求。保留为已知问题。

### sessionStorage 边界

- 读取:已有 `try/catch JSON.parse` → 失败回 `null`。继续保留。
- 写入(`persistChatHistory`):当前无 `try/catch`,在 quota 满时会抛异常打断
  UI。**升级为**:写入失败 `console.error` 并继续(优先保活,聊天照常工作,
  刷新会丢)。

### 卸载清理

`onBeforeUnmount`(留在 page):
- 移除 document 级 `click` / `keydown` 监听。
- 清空任何 pending 定时器(当前没有,但保留空守卫以便后续加)。
- **不**调用 stream abort(见上述遗留)。

### Document 级事件拆分

- **保留在 page**:sidebar overlay 的 `toggleSidebar`(`<div class="sidebar-overlay" @click="toggleSidebar">`)。
- **搬入 ChatSidebarPanel**:
  - document click-outside 检测:panel 用自己的 `historyListRef`,点击不在其
    内时 `emit('close-layers')`。
  - Escape 监听:panel 监听 `keydown`,`renamingChatId !== null` 时
    `emit('cancel-rename')`,否则 `emit('close-layers')`。
- page 端绑定:`@close-layers="closeHistoryLayers"`、
  `@cancel-rename="cancelRename"`(两个都是 `useChatSessions` 返回的方法)。

### 输入栏 ref

- `fileInput` ref 从 page 搬到 ChatInputPanel(局部 ref)。
- `handleFileChange` / `handleAttachment` 搬入 panel 内部(占位 alert 行为不变)。
- `renameInputRef` 仍在 ChatSidebarPanel(sidebar 内部 UI 细节)。

### 消息 ID 生成

`createId()` 工具函数统一放到 `useChatStream.js` 顶部 export。`useChatSessions`
import 复用,用于 `createDefaultChat` / `createWelcomeMessage`。

## 样式边界

每个组件自带 scoped CSS,只搬走自身 markup 用到的样式。

**留在 page**(全局布局 / 响应式 / 工具规则):
- `.ai-qa-chat-wrapper` / `.ai-qa-chat` / 整体 grid
- `.mobile-menu-btn` / `.sidebar-overlay`
- `@media (max-width: 1024px)` / `768px` 响应式断点(部分仍归属 page,因为
  影响 layout 而非单组件)
- `.material-symbols-outlined` 全局字体规则

**搬入 ChatSidebarPanel**:
- `.chat-sidebar` / `.sidebar-header` / `.eco-badge` / `.sidebar-title` /
  `.new-chat-btn` / `.sidebar-nav` / `.nav-section-title` / `.history-list` /
  `.history-item*` / `.history-main*` / `.history-rename-input` /
  `.history-actions` / `.history-more-btn` / `.history-popover` /
  `.history-menu*` / `.history-delete-confirm*` / `.history-confirm-*` /
  `.nav-link*`

**搬入 ChatMessagesPanel**(只保留容器 / 滚动 / 思考点 / 建议):
- `.chat-messages` 容器、`::-webkit-scrollbar`
- `.suggestions*` / `.thinking-dots*` / `@keyframes thinkingBounce`

**搬入 ChatInputPanel**:
- `.chat-input-wrapper` / `.chat-input-container` / `.input-action-btn` /
  `.chat-input` / `.send-btn` / `.input-disclaimer`

**搬入 ChatMessage**(消息体自治,避免 Vue scoped 穿透问题):
- `.message-wrapper` / `.user-message` / `.message-avatar*` /
  `.message-content` / `.message-text` / `.ai-text` / `.message-bubble` /
  `.ai-modules` / `.ai-module` / `.module-*` / `@keyframes messageSlideIn` /
  `@keyframes moduleSlideIn`

## 重构配套清理

- **删除 `isStreaming` ref**(`useChatStream` 中):当前无 UI 消费者,只在 script
  里设值。本次顺手清掉。
- 重构完跑一次 grep:
  - 未被任何 template 引用的 ref
  - 未被任何 selector 引用的 CSS class
  - 未被 import 的模块
- 不改动 `streamChat` / `parseModules` / `messages` computed / `iconMap` 的逻辑
  内容(只搬位置)。

## 验证策略

按 CLAUDE.md 与现有 CI 约定(没有 Vitest / Jest / ESLint,CI 步骤
`--passWithNoTests`),本次重构不做单元测试,验证全部走 Vite dev server + 浏览
器手动。

### 功能验证清单

| 场景 | 期望 |
|---|---|
| 首次访问 | sessionStorage 为空 → 自动创建默认 chat 并展示欢迎语 |
| 发送普通问题 | 用户气泡出现 → AI 占位 message 出现 → 流式逐字追加 → 滚动到底部 |
| AI 返回 JSON 模块 | 流式过程中 `parseModules` 命中 → 渲染模块卡片而非纯文本 |
| AI 返回纯文本 | 始终未命中 → 渲染 `.ai-text` 普通气泡 |
| 第一次发问后 chat 标题 | 截取用户输入前 20 字,`titleLocked=true`,后续不再自动改 |
| 重命名 | 点击 `more_horiz` → 重命名 → 编辑 → Enter / blur 提交 → 标题持久化;Esc 取消 |
| 删除当前 chat | 切到下一个 chat 或回退到新建的默认 chat |
| 删除非当前 chat | 保留当前 chat |
| 切换 chat | 消息列表刷新、滚动到底部 |
| 新建 chat | 头部插入、sidebarOpen 关闭、移动端关闭 sidebar |
| 刷新页面 | sessionStorage 恢复历史 → 当前 chat 保留 |
| 移动端 sidebar | 顶部菜单按钮 → sidebar 滑入 + overlay;点击 overlay 关闭 |
| 菜单点击外部 | 菜单自动关闭 |
| Escape 键 | 正在重命名 → 取消重命名;否则关闭菜单/确认层 |
| 流式错误 | AI 气泡显示"抱歉,发生了错误..." |

### 视觉回归

- 消息流 `messageSlideIn` 动画
- 模块卡 `moduleSlideIn` 动画 + 错开 0.1s
- 思考点 `thinkingBounce`
- 响应式断点:`max-width: 1024px` / `768px` 下 sidebar 变 fixed、padding 缩减
- `material-symbols-outlined` 全局规则不能丢

### 完成判定

- `npm run dev` 启动无报错。
- 功能验证清单全部场景通过。
- 视觉无回归。
- 无死代码 / 死 import / 死 CSS。

## 风险与注意

- **消息循环 class 命中**:ChatMessage 内部使用 `.message-wrapper` 等类名,样式
  在 MessagesPanel 的 scoped CSS 里。Vue scoped 会给选择器加属性,子组件的根
  class 不会命中父级 scoped 选择器——需要在 ChatMessage 上保留类名,但样式放
  在 MessagesPanel(因为 ChatMessage 只是"瘦代理"),或者使用 `:deep()` 让父
  选择器穿透。**首选方案**:MessagesPanel 把每条消息的样式迁到 ChatMessage
  自身,确保 ChatMessage 拥有完整样式自治;MessagesPanel 只保留容器 / 滚动 /
  thinking / suggestions。
- **document 监听重复挂载**:ChatSidebarPanel 的 onMounted / onBeforeUnmount
  必须成对,否则会泄漏监听器。
- **重构期间不要破坏流式体验**:确保 `scrollToBottom` 仍由 `useChatStream` 在
  流式追加的 nextTick 内调用,否则新消息不会自动滚动到视野内。