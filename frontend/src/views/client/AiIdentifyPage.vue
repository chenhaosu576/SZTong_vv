<script setup>
import { onBeforeUnmount, reactive, ref } from "vue";

import CameraCaptureModal from "../../components/client/CameraCaptureModal.vue";
import IdentifyActionArea from "../../components/client/identify/IdentifyActionArea.vue";
import IdentifyInfoCard from "../../components/client/identify/IdentifyInfoCard.vue";
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

    <section class="result-panel" data-reveal style="--reveal-delay: 120ms">
      <div class="result-panel__media">
        <Transition name="result-fade" mode="out-in">
          <div
            :key="view.displayImage"
            class="preview-stage"
            :class="{
              'is-recognizing': view.viewState === 'loading',
              'is-sample': view.viewState === 'sample',
            }"
          >
            <img :src="view.displayImage" :alt="view.displayImageAlt" />
            <span v-if="view.viewState === 'sample'" class="sample-tag sample-tag--media">示例图片</span>

            <div v-if="view.viewState === 'loading'" class="preview-stage__scanner" aria-hidden="true">
              <span class="preview-stage__scanner-line" />
            </div>

            <div class="preview-frame">
              <i class="preview-frame__corner preview-frame__corner--tl" />
              <i class="preview-frame__corner preview-frame__corner--tr" />
              <i class="preview-frame__corner preview-frame__corner--bl" />
              <i class="preview-frame__corner preview-frame__corner--br" />

              <div class="preview-frame__label">
                <span class="preview-frame__dot" />
                <span>{{ view.previewFrameLabel }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <div class="result-panel__body">
        <Transition name="result-fade" mode="out-in">
          <div v-if="view.viewState === 'loading'" key="loading" class="result-copy result-copy--loading">
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

          <div v-else-if="view.viewState === 'failed'" key="failed" class="result-copy result-copy--failed">
            <article class="failed-card" role="status" aria-live="polite">
              <p class="failed-card__eyebrow">识别结果</p>
              <h2>{{ view.displayResult.name }}</h2>
              <p class="failed-card__lead">{{ view.displayResult.action }}</p>

              <div class="failed-card__tips">
                <IdentifyInfoCard
                  variant="primary"
                  label="建议重试方式"
                  heading="更换清晰、单一主体的图片"
                />

                <IdentifyInfoCard
                  variant="warm"
                  label="拍摄提醒"
                  :body="view.displayWarning"
                />
              </div>
            </article>
          </div>

          <div
            v-else
            :key="`${view.displayResult.name}-${view.displayResult.category}-${view.displayConfidence}`"
            class="result-copy"
          >
            <div class="result-head">
              <div class="result-head__copy">
                <div class="result-meta">
                  <p class="result-eyebrow">{{ view.viewState === 'sample' ? "系统示例" : "识别结果" }}</p>
                  <span v-if="view.viewState === 'sample'" class="sample-tag sample-tag--body">示例结果</span>
                </div>

                <div class="title-row">
                  <h2>{{ view.displayResult.name }}</h2>
                  <span class="confidence-pill">{{ view.displayConfidence }}</span>
                </div>

                <div class="category-row">
                  <span class="category-mark">{{ view.categoryMark }}</span>
                  <strong>{{ view.displayResult.category }}</strong>
                </div>
              </div>
            </div>

            <div class="info-stack">
              <IdentifyInfoCard
                variant="primary"
                label="投放要求"
                :heading="view.displayResult.action"
              />

              <IdentifyInfoCard
                variant="warm"
                label="特别提醒"
                :body="view.displayWarning"
              />
            </div>

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
          </div>
        </Transition>
      </div>
    </section>
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

.result-panel {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  overflow: hidden;
  border-radius: 34px;
  border: 1px solid rgba(46, 93, 63, 0.08);
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    0 28px 60px rgba(29, 58, 40, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.result-panel__media {
  background:
    linear-gradient(180deg, rgba(217, 231, 221, 0.34), rgba(234, 240, 235, 0.1)),
    rgba(224, 236, 228, 0.3);
}

.preview-stage {
  position: relative;
  min-height: 630px;
  overflow: hidden;
}

.sample-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 248, 231, 0.94);
  color: #8a621d;
  box-shadow:
    inset 0 0 0 1px rgba(194, 131, 47, 0.22),
    0 10px 22px rgba(138, 98, 29, 0.12);
  font-family: var(--font-data);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.sample-tag--media {
  position: absolute;
  top: 26px;
  left: 26px;
  z-index: 2;
}

.preview-stage::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(14, 33, 23, 0.08), transparent 25%, transparent 70%, rgba(14, 33, 23, 0.16)),
    radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.22), transparent 42%);
  pointer-events: none;
}

.preview-stage img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-stage.is-recognizing img {
  filter: saturate(0.92) contrast(1.02);
}

.preview-stage__scanner {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(17, 39, 28, 0.04), rgba(17, 39, 28, 0.2)),
    repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.02) 0,
      rgba(255, 255, 255, 0.02) 6px,
      transparent 6px,
      transparent 12px
    );
}

.preview-stage__scanner-line {
  position: absolute;
  left: 22px;
  right: 22px;
  height: 132px;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    rgba(163, 233, 188, 0),
    rgba(163, 233, 188, 0.22) 28%,
    rgba(163, 233, 188, 0.82) 50%,
    rgba(163, 233, 188, 0.22) 72%,
    rgba(163, 233, 188, 0)
  );
  filter: blur(0.2px);
  animation: scannerSweep 2.3s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

