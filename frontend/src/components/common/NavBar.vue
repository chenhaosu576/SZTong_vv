<script setup>
import {
  computed,
  nextTick,
  onBeforeUpdate,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";

import BrandLogo from "./BrandLogo.vue";
import { accountMenuLinks, findActiveNavPath } from "../../router/siteMap";

const props = defineProps({
  brand: {
    type: String,
    default: "收智通",
  },
  links: {
    type: Array,
    default: () => [],
  },
  user: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["logout"]);

const route = useRoute();
const accountMenuRef = ref(null);
const navLinksRef = ref(null);
const desktopNavRefs = new Map();
const mobileMenuButtonRef = ref(null);
const mobilePanelRef = ref(null);
const accountMenuOpen = ref(false);
const mobileMenuOpen = ref(false);
const hoveredPath = ref("");
const indicatorTransitionsEnabled = ref(false);
const indicatorHiddenStyle = {
  opacity: 0,
  width: "0px",
  transform: "translate3d(0px, 0, 0)",
};
const indicatorStyle = ref({
  ...indicatorHiddenStyle,
});

const activeNavPath = computed(() => findActiveNavPath(route.path));

const accountEntry = computed(() => {
  if (!props.user) {
    return {
      label: "登录 / 注册",
      avatarText: "SZ",
      avatarImage: "",
      isDefault: true,
    };
  }

  const displayName = props.user.displayName || props.user.username || "收智通用户";
  const nameWithoutSpaces = displayName.replace(/\s+/g, "");

  return {
    label: displayName,
    avatarText: nameWithoutSpaces.slice(-2).toUpperCase(),
    avatarImage: props.user.avatar || "",
    isDefault: false,
  };
});

function isNavItemActive(item) {
  return activeNavPath.value === item.to;
}

function setDesktopNavRef(el, to) {
  const resolvedEl = el?.$el ?? el;

  if (resolvedEl instanceof HTMLElement) {
    desktopNavRefs.set(to, resolvedEl);
    return;
  }

  desktopNavRefs.delete(to);
}

function syncIndicator(
  path = hoveredPath.value || activeNavPath.value,
  { instant = !indicatorTransitionsEnabled.value } = {},
) {
  const target = desktopNavRefs.get(path);

  if (!target) {
    indicatorStyle.value = { ...indicatorHiddenStyle };
    return;
  }

  const width = Math.round(target.offsetWidth);
  const offset = Math.round(target.offsetLeft);

  if (!Number.isFinite(width) || !Number.isFinite(offset) || width <= 0) {
    indicatorStyle.value = { ...indicatorHiddenStyle };
    return;
  }

  indicatorStyle.value = {
    opacity: 1,
    width: `${width}px`,
    transform: `translate3d(${offset}px, 0, 0)`,
  };

  if (instant) {
    indicatorTransitionsEnabled.value = false;
    nextTick(() => {
      indicatorTransitionsEnabled.value = true;
    });
  }
}

function handleDesktopEnter(path) {
  hoveredPath.value = path;
  syncIndicator(path);
}

function handleDesktopLeave() {
  hoveredPath.value = "";
  syncIndicator(activeNavPath.value);
}

function handleDesktopFocusOut(event) {
  if (navLinksRef.value?.contains(event.relatedTarget)) return;

  handleDesktopLeave();
}

function closeAccountMenu() {
  accountMenuOpen.value = false;
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

function toggleAccountMenu() {
  if (!props.user) return;

  accountMenuOpen.value = !accountMenuOpen.value;
  if (accountMenuOpen.value) {
    mobileMenuOpen.value = false;
  }
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
  if (mobileMenuOpen.value) {
    accountMenuOpen.value = false;
  }
}

function handleAccountNavigate() {
  closeAccountMenu();
  closeMobileMenu();
}

function handleLogout() {
  closeAccountMenu();
  closeMobileMenu();
  emit("logout");
}

function handlePointerDown(event) {
  const target = event.target;

  if (
    accountMenuOpen.value &&
    accountMenuRef.value &&
    !accountMenuRef.value.contains(target)
  ) {
    closeAccountMenu();
  }

  if (
    mobileMenuOpen.value &&
    mobilePanelRef.value &&
    !mobilePanelRef.value.contains(target) &&
    !mobileMenuButtonRef.value?.contains(target)
  ) {
    closeMobileMenu();
  }
}

function handleKeydown(event) {
  if (event.key !== "Escape") return;

  closeAccountMenu();
  closeMobileMenu();
}

function handleResize() {
  syncIndicator(undefined, { instant: true });
}

onBeforeUpdate(() => {
  desktopNavRefs.clear();
});

watch(
  () => route.path,
  async () => {
    closeAccountMenu();
    closeMobileMenu();
    hoveredPath.value = "";
    await nextTick();
    syncIndicator(activeNavPath.value);
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("resize", handleResize, { passive: true });
  document.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("keydown", handleKeydown);
  nextTick(() => syncIndicator(activeNavPath.value));
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  document.removeEventListener("pointerdown", handlePointerDown);
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <header class="nav-wrap">
    <div class="page-width nav-wrap__inner">
      <router-link class="brand" to="/">
        <BrandLogo variant="nav" :title="brand" />
      </router-link>

      <nav
        ref="navLinksRef"
        class="nav-links"
        aria-label="主导航"
        @mouseleave="handleDesktopLeave"
        @focusout="handleDesktopFocusOut"
      >
        <span
          :class="['nav-links__marker', { 'is-ready': indicatorTransitionsEnabled }]"
          :style="indicatorStyle"
        />
        <router-link
          v-for="item in links"
          :key="item.to"
          :ref="(el) => setDesktopNavRef(el, item.to)"
          :to="item.to"
          :class="['nav-link', isNavItemActive(item) ? 'is-active' : '']"
          @mouseenter="handleDesktopEnter(item.to)"
          @focus="handleDesktopEnter(item.to)"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <div class="nav-actions">
        <button class="city-chip" type="button" aria-label="当前城市，北京">
          <span class="city-chip__dot" aria-hidden="true" />
          <span>北京</span>
          <span class="city-chip__caret" aria-hidden="true" />
        </button>

        <div ref="accountMenuRef" class="account-wrap">
          <router-link v-if="!user" class="auth-link" to="/auth">
            登录 / 注册
          </router-link>

          <template v-else>
            <button
              class="account-trigger"
              type="button"
              :aria-expanded="accountMenuOpen"
              aria-haspopup="menu"
              @click="toggleAccountMenu"
            >
              <span class="nav-account__avatar" :class="{ 'is-default': accountEntry.isDefault }">
                <img
                  v-if="accountEntry.avatarImage"
                  :src="accountEntry.avatarImage"
                  :alt="accountEntry.label"
                />
                <span v-else>{{ accountEntry.avatarText }}</span>
              </span>
              <span class="account-trigger__copy">
                <strong>{{ accountEntry.label }}</strong>
              </span>
              <span class="account-trigger__caret" :class="{ 'is-open': accountMenuOpen }" />
            </button>

            <Transition name="menu-fade">
              <div
                v-if="accountMenuOpen"
                class="account-menu"
                role="menu"
                aria-label="账户菜单"
              >
                <router-link
                  v-for="item in accountMenuLinks"
                  :key="item.to"
                  :to="item.to"
                  :class="['account-menu__link', route.path === item.to ? 'is-active' : '']"
                  role="menuitem"
                  @click="handleAccountNavigate"
                >
                  {{ item.label }}
                </router-link>
                <button class="account-menu__logout" type="button" @click="handleLogout">
                  退出登录
                </button>
              </div>
            </Transition>
          </template>
        </div>

        <button
          ref="mobileMenuButtonRef"
          class="menu-toggle"
          type="button"
          :aria-expanded="mobileMenuOpen"
          aria-label="切换导航菜单"
          @click="toggleMobileMenu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </div>

    <Transition name="overlay-fade">
      <button
        v-if="mobileMenuOpen"
        class="mobile-overlay"
        type="button"
        aria-label="关闭移动端导航"
        @click="closeMobileMenu"
      />
    </Transition>

    <Transition name="drawer-slide">
      <aside
        v-if="mobileMenuOpen"
        ref="mobilePanelRef"
        class="mobile-panel"
        aria-label="移动端导航面板"
      >
        <section class="mobile-panel__group">
          <p>主导航</p>
          <router-link
            v-for="item in links"
            :key="item.to"
            :to="item.to"
            :class="['mobile-panel__link', isNavItemActive(item) ? 'is-active' : '']"
            @click="handleAccountNavigate"
          >
            {{ item.label }}
          </router-link>
        </section>

        <section class="mobile-panel__group">
          <p>账户入口</p>
          <template v-if="user">
            <router-link
              v-for="item in accountMenuLinks"
              :key="item.to"
              :to="item.to"
              :class="['mobile-panel__link', route.path === item.to ? 'is-active' : '']"
              @click="handleAccountNavigate"
            >
              {{ item.label }}
            </router-link>
            <button class="mobile-panel__button" type="button" @click="handleLogout">
              退出登录
            </button>
          </template>
          <router-link v-else class="mobile-panel__button" to="/auth" @click="handleAccountNavigate">
            登录 / 注册
          </router-link>
        </section>
      </aside>
    </Transition>
  </header>
</template>

<style scoped>
.nav-wrap {
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid rgba(36, 72, 50, 0.12);
  backdrop-filter: blur(12px);
  background:
    linear-gradient(180deg, rgba(249, 252, 247, 0.94), rgba(246, 250, 245, 0.84)),
    radial-gradient(circle at 82% 0%, rgba(194, 162, 115, 0.08), transparent 28%);
  box-shadow: 0 8px 24px rgba(18, 44, 30, 0.06);
}

.nav-wrap::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(47, 98, 68, 0.28), transparent);
}

.nav-wrap__inner {
  min-height: 72px;
  display: grid;
  grid-template-columns: minmax(210px, 244px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
}

.brand {
  min-width: 0;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: var(--ink-900);
}

.nav-links {
  position: relative;
  isolation: isolate;
  justify-self: center;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.38);
  border: 1px solid rgba(48, 91, 62, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.64);
}

.nav-links__marker {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: 0;
  z-index: 0;
  border-radius: 999px;
  border: 1px solid rgba(98, 142, 107, 0.26);
  background:
    linear-gradient(180deg, rgba(233, 244, 232, 0.98), rgba(215, 233, 216, 0.94)),
    linear-gradient(90deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.08));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -1px 0 rgba(108, 150, 117, 0.14),
    0 12px 28px rgba(39, 83, 58, 0.16);
  opacity: 0;
  pointer-events: none;
  will-change: transform, width, opacity;
}

.nav-links__marker.is-ready {
  transition:
    transform 0.34s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease-out;
}

.nav-link {
  position: relative;
  z-index: 1;
  text-decoration: none;
  color: var(--ink-700);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition:
    color 0.24s ease,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-link:hover,
.nav-link:focus-visible {
  color: var(--forest-700);
  transform: translateY(-1px);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.28);
  outline: none;
}

.nav-link.is-active {
  color: var(--forest-700);
}

.nav-link:active {
  transform: translateY(0);
}

.nav-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-self: end;
}

.city-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(48, 91, 62, 0.12);
  background: rgba(255, 255, 255, 0.56);
  color: var(--ink-700);
  font-family: var(--font-data);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.city-chip:hover {
  color: var(--forest-700);
  border-color: rgba(43, 99, 68, 0.22);
  background: rgba(246, 250, 244, 0.84);
}

.city-chip__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(145deg, #cb8740, #79a27f);
  box-shadow: 0 0 0 4px rgba(203, 135, 64, 0.1);
}

.city-chip__caret {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid rgba(47, 91, 62, 0.72);
  border-bottom: 1.5px solid rgba(47, 91, 62, 0.72);
  transform: rotate(45deg) translateY(-1px);
}

.account-wrap {
  position: relative;
}

.auth-link,
.account-trigger {
  min-width: 132px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 4px 10px 4px 6px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--ink-900);
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid rgba(48, 91, 62, 0.12);
  box-shadow: 0 8px 18px rgba(31, 63, 43, 0.06);
}

