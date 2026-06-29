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
