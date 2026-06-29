# AiIdentifyPage Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `frontend/src/views/client/AiIdentifyPage.vue` (1540 lines, 35KB) into 2 composables and 4 components so that the pieces can be reused by other large pages (HomePage, ProfilePage, CharityPage).

**Architecture:** Page composes 2 section components (Hero, Result) and 2 atom components (InfoCard, ActionArea). All recognition lifecycle state lives in `useImageRecognition`. All view-state derivations live in `useRecognitionViewState` (read-only over the ref returned by the first composable). Page holds only UI state (mode, modal, dev-notice).

**Tech Stack:** Vue 3 `<script setup>`, Vue Router 4 (for `<RouterLink>`), Composition API (`ref`, `computed`, `onBeforeUnmount`). No state management library. Project-local alias `@` → `frontend/src/` per `frontend/vite.config.js`. Existing composables to mirror: `useRevealOnScroll.js`, `useCameraCapture.js`.

**Verification context:** This codebase has **no test runner**. `npm test` runs Vitest with `--passWithNoTests` (per `frontend/CLAUDE.md`). The CI test step will not catch runtime regressions. Therefore this plan replaces the standard "write failing test → implement → pass" TDD loop with **explicit browser verification at each task boundary** — the implementer must run `npm run dev` and visually confirm behavior preservation before moving on.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `frontend/src/composables/useImageRecognition.js` | Create | File → blob URL → analyzer call → state mgmt → unmount cleanup |
| `frontend/src/composables/useRecognitionViewState.js` | Create | Pure derivations over external refs; exports `SAMPLE_RESULT` / `FAILED_RESULT` / `RESULT_WARNING_MAP` |
| `frontend/src/components/client/identify/IdentifyInfoCard.vue` | Create | Atom: `label` + `heading` / `body` card with `primary` / `warm` variants |
| `frontend/src/components/client/identify/IdentifyActionArea.vue` | Create | Atom: primary `<RouterLink>` + grid of secondary `<RouterLink>` |
| `frontend/src/components/client/identify/IdentifyResultPanel.vue` | Create | Section: preview column + body column with 4 view states |
| `frontend/src/components/client/identify/IdentifyHeroPanel.vue` | Create | Section: hero copy + mode switch + upload panel + dev notice |
| `frontend/src/views/client/AiIdentifyPage.vue` | Modify | Page orchestrator: composes the above; owns UI state only |
| `frontend/src/mock/clientApi.js` | Read-only | Source of default `analyzeImage` for `useImageRecognition` |

**Untouched:** `CameraCaptureModal.vue`, `useCameraCapture.js`, `useRevealOnScroll.js`, all router files, all mock files.

---

## Task 1: Create `useImageRecognition` composable

**Files:**
- Create: `frontend/src/composables/useImageRecognition.js`

- [ ] **Step 1: Create the composable file with full implementation**

Write `frontend/src/composables/useImageRecognition.js`:

```js
import { onBeforeUnmount, ref } from "vue";
import { analyzeImage } from "../mock/clientApi";

/**
 * Owns the lifecycle of an uploaded image and the in-flight recognition call.
 * Returns refs the caller reads directly plus two functions to mutate state.
 * Mounted-time unmount cleanup is built in so callers don't have to remember
 * to revoke object URLs.
 */
export function useImageRecognition(options = {}) {
  const analyzer = options.analyzer ?? analyzeImage;

  const imageUrl = ref("");
  const imageName = ref("");
  const recognizing = ref(false);
  const results = ref([]);

  function revokeImageUrl() {
    if (imageUrl.value) {
      URL.revokeObjectURL(imageUrl.value);
      imageUrl.value = "";
    }
  }

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
    imageUrl,
    imageName,
    recognizing,
    results,
    recognize,
    reset,
  };
}
```

- [ ] **Step 2: Verify dev server still starts cleanly**

Run: `cd frontend && npm run dev`
Expected: Vite reports a clean start with no import errors. Open `http://localhost:5173/ai-identify` (or wherever the route is mounted — check `frontend/src/router/index.js` if unsure) and confirm the page renders the **sample** state (no upload yet).
Stop the dev server before continuing.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/composables/useImageRecognition.js
git commit -m "feat(composable): add useImageRecognition"
```

---

## Task 2: Create `useRecognitionViewState` composable

**Files:**
- Create: `frontend/src/composables/useRecognitionViewState.js`

- [ ] **Step 1: Create the composable file with full implementation**

Write `frontend/src/composables/useRecognitionViewState.js`:

```js
import { computed } from "vue";

export const SAMPLE_RESULT = Object.freeze({
  name: "矿泉水瓶",
  category: "可回收物",
  score: 98.4,
  action: "请排空液体、压扁后投放，瓶盖建议分投。",
  warning: "严禁混入厨余垃圾或受污染严重的塑料包装，请保持容器整洁。",
  preview:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBlUIW4u43B2eU93ycMIzxnmfLTkpGpE-OST-kBlFMDB-US0AGKx3MlXzQRAU8xDGPUK7GN-UUzdcMkR_d1mkWroSjcx9wS5vVq_jCCs-OPzDksEIqfYfXcKjSUL85R4yMQgqoBhuljUDCSsZN4Kyo_RzhjgyGqfLaG7w3JBUwjeFmR__RXihAiwn3GWD1pWYyERL8wRQBc1Tb-qqn4pw1OHPQHW9PVA0bjCFUyzDQ3SFK67g5L2kWJ5fmqUeHT6MgmC0i3sH5hDcQ",
  previewAlt: "示例识别图片",
});

export const FAILED_RESULT = Object.freeze({
  name: "暂未识别成功",
  category: "请重试",
  action: "建议重新上传主体更清晰、背景更干净的单一物品照片。",
  warning: "请尽量保证画面中只有一个废弃物主体，并避免反光、模糊或遮挡。",
});

const RESULT_WARNING_MAP = Object.freeze({
  有害垃圾: "投放前请做好密封与绝缘处理，并尽量避免和其它垃圾混装。",
  可回收物: "请尽量保持材质单一与表面整洁，明显污渍建议先简单清理。",
  厨余垃圾: "请先去除包装并尽快投放，避免长时间堆放带来异味与渗漏。",
  其他垃圾: "若材质复杂或被严重污染，建议先咨询处理方式后再投放。",
});

/**
 * Pure derivations over the refs owned by useImageRecognition plus the
 * caller-supplied recognitionMode. Returns computed display values; never
 * mutates the input refs and never holds source data of its own.
 */