.auth-link {
  justify-content: center;
  padding: 0 14px;
  font-size: 0.84rem;
  font-weight: 600;
  transition:
    transform 0.18s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.auth-link:hover,
.account-trigger:hover {
  transform: translateY(-1px);
  border-color: rgba(43, 99, 68, 0.22);
  background: rgba(246, 250, 244, 0.88);
}

.account-trigger {
  cursor: pointer;
  text-align: left;
  transition:
    transform 0.18s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.nav-account__avatar {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: var(--font-data);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #f7fff8;
  background:
    linear-gradient(145deg, rgba(38, 92, 62, 0.98), rgba(126, 171, 135, 0.95));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    0 6px 14px rgba(33, 78, 53, 0.16);
}

.nav-account__avatar.is-default {
  color: rgba(37, 74, 51, 0.9);
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.96), rgba(232, 239, 229, 0.92)),
    linear-gradient(145deg, rgba(220, 230, 220, 0.98), rgba(193, 209, 193, 0.95));
}

.nav-account__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.account-trigger__copy {
  min-width: 0;
  display: flex;
  align-items: center;
  flex: 1;
}

.account-trigger__copy strong {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--ink-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-trigger__caret {
  width: 8px;
  height: 8px;
  border-right: 1.5px solid rgba(47, 91, 62, 0.72);
  border-bottom: 1.5px solid rgba(47, 91, 62, 0.72);
  transform: rotate(45deg) translateY(-1px);
  transition: transform 0.2s ease;
}

.account-trigger__caret.is-open {
  transform: rotate(-135deg) translate(-2px, -1px);
}

.account-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  min-width: 204px;
  display: grid;
  gap: 4px;
  padding: 8px;
  border-radius: 16px;
  background: rgba(252, 253, 250, 0.96);
  border: 1px solid rgba(46, 89, 62, 0.12);
  box-shadow: 0 18px 40px rgba(23, 52, 36, 0.12);
}