.preview-frame {
  position: absolute;
  inset: 42px;
  border: 2px solid rgba(79, 141, 96, 0.6);
  border-radius: 26px;
  z-index: 1;
}

.preview-frame__corner {
  position: absolute;
  width: 38px;
  height: 38px;
  border-color: var(--moss-500);
  border-style: solid;
}

.preview-frame__corner--tl {
  top: -2px;
  left: -2px;
  border-width: 4px 0 0 4px;
  border-top-left-radius: 18px;
}

.preview-frame__corner--tr {
  top: -2px;
  right: -2px;
  border-width: 4px 4px 0 0;
  border-top-right-radius: 18px;
}

.preview-frame__corner--bl {
  left: -2px;
  bottom: -2px;
  border-width: 0 0 4px 4px;
  border-bottom-left-radius: 18px;
}

.preview-frame__corner--br {
  right: -2px;
  bottom: -2px;
  border-width: 0 4px 4px 0;
  border-bottom-right-radius: 18px;
}

.preview-frame__label {
  position: absolute;
  top: -18px;
  left: 50%;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #5a9768 0%, #4f8d60 55%, #2e5d3f 100%);
  color: #f6fbf7;
  font-family: var(--font-data);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  transform: translateX(-50%);
  box-shadow: 0 14px 26px rgba(46, 93, 63, 0.24);
  white-space: nowrap;
}

.preview-frame__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffffff;
}

.result-panel__body {
  padding: clamp(30px, 4vw, 52px);
}

.result-copy {
  display: grid;
  gap: 34px;
}

.result-copy--loading,
.result-copy--failed {
  align-content: center;
  min-height: 100%;
}

.result-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.result-head__copy {
  display: grid;
  gap: 18px;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.result-eyebrow {
  margin: 0;
  color: rgba(76, 103, 93, 0.82);
  font-family: var(--font-data);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.sample-tag--body {
  padding: 6px 12px;
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.title-row h2 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 4vw, 4rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
}

.confidence-pill {
  padding: 7px 14px;
  border-radius: 999px;
  background: rgba(229, 248, 237, 0.9);
  color: var(--moss-500);
  box-shadow: inset 0 0 0 1px rgba(46, 93, 63, 0.08);
  font-family: var(--font-data);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.category-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.category-mark {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--moss-500);
  font-size: 1.1rem;
  font-weight: 700;
}

.category-row strong {
  color: var(--moss-500);
  font-family: var(--font-display);
  font-size: 1.95rem;
}

.eco-badge {
  display: grid;
  place-items: center;
  width: 78px;
  height: 78px;
  border-radius: 18px;
  background: rgba(229, 248, 237, 0.9);
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 63, 0.05),
    inset 0 -10px 20px rgba(79, 141, 96, 0.08);
}

.eco-badge span {
  color: var(--forest-600);
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
}

.info-stack {
  display: grid;
  gap: 16px;
}

.loading-card,
.failed-card {
  display: grid;
  gap: 22px;
  padding: clamp(26px, 3vw, 34px);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 248, 245, 0.96)),
    rgba(255, 255, 255, 0.96);
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 63, 0.08),
    0 22px 46px rgba(29, 58, 40, 0.08);
}

.loading-card__signal {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.loading-card__signal span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #73b387, #2e5d3f);
  animation: loadingPulse 1.1s ease-in-out infinite;
}

.loading-card__signal span:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-card__signal span:nth-child(3) {
  animation-delay: 0.3s;
}

.loading-card__eyebrow,
.failed-card__eyebrow {
  margin: 0;
  color: var(--moss-500);
  font-family: var(--font-data);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.loading-card h2,
.failed-card h2 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.loading-card__description,
.failed-card__lead {
  margin: 0;
  color: rgba(76, 103, 93, 0.92);
  font-size: 1.04rem;
  line-height: 1.86;
}

.loading-card__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.loading-card__steps span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  background: rgba(229, 248, 237, 0.84);
  color: var(--forest-700);
  box-shadow: inset 0 0 0 1px rgba(46, 93, 63, 0.08);
  font-size: 0.9rem;
  font-weight: 700;
}

.failed-card {
  background:
    linear-gradient(180deg, rgba(255, 251, 244, 0.98), rgba(255, 255, 255, 0.96)),
    rgba(255, 255, 255, 0.96);
}

.failed-card__tips {
  display: grid;
  gap: 16px;
}

.mode-swap-enter-active,
.mode-swap-leave-active,
.notice-slide-enter-active,
.notice-slide-leave-active,
.result-fade-enter-active,
.result-fade-leave-active {
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

.result-fade-enter-from,
.result-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes scannerSweep {
  0% {
    top: -132px;
    opacity: 0;
  }

  15%,
  85% {
    opacity: 1;
  }

  100% {
    top: calc(100% + 12px);
    opacity: 0;
  }
}

@keyframes loadingPulse {
  0%,
  100% {
    transform: scale(0.72);
    opacity: 0.48;
  }

  50% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (max-width: 1120px) {
  .result-panel {
    grid-template-columns: 1fr;
  }

  .preview-stage {
    min-height: 520px;
  }
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

  .result-panel {
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
