<script setup>
import { onBeforeUnmount, reactive, ref } from "vue";

import CameraCaptureModal from "../../components/client/CameraCaptureModal.vue";
import IdentifyHeroPanel from "../../components/client/identify/IdentifyHeroPanel.vue";
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
    <input
      ref="uploadInput"
      class="sr-only"
      type="file"
      accept="image/*"
      @change="handleImageUpload"
    />

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

@media (max-width: 760px) {
  .identify-page {
    gap: 28px;
    padding-bottom: 20px;
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
