<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

import { useCameraCapture } from "../../composables/useCameraCapture";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  busy: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "confirm"]);

const capturedFile = ref(null);
const videoElementRef = ref(null);

const {
  videoRef,
  error,
  isReady,
  hasCapture,
  previewUrl,
  openCamera,
  closeCamera,
  captureFrameAsFile,
  resetCapture,
} = useCameraCapture();

watch(videoElementRef, (element) => {
  videoRef.value = element;
});

const cameraError = computed(() => error.value || "");
const cameraReady = computed(() => Boolean(isReady.value));
const cameraHasCapture = computed(() => Boolean(capturedFile.value || hasCapture.value));
const cameraPreviewUrl = computed(() => capturedFile.value?.previewUrl || previewUrl.value || "");
const confirmDisabled = computed(() => props.busy || !capturedFile.value);

function resetState() {
  capturedFile.value = null;
  resetCapture();
}

async function handleCapture() {
  if (props.busy) {
    return;
  }

  const payload = await captureFrameAsFile();
  if (!payload) {
    return;
  }

  capturedFile.value = payload;
}

function handleRetake() {
  if (props.busy) {
    return;
  }

  resetState();
}

function handleConfirm() {
  if (confirmDisabled.value) {
    return;
  }

  emit("confirm", capturedFile.value);
}

function handleClose() {
  emit("close");
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      resetState();
      await nextTick();
      await openCamera();
      return;
    }

    resetState();
    closeCamera();
  },
);

onBeforeUnmount(() => {
  resetState();
  closeCamera();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="camera-modal">
      <div
        v-if="open"
        class="camera-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-title"
      >
        <div class="camera-modal__backdrop" @click="handleClose" />

        <section class="camera-modal__panel">
          <header class="camera-modal__header">
            <div>
              <p class="camera-modal__eyebrow">CAMERA CAPTURE</p>
              <h2 id="camera-title">拍照识别</h2>
            </div>

            <button
              type="button"
              class="camera-modal__icon-button"
              data-testid="close-button"
              aria-label="关闭拍照识别弹层"
              @click="handleClose"
            >
              x
            </button>
          </header>

          <div class="camera-modal__stage" :class="{ 'has-error': cameraError }">
            <p v-if="cameraError" class="camera-modal__message">
              {{ cameraError }}
            </p>

            <template v-else-if="cameraHasCapture && cameraPreviewUrl">
              <img class="camera-modal__preview" :src="cameraPreviewUrl" alt="拍照预览" />
            </template>

            <template v-else>
              <video
                ref="videoElementRef"
                class="camera-modal__video"
                autoplay
                muted
                playsinline
              />

              <div v-if="!cameraReady" class="camera-modal__overlay">
                正在连接摄像头...
              </div>
            </template>
          </div>

          <p class="camera-modal__hint">
            {{
              cameraHasCapture
                ? "确认后将复用当前 AI 识别流程。"
                : "请将物体置于取景框内，保持画面稳定后拍照。"
            }}
          </p>

          <div class="camera-modal__actions">
            <template v-if="cameraHasCapture">
              <button
                type="button"
                class="camera-modal__button camera-modal__button--secondary"
                @click="handleRetake"
              >
                重拍
              </button>
              <button
                type="button"
                class="camera-modal__button camera-modal__button--primary"
                data-testid="confirm-button"
                :disabled="confirmDisabled"
                @click="handleConfirm"
              >
                {{ busy ? "识别中..." : "确认识别" }}
              </button>
            </template>

            <template v-else>
              <button
                type="button"
                class="camera-modal__button camera-modal__button--secondary"
                @click="handleClose"
              >
                取消
              </button>
              <button
                type="button"
                class="camera-modal__button camera-modal__button--primary"
                data-testid="capture-button"
                :disabled="busy || !!cameraError || !cameraReady"
                @click="handleCapture"
              >
                拍照
              </button>
            </template>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.camera-modal {
  --camera-modal-safe-space: clamp(16px, 4dvh, 32px);
  --camera-modal-panel-width: 760px;
  --camera-stage-basis: clamp(220px, 40dvh, 420px);
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--camera-modal-safe-space);
  overflow: hidden;
  overscroll-behavior: contain;
}

.camera-modal__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top, rgba(90, 151, 104, 0.12), transparent 34%),
    rgba(17, 29, 21, 0.58);
  backdrop-filter: blur(10px);
}

.camera-modal__panel {
  position: relative;
  z-index: 1;
  width: min(100%, var(--camera-modal-panel-width));
  max-height: calc(100dvh - (var(--camera-modal-safe-space) * 2));
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: clamp(22px, 3vw, 30px);
  border-radius: 30px;
  background: rgba(250, 247, 240, 0.98);
  box-shadow:
    0 28px 70px rgba(17, 29, 21, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  overflow: hidden;
  overscroll-behavior: contain;
  scrollbar-gutter: stable both-edges;
}

.camera-modal__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex: 0 0 auto;
}

