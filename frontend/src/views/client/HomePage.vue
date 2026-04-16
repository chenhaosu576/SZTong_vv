<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";

import { useRevealOnScroll } from "../../composables/useRevealOnScroll";
import blocksIcon from "../../assets/blocks.png";
import ghostIcon from "../../assets/ghost.png";
import heartHandshakeIcon from "../../assets/heart-handshake.png";
import imagePlusIcon from "../../assets/image-plus.png";
import { fetchHomeData } from "../../mock/clientApi";
import { getCurrentUser } from "../../utils/auth";
import { HOME_SECTION_IDS, getImpactPanelContent } from "../../utils/homePageContent";

const pageRef = ref(null);
const servicesSectionRef = ref(null);
const newsListRef = ref(null);
const newsScrollerRef = ref(null);
useRevealOnScroll(pageRef);
const router = useRouter();

const loading = ref(true);
const loadError = ref("");
const isLoggedIn = ref(Boolean(getCurrentUser()));
const HERO_DESCRIPTION =
  "通过高精度AI和有机物流改变城市回收。我们不仅仅是处理废弃物；我们打造一个可持续发展与精致相遇的生态系统。";
const DEFAULT_HOME_HERO = Object.freeze({
  primaryCta: {
    to: "/ai-identify",
  },
});
const TYPEWRITER_DELAY = 58;
const TYPEWRITER_START_DELAY = 320;
const heroDescriptionText = ref("");
const activeNewsIndex = ref(0);
let heroDescriptionTimer = null;

// News scroll stack state
const newsCardsRef = ref([]);
const lastNewsTransforms = ref(new Map());
const isNewsUpdating = ref(false);

const home = reactive({
  hero: null,
  features: [],
  serviceCenters: [],
  impact: null,
  taskSummary: null,
  quickLinks: [],
});

// 3D Card hover effect
const cardRefs = ref([]);
const cardHoverStates = ref([
  { x: 0, y: 0, isHovered: false },
  { x: 0, y: 0, isHovered: false },
  { x: 0, y: 0, isHovered: false },
  { x: 0, y: 0, isHovered: false },
]);

function handleCardMouseMove(event, index) {
  const card = cardRefs.value[index];
  if (!card) return;

  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = (y - centerY) / 10;
  const rotateY = (centerX - x) / 10;

  cardHoverStates.value[index] = {
    x: rotateY,
    y: rotateX,
    isHovered: true,
  };
}

function handleCardMouseLeave(index) {
  cardHoverStates.value[index] = {
    x: 0,
    y: 0,
    isHovered: false,
  };
}

function setCardRef(el, index) {
  if (el) {
    cardRefs.value[index] = el;
  }
}

const impactPanel = computed(() => getImpactPanelContent(home.impact, isLoggedIn.value));
const heroBadges = computed(() => home.hero?.badges || home.hero?.floatingTags || []);
const heroPrimaryCtaTo = computed(() => home.hero?.primaryCta?.to || DEFAULT_HOME_HERO.primaryCta.to);
const newsTargets = ["/ai-identify", "/upcycle", "/profile", "/science"];

function syncLoginState() {
  isLoggedIn.value = Boolean(getCurrentUser());
}

function stopHeroDescriptionTypewriter() {
  if (!heroDescriptionTimer) return;

  window.clearTimeout(heroDescriptionTimer);
  heroDescriptionTimer = null;
}

function startHeroDescriptionTypewriter() {
  stopHeroDescriptionTypewriter();

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    heroDescriptionText.value = HERO_DESCRIPTION;
    return;
  }

  heroDescriptionText.value = "";
  let currentIndex = 0;

  const typeNextCharacter = () => {
    if (currentIndex >= HERO_DESCRIPTION.length) {
      heroDescriptionTimer = null;
      return;
    }

    currentIndex += 1;
    heroDescriptionText.value = HERO_DESCRIPTION.slice(0, currentIndex);

    if (currentIndex < HERO_DESCRIPTION.length) {
      heroDescriptionTimer = window.setTimeout(typeNextCharacter, TYPEWRITER_DELAY);
      return;
    }

    heroDescriptionTimer = null;
  };

  heroDescriptionTimer = window.setTimeout(typeNextCharacter, TYPEWRITER_START_DELAY);
}

async function loadHome() {
  loading.value = true;
  loadError.value = "";
  stopHeroDescriptionTypewriter();
  heroDescriptionText.value = "";

  try {
    const data = await fetchHomeData();
    home.hero = data.hero || DEFAULT_HOME_HERO;
    home.features = data.features || [];
    home.serviceCenters = data.serviceCenters || [];
    home.impact = data.impact || null;
    home.taskSummary = data.taskSummary || null;
    home.quickLinks = data.quickLinks || [];
  } catch {
    loadError.value = "首页数据加载失败，请稍后重试。";
  } finally {
    loading.value = false;

    if (home.hero) {
      await nextTick();
      startHeroDescriptionTypewriter();
    }
  }
}

function scrollToServices() {
  const node = servicesSectionRef.value;
  if (!node) return;

  node.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    node.focus({ preventScroll: true });
  }, 420);
}