export function useRecognitionViewState({
  imageUrl,
  recognizing,
  results,
  recognitionMode,
}) {
  const currentResult = computed(() => results.value[0] ?? null);
  const hasUploadedImage = computed(() => Boolean(imageUrl.value));
  const hasResolvedResult = computed(() => Boolean(currentResult.value));

  const viewState = computed(() => {
    if (recognizing.value && hasUploadedImage.value) return "loading";
    if (hasResolvedResult.value) return "resolved";
    if (hasUploadedImage.value) return "failed";
    return "sample";
  });

  const displayResult = computed(() => {
    if (viewState.value === "failed") return FAILED_RESULT;
    if (viewState.value === "resolved") return currentResult.value;
    return SAMPLE_RESULT;
  });

  const displayImage = computed(() =>
    viewState.value === "sample"
      ? SAMPLE_RESULT.preview
      : imageUrl.value || SAMPLE_RESULT.preview,
  );

  const displayImageAlt = computed(
    () =>
      (viewState.value === "sample"
        ? SAMPLE_RESULT.previewAlt
        : imageName.value || "上传识别图片") ||
      displayResult.value.previewAlt ||
      displayResult.value.name,
  );

  const displayConfidence = computed(() => {
    const score = Number(displayResult.value.score);
    return `${Number.isInteger(score) ? score : score.toFixed(1)}% CONFIDENCE`;
  });

  const displayWarning = computed(
    () =>
      displayResult.value.warning ||
      RESULT_WARNING_MAP[displayResult.value.category] ||
      "若图片中存在混合材质、液体残留或严重污损，建议进一步确认后再投放。",
  );

  const previewFrameLabel = computed(() => {
    if (viewState.value === "loading") return "AI ANALYZING";
    if (viewState.value === "failed") return "RETRY NEEDED";
    if (viewState.value === "resolved") return `DETECTED: ${displayResult.value.name}`;
    return "SAMPLE PREVIEW";
  });

  const uploadHeadline = computed(() =>
    recognitionMode.value === "single"
      ? recognizing.value
        ? "AI 正在识别中"
        : "上传需要识别的废弃物"
      : "批量识别功能开发中",
  );

  const uploadSummary = computed(() =>
    recognitionMode.value === "single"
      ? "支持 JPG/PNG 格式。为了获得最佳识别效果，请在纯色背景下拍摄物体的完整图像。"
      : "当前仅保留视觉位与交互占位，你可以停留在批量识别模式，后续能力将逐步开放。",
  );

  const categoryMark = computed(() => {
    if (viewState.value === "failed") return "?";
    if (displayResult.value.category.includes("有害")) return "!";
    if (displayResult.value.category.includes("厨余")) return "厨";
    if (displayResult.value.category.includes("其他")) return "其";
    return "♻";
  });

  const showResultActions = computed(
    () => viewState.value === "sample" || viewState.value === "resolved",
  );

  return {
    viewState,
    displayResult,
    displayImage,
    displayImageAlt,
    displayConfidence,
    displayWarning,
    previewFrameLabel,
    uploadHeadline,
    uploadSummary,
    categoryMark,
    showResultActions,
  };
}
```

- [ ] **Step 2: Verify dev server starts cleanly**

Run: `cd frontend && npm run dev`
Expected: Vite reports a clean start. Confirm no console errors about the new composable.
Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/composables/useRecognitionViewState.js
git commit -m "feat(composable): add useRecognitionViewState"
```

---

## Task 3: Refactor `AiIdentifyPage.vue` script to use composables

**Files:**
- Modify: `frontend/src/views/client/AiIdentifyPage.vue` (lines 1-269, `<script setup>` only — template and style untouched)

- [ ] **Step 1: Replace the `<script setup>` block**

Open `frontend/src/views/client/AiIdentifyPage.vue`. The script block runs from line 1 to line 269. Replace the entire block with:

```vue
<script setup>
import { onBeforeUnmount, ref } from "vue";
import { RouterLink } from "vue-router";

import CameraCaptureModal from "../../components/client/CameraCaptureModal.vue";
import { useRevealOnScroll } from "../../composables/useRevealOnScroll";
import { useImageRecognition } from "../../composables/useImageRecognition";
import { useRecognitionViewState } from "../../composables/useRecognitionViewState";

const pageRef = ref(null);
const uploadInput = ref(null);

useRevealOnScroll(pageRef);

const recognitionMode = ref("single");
const cameraModalOpen = ref(false);
const devNoticeVisible = ref(false);

let devNoticeTimer = null;

const recognition = useImageRecognition();
const view = useRecognitionViewState({
  imageUrl: recognition.imageUrl,
  recognizing: recognition.recognizing,
  results: recognition.results,
  recognitionMode,
});

function clearDevNoticeTimer() {
  if (devNoticeTimer) {
    window.clearTimeout(devNoticeTimer);
    devNoticeTimer = null;
  }
}

function showDevNotice() {
  clearDevNoticeTimer();
  devNoticeVisible.value = true;
  devNoticeTimer = window.setTimeout(() => {
    devNoticeVisible.value = false;
    devNoticeTimer = null;
  }, 2400);
}

function switchRecognitionMode(mode) {
  if (recognitionMode.value === mode) {
    if (mode === "batch") showDevNotice();
    return;
  }
  recognitionMode.value = mode;
  if (mode === "batch") {
    cameraModalOpen.value = false;
    showDevNotice();
    return;
  }
  clearDevNoticeTimer();
  devNoticeVisible.value = false;
}

function triggerUpload() {
  if (recognition.recognizing.value && recognitionMode.value === "single") return;
  if (recognitionMode.value === "batch") {
    showDevNotice();
    return;
  }
  uploadInput.value?.click();
}

function openCameraCapture() {
  if (recognition.recognizing.value && recognitionMode.value === "single") return;
  if (recognitionMode.value === "batch") {
    showDevNotice();
    return;
  }
  cameraModalOpen.value = true;
}

function closeCameraCapture() {
  cameraModalOpen.value = false;
}

async function handleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await recognition.recognize(file, file.name);
  } finally {
    event.target.value = "";
  }
}

async function handleCameraConfirm(payload) {
  if (!payload?.file || recognition.recognizing.value) return;
  closeCameraCapture();
  await recognition.recognize(payload.file, payload.fileName || payload.file.name);
}

onBeforeUnmount(() => {
  clearDevNoticeTimer();
});
</script>
```

Note what changed relative to the original:
- `analyzeImage` import removed (now used only by composable)
- All `recognitionResults.value[0]`, `hasUploadedImage`, `resultViewState`, `displayResult`, `displayImage`, `displayImageAlt`, `displayConfidence`, `displayWarning`, `previewFrameLabel`, `uploadHeadline`, `uploadSummary`, `categoryMark`, `ecoBadgeMark`, `showResultActions` removed — they come from `view.*`
- `imageUrl`, `imageName`, `recognizing`, `recognitionResults` removed — they come from `recognition.*`
- `SAMPLE_RESULT`, `FAILED_RESULT`, `RESULT_WARNING_MAP` removed — they come from `useRecognitionViewState`'s exports
- Template **still references** these names like `resultViewState`, `imageUrl`, `uploadHeadline` — **do not change the template yet**. Step 2 fixes template references.

- [ ] **Step 2: Update the template references to read from `recognition.*` and `view.*`**

In the same file, edit the `<template>` block (lines 271-505). The original template references these identifiers from the script:

