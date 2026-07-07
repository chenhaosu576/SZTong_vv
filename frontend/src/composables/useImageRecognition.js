import { onBeforeUnmount, ref } from "vue";
import { analyzeImageWithAI } from "../mock/picAI";

/**
 * 默认 analyzer:File 走真实 AI 识别 (analyzeImageWithAI),否则返回空数组
 * (前端 caller 用空数组显示示例)。
 * 调用方可通过 options.analyzer 注入自定义识别器。
 */
const defaultAnalyzer = async (imageSource) => {
  if (imageSource instanceof File) {
    try {
      return await analyzeImageWithAI(imageSource);
    } catch (error) {
      console.error("AI 识别失败:", error);
      return [];
    }
  }
  return [];
};

export function useImageRecognition(options = {}) {
  const analyzer = options.analyzer ?? defaultAnalyzer;

  const imageUrl = ref("");
  const imageName = ref("");
  const recognizing = ref(false);
  const results = ref([]);
  const error = ref(null);

  let requestSeq = 0;

  function revokeImageUrl() {
    if (imageUrl.value) {
      URL.revokeObjectURL(imageUrl.value);
      imageUrl.value = "";
    }
  }

  async function recognize(file, nextName) {
    if (!file) return;

    const seq = ++requestSeq;
    revokeImageUrl();
    imageUrl.value = URL.createObjectURL(file);
    imageName.value = nextName ?? file.name ?? "";
    results.value = [];
    recognizing.value = true;
    error.value = null;

    try {
      const out = await analyzer(file);
      if (seq !== requestSeq) return;
      results.value = out;
    } catch (err) {
      if (seq === requestSeq) {
        error.value = err;
        results.value = [];
      }
    } finally {
      if (seq === requestSeq) recognizing.value = false;
    }
  }

  function reset() {
    requestSeq++;
    revokeImageUrl();
    imageName.value = "";
    results.value = [];
    recognizing.value = false;
    error.value = null;
  }

  onBeforeUnmount(reset);

  return {
    imageUrl,
    imageName,
    recognizing,
    results,
    error,
    recognize,
    reset,
  };
}