# AiIdentifyPage 组件拆分设计

**日期**：2026-06-29
**目标文件**：`frontend/src/views/client/AiIdentifyPage.vue`（1540 行 / 35 KB）
**状态**：设计中

## 背景与目标

AiIdentifyPage.vue 是「收智通」客户端 AI 图像识别页。随着功能叠加，文件膨胀到 1540 行，其中 `<style scoped>` 占约 1030 行。本次拆分的目的不是单纯压缩文件，而是**为后续大页面（HomePage 1785 行、ProfilePage 2958 行、CharityPage 1894 行）铺路** —— 抽出视觉与逻辑原子，使这些页面可以直接复用识别流程与 UI 组件，避免下一轮重复实现。

代码库已有先例：`CameraCaptureModal.vue` + `useCameraCapture.js` 即是从本页面抽出的组件 + composable 组合。本次设计沿用同一模式。

## 关键决策（已在对话中确认）

| 维度 | 选择 | 理由 |
|---|---|---|
| 拆分目的 | 为其他大页面铺路 | 抽出可复用原子，覆盖后续多页面的视觉模式 |
| 组件粒度 | 中粒度（10–14 个） → 优化为 5 个新组件 | section + atom 双层，11 个偏多，5 个满足当前复用需求且不冗余 |
| 业务逻辑归属 | 集中在两个 composable | 与现有 `useCameraCapture` 一致；page 只剩胶水 |
| API 边界 | composable 默认 mock，接受可选覆盖 | 调用方零配置；未来切真实后端只改 composable 一处 |

## 文件结构

```
frontend/src/
├── views/client/
│   └── AiIdentifyPage.vue                   ← 页面编排（~120 行）
├── components/client/identify/
│   ├── IdentifyHeroPanel.vue                ← section · 头部容器（含模式切换+上传面板）
│   ├── IdentifyResultPanel.vue              ← section · 结果容器（含预览+4 种视图态）
│   ├── IdentifyInfoCard.vue                 ← atom · 提示卡片（primary / warm 变体）
│   └── IdentifyActionArea.vue               ← atom · 主+次操作链接组
└── composables/
    ├── useImageRecognition.js               ← 识别生命周期（文件 → URL → analyzer）
    └── useRecognitionViewState.js           ← 视图态纯计算 + 导出常量
```

**新增 4 个组件 + 2 个 composable + page 缩减**。`CameraCaptureModal.vue` 与 `useCameraCapture.js` 已存在，保持不动。

## 组件与 Composable 契约

### `useImageRecognition.js`

**职责**：纯识别生命周期 —— 文件 → blob URL → analyzer 调用 → state 管理 → 卸载清理。

**接口**：

```js
export function useImageRecognition(options = {}) {
  const analyzer = options.analyzer ?? analyzeImage;  // 默认从 mock 导入

  const imageUrl = ref("");
  const imageName = ref("");
  const recognizing = ref(false);
  const results = ref([]);

  function revokeImageUrl() { /* URL.revokeObjectURL */ }

  async function recognize(file, nextName) {
    if (!file) return;
    revokeImageUrl();
    imageUrl.value = URL.createObjectURL(file);
    imageName.value = nextName ?? file.name ?? "";
    results.value = [];
    recognizing.value = true;
    try {
      results.value = await analyzer(file);
    } finally {
      recognizing.value = false;
    }
  }

  function reset() {
    revokeImageUrl();
    imageName.value = "";
    results.value = [];
    recognizing.value = false;
  }

  onBeforeUnmount(reset);

  return {
    imageUrl, imageName, recognizing, results,
    recognize, reset,
  };
}
```

**耦合点**：默认从 `mock/clientApi` 导入 `analyzeImage`。外部可通过 `options.analyzer` 注入自定义实现（测试或未来真实后端切换）。

### `useRecognitionViewState.js`

**职责**：纯计算 —— 接收外部 ref，派生所有展示用计算属性。**不持有源状态**。

**接口**：