| Original identifier | Replace with |
|---|---|
| `recognitionMode` | `recognitionMode` (unchanged — page still owns it) |
| `recognizing` | `recognition.recognizing` |
| `imageUrl` | `recognition.imageUrl` |
| `imageName` | `recognition.imageName` |
| `recognitionResults` | `recognition.results` |
| `resultViewState` | `view.viewState` |
| `displayResult` | `view.displayResult` |
| `displayImage` | `view.displayImage` |
| `displayImageAlt` | `view.displayImageAlt` |
| `displayConfidence` | `view.displayConfidence` |
| `displayWarning` | `view.displayWarning` |
| `previewFrameLabel` | `view.previewFrameLabel` |
| `uploadHeadline` | `view.uploadHeadline` |
| `uploadSummary` | `view.uploadSummary` |
| `categoryMark` | `view.categoryMark` |
| `showResultActions` | `view.showResultActions` |
| `isSampleState` | (delete — derived in template as `view.viewState === 'sample'`) |
| `hasUploadedImage` | (delete — only used in script; not referenced in template) |
| `hasResolvedResult` | (delete — only used in script) |
| `currentResult` | (delete — only used in script) |
| `ecoBadgeMark` | (delete — dead code, never rendered) |

Apply each replacement. Where the original uses a `computed` value inside a template binding (e.g. `resultViewState === 'loading'`), the replacement `view.viewState === 'loading'` is equivalent.

Where the template uses `isSampleState` (e.g. `:class="{ 'is-sample': isSampleState }"`, `v-if="isSampleState"`), replace inline: `view.viewState === 'sample'`.

`ecoBadgeMark` does not appear in the template, so removing its computed property in step 1 is sufficient.

- [ ] **Step 3: Verify dev server + browser behavior is unchanged**

Run: `cd frontend && npm run dev`

Open the AI 识别 page in the browser. Verify the following checklist:

- [ ] Page renders the SAMPLE state on first load (矿泉水瓶 sample image + "示例结果" tag)
- [ ] Clicking "相册上传" → upload a JPG → loading spinner appears → resolves to a result (mock data)
- [ ] Clicking "拍照识别" opens the camera modal; closing it works
- [ ] Clicking "批量识别" tab shows the dev notice toast and it auto-dismisses after ~2.4s
- [ ] Switching back to "单件识别" hides the dev notice immediately
- [ ] The 3 secondary action links (公益捐赠 / 旧物改造 / 环保助手) navigate correctly
- [ ] The primary "一键预约回收" link navigates to `/recycle-booking`
- [ ] No errors in browser console
- [ ] Scroll-reveal animation still triggers when scrolling into view

If anything is broken, **do not proceed** — fix the template/script references and re-verify.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/client/AiIdentifyPage.vue
git commit -m "refactor(ai-identify): migrate script setup to composables"
```

---

## Task 4: Extract `IdentifyInfoCard.vue`

**Files:**
- Create: `frontend/src/components/client/identify/IdentifyInfoCard.vue`
- Modify: `frontend/src/views/client/AiIdentifyPage.vue` (replace two inline info-card blocks)

- [ ] **Step 1: Create the atom component**

Create `frontend/src/components/client/identify/IdentifyInfoCard.vue`:

```vue
<script setup>
defineProps({
  variant: {
    type: String,
    default: "primary",
    validator: (v) => ["primary", "warm"].includes(v),
  },
  label: { type: String, required: true },
  heading: { type: String, default: "" },
  body: { type: String, default: "" },
});
</script>

<template>
  <article class="info-card" :class="`info-card--${variant}`">
    <p class="info-card__label">{{ label }}</p>
    <h3 v-if="heading">{{ heading }}</h3>
    <p v-else-if="body">{{ body }}</p>
    <slot v-else />
  </article>
</template>

<style scoped>
.info-card {
  display: grid;
  gap: 10px;
  padding: 22px;
  border-radius: 22px;
}

.info-card__label {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 700;
}

.info-card h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.42rem;
  line-height: 1.4;
}

.info-card p {
  margin: 0;
  line-height: 1.8;
  font-size: 1rem;
}

.info-card--primary {
  background: linear-gradient(160deg, rgba(229, 248, 237, 0.96), rgba(220, 240, 226, 0.78));
  color: var(--forest-700);
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 63, 0.08),
    0 14px 30px rgba(46, 93, 63, 0.06);
}

.info-card--primary .info-card__label {
  color: rgba(46, 93, 63, 0.66);
}

.info-card--primary h3 {
  color: var(--ink-900);
}

.info-card--warm {
  background: linear-gradient(160deg, rgba(255, 244, 224, 0.96), rgba(252, 232, 209, 0.78));
  color: #8a5a1a;
  box-shadow:
    inset 0 0 0 1px rgba(184, 122, 30, 0.16),
    0 14px 30px rgba(184, 122, 30, 0.08);
}

.info-card--warm .info-card__label {
  color: rgba(138, 90, 26, 0.78);
}

.info-card--warm p {
  color: #6c4516;
}
</style>
```

- [ ] **Step 2: Move CSS for `.info-card` out of AiIdentifyPage.vue**

In `frontend/src/views/client/AiIdentifyPage.vue`, find and **delete** the existing `.info-card`, `.info-card--primary`, `.info-card--warm`, `.info-card__label`, `.info-card h3`, `.info-card p` rule blocks. Use the file's existing line ranges — the rules appear once each, in the `<style scoped>` block. After deletion, the page should have no `.info-card*` selectors.

To find them, search the file for `info-card` (case-sensitive). Each rule should be removed in its entirety (selector + braces + closing brace).

- [ ] **Step 3: Replace the two inline info-card blocks in the page template**

In `frontend/src/views/client/AiIdentifyPage.vue`, find the `<article class="info-card info-card--primary">` block at the "投放要求" position (inside the resolved view-state branch, after the result-head) and replace with:

```vue
<IdentifyInfoCard
  variant="primary"
  label="投放要求"
  :heading="view.displayResult.action"
/>
```

Find the `<article class="info-card info-card--warm">` block immediately after it and replace with:

```vue
<IdentifyInfoCard
  variant="warm"
  label="特别提醒"
  :body="view.displayWarning"
/>
```

Add this import at the top of the `<script setup>`:

```js
import IdentifyInfoCard from "../../components/client/identify/IdentifyInfoCard.vue";
```

(Alphabetical order with the existing CameraCaptureModal import is fine.)

- [ ] **Step 4: Verify both info-card variants still render**

Run: `cd frontend && npm run dev`

- [ ] Sample view shows both info-cards under the result panel: green "投放要求" with heading, warm-yellow "特别提醒" with warning text
- [ ] After uploading a real image and resolving, the same two cards show with the resolved values
- [ ] No console errors
- [ ] Background colors and padding look identical to before

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/client/identify/IdentifyInfoCard.vue \
        frontend/src/views/client/AiIdentifyPage.vue
git commit -m "refactor(ai-identify): extract IdentifyInfoCard atom"
```

---

## Task 5: Extract `IdentifyActionArea.vue`

**Files:**
- Create: `frontend/src/components/client/identify/IdentifyActionArea.vue`
- Modify: `frontend/src/views/client/AiIdentifyPage.vue` (replace action-area block)

- [ ] **Step 1: Create the atom component**

Create `frontend/src/components/client/identify/IdentifyActionArea.vue`:

