import { getCurrentInstance, onBeforeUnmount, ref } from "vue";

const UNSUPPORTED_MESSAGE = "当前浏览器不支持摄像头拍照，请改用相册上传";
const PERMISSION_DENIED_MESSAGE = "摄像头权限被拒绝，请允许浏览器访问摄像头后重试";
const DEVICE_UNAVAILABLE_MESSAGE = "未检测到可用摄像头，请改用相册上传";
const DEVICE_BUSY_MESSAGE = "无法打开摄像头，请检查设备是否被占用后重试";
const CAPTURE_FAILED_MESSAGE = "拍照失败，请稍后重试";

function buildCaptureFileName() {
  return `camera-capture-${Date.now()}.jpg`;
}

function resolveCameraErrorMessage(error) {
  if (!error?.name) {
    return DEVICE_BUSY_MESSAGE;
  }

  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return PERMISSION_DENIED_MESSAGE;
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return DEVICE_UNAVAILABLE_MESSAGE;
  }

  if (
    error.name === "NotReadableError" ||
    error.name === "TrackStartError" ||
    error.name === "AbortError"
  ) {
    return DEVICE_BUSY_MESSAGE;
  }

  return DEVICE_BUSY_MESSAGE;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}

export function useCameraCapture() {
  const videoRef = ref(null);
  const error = ref("");
  const isReady = ref(false);
  const hasCapture = ref(false);
  const previewUrl = ref("");

  const streamRef = ref(null);

  function revokePreviewUrl() {
    if (!previewUrl.value) {
      return;
    }

    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }

  function resetCapture() {
    revokePreviewUrl();
    hasCapture.value = false;
  }

  function closeCamera() {
    const stream = streamRef.value;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    streamRef.value = null;

    if (videoRef.value) {
      videoRef.value.srcObject = null;
    }

    isReady.value = false;
    resetCapture();
  }

  async function openCamera() {
    closeCamera();
    error.value = "";

    const mediaDevices = globalThis.navigator?.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      error.value = UNSUPPORTED_MESSAGE;
      return;
    }

    try {
      const stream = await mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.value = stream;

      if (!videoRef.value) {
        error.value = DEVICE_BUSY_MESSAGE;
        closeCamera();
        return;
      }

      videoRef.value.srcObject = stream;
      videoRef.value.muted = true;
      videoRef.value.playsInline = true;
      await videoRef.value.play();
      isReady.value = true;
    } catch (openError) {
      error.value = resolveCameraErrorMessage(openError);
      closeCamera();
    }
  }

  async function captureFrameAsFile(fileName = buildCaptureFileName()) {
    if (!videoRef.value || !streamRef.value || !isReady.value) {
      error.value = CAPTURE_FAILED_MESSAGE;
      return null;
    }

    const width = videoRef.value.videoWidth;
    const height = videoRef.value.videoHeight;

    if (!width || !height) {
      error.value = CAPTURE_FAILED_MESSAGE;
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      error.value = CAPTURE_FAILED_MESSAGE;
      return null;
    }

    context.drawImage(videoRef.value, 0, 0, width, height);

    const blob = await canvasToBlob(canvas);
    if (!blob) {
      error.value = CAPTURE_FAILED_MESSAGE;
      return null;
    }

    resetCapture();

    const file = new File([blob], fileName, {
      type: blob.type || "image/jpeg",
      lastModified: Date.now(),
    });
    const nextPreviewUrl = URL.createObjectURL(file);

    previewUrl.value = nextPreviewUrl;
    hasCapture.value = true;
    error.value = "";

    return {
      file,
      previewUrl: nextPreviewUrl,
      fileName,
    };
  }

  async function captureFrame() {
    return captureFrameAsFile();
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      closeCamera();
    });
  }

  return {
    videoRef,
    error,
    isReady,
    hasCapture,
    previewUrl,
    openCamera,
    closeCamera,
    captureFrame,
    captureFrameAsFile,
    resetCapture,
  };
}