```js
export const SAMPLE_RESULT = Object.freeze({ /* 原数据 */ });
export const FAILED_RESULT = Object.freeze({ /* 原数据 */ });
export const RESULT_WARNING_MAP = Object.freeze({ /* 原映射 */ });

export function useRecognitionViewState({
  imageUrl,        // Ref<string>
  recognizing,     // Ref<boolean>
  results,         // Ref<Result[]>
  recognitionMode, // Ref<'single' | 'batch'>
}) {
  const currentResult = computed(() => results.value[0] ?? null);
  const hasUploadedImage = computed(() => Boolean(imageUrl.value));
  const hasResolvedResult = computed(() => Boolean(currentResult.value));

  const viewState = computed(() => /* sample | loading | failed | resolved */);

  // displayResult, displayImage, displayImageAlt,
  // displayConfidence, displayWarning, previewFrameLabel,
  // uploadHeadline, uploadSummary, categoryMark, showResultActions
  // — 全部为 computed，由 viewState 派生

  return {
    viewState, displayResult, displayImage, displayImageAlt,
    displayConfidence, displayWarning, previewFrameLabel,
    uploadHeadline, uploadSummary, categoryMark, showResultActions,
  };
}
```

**关键**：接收的是 ref 对象本身而非值 —— 源数据更新自动驱动派生属性，page 不需要手动 watch。

**导出常量**：`SAMPLE_RESULT`、`FAILED_RESULT`、`RESULT_WARNING_MAP` 随 composable 一起导出。

### `AiIdentifyPage.vue`（page 编排）

**内部 state**：
- `recognitionMode: 'single' | 'batch'`
- `cameraModalOpen: boolean`
- `devNoticeVisible: boolean` + `devNoticeTimer`（清理定时器）

**职责**：
1. 调用两个 composable
2. 桥接胶水事件（模式切换、相机弹窗、dev notice）到 composable 与子组件
3. 调用 `useRevealOnScroll(pageRef)`，根元素加 `data-reveal`

**典型用法**：

```js
const recognition = useImageRecognition();
const view = useRecognitionViewState({
  imageUrl: recognition.imageUrl,
  recognizing: recognition.recognizing,
  results: recognition.results,
  recognitionMode,
});

const handleImageUpload = (e) => recognition.recognize(e.target.files?.[0]);
const handleCameraConfirm = (p) => {
  cameraModalOpen.value = false;
  return recognition.recognize(p.file, p.fileName);
};
```

### `IdentifyHeroPanel.vue`

| Props | 类型 | 说明 |
|---|---|---|
| `recognitionMode` | `'single' \| 'batch'` | 当前模式 |
| `recognizing` | `boolean` | 识别中（用于禁用按钮） |
| `uploadHeadline` | `string` | 来自 `view.uploadHeadline` |
| `uploadSummary` | `string` | 来自 `view.uploadSummary` |
| `devNoticeVisible` | `boolean` | "批量识别开发中"提示 |

| Events | 参数 | 说明 |
|---|---|---|
| `@mode-change` | `(mode: 'single' \| 'batch')` | 用户切换模式 |
| `@camera-open` | `()` | 点击"拍照识别" |
| `@album-trigger` | `()` | 点击"相册上传" |

**内部 state**：无（完全受控）。dev notice 显示由 page 控制，HeroPanel 只接收 prop 决定是否渲染。

**包含**：`mode-switch` + `upload-panel`（含 `focus-badge`、`upload-copy`、`upload-actions`、`dev-notice`、`upload-links`）+ `<Transition name="mode-swap">` 与 `<Transition name="notice-slide">`。

### `IdentifyResultPanel.vue`

| Props | 类型 | 说明 |
|---|---|---|
| `viewState` | `'sample' \| 'loading' \| 'failed' \| 'resolved'` | 当前视图态 |
| `displayImage` | `string` | 展示图片 URL |
| `displayImageAlt` | `string` | 图片 alt |
| `displayResult` | `{ name, category, action, score, warning, preview, previewAlt }` | 展示用结果 |
| `displayConfidence` | `string` | 例 `"98.4% CONFIDENCE"` |
| `displayWarning` | `string` | 警告文案 |
| `previewFrameLabel` | `string` | 边框标签 |
| `categoryMark` | `string` | 字符徽章 ♻/!/厨/其/? |
| `showResultActions` | `boolean` | 是否渲染操作区 |