```vue
<script setup>
import { RouterLink } from "vue-router";

defineProps({
  primaryTo: { type: String, required: true },
  primaryLabel: { type: String, required: true },
  secondary: {
    type: Array,
    required: true,
    validator: (arr) => arr.every((item) => typeof item.to === "string" && typeof item.label === "string"),
  },
});
</script>

<template>
  <div class="action-area">
    <RouterLink class="primary-action" :to="primaryTo">{{ primaryLabel }}</RouterLink>

    <div class="secondary-actions">
      <RouterLink
        v-for="item in secondary"
        :key="item.to"
        class="secondary-action"
        :to="item.to"
      >
        {{ item.label }}
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.action-area {
  display: grid;
  gap: 18px;
  margin-top: 8px;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  padding: 0 28px;
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 1.32rem;
  font-weight: 800;
  text-decoration: none;
  color: #f8fdf9;
  background: linear-gradient(135deg, #5a9768 0%, #4f8d60 40%, #2e5d3f 100%);
  box-shadow:
    0 18px 30px rgba(46, 93, 63, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.primary-action:hover {
  transform: translateY(-2px);
  box-shadow:
    0 22px 38px rgba(46, 93, 63, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.secondary-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0 18px;
  border-radius: 18px;
  font-weight: 700;
  font-size: 0.96rem;
  text-decoration: none;
  color: var(--forest-700);
  background: rgba(229, 248, 237, 0.86);
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 63, 0.08),
    0 8px 18px rgba(31, 60, 42, 0.05);
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

.secondary-action:hover {
  transform: translateY(-1px);
}
</style>
```

- [ ] **Step 2: Move CSS for `.action-area`, `.primary-action`, `.secondary-actions`, `.secondary-action` out of AiIdentifyPage.vue**

In `frontend/src/views/client/AiIdentifyPage.vue`, find and **delete** the existing CSS rules for these four selectors. Search the file to locate each rule block; each is a single rule with its variants.

- [ ] **Step 3: Replace the inline action-area block in the page template**

In `frontend/src/views/client/AiIdentifyPage.vue`, find the `<div v-if="showResultActions" class="action-area">` block (inside the resolved view-state branch) and replace with:

```vue
<IdentifyActionArea
  v-if="view.showResultActions"
  primary-to="/recycle-booking"
  primary-label="一键预约回收"
  :secondary="[
    { to: '/charity', label: '公益捐赠' },
    { to: '/upcycle', label: '旧物改造' },
    { to: '/ai-qa', label: '环保助手' },
  ]"
/>
```

Add this import at the top of the `<script setup>`:

```js
import IdentifyActionArea from "../../components/client/identify/IdentifyActionArea.vue";
```

- [ ] **Step 4: Verify action links still work**

Run: `cd frontend && npm run dev`

- [ ] Sample state shows the "一键预约回收" button + 3 secondary buttons in correct grid layout
- [ ] Each button is clickable and navigates to the right route
- [ ] After image resolves, the same buttons reappear with correct content
- [ ] No console errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/client/identify/IdentifyActionArea.vue \
        frontend/src/views/client/AiIdentifyPage.vue
git commit -m "refactor(ai-identify): extract IdentifyActionArea atom"
```

---

## Task 6: Extract `IdentifyResultPanel.vue`

**Files:**
- Create: `frontend/src/components/client/identify/IdentifyResultPanel.vue`
- Modify: `frontend/src/views/client/AiIdentifyPage.vue` (replace result-panel section)

- [ ] **Step 1: Create the section component**

Create `frontend/src/components/client/identify/IdentifyResultPanel.vue`:

```vue
<script setup>
import { RouterLink } from "vue-router";
import IdentifyInfoCard from "./IdentifyInfoCard.vue";
import IdentifyActionArea from "./IdentifyActionArea.vue";

defineProps({
  viewState: { type: String, required: true }, // 'sample' | 'loading' | 'failed' | 'resolved'
  displayImage: { type: String, required: true },
  displayImageAlt: { type: String, required: true },
  displayResult: { type: Object, required: true },
  displayConfidence: { type: String, required: true },
  displayWarning: { type: String, required: true },
  previewFrameLabel: { type: String, required: true },
  categoryMark: { type: String, required: true },
  showResultActions: { type: Boolean, required: true },
});

const isSample = (state) => state === "sample";
</script>

<template>
  <section class="result-panel" data-reveal style="--reveal-delay: 120ms">
    <div class="result-panel__media">
      <Transition name="result-fade" mode="out-in">
        <div
          :key="displayImage"
          class="preview-stage"
          :class="{
            'is-recognizing': viewState === 'loading',
            'is-sample': isSample(viewState),
          }"
        >
          <img :src="displayImage" :alt="displayImageAlt" />
          <span v-if="isSample(viewState)" class="sample-tag sample-tag--media">示例图片</span>

          <div v-if="viewState === 'loading'" class="preview-stage__scanner" aria-hidden="true">
            <span class="preview-stage__scanner-line" />
          </div>

          <div class="preview-frame">
            <i class="preview-frame__corner preview-frame__corner--tl" />
            <i class="preview-frame__corner preview-frame__corner--tr" />
            <i class="preview-frame__corner preview-frame__corner--bl" />
            <i class="preview-frame__corner preview-frame__corner--br" />

            <div class="preview-frame__label">
              <span class="preview-frame__dot" />
              <span>{{ previewFrameLabel }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <div class="result-panel__body">
      <Transition name="result-fade" mode="out-in">
        <div v-if="viewState === 'loading'" key="loading" class="result-copy result-copy--loading">
          <article class="loading-card" role="status" aria-live="polite">
            <div class="loading-card__signal" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <p class="loading-card__eyebrow">识别加载中</p>
            <h2>AI 正在分析图片</h2>
            <p class="loading-card__description">
              请稍候，我们正在提取图片主体、判断分类，并生成对应的投放建议。
            </p>

            <div class="loading-card__steps" aria-hidden="true">
              <span>读取图像</span>
              <span>特征识别</span>
              <span>生成结果</span>
            </div>
          </article>
        </div>

        <div v-else-if="viewState === 'failed'" key="failed" class="result-copy result-copy--failed">
          <article class="failed-card" role="status" aria-live="polite">
            <p class="failed-card__eyebrow">识别结果</p>
            <h2>{{ displayResult.name }}</h2>
            <p class="failed-card__lead">{{ displayResult.action }}</p>

            <div class="failed-card__tips">
              <article class="info-card info-card--primary">
                <p class="info-card__label">建议重试方式</p>
                <h3>更换清晰、单一主体的图片</h3>
              </article>

              <article class="info-card info-card--warm">
                <p class="info-card__label">拍摄提醒</p>
                <p>{{ displayWarning }}</p>
              </article>
            </div>
          </article>
        </div>

        <div
          v-else
          :key="`${displayResult.name}-${displayResult.category}-${displayConfidence}`"
          class="result-copy"
        >
          <div class="result-head">
            <div class="result-head__copy">
              <div class="result-meta">
                <p class="result-eyebrow">{{ isSample(viewState) ? "系统示例" : "识别结果" }}</p>
                <span v-if="isSample(viewState)" class="sample-tag sample-tag--body">示例结果</span>
              </div>

              <div class="title-row">
                <h2>{{ displayResult.name }}</h2>
                <span class="confidence-pill">{{ displayConfidence }}</span>
              </div>

              <div class="category-row">
                <span class="category-mark">{{ categoryMark }}</span>
                <strong>{{ displayResult.category }}</strong>
              </div>
            </div>
          </div>

          <div class="info-stack">
            <IdentifyInfoCard
              variant="primary"
              label="投放要求"
              :heading="displayResult.action"
            />
            <IdentifyInfoCard
              variant="warm"
              label="特别提醒"
              :body="displayWarning"
            />
          </div>

          <IdentifyActionArea
            v-if="showResultActions"
            primary-to="/recycle-booking"
            primary-label="一键预约回收"
            :secondary="[
              { to: '/charity', label: '公益捐赠' },
              { to: '/upcycle', label: '旧物改造' },
              { to: '/ai-qa', label: '环保助手' },
            ]"
          />
        </div>
      </Transition>
    </div>
  </section>
