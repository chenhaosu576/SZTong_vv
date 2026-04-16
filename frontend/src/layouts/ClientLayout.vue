<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { RouterView, useRouter } from "vue-router";

import AuroraBackground from "../components/common/AuroraBackground.vue";
import NavBar from "../components/common/NavBar.vue";
import SiteFooter from "../components/common/SiteFooter.vue";
import { publicNavLinks } from "../router/siteMap";
import { getCurrentUser, logout } from "../utils/auth";

const router = useRouter();
const user = ref(getCurrentUser());
const scrollProgress = ref(0);
let removeAfterEach = null;

function syncUser() {
  user.value = getCurrentUser();
}

function handleLogout() {
  logout();
  syncUser();

  if (router.currentRoute.value.path !== "/") {
    router.push("/");
  }
}

function updateScrollProgress() {
  const doc = document.documentElement;
  const scrollTop = doc.scrollTop || document.body.scrollTop;
  const height = doc.scrollHeight - doc.clientHeight;

  if (height <= 0) {
    scrollProgress.value = 0;
    return;
  }

  scrollProgress.value = Math.min((scrollTop / height) * 100, 100);
}

onMounted(() => {
  window.addEventListener("storage", syncUser);
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  removeAfterEach = router.afterEach(syncUser);
  updateScrollProgress();
});

onUnmounted(() => {
  window.removeEventListener("storage", syncUser);
  window.removeEventListener("scroll", updateScrollProgress);

  if (typeof removeAfterEach === "function") {
    removeAfterEach();
  }
});
</script>

<template>
  <div class="client-shell">
    <AuroraBackground />
    <NavBar brand="收智通" :links="publicNavLinks" :user="user" @logout="handleLogout" />
    <div class="scroll-progress">
      <span :style="{ width: `${scrollProgress}%` }" />
    </div>

    <main class="page-width main-content">
      <RouterView v-slot="{ Component, route }">
        <Transition name="route-fade" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.client-shell {
  position: relative;
  min-height: 100vh;
  background: #fcfbf5;
}

.scroll-progress {
  height: 2px;
  background: rgba(32, 66, 47, 0.12);
}

.scroll-progress span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #2c6646, #8abd95);
  transition: width 0.15s linear;
}

.main-content {
  position: relative;
  z-index: 1;
  padding-top: 32px;
}

.route-fade-enter-active,
.route-fade-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.route-fade-enter-from,
.route-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
