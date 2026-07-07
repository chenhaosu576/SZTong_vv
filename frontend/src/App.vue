<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

import LoginPromptModal from "./components/common/LoginPromptModal.vue";
import ClickSpark from "./components/common/ClickSpark.vue";
import { useAuthStore } from "./stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const showPrompt = ref(false);
let timer = null;

function clearTimer() {
  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }
}

function syncUser() {
  authStore.restoreFromStorage();
}

function shouldPrompt() {
  if (authStore.isAuthed) return false;
  if (route.path === "/auth") return false;
  if (sessionStorage.getItem("szt_prompted") === "1") return false;
  return true;
}

function setupPromptTimer() {
  clearTimer();
  showPrompt.value = false;

  if (!shouldPrompt()) {
    return;
  }

  timer = window.setTimeout(() => {
    showPrompt.value = true;
    sessionStorage.setItem("szt_prompted", "1");
  }, 3000);
}

function closePrompt() {
  showPrompt.value = false;
}

function confirmPrompt() {
  showPrompt.value = false;
  router.push({
    path: "/auth",
    query: {
      redirect: route.fullPath,
    },
  });
}

watch(
  () => route.fullPath,
  () => {
    syncUser();
    setupPromptTimer();
  },
);

onMounted(() => {
  window.addEventListener("storage", syncUser);
  setupPromptTimer();
});

onBeforeUnmount(() => {
  clearTimer();
  window.removeEventListener("storage", syncUser);
});
</script>

<template>
  <ClickSpark
    spark-color="#2e6950"
    :spark-size="8"
    :spark-radius="15"
    :spark-count="8"
    :duration="500"
    easing="ease-out"
    :extra-scale="1.0"
  >
    <RouterView />
    <LoginPromptModal
      v-if="showPrompt"
      @close="closePrompt"
      @confirm="confirmPrompt"
    />
  </ClickSpark>
</template>