</template>
```

Note: the failed-card branch keeps **inline** `.info-card` markup rather than using `<IdentifyInfoCard>`. Reason: those two cards (suggestion + photography tip) are only used in the failed state and have static content that doesn't share the resolved-state info-card prop contract (one has hardcoded "更换清晰、单一主体的图片" heading, the other uses `displayWarning` as body). Keeping them inline avoids forcing prop shape changes for one-off content. Their CSS is duplicated below.

- [ ] **Step 2: Add all result-related CSS to the new component**

Append the following CSS rules to `IdentifyResultPanel.vue`'s `<style scoped>` block (under any existing rules). These are the result-panel / preview-stage / preview-frame / sample-tag / result-copy / loading-card / failed-card / result-head / title-row / confidence-pill / category-row / category-mark / eco-badge / result-fade rules from the original page. Plus duplicated `.info-card` rules for the failed-card branch.

```css
.result-panel {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: clamp(28px, 4vw, 56px);
  padding: clamp(28px, 4vw, 50px);
  border-radius: 36px;
  border: 1px solid rgba(46, 93, 63, 0.06);
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.65), transparent 38%),
    linear-gradient(160deg, rgba(247, 252, 248, 0.96), rgba(241, 246, 242, 0.86));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 28px 60px rgba(31, 60, 42, 0.08);
}

.result-panel__media {
  position: relative;
}

.result-panel__body {
  display: flex;
  align-items: stretch;
  padding: 8px 6px;
}

.preview-stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 460px;
  padding: 26px;
  border-radius: 28px;
  overflow: hidden;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.78), rgba(232, 244, 234, 0.5));
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 63, 0.06),
    0 26px 50px rgba(31, 60, 42, 0.1);
}

.preview-stage img {
  max-width: 100%;
  max-height: 420px;
  border-radius: 18px;
  object-fit: cover;
}

.preview-stage.is-sample img {
  filter: saturate(1.05) contrast(1.02);
}

.preview-stage__scanner {
  position: absolute;
  inset: 26px;
  border-radius: 18px;
  pointer-events: none;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgba(46, 93, 63, 0) 0%,
    rgba(46, 93, 63, 0.18) 48%,
    rgba(46, 93, 63, 0) 100%
  );
  mix-blend-mode: multiply;
}

.preview-stage__scanner-line {
  position: absolute;
  left: 6%;
  right: 6%;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(46, 93, 63, 0.78), transparent);
  box-shadow: 0 0 22px rgba(46, 93, 63, 0.5);
  animation: scan 1.8s linear infinite;
}

@keyframes scan {
  0%   { top: 0%; }
  50%  { top: 96%; }
  100% { top: 0%; }
}

.preview-frame {
  position: absolute;
  inset: 14px;
  border-radius: 22px;
  pointer-events: none;
}

.preview-frame__corner {
  position: absolute;
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 4px;
  filter: drop-shadow(0 2px 6px rgba(31, 60, 42, 0.25));
}

.preview-frame__corner--tl { top: -2px; left: -2px;  border-right: 0;  border-bottom: 0; }
.preview-frame__corner--tr { top: -2px; right: -2px; border-left: 0;   border-bottom: 0; }
.preview-frame__corner--bl { bottom: -2px; left: -2px;  border-right: 0; border-top: 0; }
.preview-frame__corner--br { bottom: -2px; right: -2px; border-left: 0;  border-top: 0; }

.preview-frame__label {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(31, 60, 42, 0.78);
  color: #f8fdf9;
  font-family: var(--font-display);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.preview-frame__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c8e6d2;
  box-shadow: 0 0 0 4px rgba(200, 230, 210, 0.25);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}

.sample-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(46, 93, 63, 0.12);
  color: var(--forest-700);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.sample-tag--media {
  position: absolute;
  top: 18px;
  left: 18px;
}

.sample-tag--body {
  background: rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 0 0 1px rgba(46, 93, 63, 0.18);
}

.result-copy {
  display: grid;
  gap: 28px;
  align-content: start;
  flex: 1;
}

.result-copy--loading,
.result-copy--failed {
  align-content: center;
}

.loading-card,
.failed-card {
  display: grid;
  gap: 16px;
  padding: 28px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 63, 0.06),
    0 22px 40px rgba(31, 60, 42, 0.08);
}

.loading-card__signal {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.loading-card__signal span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(46, 93, 63, 0.6), rgba(46, 93, 63, 0.2));
  animation: signal 1.2s ease-in-out infinite;
}

.loading-card__signal span:nth-child(2) { animation-delay: 0.18s; }
.loading-card__signal span:nth-child(3) { animation-delay: 0.36s; }

@keyframes signal {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50%      { transform: translateY(-6px); opacity: 1; }
}

.loading-card__eyebrow,
.failed-card__eyebrow {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(76, 103, 93, 0.72);
  font-weight: 700;
}

.loading-card h2,
.failed-card h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.8rem;
  color: var(--ink-900);
}

.failed-card__lead {
  margin: 0;
  line-height: 1.7;
  color: rgba(76, 103, 93, 0.92);
}

.loading-card__description {
  margin: 0;
  color: rgba(76, 103, 93, 0.88);
  line-height: 1.8;
}

.loading-card__steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(229, 248, 237, 0.6);
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--forest-700);
  text-align: center;
}

.failed-card__tips {
  display: grid;
  gap: 12px;
}

.result-head {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.result-head__copy {
  display: grid;
  gap: 14px;
  flex: 1;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-eyebrow {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(76, 103, 93, 0.72);
  font-weight: 700;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}

.title-row h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.1rem, 3.2vw, 2.9rem);
  color: var(--ink-900);
  letter-spacing: -0.02em;
}

.confidence-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(46, 93, 63, 0.12);
  color: var(--forest-700);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.category-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.category-row strong {
  font-family: var(--font-display);
  font-size: 1.72rem;
  color: var(--forest-700);
  font-weight: 800;
}

.category-mark {
  display: inline-grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(160deg, rgba(229, 248, 237, 0.96), rgba(220, 240, 226, 0.78));
  color: var(--forest-700);
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 800;
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 63, 0.12),
    0 8px 18px rgba(31, 60, 42, 0.08);
}

.eco-badge {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 1.7rem;
  color: var(--forest-700);
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), rgba(220, 240, 226, 0.65));
  box-shadow:
    inset 0 -10px 20px rgba(79, 141, 96, 0.12),
    0 10px 22px rgba(31, 60, 42, 0.08);
}

.info-stack {
  display: grid;
  gap: 14px;
}

/* duplicated .info-card rules — used only by failed-card's static content */
.info-card {
  display: grid;
  gap: 10px;
  padding: 22px;
  border-radius: 22px;
}

.info-card__label {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 700;
}