.camera-modal__eyebrow {
  margin: 0 0 8px;
  color: var(--moss-500);
  font-family: var(--font-data);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.camera-modal__header h2 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 3vw, 2.4rem);
}

.camera-modal__icon-button {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(229, 248, 237, 0.92);
  color: var(--forest-700);
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(46, 93, 63, 0.1);
}

.camera-modal__stage {
  position: relative;
  flex: 1 1 var(--camera-stage-basis);
  min-height: clamp(190px, 28dvh, 260px);
  max-height: min(100%, var(--camera-stage-basis));
  overflow: hidden;
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(214, 231, 220, 0.46), rgba(242, 238, 228, 0.5)),
    #eef3ee;
  box-shadow: inset 0 0 0 1px rgba(46, 93, 63, 0.08);
}

.camera-modal__stage.has-error {
  display: grid;
  place-items: center;
  padding: 28px;
}

.camera-modal__video,
.camera-modal__preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.camera-modal__overlay {
  position: absolute;
  inset: auto 18px 18px 18px;
  padding: 12px 16px;
  border-radius: 999px;
  background: rgba(17, 29, 21, 0.58);
  color: #f6fbf7;
  text-align: center;
  font-size: 0.94rem;
}

.camera-modal__message {
  margin: 0;
  max-width: 28rem;
  color: var(--ink-900);
  font-size: 1rem;
  line-height: 1.8;
  text-align: center;
}

.camera-modal__hint {
  margin: 0;
  color: rgba(76, 103, 93, 0.92);
  font-size: 0.96rem;
  line-height: 1.7;
  flex: 0 0 auto;
}

.camera-modal__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 14px;
  flex: 0 0 auto;
}

.camera-modal__button {
  min-width: 132px;
  min-height: 52px;
  padding: 0 20px;
  border-radius: 16px;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.camera-modal__button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.camera-modal__button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.camera-modal__button--primary {
  color: #f8fdf9;
  background: linear-gradient(135deg, #5a9768 0%, #4f8d60 40%, #2e5d3f 100%);
  box-shadow: 0 16px 28px rgba(46, 93, 63, 0.18);
}

.camera-modal__button--secondary {
  color: var(--forest-700);
  background: rgba(229, 248, 237, 0.9);
  box-shadow: inset 0 0 0 1px rgba(46, 93, 63, 0.1);
}

.camera-modal-enter-active,
.camera-modal-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.camera-modal-enter-from,
.camera-modal-leave-to {
  opacity: 0;
}

@media (max-width: 760px) {
  .camera-modal {
    --camera-modal-safe-space: 14px;
  }

  .camera-modal__panel {
    padding: 18px;
    border-radius: 24px;
  }

  .camera-modal__actions {
    flex-direction: column;
  }

  .camera-modal__button {
    width: 100%;
  }
}

@media (max-height: 820px) {
  .camera-modal {
    --camera-modal-safe-space: 18px;
    --camera-stage-basis: clamp(200px, 34dvh, 320px);
  }

  .camera-modal__panel {
    gap: 16px;
    padding: 20px;
  }

  .camera-modal__header h2 {
    font-size: clamp(1.55rem, 3vw, 2rem);
  }

  .camera-modal__hint {
    font-size: 0.92rem;
    line-height: 1.6;
  }

  .camera-modal__button {
    min-height: 48px;
  }
}

@media (max-height: 680px) {
  .camera-modal {
    --camera-modal-safe-space: 12px;
    --camera-stage-basis: clamp(160px, 28dvh, 240px);
  }

  .camera-modal__panel {
    gap: 14px;
    padding: 16px;
    border-radius: 22px;
    overflow-y: auto;
  }

  .camera-modal__header {
    gap: 12px;
  }

  .camera-modal__eyebrow {
    margin-bottom: 6px;
    font-size: 0.68rem;
  }

  .camera-modal__header h2 {
    font-size: 1.4rem;
  }

  .camera-modal__icon-button {
    width: 38px;
    height: 38px;
    font-size: 1rem;
  }

  .camera-modal__stage {
    min-height: 150px;
    border-radius: 22px;
  }

  .camera-modal__overlay {
    inset: auto 12px 12px 12px;
    padding: 10px 14px;
    font-size: 0.88rem;
  }

  .camera-modal__hint {
    font-size: 0.88rem;
    line-height: 1.55;
  }

  .camera-modal__actions {
    gap: 10px;
  }

  .camera-modal__button {
    min-width: 120px;
    min-height: 44px;
    border-radius: 14px;
    font-size: 0.95rem;
  }
}
</style>
