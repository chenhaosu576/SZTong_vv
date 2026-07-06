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
  imageName,
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
