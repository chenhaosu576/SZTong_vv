<script setup>
import { computed, onMounted, ref } from "vue";

import { useRevealOnScroll } from "../../composables/useRevealOnScroll";
import { fetchFaqData } from "../../mock/clientApi";

const pageRef = ref(null);
useRevealOnScroll(pageRef);

const loading = ref(true);
const errorText = ref("");
const faqPayload = ref(null);
const activeCategory = ref("全部");
const keyword = ref("");

const categories = computed(() => {
  if (!faqPayload.value) return ["全部"];
  const values = new Set(faqPayload.value.faqs.map((item) => item.category));
  return ["全部", ...Array.from(values)];
});

const filteredFaqs = computed(() => {
  if (!faqPayload.value) return [];
  return faqPayload.value.faqs.filter((item) => {
    const passCategory = activeCategory.value === "全部" || item.category === activeCategory.value;
    const query = keyword.value.trim();
    const passKeyword = !query || item.q.includes(query) || item.a.includes(query);
    return passCategory && passKeyword;
  });
});

async function loadFaq() {
  loading.value = true;
  errorText.value = "";
  try {
    faqPayload.value = await fetchFaqData();
  } catch (error) {
    errorText.value = "常见问题加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

onMounted(loadFaq);
</script>

<template>
  <section ref="pageRef" class="faq-page">
    <header class="faq-head" data-reveal>
      <div>
        <p class="eyebrow">常见问题与环保科普</p>
        <h1>把本地分类规范、生活疑问和旧物改造方法，整理成一个更容易打开的知识页。</h1>
      </div>
      <p>你可以按分类筛选，也可以直接搜索问题。这里不仅回答“怎么分”，也告诉你“为什么这样分”。</p>
    </header>

    <template v-if="loading">
      <div class="loading-shimmer skeleton" />
      <div class="loading-shimmer skeleton" />
    </template>

    <template v-else-if="faqPayload">
      <section class="standards-strip" data-reveal style="--reveal-delay: 80ms">
        <article v-for="item in faqPayload.standards" :key="item.name">
          <p class="block-label">{{ item.name }}</p>
          <p>{{ item.text }}</p>
        </article>
      </section>

      <section class="faq-filter" data-reveal style="--reveal-delay: 100ms">
        <div class="category-chips">
          <button
            v-for="item in categories"
            :key="item"
            :class="['chip', activeCategory === item ? 'is-active' : '']"
            @click="activeCategory = item"
          >
            {{ item }}
          </button>
        </div>
        <input v-model="keyword" type="text" placeholder="输入关键词筛选问题" />
      </section>

      <section class="faq-stage" data-reveal style="--reveal-delay: 120ms">
        <article class="qa-panel">
          <p class="block-label">问答列表</p>
          <h2>常见问题</h2>

          <div class="qa-list">
            <details v-for="item in filteredFaqs" :key="item.q">
              <summary>
                <span class="tag">{{ item.category }}</span>
                {{ item.q }}
              </summary>
              <p>{{ item.a }}</p>
            </details>

            <p v-if="!filteredFaqs.length" class="empty">没有匹配的问题，可以尝试更换关键词或切换分类。</p>
          </div>
        </article>

        <article class="side-panel">
          <section>
            <p class="block-label">环保科普</p>
            <h2>为什么回收值得持续做</h2>
            <ul>
              <li v-for="item in faqPayload.science" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section>
            <p class="block-label">旧物改造</p>
            <h2>DIY 教程</h2>
            <ul>
              <li v-for="item in faqPayload.diy" :key="item">{{ item }}</li>
            </ul>
          </section>
        </article>
      </section>
    </template>

    <p v-if="errorText" class="state-error">{{ errorText }}</p>

    <router-link class="ai-float" to="/ai-identify">
      <span>AI</span>
      <small>问答助手</small>
    </router-link>
  </section>
</template>

<style scoped>
.faq-page {
  position: relative;
  display: grid;
  gap: 22px;
}

.faq-head {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 20px;
  align-items: end;
  border-bottom: 1px solid rgba(41, 79, 57, 0.18);
  padding-bottom: 18px;
}

.faq-head h1 {
  margin: 12px 0 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1.1;
}

.faq-head p:last-child {
  margin: 0;
  color: var(--ink-600);
  line-height: 1.9;
  max-width: 44ch;
}

.skeleton {
  height: 150px;
}

.standards-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid rgba(42, 79, 58, 0.18);
  border-bottom: 1px solid rgba(42, 79, 58, 0.18);
}

.standards-strip article {
  padding: 16px 18px 18px 0;
  border-left: 1px solid rgba(42, 79, 58, 0.1);
}

.standards-strip article:first-child {
  border-left: 0;
}

.block-label {
  margin: 0;
  font-family: var(--font-data);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  color: var(--forest-600);
  text-transform: uppercase;
}

.standards-strip p:last-child {
  margin: 10px 0 0;
  color: var(--ink-600);
  line-height: 1.82;
}

.faq-filter {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.category-chips {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.chip {
  border: none;
  padding: 0 0 8px;
  background: transparent;
  color: var(--ink-600);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

.chip.is-active,
.chip:hover {
  color: var(--forest-700);
  border-bottom-color: rgba(44, 92, 63, 0.46);
}

.faq-filter input {
  width: 320px;
  max-width: 100%;
  height: 40px;
  border: 1px solid rgba(53, 96, 70, 0.2);
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.74);
  font: inherit;
}

.faq-stage {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 28px;
}

.qa-panel,
.side-panel {
  padding-top: 22px;
  border-top: 1px solid rgba(42, 79, 58, 0.18);
}

.qa-panel h2,
.side-panel h2 {
  margin: 10px 0 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: 1.84rem;
}

.qa-list {
  margin-top: 16px;
  display: grid;
  gap: 10px;
}

details {
  padding: 0 0 14px;
  border-bottom: 1px solid rgba(42, 79, 58, 0.12);
}

summary {
  cursor: pointer;
  color: var(--ink-800);
  font-weight: 700;
  line-height: 1.76;
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 8px;
  margin-right: 8px;
  background: rgba(142, 196, 152, 0.16);
  color: #215f3d;
  font-size: 0.72rem;
}

details p {
  margin: 10px 0 0;
  color: var(--ink-600);
  line-height: 1.85;
}

.side-panel {
  display: grid;
  gap: 22px;
}

.side-panel section ul {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}

.side-panel li {
  padding: 12px 0;
  border-bottom: 1px solid rgba(42, 79, 58, 0.12);
  color: var(--ink-600);
  line-height: 1.8;
}

.empty {
  margin: 0;
  color: var(--ink-600);
}

.ai-float {
  position: fixed;
  right: 24px;
  bottom: 30px;
  z-index: 40;
  width: 78px;
  height: 78px;
  display: grid;
  place-items: center;
  text-align: center;
  text-decoration: none;
  color: #f2fff5;
  background:
    radial-gradient(circle at 30% 20%, rgba(202, 229, 210, 0.3), transparent 50%),
    linear-gradient(145deg, #1f5036, #56926a);
  box-shadow: 0 14px 34px rgba(22, 98, 58, 0.24);
  animation: bob 2.4s ease-in-out infinite, pulseGlow 2.8s ease-in-out infinite;
}

.ai-float span {
  display: block;
  font-family: var(--font-data);
  font-size: 1.2rem;
  letter-spacing: 0.1em;
}

.ai-float small {
  display: block;
  margin-top: 2px;
  font-size: 0.72rem;
}

@media (max-width: 1120px) {
  .faq-head,
  .faq-stage {
    grid-template-columns: 1fr;
  }

  .standards-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .standards-strip {
    grid-template-columns: 1fr;
  }

  .standards-strip article {
    border-left: 0;
    border-top: 1px solid rgba(42, 79, 58, 0.1);
    padding-right: 0;
  }

  .standards-strip article:first-child {
    border-top: 0;
  }

  .faq-filter input {
    width: 100%;
  }
}
</style>
