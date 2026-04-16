<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

import LoginPromptModal from "./components/common/LoginPromptModal.vue";
import ClickSpark from "./components/common/ClickSpark.vue";
import { getCurrentUser } from "./utils/auth";

const route = useRoute();
const router = useRouter();

const showPrompt = ref(false);
const user = ref(getCurrentUser());
let timer = null;

function clearTimer() {
  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }
}

function syncUser() {
  user.value = getCurrentUser();
}

function shouldPrompt() {
  if (user.value) return false;
  if (route.path === "/auth") return false;
  // 每个浏览器会话只弹一次，避免反复打断浏览体验
  if (sessionStorage.getItem("szt_prompted") === "1") return false;
  return true;
}

function setupPromptTimer() {
  clearTimer();
  showPrompt.value = false;

  if (!shouldPrompt()) {
    return;
  }

  // 进入站点约 3 秒后再提示去登录/注册
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