**Events**：无 —— 操作区直接用 `<RouterLink>`，不冒泡到 page。

**内部结构**：

```
<result-panel>
  <preview-column>
    <Transition name="result-fade" mode="out-in">
      <preview-stage :key="displayImage">
        <img />
        <scanner v-if="loading" />
        <preview-frame :label />
        <sample-tag v-if="sample" />
      </preview-stage>
    </Transition>
  </preview-column>
  <body-column>
    <Transition name="result-fade" mode="out-in">
      <loading-card v-if="loading" />
      <failed-card v-else-if="failed" />
      <resolved v-else>
        <result-head :result :confidence :categoryMark />
        <info-stack>
          <InfoCard variant="primary" :label :heading />
          <InfoCard variant="warm" :label :body />
        </info-stack>
        <ActionArea v-if="showResultActions" />
      </resolved>
    </Transition>
  </body-column>
</result-panel>
```

### `IdentifyInfoCard.vue`（atom）

| Props | 类型 | 说明 |
|---|---|---|
| `variant` | `'primary' \| 'warm'` | 决定背景色与样式变体 |
| `label` | `string` | 顶部小字标签 |
| `heading` | `string` | 加粗主标题（primary 用） |
| `body` | `string` | 正文段落（warm 用） |

**Slots**：
- `default`：任意自定义内容（覆盖 heading/body）

### `IdentifyActionArea.vue`（atom）

| Props | 类型 | 说明 |
|---|---|---|
| `primaryTo` | `string` | 主按钮跳转路由 |
| `primaryLabel` | `string` | 主按钮文字 |
| `secondary` | `Array<{ to: string, label: string }>` | 次按钮数组 |

**Events**：无（RouterLink 自跳转）。

## 数据流

```
相册/相机 ──► handleImageUpload / handleCameraConfirm
              │
              ▼
       recognition.recognize(file, name)
              │  ← 内部：URL.createObjectURL + analyzer + state 更新
              ▼
       recognition.imageUrl / recognizing / results  ←──┐
              │                                          │
              ▼                                          │  派生计算
       useRecognitionViewState 接收 ref                  │
              │                                          │
              ▼                                          │
       view.displayImage / displayResult / viewState ... ┘
              │
              ▼
       <ResultPanel :viewState="..." :displayImage="..." />
```

### 状态所有权单一性

- **page** 持有 UI 状态：`recognitionMode`、`cameraModalOpen`、`devNoticeVisible` + 定时器
- **`useImageRecognition`** 持有识别状态：`imageUrl`、`imageName`、`recognizing`、`results`
- **`useRecognitionViewState`** 不持有任何状态，只读 ref 做派生
- **HeroPanel / ResultPanel / atom 组件**：零内部 state（除少量纯展示用 ref）

## CSS 拆分策略

| 文件 | 关键 class | 估算行数 |
|---|---|---|
| `AiIdentifyPage.vue` | `.sr-only`、`.identify-page`、`@media prefers-reduced-motion` | ~40 |
| `IdentifyHeroPanel.vue` | `.hero-panel*`、`.mode-switch*`、`.upload-panel*`、`.focus-badge*`、`.upload-button*`、`.dev-notice`、`.upload-links`、transition `mode-swap` / `notice-slide` 配套 class | ~400 |
| `IdentifyResultPanel.vue` | `.result-panel*`、`.preview-stage*`、`.preview-frame*`、`.sample-tag*`、`.result-copy*`、`.loading-card*`、`.failed-card*`、`.result-head*`、`.title-row*`、`.confidence-pill`、`.category-row*`、`.category-mark`、`.eco-badge`、transition `result-fade` 配套 class | ~520 |
| `IdentifyInfoCard.vue` | `.info-card`、`.info-card--primary`、`.info-card--warm` | ~70 |
| `IdentifyActionArea.vue` | `.action-area`、`.primary-action`、`.secondary-actions`、`.secondary-action` | ~80 |

**`<Transition>` CSS 跟随 Transition 元素走**：

- `mode-swap`、`notice-slide` → HeroPanel 的 scoped style
- `result-fade`（在两处使用）→ ResultPanel 的 scoped style