.info-card h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.42rem;
  line-height: 1.4;
}

.info-card p {
  margin: 0;
  line-height: 1.8;
  font-size: 1rem;
}

.info-card--primary {
  background: linear-gradient(160deg, rgba(229, 248, 237, 0.96), rgba(220, 240, 226, 0.78));
  color: var(--forest-700);
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 63, 0.08),
    0 14px 30px rgba(46, 93, 63, 0.06);
}

.info-card--primary .info-card__label {
  color: rgba(46, 93, 63, 0.66);
}

.info-card--primary h3 {
  color: var(--ink-900);
}

.info-card--warm {
  background: linear-gradient(160deg, rgba(255, 244, 224, 0.96), rgba(252, 232, 209, 0.78));
  color: #8a5a1a;
  box-shadow:
    inset 0 0 0 1px rgba(184, 122, 30, 0.16),
    0 14px 30px rgba(184, 122, 30, 0.08);
}

.info-card--warm .info-card__label {
  color: rgba(138, 90, 26, 0.78);
}

.info-card--warm p {
  color: #6c4516;
}

/* result-fade transition */
.result-fade-enter-active,
.result-fade-leave-active {
  transition: opacity 240ms ease;
}
.result-fade-enter-from,
.result-fade-leave-to {
  opacity: 0;
}

@media (max-width: 880px) {
  .result-panel {
    grid-template-columns: 1fr;
    border-radius: 26px;
  }

  .preview-stage {
    min-height: 360px;
  }

  .preview-frame {
    inset: 26px;
  }

  .preview-frame__label {
    max-width: calc(100% - 24px);
    padding-inline: 10px;
    font-size: 0.58rem;
    letter-spacing: 0.08em;
    white-space: normal;
    text-align: center;
  }

  .result-panel__body {
    padding: 24px 20px 22px;
  }

  .result-copy {
    gap: 24px;
  }

  .result-head {
    flex-direction: column;
  }

  .title-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .title-row h2 {
    font-size: 2.25rem;
  }

  .category-row strong {
    font-size: 1.55rem;
  }

  .eco-badge {
    width: 64px;
    height: 64px;
  }

  .info-card {
    padding: 18px;
  }

  .info-card h3 {
    font-size: 1.24rem;
  }

  .info-card p {
    font-size: 0.95rem;
  }

  .primary-action {
    min-height: 58px;
    font-size: 1.24rem;
  }

  .secondary-actions {
    grid-template-columns: 1fr;
  }

  .secondary-action {
    min-height: 58px;
    font-size: 1rem;
  }
}
```

- [ ] **Step 3: Move the result-panel CSS out of AiIdentifyPage.vue**

In `frontend/src/views/client/AiIdentifyPage.vue`, find and **delete** all CSS rules whose selector starts with: `.result-panel`, `.preview-stage`, `.preview-frame`, `.sample-tag`, `.result-copy`, `.loading-card`, `.failed-card`, `.result-head`, `.result-meta`, `.result-eyebrow`, `.title-row`, `.confidence-pill`, `.category-row`, `.category-mark`, `.eco-badge`, `.info-stack`. Also delete the `.result-fade-enter-active` / `-enter-from` / `-leave-active` / `-leave-to` rules. Also delete the result-panel section of the responsive `@media (max-width: 880px)` block.

Search the file for each prefix to locate the rules.

- [ ] **Step 4: Replace the inline result-panel block in the page template**

In `frontend/src/views/client/AiIdentifyPage.vue`, find the entire `<section class="result-panel" data-reveal ...>...</section>` block and replace with:

```vue
<IdentifyResultPanel
  :view-state="view.viewState"
  :display-image="view.displayImage"
  :display-image-alt="view.displayImageAlt"
  :display-result="view.displayResult"
  :display-confidence="view.displayConfidence"
  :display-warning="view.displayWarning"
  :preview-frame-label="view.previewFrameLabel"
  :category-mark="view.categoryMark"
  :show-result-actions="view.showResultActions"
/>
```

Add this import at the top of the `<script setup>`:

```js
import IdentifyResultPanel from "../../components/client/identify/IdentifyResultPanel.vue";
```

- [ ] **Step 5: Verify all 4 view states still render correctly**

Run: `cd frontend && npm run dev`

- [ ] Sample state: image preview with corner brackets, "SAMPLE PREVIEW" label, sample tag, sample card body with "系统示例" eyebrow
- [ ] Loading state (during recognition): scanner line animates, loading-card shows
- [ ] Failed state: failed-card with retry tips shows
- [ ] Resolved state: title + confidence pill + category mark + info-stack + action area
- [ ] Fade transitions between states work (no jumpy flash)
- [ ] No console errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/client/identify/IdentifyResultPanel.vue \
        frontend/src/views/client/AiIdentifyPage.vue
git commit -m "refactor(ai-identify): extract IdentifyResultPanel section"
```

---

## Task 7: Extract `IdentifyHeroPanel.vue`

**Files:**
- Create: `frontend/src/components/client/identify/IdentifyHeroPanel.vue`
- Modify: `frontend/src/views/client/AiIdentifyPage.vue` (replace hero-panel section)

- [ ] **Step 1: Create the section component**

Create `frontend/src/components/client/identify/IdentifyHeroPanel.vue`:

```vue
<script setup>
import IdentifyInfoCard from "./IdentifyInfoCard.vue";

const props = defineProps({
  recognitionMode: { type: String, required: true }, // 'single' | 'batch'
  recognizing: { type: Boolean, required: true },
  uploadHeadline: { type: String, required: true },
  uploadSummary: { type: String, required: true },
  devNoticeVisible: { type: Boolean, required: true },
});

const emit = defineEmits(["mode-change", "camera-open", "album-trigger"]);

const isSingle = () => props.recognitionMode === "single";
</script>

<template>
  <section class="hero-panel" data-reveal>
    <div class="hero-copy">
      <h1>识别身边的废弃物</h1>
      <p>智能AI实时检测分类，让每一份资源重获新生</p>
    </div>

    <div class="mode-switch" role="tablist" aria-label="识别模式">
      <span
        class="mode-switch__indicator"
        :style="{ transform: isSingle() ? 'translateX(0)' : 'translateX(100%)' }"
      />

      <button
        type="button"
        class="mode-switch__button"
        :class="{ 'is-active': recognitionMode === 'single' }"
        :aria-selected="recognitionMode === 'single'"
        @click="emit('mode-change', 'single')"
      >
        <span>单件识别</span>
        <small>最适合单一物品</small>
      </button>

      <button
        type="button"
        class="mode-switch__button"
        :class="{ 'is-active': recognitionMode === 'batch' }"
        :aria-selected="recognitionMode === 'batch'"
        @click="emit('mode-change', 'batch')"
      >
        <span>批量识别</span>
        <small>多件或混合垃圾</small>
      </button>
    </div>

    <div class="upload-panel">
      <div class="upload-panel__content">
        <div class="focus-badge" aria-hidden="true">
          <span class="focus-badge__frame" />
          <span class="focus-badge__core" />
        </div>

        <div class="upload-copy">
          <h2>{{ uploadHeadline }}</h2>
          <p>{{ uploadSummary }}</p>
        </div>

        <div class="upload-actions" :class="{ 'is-batch': recognitionMode === 'batch' }">
          <button
            type="button"
            class="upload-button upload-button--primary"
            data-testid="camera-trigger"
            :disabled="recognizing && isSingle()"
            @click="emit('camera-open')"
          >
            <span class="upload-button__icon">◔</span>
            <span>{{ recognizing && isSingle() ? "识别中..." : "拍照识别" }}</span>
          </button>

          <button
            type="button"
            class="upload-button upload-button--secondary"
            data-testid="album-trigger"
            :disabled="recognizing && isSingle()"
            @click="emit('album-trigger')"
          >
            <span class="upload-button__icon">▣</span>
            <span>相册上传</span>
          </button>
        </div>

        <Transition name="notice-slide">
          <p v-if="devNoticeVisible" class="dev-notice">批量识别功能正在开发中，敬请期待</p>
        </Transition>

        <div class="upload-links">
          <button type="button" class="upload-link">
            <span>⌕</span>
            <span>语音识别</span>
          </button>
          <button type="button" class="upload-link">
            <span>≡</span>
            <span>文本搜索</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-panel {
  position: relative;
  display: grid;
  gap: 28px;
  padding: clamp(32px, 4vw, 58px);
  border-radius: 36px;
  border: 1px solid rgba(46, 93, 63, 0.06);
  background:
    radial-gradient(circle at 14% 18%, rgba(194, 131, 47, 0.1), transparent 26%),
    radial-gradient(circle at 84% 82%, rgba(79, 141, 96, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(246, 241, 232, 0.94), rgba(241, 236, 226, 0.86));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 28px 60px rgba(31, 60, 42, 0.08);
}

.hero-copy {
  display: grid;
  gap: 12px;
  justify-items: center;
  text-align: center;
}

.hero-copy h1 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 5vw, 4.5rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.hero-copy p {
  margin: 0;
  color: rgba(76, 103, 93, 0.86);
  font-size: 1.08rem;
  line-height: 1.8;
}

.mode-switch {
  position: relative;
  width: min(100%, 286px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  padding: 6px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 63, 0.08),
    0 10px 26px rgba(33, 71, 49, 0.06);
}

.mode-switch__indicator {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 6px;
  width: calc(50% - 6px);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    0 10px 22px rgba(31, 60, 42, 0.08),
    inset 0 0 0 1px rgba(46, 93, 63, 0.04);
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.mode-switch__button {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 5px;
  justify-items: center;
  padding: 16px 12px 14px;
  border-radius: 16px;
  background: transparent;
  color: rgba(76, 103, 93, 0.88);
  cursor: pointer;
  transition:
    color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    text-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.mode-switch__button span {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
}

.mode-switch__button small {
  color: inherit;
  font-size: 0.72rem;
}

.mode-switch__button.is-active {
  color: var(--forest-700);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.upload-panel {
  width: min(100%, 860px);
  margin: 0 auto;
  padding: clamp(26px, 4vw, 42px);
  border-radius: 32px;
  border: 2px dashed rgba(79, 141, 96, 0.18);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 30px 56px rgba(31, 60, 42, 0.08);
}

.upload-panel__content {
  display: grid;
  justify-items: center;
  gap: 24px;
  text-align: center;
}

.focus-badge {
  position: relative;
  display: grid;
  place-items: center;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(233, 246, 236, 0.98), rgba(220, 238, 225, 0.74));
  box-shadow:
    inset 0 -10px 20px rgba(79, 141, 96, 0.12),
    0 10px 20px rgba(79, 141, 96, 0.08);
}

.focus-badge__frame,
.focus-badge__core {
  position: absolute;
}

.focus-badge__frame {
  width: 34px;
  height: 34px;
  border: 3px solid var(--moss-500);
  border-radius: 10px;
}

.focus-badge__frame::before,
.focus-badge__frame::after {
  content: "";
  position: absolute;
  inset: 7px;
  border: 3px solid transparent;
}

.focus-badge__frame::before {
  border-top-color: var(--moss-500);
  border-left-color: var(--moss-500);
}

.focus-badge__frame::after {
  border-right-color: var(--moss-500);
  border-bottom-color: var(--moss-500);
}

.focus-badge__core {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--moss-500);
}

.upload-copy {
  display: grid;
  gap: 10px;
}

.upload-copy h2 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: 1.7rem;
}

.upload-copy p {
  margin: 0;
  max-width: 36rem;
  color: rgba(76, 103, 93, 0.9);
  line-height: 1.82;
}

.upload-actions {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.upload-actions.is-batch .upload-button {
  cursor: pointer;
}

.upload-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 64px;
  padding: 0 20px;
  border-radius: 18px;
  font-family: var(--font-display);
  font-size: 1.22rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1),
    background 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.upload-button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.upload-button:disabled {
  cursor: progress;
  opacity: 0.9;
}

.upload-button__icon {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 0.82rem;
}

.upload-button--primary {
  color: #f8fdf9;
  background: linear-gradient(135deg, #5a9768 0%, #4f8d60 40%, #2e5d3f 100%);
  box-shadow: 0 18px 30px rgba(46, 93, 63, 0.18);
}

.upload-button--primary .upload-button__icon {
  background: rgba(255, 255, 255, 0.14);
}

.upload-button--secondary {
  color: var(--forest-700);
  background: rgba(229, 248, 237, 0.9);
  box-shadow: inset 0 0 0 1px rgba(46, 93, 63, 0.08);
}

.upload-button--secondary .upload-button__icon {
  background: rgba(79, 141, 96, 0.12);
}

.dev-notice {
  margin: 0;
  padding: 12px 18px;
  border-radius: 999px;
  background: rgba(229, 248, 237, 0.88);
  color: var(--forest-700);
  font-size: 0.94rem;
  font-weight: 700;
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 63, 0.08),
    0 10px 24px rgba(31, 60, 42, 0.08);
}

.upload-links {
  display: inline-flex;
  align-items: center;
  gap: 14px;
}

.upload-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: transparent;
  color: rgba(76, 103, 93, 0.86);
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 200ms ease;
}

.upload-link:hover {
  background: rgba(229, 248, 237, 0.6);
}

/* mode-swap transition (used to wrap the upload-panel__content but the parent component uses it as a single child; keep class available in case future extraction wants it) */
.mode-swap-enter-active,
.mode-swap-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}
.mode-swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.mode-swap-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* notice-slide transition */
.notice-slide-enter-active,
.notice-slide-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.notice-slide-enter-from,
.notice-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 880px) {
  .hero-panel {
    padding: 28px 22px;
    border-radius: 28px;
  }

  .hero-copy h1 {
    font-size: 2.4rem;
  }

  .mode-switch {
    width: 100%;
  }

  .upload-actions {
    grid-template-columns: 1fr;
  }

  .upload-button {
    min-height: 56px;
    font-size: 1.06rem;
  }
}
```

Note on imports: the component declares `import IdentifyInfoCard from "./IdentifyInfoCard.vue"` in the script but does **not use** `<IdentifyInfoCard>` in the template — the original `hero-panel` markup doesn't contain an info-card. **Remove that import** before saving; it's a leftover from copy-paste risk. The correct script block is:

