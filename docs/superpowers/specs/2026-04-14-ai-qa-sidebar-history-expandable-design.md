---
name: ai-qa-sidebar-history-expandable-design
description: 侧边栏历史记录可展开/收起功能设计
type: project
---

# AI 问答页面侧边栏历史记录展开/收起功能设计

## 1. 概述

在 AI 问答页面的侧边栏中，将"最近历史"列表改为可展开/收起的形式。默认只显示最近 5 条对话历史，用户可点击按钮展开查看全部历史。

## 2. UI/UX 设计

### 2.1 交互行为

- 侧边栏加载时，历史列表只显示最近 5 条对话
- 第 5 条之后显示"展开历史"按钮（带向下箭头图标）
- 点击按钮后，显示全部历史，按钮变为"收起历史"（带向上箭头）
- 再次点击可收起

### 2.2 视觉样式

- 展开/收起按钮位于历史列表底部
- 按钮样式：使用文字 + 图标，无背景色，保持轻量
- 使用过渡动画让展开/收起更平滑

### 2.3 组件结构

```
侧边栏
├── 头部信息
├── 新对话按钮
├── 导航区域
│   ├── 最近历史（可折叠）
│   │   ├── 历史项 1
│   │   ├── ...
│   │   ├── 历史项 5
│   │   └── 展开/收起按钮
│   ├── AI 识别
│   ├── 预约回收
│   └── 帮助中心
└── 底部导航
```

## 3. 功能设计

### 3.1 状态管理

- 新增 `historyExpanded` 响应式变量（默认 `false`）
- 控制历史列表的显示数量：`DISPLAY_LIMIT = 5`

### 3.2 计算属性

- `displayedHistory`：根据 `historyExpanded` 返回显示的历史数量
- `hasMoreHistory`：判断是否有更多历史需要展开（历史总数 > 5）

### 3.3 方法

- `toggleHistoryExpand()`：切换展开/收起状态

## 4. 实现要点

### 4.1 代码变更

1. 在 `<script setup>` 中添加：
   - `const historyExpanded = ref(false)`
   - `const DISPLAY_LIMIT = 5`
   - `const hasMoreHistory = computed(() => chatHistory.value.length > DISPLAY_LIMIT)`
   - `const displayedHistory = computed(() => historyExpanded.value ? chatHistory.value : chatHistory.value.slice(0, DISPLAY_LIMIT))`
   - `function toggleHistoryExpand() { historyExpanded.value = !historyExpanded.value }`

2. 在模板中修改：
   - 将 `v-for="chat in chatHistory"` 改为 `v-for="chat in displayedHistory"`
   - 在历史列表底部添加展开/收起按钮

### 4.2 样式

- 展开/收起按钮使用 `.history-toggle-btn` 类
- 按钮文字 + 图标居中显示
- 添加简单的过渡动画

## 5. 接受标准

- [ ] 默认只显示最近 5 条历史
- [ ] 存在更多历史时显示"展开历史"按钮
- [ ] 点击按钮可展开显示全部历史
- [ ] 展开后按钮变为"收起历史"
- [ ] 再次点击可收起历史
- [ ] 展开/收起有平滑过渡效果
- [ ] 移动端响应式行为正常