`<Transition name="...">` 生成的 class（`.mode-swap-enter-active` 等）在 `<Transition>` 元素所在作用域内有效，`scoped` 不会破坏。

**死代码清理**：`.eco-badge` 样式存在但模板里没有渲染（仅有 `ecoBadgeMark` 计算属性未被使用）。迁移时一并删除该 class 及计算属性。

**`@media` 响应式断点**按视觉归属拆分：Hero 断点跟 HeroPanel，Result 断点跟 ResultPanel。

## 迁移顺序

每一步完成后**必须实际跑 dev server 看一眼**，不仅依赖 `npm run build` 通过（CI 的 `--passWithNoTests` 不抓运行时回归）。

```
步骤 1: 写 composables（useImageRecognition + useRecognitionViewState）
        ├─ 不动模板和样式，纯新增
        └─ ✓ npm run dev 验证：识别流程仍工作

步骤 2: 重构 AiIdentifyPage.vue 的 <script setup>
        ├─ 替换 state/computed 为 composable 调用
        ├─ 模板和样式暂时不动
        └─ ✓ 浏览器目视检查 + console 无 error

步骤 3: 抽 IdentifyInfoCard.vue
        ├─ 最小、最原子、独立
        ├─ 替换两处使用：result-head 后的 info-stack 里
        └─ ✓ 验证：两个 info-card 视觉无变化

步骤 4: 抽 IdentifyActionArea.vue
        ├─ 独立，props 边界清晰
        └─ ✓ 验证：4 个跳转链接工作

步骤 5: 抽 IdentifyResultPanel.vue
        ├─ 最大块，内部包含 preview + body + 视图态卡片
        └─ ✓ 验证：4 种视图态切换正确、动效保留

步骤 6: 抽 IdentifyHeroPanel.vue
        ├─ 最后做，依赖前面几个的理解
        └─ ✓ 验证：模式切换、上传、dev notice 全部正常

步骤 7: 收尾
        ├─ 清理 .eco-badge 死代码
        ├─ 跑 npm run build 确认无打包错误
        └─ ✓ 最终目视检查整个流程
```

原子优先（步骤 3–4）→ 最大块（步骤 5）→ 最顶层（步骤 6），由下而上，每步可独立验证。

## 行为不变性清单（迁移时不能丢）

- [ ] `useRevealOnScroll` 滚动显隐动画
- [ ] 模式切换滑动 indicator 平滑过渡
- [ ] dev notice 自动消失（2.4 秒）
- [ ] 4 种视图态切换的 fade 动效
- [ ] 扫描线动效（识别中）
- [ ] 上传后立即 revoke 旧 URL、创建新 URL 的生命周期
- [ ] 组件卸载时 revoke 当前 URL（防内存泄漏）
- [ ] 批量模式下按钮 disabled 状态正确
- [ ] 三个次按钮链接（/charity、/upcycle、/ai-qa）跳转正常
- [ ] 主按钮"一键预约回收"跳转 /recycle-booking
- [ ] 键盘可达性：file input 仍触发 `data-testid="album-trigger"`、`data-testid="camera-trigger"`

## 不在本次范围

- **不做其它大页面的同步重构**：本设计仅为 AiIdentifyPage 拆分；HomePage、ProfilePage、CharityPage 的复用改造是后续独立任务
- **不切换真实后端**：仍走 `mock/clientApi.js` 的 `analyzeImage`，但 composable 的 `options.analyzer` 注入点已预留
- **不新增状态管理库**：保持现有"page 持有 UI 状态 + composable 持有识别状态"模式，与项目其它页一致
- **不动 CameraCaptureModal 与 useCameraCapture**：已抽好

## 后续可考虑（未承诺）

- 当 `InfoCard` / `ActionArea` 在其它页面有第二个调用点时，可考虑重命名为 `BaseInfoCard` / `BaseActionArea` 并移到 `components/client/common/`
- `useRecognitionViewState` 的常量若被其它页面引用，可独立出 `constants/recognition.js`
- `design.md` 中提到的真实后端切换：到时只需改 `useImageRecognition.js` 默认 import，调用方零改动