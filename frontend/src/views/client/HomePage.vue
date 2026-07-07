<!-- HomePage.vue -->
<!-- 首页(view 层)。
     只做编排:
       - 实例化 useTypewriter + 内联 loading/loadError/home 状态
       - 持有 4 个私有数据常量(FUNCTION_CARDS / STATS / WHY_IMAGE / NEWS_ITEMS)
       - 持有 HERO_DESCRIPTION / DEFAULT_HOME_HERO 文案 + fallback
       - 渲染 4 个 panel: HomeHeroPanel / HomeCoreFunctionsPanel /
         HomeWhyChoosePanel / HomeNewsPanel
       - 3 个协调函数: navigateTo / scrollToServices / 接 servicesSectionRef
     所有业务状态 / 模板细节 / 滚动堆叠逻辑 / 3D 倾斜 / 打字机 都拆到
     composables(/) + components/client/home/。
     view 只保留布局容器、加载/错误状态、主页级响应式断点(影响多 section)。 -->

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import { useTypewriter } from "@/composables/useTypewriter";
import { useContentStore } from "@/stores/content";

import HomeHeroPanel from "@/components/client/home/HomeHeroPanel.vue";
import HomeCoreFunctionsPanel from "@/components/client/home/HomeCoreFunctionsPanel.vue";
import HomeWhyChoosePanel from "@/components/client/home/HomeWhyChoosePanel.vue";
import HomeNewsPanel from "@/components/client/home/HomeNewsPanel.vue";

import blocksIcon from "@/assets/blocks.png";
import ghostIcon from "@/assets/ghost.png";
import heartHandshakeIcon from "@/assets/heart-handshake.png";
import imagePlusIcon from "@/assets/image-plus.png";

const pageRef = ref(null);
const servicesSectionRef = ref(null);
useRevealOnScroll(pageRef);
const router = useRouter();

const contentStore = useContentStore();
const loading = computed(() => contentStore.loading);
const loadError = computed(() => contentStore.errorText);
const home = computed(() => contentStore.home);

async function loadHome() {
  await contentStore.fetchHome();
}

const typewriter = useTypewriter({ delay: 58, startDelay: 320 });

const HERO_DESCRIPTION =
  "通过高精度AI和有机物流改变城市回收。我们不仅仅是处理废弃物；我们打造一个可持续发展与精致相遇的生态系统。";

const DEFAULT_HOME_HERO = Object.freeze({
  primaryCta: { to: "/ai-identify" },
});

const FUNCTION_CARDS = [
  {
    icon: imagePlusIcon,
    variant: "default",
    title: "AI识别",
    subtitle: "AI Identification",
    description: "智能识别废弃物类型，精准分类指导",
    badge: "Precision AI",
    to: "/ai-identify",
  },
  {
    icon: ghostIcon,
    variant: "secondary",
    title: "AI助手",
    subtitle: "Category Inquiry",
    description: "快速查询物品分类，获取回收建议",
    badge: "Smart Catalog",
    to: "/ai-qa",
  },
  {
    icon: blocksIcon,
    variant: "tertiary",
    title: "预约回收",
    subtitle: "Book Collection",
    description: "便捷预约上门回收，省时省力环保",
    badge: "Scheduled Flow",
    to: "/recycle-booking",
  },
  {
    icon: heartHandshakeIcon,
    variant: "charity",
    title: "公益捐赠",
    subtitle: "Public Welfare",
    description: "闲置物品捐赠，传递爱心与温暖",
    badge: "Ethereal Impact",
    to: "/charity",
  },
];

const STATS = [
  { icon: "✓", value: "600+", description: "成功落地的城市循环再生项目" },
  { icon: "🌿", value: "1.5万吨", description: "每年通过我们的生态系统处理的回收材料" },
  { icon: "👥", value: "98%", description: "在我们的无缝预约回收流程中的客户满意度" },
  { icon: "📊", value: "AI 优先", description: "自主研发的识别引擎，确保 99.9% 的分类准确率" },
];

const WHY_IMAGE = {
  url: "https://tse1.mm.bing.net/th/id/OIP.mEE_eLNmAV9iYl4IjM6wdAAAAA?rs=1&pid=ImgDetMain&o=7&rm=3",
  alt: "现代生态办公环境",
};

const NEWS_ITEMS = [
  {
    badge: "系统公告",
    date: "2025.03.18",
    title: "收智通全新升级，已上线ai大模型",
    text: "全新 UI 设计，更强大的 Qwen2.5 AI 识别引擎以及社区功能全面升级，带来更流畅的绿色生活体验。",
    icon: "🔬",
    to: "/ai-identify",
    variant: "system",
  },
  {
    badge: "活动",
    date: "2025.03.15",
    title: "AI 驱动灵感，定义你的绿色坐标",
    text: "提交废品，即刻开启 AI 协作模式。探索智能回收的无限可能，让每一次分类都成为环保创新的起点。",
    icon: "🌱",
    to: "/upcycle",
    variant: "community",
  },
  {
    badge: "签到",
    date: "2025.03.12",
    title: "本周你用了多少次收智通呢",
    text: "查看个人中心是否获得了新的成就或奖励。持续参与，解锁更多环保勋章，见证你的绿色足迹。",
    icon: "⭐",
    to: "/profile",
    variant: "checkin",
  },
  {
    badge: "环保知识",
    date: "2025.03.10",
    title: "如何正确进行垃圾分类？AI 助手来教你",
    text: "详细解析各类垃圾的分类标准与回收利用价值，让环保成为日常习惯。从源头做起，共建可持续未来。",
    icon: "📚",
    to: "/science",
    variant: "knowledge",
  },
];

function navigateTo(to) {
  if (!to) return;
  router.push(to);
}

function scrollToServices() {
  const node = servicesSectionRef.value;
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    node.focus({ preventScroll: true });
  }, 420);
}

onMounted(() => {
  loadHome();
  watch(
    () => home.value?.hero,
    (hero) => {
      if (hero) typewriter.start(HERO_DESCRIPTION);
    },
  );
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

    <template v-else-if="home && home.hero">
      <HomeHeroPanel
        :description-text="typewriter.text"
        :primary-cta-to="home.hero.primaryCta?.to || DEFAULT_HOME_HERO.primaryCta.to"
        @scroll-to-services="scrollToServices"
      />
      <HomeCoreFunctionsPanel
        :cards="FUNCTION_CARDS"
        @navigate="navigateTo"
        @ready="(el) => (servicesSectionRef = el)"
      />
      <HomeWhyChoosePanel
        :stats="STATS"
        :image-url="WHY_IMAGE.url"
        :image-alt="WHY_IMAGE.alt"
        @learn-more="navigateTo('/science')"
      />
      <HomeNewsPanel :items="NEWS_ITEMS" @navigate="navigateTo" />
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

/* View-level responsive breakpoints that span multiple sections.
   Section-specific media queries live in each panel. */

@media (max-width: 720px) {
  .home-skeleton--hero {
    min-height: 320px;
  }

  .loading-grid {
    grid-template-columns: 1fr;
  }
}

.state-error {
  border: 1px solid rgba(149, 73, 38, 0.32);
  border-radius: 12px;
  padding: 10px 12px;
  color: #8f431d;
  background: rgba(255, 242, 232, 0.9);
  font-size: 0.88rem;
  margin: 16px clamp(32px, 5vw, 80px);
}
</style>