function navigateTo(to) {
  if (!to) return;

  router.push(to);
}

function handleKeyboardNavigation(event, to) {
  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  navigateTo(to);
}

function focusNewsItem(index) {
  const items = newsListRef.value?.querySelectorAll("[data-news-item]");
  const node = items?.[index];
  if (!node) return;

  node.scrollIntoView({ behavior: "smooth", block: "nearest" });
  window.setTimeout(() => {
    node.focus({ preventScroll: true });
  }, 240);
}

function navigateNews(direction) {
  const total = newsTargets.length;
  if (!total) return;

  activeNewsIndex.value = (activeNewsIndex.value + direction + total) % total;
  focusNewsItem(activeNewsIndex.value);
}

// News scroll stack functions
function updateNewsCardTransforms() {
  const scroller = newsScrollerRef.value;
  if (!scroller || !newsCardsRef.value.length || isNewsUpdating.value) return;

  isNewsUpdating.value = true;

  const scrollTop = scroller.scrollTop;
  const containerHeight = scroller.clientHeight;
  const stackPosition = containerHeight * 0.2;
  const itemStackDistance = 30;
  const baseScale = 0.92;
  const itemScale = 0.02;

  newsCardsRef.value.forEach((card, i) => {
    if (!card) return;

    const cardTop = card.offsetTop;
    const triggerStart = cardTop - stackPosition - itemStackDistance * i;
    const triggerEnd = cardTop - containerHeight * 0.1;

    const progress = Math.max(0, Math.min(1, (scrollTop - triggerStart) / (triggerEnd - triggerStart)));
    const targetScale = baseScale + i * itemScale;
    const scale = 1 - progress * (1 - targetScale);

    let translateY = 0;
    const pinStart = cardTop - stackPosition - itemStackDistance * i;
    const isPinned = scrollTop >= pinStart;

    if (isPinned) {
      translateY = scrollTop - cardTop + stackPosition + itemStackDistance * i;
    }

    const newTransform = {
      translateY: Math.round(translateY * 100) / 100,
      scale: Math.round(scale * 1000) / 1000,
    };

    const lastTransform = lastNewsTransforms.value.get(i);
    const hasChanged =
      !lastTransform ||
      Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
      Math.abs(lastTransform.scale - newTransform.scale) > 0.001;

    if (hasChanged) {
      card.style.transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale})`;
      lastNewsTransforms.value.set(i, newTransform);
    }
  });

  isNewsUpdating.value = false;
}

function handleNewsScroll() {
  requestAnimationFrame(updateNewsCardTransforms);
}

function setupNewsScrollStack() {
  const scroller = newsScrollerRef.value;
  if (!scroller) return;

  const cards = Array.from(scroller.querySelectorAll('.news-stack-card'));
  newsCardsRef.value = cards;

  cards.forEach((card) => {
    card.style.willChange = 'transform';
    card.style.transformOrigin = 'top center';
    card.style.backfaceVisibility = 'hidden';
  });

  updateNewsCardTransforms();
}

onMounted(() => {
  loadHome();
  window.addEventListener("storage", syncLoginState);
  
  nextTick(() => {
    setupNewsScrollStack();
  });
});

onUnmounted(() => {
  stopHeroDescriptionTypewriter();
  window.removeEventListener("storage", syncLoginState);
  newsCardsRef.value = [];
  lastNewsTransforms.value.clear();
});
</script>

<template>
  <section ref="pageRef" class="home-page">
    <template v-if="loading">
      <div class="loading-shell" data-reveal>
        <div class="loading-shimmer home-skeleton home-skeleton--hero" />
        <div class="loading-grid">
          <div class="loading-shimmer home-skeleton" />
          <div class="loading-shimmer home-skeleton" />
          <div class="loading-shimmer home-skeleton" />
          <div class="loading-shimmer home-skeleton" />
        </div>
      </div>
    </template>

    <template v-else-if="home.hero">
      <!-- Hero Section -->
      <section class="hero-section" data-reveal>
        <div class="hero-content">
          <div class="hero-text">
            <span class="hero-eyebrow">循环经济的未来</span>
            <h1 class="hero-title">
              <span class="hero-title-gradient">智慧回收，空灵未来</span>
            </h1>
            <p class="hero-description" :aria-label="HERO_DESCRIPTION">
              <span aria-hidden="true">{{ heroDescriptionText }}</span>
              <span class="hero-description-cursor" aria-hidden="true"></span>
            </p>
            <div class="hero-actions">
              <RouterLink class="hero-btn hero-btn-primary" :to="heroPrimaryCtaTo">
                立即预约回收
              </RouterLink>
              <button class="hero-btn hero-btn-secondary" type="button" @click="scrollToServices">
                探索功能
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Core Functions Section -->
      <section
        :id="HOME_SECTION_IDS.services"
        ref="servicesSectionRef"
        class="core-functions-section"
        data-reveal
        tabindex="-1"
        style="--reveal-delay: 60ms"
      >
        <div class="core-functions-content">
          <div class="core-functions-left">
            <h2 class="core-functions-title">核心功能</h2>
            <div class="core-functions-divider"></div>
            <p class="core-functions-description">
              技术背后：<br/>我们的生态系统由神经网络和自动化精度的交响乐驱动。
            </p>
          </div>

          <div class="core-functions-grid">
            <div
              :ref="el => setCardRef(el, 0)"
              class="function-card"
              :style="{
                transform: `perspective(1000px) rotateX(${cardHoverStates[0].y}deg) rotateY(${cardHoverStates[0].x}deg) scale(${cardHoverStates[0].isHovered ? 1.05 : 1})`,
              }"
              role="link"
              tabindex="0"
              @click="navigateTo('/ai-identify')"
              @keydown="handleKeyboardNavigation($event, '/ai-identify')"
              @mousemove="handleCardMouseMove($event, 0)"
              @mouseleave="handleCardMouseLeave(0)"
            >
              <div class="function-card-glow"></div>
              <div class="function-card-inner">
                <div class="function-card-icon">
                  <img class="function-card-icon-image" :src="imagePlusIcon" alt="" aria-hidden="true" />
                  <div class="icon-glow"></div>
                </div>
                <div class="function-card-content">
                  <h3 class="function-card-title">AI识别</h3>
                  <p class="function-card-subtitle">AI Identification</p>
                  <p class="function-card-description">智能识别废弃物类型，精准分类指导</p>
                </div>
                <div class="function-card-footer">
                  <div class="function-card-badge">Precision AI</div>
                  <span class="function-card-arrow">→</span>
                </div>
              </div>
            </div>

            <div
              :ref="el => setCardRef(el, 1)"
              class="function-card function-card--secondary"
              :style="{
                transform: `perspective(1000px) rotateX(${cardHoverStates[1].y}deg) rotateY(${cardHoverStates[1].x}deg) scale(${cardHoverStates[1].isHovered ? 1.05 : 1})`,
              }"
              role="link"
              tabindex="0"
              @click="navigateTo('/ai-qa')"
              @keydown="handleKeyboardNavigation($event, '/ai-qa')"
              @mousemove="handleCardMouseMove($event, 1)"
              @mouseleave="handleCardMouseLeave(1)"
            >
              <div class="function-card-glow"></div>
              <div class="function-card-inner">
                <div class="function-card-icon function-card-icon--secondary">
                  <img class="function-card-icon-image" :src="ghostIcon" alt="" aria-hidden="true" />
                  <div class="icon-glow"></div>
                </div>
                <div class="function-card-content">
                  <h3 class="function-card-title">AI助手</h3>
                  <p class="function-card-subtitle">Category Inquiry</p>
                  <p class="function-card-description">快速查询物品分类，获取回收建议</p>
                </div>
                <div class="function-card-footer">
                  <div class="function-card-badge function-card-badge--secondary">Smart Catalog</div>
                  <span class="function-card-arrow">→</span>
                </div>
              </div>
            </div>

            <div
              :ref="el => setCardRef(el, 2)"
              class="function-card function-card--tertiary"
              :style="{
                transform: `perspective(1000px) rotateX(${cardHoverStates[2].y}deg) rotateY(${cardHoverStates[2].x}deg) scale(${cardHoverStates[2].isHovered ? 1.05 : 1})`,
              }"
              role="link"
              tabindex="0"
              @click="navigateTo('/recycle-booking')"
              @keydown="handleKeyboardNavigation($event, '/recycle-booking')"
              @mousemove="handleCardMouseMove($event, 2)"
              @mouseleave="handleCardMouseLeave(2)"
            >
              <div class="function-card-glow"></div>
              <div class="function-card-inner">
                <div class="function-card-icon function-card-icon--tertiary">
                  <img class="function-card-icon-image" :src="blocksIcon" alt="" aria-hidden="true" />
                  <div class="icon-glow"></div>
                </div>
                <div class="function-card-content">
                  <h3 class="function-card-title">预约回收</h3>
                  <p class="function-card-subtitle">Book Collection</p>
                  <p class="function-card-description">便捷预约上门回收，省时省力环保</p>
                </div>
                <div class="function-card-footer">
                  <div class="function-card-badge function-card-badge--tertiary">Scheduled Flow</div>
                  <span class="function-card-arrow">→</span>
                </div>
              </div>
            </div>

            <div
              :ref="el => setCardRef(el, 3)"
              class="function-card function-card--charity"
              :style="{
                transform: `perspective(1000px) rotateX(${cardHoverStates[3].y}deg) rotateY(${cardHoverStates[3].x}deg) scale(${cardHoverStates[3].isHovered ? 1.05 : 1})`,
              }"
              role="link"
              tabindex="0"
              @click="navigateTo('/charity')"
              @keydown="handleKeyboardNavigation($event, '/charity')"
              @mousemove="handleCardMouseMove($event, 3)"
              @mouseleave="handleCardMouseLeave(3)"
            >
              <div class="function-card-glow"></div>
              <div class="function-card-inner">
                <div class="function-card-icon function-card-icon--charity">
                  <img class="function-card-icon-image" :src="heartHandshakeIcon" alt="" aria-hidden="true" />
                  <div class="icon-glow"></div>
                </div>
                <div class="function-card-content">
                  <h3 class="function-card-title">公益捐赠</h3>
                  <p class="function-card-subtitle">Public Welfare</p>
                  <p class="function-card-description">闲置物品捐赠，传递爱心与温暖</p>
                </div>
                <div class="function-card-footer">
                  <div class="function-card-badge function-card-badge--charity">Ethereal Impact</div>
                  <span class="function-card-arrow">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Why Choose Us Section -->
      <section class="why-choose-section" data-reveal style="--reveal-delay: 100ms">
        <div class="why-choose-content">
          <div class="why-choose-header">
            <div>
              <span class="why-choose-label">Why Choose Us</span>
              <h2 class="why-choose-title">我们的品牌使命</h2>
            </div>
            <button class="why-choose-btn" type="button" @click="navigateTo('/science')">
              了解更多
            </button>
          </div>

          <div class="why-choose-grid">
            <div class="why-choose-stats">
              <div class="stat-card">
                <div class="stat-card-header">
                  <span class="stat-icon">✓</span>
                  <span class="stat-arrow">↗</span>
                </div>
                <div class="stat-value">600+</div>
                <p class="stat-description">成功落地的城市循环再生项目</p>
              </div>

              <div class="stat-card">
                <div class="stat-card-header">
                  <span class="stat-icon">🌿</span>
                  <span class="stat-arrow">↗</span>
                </div>
                <div class="stat-value">1.5万吨</div>
                <p class="stat-description">每年通过我们的生态系统处理的回收材料</p>
              </div>

              <div class="stat-card">
                <div class="stat-card-header">
                  <span class="stat-icon">👥</span>
                  <span class="stat-arrow">↗</span>
                </div>
                <div class="stat-value">98%</div>
                <p class="stat-description">在我们的无缝预约回收流程中的客户满意度</p>
              </div>

              <div class="stat-card">
                <div class="stat-card-header">
                  <span class="stat-icon">📊</span>
                  <span class="stat-arrow">↗</span>
                </div>
                <div class="stat-value">AI 优先</div>
                <p class="stat-description">自主研发的识别引擎，确保 99.9% 的分类准确率</p>
              </div>
            </div>

            <div class="why-choose-image">
              <img 
                src="https://tse1.mm.bing.net/th/id/OIP.mEE_eLNmAV9iYl4IjM6wdAAAAA?rs=1&pid=ImgDetMain&o=7&rm=3"
                alt="现代生态办公环境"
                class="why-choose-img"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- News Section with Scroll Stack Effect -->
      <section class="news-section" data-reveal style="--reveal-delay: 140ms">
        <div class="news-content">
          <div class="news-header">
            <div>
              <h2 class="news-title">动态资讯</h2>
              <div class="news-divider"></div>
              <p class="news-description">及时了解我们的社区里程碑和环境影响倡议。</p>
            </div>
          </div>

          <div ref="newsScrollerRef" class="news-scroll-container" @scroll="handleNewsScroll">
            <div class="news-stack-wrapper">
              <div
                class="news-stack-card news-stack-card--system"
                role="link"
                tabindex="0"
                @click="navigateTo(newsTargets[0])"
                @keydown="handleKeyboardNavigation($event, newsTargets[0])"
              >
                <div class="news-stack-card-inner">
                  <div class="news-stack-card-header">
                    <span class="news-stack-badge news-stack-badge--system">系统公告</span>
                    <span class="news-stack-date">2025.03.18</span>
                  </div>
                  <h3 class="news-stack-card-title">收智通全新升级，已上线ai大模型</h3>
                  <p class="news-stack-card-text">全新 UI 设计，更强大的 Qwen2.5 AI 识别引擎以及社区功能全面升级，带来更流畅的绿色生活体验。</p>
                  <div class="news-stack-card-footer">
                    <span class="news-stack-icon">🔬</span>
                    <span class="news-stack-arrow">→</span>
                  </div>
                </div>
              </div>

              <div
                class="news-stack-card news-stack-card--community"
                role="link"
                tabindex="0"
                @click="navigateTo(newsTargets[1])"
                @keydown="handleKeyboardNavigation($event, newsTargets[1])"
              >
                <div class="news-stack-card-inner">
                  <div class="news-stack-card-header">
                    <span class="news-stack-badge news-stack-badge--community">活动</span>
                    <span class="news-stack-date">2025.03.15</span>
                  </div>
                  <h3 class="news-stack-card-title">AI 驱动灵感，定义你的绿色坐标</h3>
                  <p class="news-stack-card-text">提交废品，即刻开启 AI 协作模式。探索智能回收的无限可能，让每一次分类都成为环保创新的起点。</p>
                  <div class="news-stack-card-footer">
                    <span class="news-stack-icon">🌱</span>
                    <span class="news-stack-arrow">→</span>
                  </div>
                </div>
              </div>

              <div
                class="news-stack-card news-stack-card--checkin"
                role="link"
                tabindex="0"
                @click="navigateTo(newsTargets[2])"
                @keydown="handleKeyboardNavigation($event, newsTargets[2])"
              >
                <div class="news-stack-card-inner">
                  <div class="news-stack-card-header">
                    <span class="news-stack-badge news-stack-badge--checkin">签到</span>
                    <span class="news-stack-date">2025.03.12</span>
                  </div>
                  <h3 class="news-stack-card-title">本周你用了多少次收智通呢</h3>
                  <p class="news-stack-card-text">查看个人中心是否获得了新的成就或奖励。持续参与，解锁更多环保勋章，见证你的绿色足迹。</p>
                  <div class="news-stack-card-footer">
                    <span class="news-stack-icon">⭐</span>
                    <span class="news-stack-arrow">→</span>
                  </div>
                </div>
              </div>

              <div
                class="news-stack-card news-stack-card--knowledge"
                role="link"
                tabindex="0"
                @click="navigateTo(newsTargets[3])"
                @keydown="handleKeyboardNavigation($event, newsTargets[3])"
              >
                <div class="news-stack-card-inner">
                  <div class="news-stack-card-header">
                    <span class="news-stack-badge news-stack-badge--knowledge">环保知识</span>
                    <span class="news-stack-date">2025.03.10</span>
                  </div>
                  <h3 class="news-stack-card-title">如何正确进行垃圾分类？AI 助手来教你</h3>
                  <p class="news-stack-card-text">详细解析各类垃圾的分类标准与回收利用价值，让环保成为日常习惯。从源头做起，共建可持续未来。</p>
                  <div class="news-stack-card-footer">
                    <span class="news-stack-icon">📚</span>
                    <span class="news-stack-arrow">→</span>
                  </div>
                </div>
              </div>

              <div class="news-stack-spacer"></div>
            </div>
          </div>
        </div>
      </section>
    </template>

    <p v-if="loadError" class="state-error">{{ loadError }}</p>
  </section>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: 0;
  padding-bottom: 0;
}

.loading-shell {
  display: grid;
  gap: 18px;
  padding: 0 clamp(32px, 5vw, 80px);
}

.loading-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.home-skeleton {
  min-height: 180px;
  border-radius: 28px;
}

.home-skeleton--hero {
  min-height: 430px;
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: clamp(80px, 12vw, 160px) clamp(32px, 5vw, 80px);
  text-align: center;
}

.hero-content {
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  z-index: 10;
}

.hero-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.hero-eyebrow {
  display: inline-block;
  font-family: var(--font-data);
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--forest-700);
  margin-bottom: 8px;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  margin: 0;
  white-space: nowrap;
}

.hero-title-gradient {
  background: linear-gradient(135deg, var(--forest-700) 0%, var(--moss-500) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: clamp(1.125rem, 2vw, 1.375rem);
  line-height: 1.6;
  color: var(--ink-600);
  max-width: 640px;
  margin: 0;
}

.hero-description-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 4px;
  background: var(--forest-700);
  vertical-align: -0.12em;
  animation: heroCursorBlink 0.9s steps(1, end) infinite;
}

@keyframes heroCursorBlink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-description-cursor {
    animation: none;
  }
}

.hero-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 18px 40px;
  border-radius: 999px;
  font-size: 1.125rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.hero-btn-primary {
  background: linear-gradient(135deg, var(--forest-700) 0%, var(--moss-500) 100%);
  color: white;
  box-shadow: 0 12px 24px rgba(46, 93, 63, 0.25);
}

.hero-btn-primary:hover {
  transform: scale(1.05);
  box-shadow: 0 16px 32px rgba(46, 93, 63, 0.35);
}

.hero-btn-secondary {
  background: transparent;
  color: var(--forest-700);
  border: 1px solid rgba(112, 123, 100, 0.3);
}

.hero-btn-secondary:hover {
  background: rgba(236, 239, 228, 0.5);
  border-color: var(--forest-700);
}

/* Core Functions Section */
.core-functions-section {
  padding: clamp(64px, 10vw, 128px) clamp(32px, 5vw, 80px);
  background: rgba(236, 239, 228, 0.3);
  scroll-margin-top: 96px;
}

.core-functions-section:focus {
  outline: none;
}

.core-functions-content {
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(0, 2.5fr);
  gap: clamp(32px, 8vw, 96px);
  align-items: start;
}

.core-functions-left {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 120px;
}

.core-functions-title {
  font-family: var(--font-display);
  font-size: clamp(3rem, 6vw, 5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  margin: 0;
}

.core-functions-divider {
  height: 6px;
  width: 96px;
  background: rgba(46, 93, 63, 0.4);
  border-radius: 999px;
}

.core-functions-description {
  font-size: 1.25rem;
  line-height: 1.6;
  color: var(--ink-600);
  margin: 0;
}

.core-functions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

.function-card {
  position: relative;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 32px;
  padding: 0;
  overflow: hidden;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  cursor: pointer;
  transform-style: preserve-3d;
  will-change: transform;
}

.function-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(46, 93, 63, 0.05) 0%, rgba(79, 141, 96, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.6s ease;
  border-radius: 32px;
}

.function-card:hover::before {
  opacity: 1;
}

.function-card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(46, 93, 63, 0.15) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
}

.function-card:hover .function-card-glow {
  opacity: 1;
  animation: glowPulse 2s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.6;
  }
}

.function-card-inner {
  position: relative;
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  z-index: 1;
  transform: translateZ(20px);
}

.function-card:focus-visible {
  outline: 3px solid rgba(46, 93, 63, 0.5);
  outline-offset: 4px;
}

.function-card-icon {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(46, 93, 63, 0.15) 0%, rgba(79, 141, 96, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  box-shadow: 0 8px 32px rgba(46, 93, 63, 0.1);
}

.function-card:hover .function-card-icon {
  transform: translateY(-8px) scale(1.1);
  box-shadow: 0 16px 48px rgba(46, 93, 63, 0.2);
}

.function-card-icon-image {
  position: relative;
  z-index: 1;
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.icon-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(46, 93, 63, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.6s ease;
}

.function-card:hover .icon-glow {
  opacity: 1;
  animation: iconGlowPulse 1.5s ease-in-out infinite;
}

@keyframes iconGlowPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
  }
}

.function-card-icon--secondary {
  background: linear-gradient(135deg, rgba(82, 96, 105, 0.15) 0%, rgba(82, 96, 105, 0.1) 100%);
}

.function-card--secondary .icon-glow {
  background: radial-gradient(circle, rgba(82, 96, 105, 0.4) 0%, transparent 70%);
}

.function-card-icon--tertiary {
  background: linear-gradient(135deg, rgba(79, 141, 96, 0.15) 0%, rgba(79, 141, 96, 0.1) 100%);
}

.function-card--tertiary .icon-glow {
  background: radial-gradient(circle, rgba(79, 141, 96, 0.4) 0%, transparent 70%);
}

.function-card-icon--charity {
  background: linear-gradient(135deg, rgba(119, 218, 16, 0.15) 0%, rgba(119, 218, 16, 0.1) 100%);
}

.function-card--charity .icon-glow {
  background: radial-gradient(circle, rgba(119, 218, 16, 0.4) 0%, transparent 70%);
}

.function-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.function-card-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ink-900);
  margin: 0;
  transition: all 0.4s ease;
}

.function-card:hover .function-card-title {
  color: var(--forest-700);
  transform: translateX(4px);
}

.function-card-subtitle {
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-500);
  margin: 0;
  transition: all 0.4s ease;
}

.function-card:hover .function-card-subtitle {
  color: var(--ink-600);
}

.function-card-description {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--ink-600);
  margin: 8px 0 0 0;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

.function-card:hover .function-card-description {
  opacity: 1;
  transform: translateY(0);
}

.function-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.function-card-badge {
  display: inline-flex;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: rgba(46, 93, 63, 0.12);
  color: var(--forest-700);
  width: fit-content;
  transition: all 0.4s ease;
  box-shadow: 0 4px 12px rgba(46, 93, 63, 0.1);
}

.function-card:hover .function-card-badge {
  background: rgba(46, 93, 63, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(46, 93, 63, 0.15);
}

.function-card-badge--secondary {
  background: rgba(82, 96, 105, 0.12);
  color: #526069;
  box-shadow: 0 4px 12px rgba(82, 96, 105, 0.1);
}

.function-card--secondary:hover .function-card-badge--secondary {
  background: rgba(82, 96, 105, 0.2);
  box-shadow: 0 8px 20px rgba(82, 96, 105, 0.15);
}

.function-card-badge--tertiary {
  background: rgba(79, 141, 96, 0.12);
  color: var(--moss-500);
  box-shadow: 0 4px 12px rgba(79, 141, 96, 0.1);
}

.function-card--tertiary:hover .function-card-badge--tertiary {
  background: rgba(79, 141, 96, 0.2);
  box-shadow: 0 8px 20px rgba(79, 141, 96, 0.15);
}

.function-card-badge--charity {
  background: rgba(119, 218, 16, 0.12);
  color: #366b00;
  box-shadow: 0 4px 12px rgba(119, 218, 16, 0.1);
}

.function-card--charity:hover .function-card-badge--charity {
  background: rgba(119, 218, 16, 0.2);
  box-shadow: 0 8px 20px rgba(119, 218, 16, 0.15);
}

.function-card-arrow {
  font-size: 1.5rem;
  color: var(--forest-700);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  font-weight: 300;
}

.function-card:hover .function-card-arrow {
  opacity: 1;
  transform: translateX(0);
}

.function-card--secondary:hover .function-card-title {
  color: #526069;
}

.function-card--secondary .function-card-arrow {
  color: #526069;
}

.function-card--tertiary:hover .function-card-title {
  color: var(--moss-500);
}

.function-card--tertiary .function-card-arrow {
  color: var(--moss-500);
}

.function-card--charity:hover .function-card-title {
  color: #366b00;
}

.function-card--charity .function-card-arrow {
  color: #366b00;
}

@media (prefers-reduced-motion: reduce) {
  .function-card {
    transition: none;
  }
  
  .function-card-glow,
  .icon-glow {
    animation: none !important;
  }
}

/* Why Choose Us Section */
.why-choose-section {
  padding: clamp(64px, 10vw, 128px) clamp(32px, 5vw, 80px);
  background: var(--surface);
}

.why-choose-content {
  max-width: 1440px;
  margin: 0 auto;
}

.why-choose-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 64px;
  gap: 32px;
  flex-wrap: wrap;
}

.why-choose-label {
  font-family: var(--font-data);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--forest-700);
  display: block;
  margin-bottom: 16px;
}

.why-choose-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  margin: 0;
}

.why-choose-btn {
  background: var(--forest-700);
  color: white;
  padding: 16px 40px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 1.125rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 12px 24px rgba(46, 93, 63, 0.2);
}

.why-choose-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 16px 32px rgba(46, 93, 63, 0.3);
}

.why-choose-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 48px;
  align-items: stretch;
}

.why-choose-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.stat-card {
  padding: 32px;
  border-radius: 28px;
  border: 1px solid rgba(191, 202, 176, 0.3);
  background: rgba(236, 239, 228, 0.4);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(22, 53, 36, 0.1);
}

.stat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-icon {
  font-size: 1.75rem;
}

.stat-arrow {
  font-size: 1.25rem;
  color: var(--ink-500);
  transition: color 0.3s ease;
}

.stat-card:hover .stat-arrow {
  color: var(--forest-700);
}

.stat-value {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--ink-900);
}

.stat-description {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--ink-600);
  margin: 0;
}

.why-choose-image {
  position: relative;
  border-radius: 40px;
  overflow: hidden;
  box-shadow: 0 32px 64px rgba(22, 53, 36, 0.15);
  min-height: 400px;
}

.why-choose-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s ease;
}

.why-choose-image:hover .why-choose-img {
  transform: scale(1.05);
}

/* News Section with Scroll Stack Effect */
.news-section {
  padding: clamp(64px, 10vw, 96px) clamp(32px, 5vw, 80px);
  background: linear-gradient(180deg, rgba(236, 239, 228, 0.2) 0%, rgba(236, 239, 228, 0.5) 100%);
  overflow: hidden;
}

.news-content {
  max-width: 1440px;
  margin: 0 auto;
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 64px;
  gap: 32px;
}

.news-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  margin: 0 0 16px 0;
}

.news-divider {
  height: 6px;
  width: 96px;
  background: rgba(46, 93, 63, 0.4);
  border-radius: 999px;
  margin-bottom: 24px;
}

.news-description {
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--ink-600);
  margin: 0;
}

/* Scroll Stack Container */
.news-scroll-container {
  position: relative;
  height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.news-scroll-container::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.news-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.news-scroll-container::-webkit-scrollbar-track {
  background: rgba(191, 202, 176, 0.2);
  border-radius: 999px;
}

.news-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(46, 93, 63, 0.3);
  border-radius: 999px;
  transition: background 0.3s ease;
}

.news-scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(46, 93, 63, 0.5);
}

.news-stack-wrapper {
  position: relative;
  padding-bottom: 400px;
}

/* Stack Cards */
.news-stack-card {
  position: relative;
  margin-bottom: 120px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: top center;
  will-change: transform;
  backface-visibility: hidden;
}

.news-stack-card:last-of-type {
  margin-bottom: 0;
}

.news-stack-card-inner {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 32px;
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 20px 60px rgba(22, 53, 36, 0.08);
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  position: relative;
  overflow: hidden;
}

.news-stack-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(46, 93, 63, 0.03) 0%, rgba(79, 141, 96, 0.03) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
  border-radius: 32px;
  pointer-events: none;
}

.news-stack-card:hover::before {
  opacity: 1;
}

.news-stack-card:hover .news-stack-card-inner {
  box-shadow: 0 32px 80px rgba(22, 53, 36, 0.12);
  border-color: rgba(46, 93, 63, 0.2);
}

.news-stack-card:focus-visible {
  outline: 3px solid rgba(46, 93, 63, 0.5);
  outline-offset: 4px;
  border-radius: 32px;
}

/* Card Header */
.news-stack-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.news-stack-badge {
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.news-stack-badge--system {
  background: linear-gradient(135deg, rgba(46, 93, 63, 0.15) 0%, rgba(46, 93, 63, 0.1) 100%);
  color: var(--forest-700);
}

.news-stack-badge--community {
  background: linear-gradient(135deg, rgba(82, 96, 105, 0.15) 0%, rgba(82, 96, 105, 0.1) 100%);
  color: #526069;
}

.news-stack-badge--checkin {
  background: linear-gradient(135deg, rgba(94, 94, 92, 0.15) 0%, rgba(94, 94, 92, 0.1) 100%);
  color: #5e5e5c;
}

.news-stack-badge--knowledge {
  background: linear-gradient(135deg, rgba(119, 218, 16, 0.15) 0%, rgba(119, 218, 16, 0.1) 100%);
  color: #366b00;
}

.news-stack-card:hover .news-stack-badge {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.news-stack-date {
  font-family: var(--font-data);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--ink-500);
  font-weight: 600;
}

/* Card Content */
.news-stack-card-title {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  font-weight: 700;
  line-height: 1.3;
  color: var(--ink-900);
  margin: 0;
  transition: all 0.3s ease;
}

.news-stack-card:hover .news-stack-card-title {
  color: var(--forest-700);
  transform: translateX(4px);
}

.news-stack-card-text {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--ink-600);
  margin: 0;
  transition: all 0.3s ease;
}

.news-stack-card:hover .news-stack-card-text {
  color: var(--ink-700);
}

/* Card Footer */
.news-stack-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.news-stack-icon {
  font-size: 2rem;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  filter: grayscale(0.3);
}

.news-stack-card:hover .news-stack-icon {
  transform: scale(1.15) rotate(5deg);
  filter: grayscale(0);
}

.news-stack-arrow {
  font-size: 2rem;
  color: var(--forest-700);
  opacity: 0;
  transform: translateX(-20px);
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  font-weight: 300;
}

.news-stack-card:hover .news-stack-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* Card Color Variants */
.news-stack-card--system:hover .news-stack-card-title {
  color: var(--forest-700);
}

.news-stack-card--community:hover .news-stack-card-title {
  color: #526069;
}

.news-stack-card--community .news-stack-arrow {
  color: #526069;
}

.news-stack-card--checkin:hover .news-stack-card-title {
  color: #5e5e5c;
}

.news-stack-card--checkin .news-stack-arrow {
  color: #5e5e5c;
}

.news-stack-card--knowledge:hover .news-stack-card-title {
  color: #366b00;
}

.news-stack-card--knowledge .news-stack-arrow {
  color: #366b00;
}

.news-stack-spacer {
  height: 200px;
}

@media (prefers-reduced-motion: reduce) {
  .news-scroll-container {
    scroll-behavior: auto;
  }
  
  .news-stack-card {
    transition: none;
  }
}

/* Responsive */
@media (max-width: 1180px) {
  .core-functions-content {
    grid-template-columns: 1fr;
  }

  .core-functions-left {
    position: static;
  }

  .why-choose-grid {
    grid-template-columns: 1fr;
  }

  .why-choose-stats {
    order: 2;
  }

  .why-choose-image {
    order: 1;
  }
}

@media (max-width: 960px) {
  .core-functions-grid {
    grid-template-columns: 1fr;
  }

  .why-choose-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 720px) {
  .hero-section {
    padding: clamp(48px, 10vw, 80px) clamp(20px, 4vw, 32px);
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .hero-btn {
    width: 100%;
  }

  .core-functions-section,
  .why-choose-section,
  .news-section {
    padding: clamp(48px, 8vw, 64px) clamp(20px, 4vw, 32px);
  }

  .why-choose-stats {
    grid-template-columns: 1fr;
  }

  .news-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .news-item {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px;
  }

  .news-arrow {
    align-self: flex-end;
  }
}

@media (max-width: 380px) {
  .hero-title {
    font-size: 1.65rem;
  }
}

.state-error {
  border: 1px solid rgba(149, 73, 38, 0.32);
  border-radius: 12px;
  padding: 10px 12px;
  color: #8f431d;
  background: rgba(255, 242, 232, 0.9);
  font-size: 0.88rem;
}

.section-title-center {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3vw, 3rem);
  font-weight: 700;
  color: var(--ink-900);
  margin: 0 0 24px;
}

.section-description-center {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--ink-600);
  max-width: 640px;
  margin: 0 auto;
}

/* Responsive */
@media (max-width: 1180px) {
  .core-functions-content {
    grid-template-columns: 1fr;
  }

  .core-functions-left {
    position: static;
  }

  .why-choose-grid {
    grid-template-columns: 1fr;
  }

  .why-choose-stats {
    order: 2;
  }

  .why-choose-image {
    order: 1;
  }
}

@media (max-width: 960px) {
  .core-functions-grid {
    grid-template-columns: 1fr;
  }

  .why-choose-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 720px) {
  .hero-section {
    padding: clamp(48px, 10vw, 80px) clamp(20px, 4vw, 32px);
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .hero-btn {
    width: 100%;
  }

  .core-functions-section,
  .why-choose-section,
  .news-section {
    padding: clamp(48px, 8vw, 64px) clamp(20px, 4vw, 32px);
  }

  .why-choose-stats {
    grid-template-columns: 1fr;
  }

  .news-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .news-scroll-container {
    height: 500px;
  }

  .news-stack-card-inner {
    padding: 32px;
  }

  .news-stack-card-title {
    font-size: 1.25rem;
  }

  .news-stack-card-text {
    font-size: 0.875rem;
  }
}

@media (max-width: 380px) {
  .hero-title {
    font-size: 1.65rem;
  }

  .news-stack-card-inner {
    padding: 24px;
  }
}

.state-error {
  border: 1px solid rgba(149, 73, 38, 0.32);
  border-radius: 12px;
  padding: 10px 12px;
  color: #8f431d;
  background: rgba(255, 242, 232, 0.9);
  font-size: 0.88rem;
}
</style>