.account-menu__link,
.account-menu__logout {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-radius: 12px;
  border: 0;
  background: transparent;
  color: var(--ink-700);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.account-menu__link:hover,
.account-menu__link.is-active,
.account-menu__logout:hover {
  color: var(--forest-700);
  background: rgba(233, 242, 233, 0.9);
}

.menu-toggle {
  display: none;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(48, 91, 62, 0.16);
  background: rgba(255, 255, 255, 0.7);
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.menu-toggle span {
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: var(--forest-700);
}

.mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 48;
  border: 0;
  background: rgba(16, 32, 24, 0.28);
  backdrop-filter: blur(6px);
}

.mobile-panel {
  position: fixed;
  left: 15px;
  right: 15px;
  top: 90px;
  z-index: 49;
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 26px 12px 26px 12px;
  background:
    linear-gradient(180deg, rgba(251, 253, 249, 0.96), rgba(241, 247, 241, 0.94)),
    radial-gradient(circle at top right, rgba(196, 135, 58, 0.14), transparent 42%);
  border: 1px solid rgba(46, 89, 62, 0.16);
  box-shadow: 0 24px 60px rgba(23, 52, 36, 0.14);
}

.mobile-panel__group {
  display: grid;
  gap: 8px;
}

.mobile-panel__group p {
  margin: 0;
  color: var(--forest-600);
  font-family: var(--font-data);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.mobile-panel__link,
.mobile-panel__button {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid rgba(46, 89, 62, 0.1);
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink-800);
  font: inherit;
  font-weight: 700;
  text-decoration: none;
}

.mobile-panel__link.is-active,
.mobile-panel__button:hover {
  color: var(--forest-700);
  background: rgba(233, 242, 233, 0.95);
}

.menu-fade-enter-active,
.menu-fade-leave-active,
.overlay-fade-enter-active,
.overlay-fade-leave-active,
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.24s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to,
.overlay-fade-enter-from,
.overlay-fade-leave-to,
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  transform: translateY(-6px);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateY(-12px);
}

