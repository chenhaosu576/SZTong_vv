<script setup>
import { onBeforeUnmount, reactive, ref } from "vue";

import CameraCaptureModal from "../../components/client/CameraCaptureModal.vue";
import IdentifyResultPanel from "../../components/client/identify/IdentifyResultPanel.vue";
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

const recognitionState = useImageRecognition();
const recognition = reactive(recognitionState);
const view = reactive(
  useRecognitionViewState({
    imageUrl: recognitionState.imageUrl,
    imageName: recognitionState.imageName,
    recognizing: recognitionState.recognizing,
    results: recognitionState.results,
    recognitionMode,
  }),
);

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
  if (recognition.recognizing && recognitionMode.value === "single") return;
  if (recognitionMode.value === "batch") {
    showDevNotice();
    return;
  }
  uploadInput.value?.click();
}

function openCameraCapture() {
  if (recognition.recognizing && recognitionMode.value === "single") return;
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
  if (!payload?.file || recognition.recognizing) return;
  closeCameraCapture();
  await recognition.recognize(payload.file, payload.fileName || payload.file.name);
}

onBeforeUnmount(() => {
  clearDevNoticeTimer();
});
</script>

<template>
  <section ref="pageRef" class="identify-page">
    <section class="hero-panel" data-reveal>
      <div class="hero-copy">
        <h1>识别身边的废弃物</h1>
        <p>智能AI实时检测分类，让每一份资源重获新生</p>
      </div>

      <div class="mode-switch" role="tablist" aria-label="识别模式">
        <span
          class="mode-switch__indicator"
          :style="{ transform: recognitionMode === 'single' ? 'translateX(0)' : 'translateX(100%)' }"
        />

        <button
          type="button"
          class="mode-switch__button"
          :class="{ 'is-active': recognitionMode === 'single' }"
          :aria-selected="recognitionMode === 'single'"
          @click="switchRecognitionMode('single')"
        >
          <span>单件识别</span>
          <small>最适合单一物品</small>
        </button>

        <button
          type="button"
          class="mode-switch__button"
          :class="{ 'is-active': recognitionMode === 'batch' }"
          :aria-selected="recognitionMode === 'batch'"
          @click="switchRecognitionMode('batch')"
        >
          <span>批量识别</span>
          <small>多件或混合垃圾</small>
        </button>
      </div>

      <div class="upload-panel">
        <input
          ref="uploadInput"
          class="sr-only"
          type="file"
          accept="image/*"
          @change="handleImageUpload"
        />

        <Transition name="mode-swap" mode="out-in">
          <div :key="recognitionMode" class="upload-panel__content">
            <div class="focus-badge" aria-hidden="true">
              <span class="focus-badge__frame" />
              <span class="focus-badge__core" />
            </div>

            <div class="upload-copy">
              <h2>{{ view.uploadHeadline }}</h2>
              <p>{{ view.uploadSummary }}</p>
            </div>

            <div class="upload-actions" :class="{ 'is-batch': recognitionMode === 'batch' }">
              <button
                type="button"
                class="upload-button upload-button--primary"
                data-testid="camera-trigger"
                :disabled="recognition.recognizing && recognitionMode === 'single'"
                @click="openCameraCapture"
              >
                <span class="upload-button__icon">◔</span>
                <span>{{ recognition.recognizing && recognitionMode === "single" ? "识别中..." : "拍照识别" }}</span>
              </button>

              <button
                type="button"
                class="upload-button upload-button--secondary"
                data-testid="album-trigger"
                :disabled="recognition.recognizing && recognitionMode === 'single'"
                @click="triggerUpload"
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
        </Transition>
      </div>
    </section>

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
    <CameraCaptureModal
      :open="cameraModalOpen"
      :busy="recognition.recognizing && recognitionMode === 'single'"
      @close="closeCameraCapture"
      @confirm="handleCameraConfirm"
    />
  </section>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

button,
a {
  font: inherit;
}

button {
  appearance: none;
  border: 0;
}

.identify-page {
  display: grid;
  gap: 44px;
  padding: 12px 0 36px;
}

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
    0 10px 18px rgba(46, 93, 63, 0.06);
}

.upload-links {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 40px;
  padding-top: 20px;
  border-top: 1px solid rgba(46, 93, 63, 0.08);
}

.upload-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  background: transparent;
  color: rgba(54, 84, 72, 0.9);
  font-weight: 700;
  cursor: pointer;
  transition: color 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.upload-link:hover {
  color: var(--forest-700);
}

.mode-swap-enter-active,
.mode-swap-leave-active,
.notice-slide-enter-active,
.notice-slide-leave-active {
  transition:
    opacity 220ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.mode-swap-enter-from,
.mode-swap-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.notice-slide-enter-from,
.notice-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 760px) {
  .identify-page {
    gap: 28px;
    padding-bottom: 20px;
  }

  .hero-panel {
    gap: 22px;
    padding: 22px;
    border-radius: 26px;
  }

  .hero-copy h1 {
    font-size: 2.35rem;
  }

  .hero-copy p {
    font-size: 0.96rem;
  }

  .mode-switch {
    width: 100%;
  }

  .upload-panel {
    padding: 22px 18px;
    border-radius: 24px;
  }

  .upload-copy h2 {
    font-size: 1.4rem;
  }

  .upload-actions {
    grid-template-columns: 1fr;
  }

  .upload-button {
    min-height: 58px;
    font-size: 1.06rem;
  }

  .upload-links {
    gap: 18px;
    flex-wrap: wrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
