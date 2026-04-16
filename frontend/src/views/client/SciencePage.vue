<script setup>
import { ref } from "vue";

import { useRevealOnScroll } from "../../composables/useRevealOnScroll";

const pageRef = ref(null);
useRevealOnScroll(pageRef);

const columns = [
  {
    label: "分类基础",
    title: "先把最常见的判断边界讲清楚",
    text: "围绕纸类、塑料、织物、小家电等高频场景，解释为什么它们会落在不同处理路径上。",
  },
  {
    label: "生活实践",
    title: "把环保动作落到更容易执行的日常里",
    text: "从家庭暂存、清洁、打包到预约前准备，让一次回收不再需要临时搜一堆零散答案。",
  },
  {
    label: "城市协同",
    title: "解释回收背后的流转逻辑",
    text: "让用户知道旧物离开家门之后会发生什么，以及平台为什么要把识别、预约和反馈连起来。",
  },
];

const articles = [
  {
    title: "旧衣物为什么要区分“可穿着”和“纺织回收”？",
    tag: "衣物分类",
    text: "因为继续穿着和拆解回收面对的是两套完全不同的流转链路。把这一步说清楚，用户才知道该去捐赠还是去预约回收。",
  },
  {
    title: "快递纸箱为什么建议先压平再投递或预约？",
    tag: "家庭整理",
    text: "压平能减少暂存体积，也能让运输和称重更稳定，避免上门时才临时重新整理。",
  },
  {
    title: "小家电里哪些部件最值得单独注意？",
    tag: "电子回收",
    text: "电池、线路板和破损外壳往往决定了它是直接回收还是需要更谨慎的拆分处理。",
  },
  {
    title: "为什么一次完整的回收反馈很重要？",
    tag: "平台机制",
    text: "因为只有把结果回到用户侧，环保行动才不会停留在提交表单的那一刻，而会变成持续可感知的参与。",
  },
];

const tags = ["减量", "分类", "再利用", "社区协同", "预约准备", "循环反馈"];
</script>

<template>
  <section ref="pageRef" class="science-page">
    <header class="hero-band" data-reveal>
      <div>
        <p class="eyebrow">科普专区</p>
        <h1>把环保知识讲得更短、更清楚，也更接近日常生活。</h1>
      </div>
      <p>
        这里不是法规堆砌区，而是面向普通家庭的公开内容页。我们把高频疑问拆成专题栏目和短文卡片，帮助用户边看边建立判断习惯。
      </p>
    </header>

    <section class="column-strip" data-reveal style="--reveal-delay: 80ms">
      <article v-for="item in columns" :key="item.title">
        <p class="block-label">{{ item.label }}</p>
        <h2>{{ item.title }}</h2>
        <p>{{ item.text }}</p>
      </article>
    </section>

    <section class="tag-band" data-reveal style="--reveal-delay: 100ms">
      <span v-for="item in tags" :key="item">{{ item }}</span>
    </section>

    <section class="article-stage" data-reveal style="--reveal-delay: 140ms">
      <div class="article-stage__head">
        <p class="eyebrow">短文卡片</p>
        <h2>适合快速浏览，也适合顺手转给家里人看。</h2>
      </div>

      <div class="article-grid">
        <article v-for="item in articles" :key="item.title" class="article-card">
          <small>{{ item.tag }}</small>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.science-page {
  display: grid;
  gap: 24px;
}

.hero-band,
.article-stage__head {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 20px;
  align-items: end;
}

.hero-band {
  border-bottom: 1px solid rgba(41, 79, 57, 0.18);
  padding-bottom: 18px;
}

.hero-band h1,
.column-strip h2,
.article-stage__head h2,
.article-card h3 {
  margin: 12px 0 0;
  color: var(--ink-900);
  font-family: var(--font-display);
}

.hero-band h1 {
  font-size: clamp(2.1rem, 4vw, 3.5rem);
  line-height: 1.08;
}

.hero-band p:last-child,
.column-strip p:last-child,
.article-card p {
  color: var(--ink-600);
  line-height: 1.8;
}

.block-label {
  margin: 0;
  color: var(--forest-600);
  font-family: var(--font-data);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.column-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.column-strip article {
  padding-top: 18px;
  border-top: 1px solid rgba(42, 79, 58, 0.16);
}

.column-strip h2 {
  font-size: 1.44rem;
  line-height: 1.45;
}

.tag-band {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-band span {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(42, 79, 58, 0.12);
  background: rgba(255, 255, 255, 0.68);
  color: var(--forest-700);
  font-size: 0.82rem;
  font-weight: 700;
}

.article-stage {
  display: grid;
  gap: 18px;
}

.article-stage__head h2 {
  font-size: clamp(1.8rem, 3vw, 2.7rem);
  line-height: 1.12;
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.article-card {
  padding: 22px;
  border-radius: 24px 10px 24px 10px;
  border: 1px solid rgba(42, 79, 58, 0.14);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(242, 247, 241, 0.88)),
    var(--surface);
  box-shadow: 0 18px 36px rgba(23, 52, 36, 0.07);
}

.article-card small {
  color: var(--forest-600);
  font-family: var(--font-data);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
}

.article-card p {
  margin: 12px 0 0;
}

@media (max-width: 980px) {
  .hero-band,
  .article-stage__head,
  .column-strip,
  .article-grid {
    grid-template-columns: 1fr;
  }
}
</style>