@media (max-width: 1180px) {
  .nav-wrap__inner {
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 12px;
  }

  .nav-links {
    display: none;
  }

  .menu-toggle {
    display: inline-flex;
  }
}

@media (max-width: 720px) {
  .nav-wrap__inner {
    min-height: 68px;
    gap: 10px;
  }

  .brand {
    max-width: 210px;
  }

  .city-chip {
    min-height: 34px;
    padding: 0 10px;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
  }

  .auth-link,
  .account-trigger {
    min-width: auto;
    padding-right: 8px;
  }

  .account-trigger__copy strong {
    max-width: 70px;
  }
}

@media (max-width: 560px) {
  .nav-actions {
    gap: 8px;
  }

  .brand {
    max-width: 176px;
  }

  .city-chip {
    display: none;
  }

  .account-trigger__copy {
    display: none;
  }

  .auth-link {
    min-width: auto;
    min-height: 36px;
    padding: 0 12px;
    font-size: 0.82rem;
    white-space: nowrap;
  }

  .account-trigger {
    min-width: auto;
    padding-right: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-links__marker,
  .nav-link,
  .auth-link,
  .account-trigger,
  .account-trigger__caret,
  .account-menu__link,
  .account-menu__logout,
  .menu-fade-enter-active,
  .menu-fade-leave-active,
  .overlay-fade-enter-active,
  .overlay-fade-leave-active,
  .drawer-slide-enter-active,
  .drawer-slide-leave-active {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