```js
<script setup>
const props = defineProps({
  recognitionMode: { type: String, required: true },
  recognizing: { type: Boolean, required: true },
  uploadHeadline: { type: String, required: true },
  uploadSummary: { type: String, required: true },
  devNoticeVisible: { type: Boolean, required: true },
});

const emit = defineEmits(["mode-change", "camera-open", "album-trigger"]);

const isSingle = () => props.recognitionMode === "single";
</script>
```

Use this corrected version (no `IdentifyInfoCard` import).

- [ ] **Step 2: Move hero-related CSS out of AiIdentifyPage.vue**

In `frontend/src/views/client/AiIdentifyPage.vue`, find and **delete** all CSS rules whose selector starts with: `.hero-panel`, `.hero-copy`, `.mode-switch`, `.upload-panel`, `.focus-badge`, `.upload-copy`, `.upload-actions`, `.upload-button`, `.dev-notice`, `.upload-links`. Also delete the `.mode-swap-*` and `.notice-slide-*` transition rules. Also delete the hero-panel section of the responsive `@media (max-width: 880px)` block.

Search the file for each prefix to locate the rules.

- [ ] **Step 3: Replace the inline hero-panel block in the page template**

In `frontend/src/views/client/AiIdentifyPage.vue`, find the entire `<section class="hero-panel" data-reveal>...</section>` block and replace with:

```vue
<IdentifyHeroPanel
  :recognition-mode="recognitionMode"
  :recognizing="recognition.recognizing"
  :upload-headline="view.uploadHeadline"
  :upload-summary="view.uploadSummary"
  :dev-notice-visible="devNoticeVisible"
  @mode-change="switchRecognitionMode"
  @camera-open="openCameraCapture"
  @album-trigger="triggerUpload"
/>
```

Add this import at the top of the `<script setup>`:

```js
import IdentifyHeroPanel from "../../components/client/identify/IdentifyHeroPanel.vue";
```

- [ ] **Step 4: Verify hero panel interactions**

Run: `cd frontend && npm run dev`

- [ ] Hero copy renders (title + subtitle)
- [ ] Mode switch slider moves smoothly between single/batch
- [ ] Switching to "批量识别" shows dev notice toast, auto-dismisses after ~2.4s
- [ ] Switching back to "单件识别" hides dev notice immediately
- [ ] "拍照识别" button opens camera modal
- [ ] "相册上传" button opens file picker
- [ ] When recognizing, both upload buttons show "识别中..." / disabled state in single mode
- [ ] Upload focus badge animates correctly
- [ ] No console errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/client/identify/IdentifyHeroPanel.vue \
        frontend/src/views/client/AiIdentifyPage.vue
git commit -m "refactor(ai-identify): extract IdentifyHeroPanel section"
```

---

## Task 8: Final cleanup and verification

**Files:**
- Modify: `frontend/src/views/client/AiIdentifyPage.vue` (verify and trim)
- Read-only verification: all newly-created files

- [ ] **Step 1: Verify AiIdentifyPage.vue is now thin and focused**

Open `frontend/src/views/client/AiIdentifyPage.vue`. The file should now contain:
- A `<script setup>` block calling both composables, owning UI state (`recognitionMode`, `cameraModalOpen`, `devNoticeVisible`), with helper functions (`showDevNotice`, `switchRecognitionMode`, `triggerUpload`, `openCameraCapture`, `closeCameraCapture`, `handleImageUpload`, `handleCameraConfirm`, `clearDevNoticeTimer`)
- A `<template>` block containing only: page root `<section ref="pageRef" class="identify-page">` → `<IdentifyHeroPanel />` → `<IdentifyResultPanel />` → `<CameraCaptureModal />`
- A `<style scoped>` block containing only: `.sr-only`, `.identify-page`, the `@media prefers-reduced-motion` block, and button/a base resets

If anything else remains (e.g., `.eco-badge` rules, leftover `.info-card` rules, transition rules that should have moved), delete it. The page should be under ~250 lines total.

- [ ] **Step 2: Run full browser end-to-end smoke test**

Run: `cd frontend && npm run dev`

Open the AI 识别 page and verify the entire flow:

- [ ] Initial render: sample state with all visual elements in place
- [ ] Upload a real JPG → loading → resolves to mock result
- [ ] Switch to batch mode → dev notice appears and disappears
- [ ] Switch back to single → dev notice clears immediately
- [ ] Open camera modal → close it → camera modal disappears
- [ ] Click each secondary action link → navigates to correct route
- [ ] Click primary action link → navigates to /recycle-booking
- [ ] Reload page → state resets to sample
- [ ] Open browser devtools → no console errors or warnings
- [ ] Check Network tab → no 404s on newly created files

- [ ] **Step 3: Run production build**

Run: `cd frontend && npm run build`
Expected: build completes without errors. Check the output bundle size — `frontend/dist/assets/*.js` should be similar to or smaller than before (since splitting should not bloat the bundle; common chunks get reused).

- [ ] **Step 4: Run the test command (should pass with no tests)**

Run: `cd frontend && npm test`
Expected: vitest exits cleanly with "No test files found" or similar — `--passWithNoTests` should not fail. If vitest complains about a missing config, that's a pre-existing condition; don't fix it now.

- [ ] **Step 5: Final commit (only if cleanup touched files)**

If step 1 made deletions or other edits:

```bash
git add frontend/src/views/client/AiIdentifyPage.vue
git commit -m "refactor(ai-identify): trim page to orchestrator-only"
```

If nothing changed in step 1, skip this commit.

- [ ] **Step 6: Final summary commit (documentation)**

No source changes; this step is optional. If you want a marker commit for "refactor complete", create or update a project-level note (e.g., add a one-liner to `项目介绍.md` mentioning the new component layout). If you skip this, that's fine.

---

## Self-Review Notes (for the implementer)

Before declaring the plan complete, the implementer should mentally check:

1. **Spec coverage**: the spec defines 4 components + 2 composables. Tasks 1, 2 create the composables. Tasks 4, 5, 6, 7 create the 4 components. Task 3 wires the page to the composables. Task 8 cleans up. All covered.
2. **Behavior preservation**: each task's verification step explicitly enumerates the behaviors that must remain unchanged (transitions, animations, click targets, navigation). The plan includes the existing `.eco-badge` rule removal as part of Task 6 (it has no consumer).
3. **Type / name consistency**:
   - `recognition.recognize(file, name?)` — consistent across Tasks 1 and 3.
   - `view.viewState`, `view.displayResult`, etc. — consistent across Tasks 2, 3, 6, 7.
   - `recognition.imageUrl` etc. — consistent in Tasks 3 and 6/7.
   - Emits `@mode-change`, `@camera-open`, `@album-trigger` — defined in Task 7 component, used in Task 7 template.
   - Info-card props `variant`, `label`, `heading`, `body` — defined in Task 4 component, used in Tasks 6 and 7.
   - ActionArea props `primaryTo`, `primaryLabel`, `secondary` — defined in Task 5, used in Task 6.
4. **Placeholder scan**: every code step shows complete content. No "TODO" or "similar to Task N". CSS rules are pasted in full where they appear.
5. **One known typo trap**: Task 7 step 1 has a wrong import line in the `<script setup>` example block (leftover from copy-paste). The corrected version is in the paragraph below it. **Use the corrected version, not the example block.**