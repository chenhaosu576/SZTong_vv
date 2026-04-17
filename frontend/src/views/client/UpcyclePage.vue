<script setup>
import { ref } from 'vue';
import { useRevealOnScroll } from '../../composables/useRevealOnScroll';

const pageRef = ref(null);
useRevealOnScroll(pageRef);

const scrollToMaterialDetail = (materialId, event) => {
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0 ||
    typeof document === 'undefined' ||
    typeof window === 'undefined'
  ) {
    return;
  }

  const target = document.getElementById(materialId);

  if (!target) {
    return;
  }

  event.preventDefault();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  target.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start'
  });

  window.history.pushState(null, '', `#${materialId}`);
};

// Material categories for the asymmetrical grid
const materials = [
  {
    id: 'glass',
    title: '玻璃容器',
    subtitle: '瓶子、罐子与透光的艺术',
    image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800',
    span: 'large'
  },
  {
    id: 'fabric',
    title: '旧衣织物',
    subtitle: '让过季服装再次焕发温度',
    image: 'https://images.pexels.com/photos/7444977/pexels-photo-7444977.jpeg?cs=srgb&dl=pexels-enric-cruz-lopez-7444977.jpg&fm=jpg',
    span: 'medium'
  },
  {
    id: 'cardboard',
    title: '纸板纸箱',
    subtitle: '',
    image: 'https://images.pexels.com/photos/5691655/pexels-photo-5691655.jpeg?cs=srgb&dl=pexels-kseniachernaya-5691655.jpg&fm=jpg',
    span: 'small'
  },
  {
    id: 'wood',
    title: '木石金工',
    subtitle: '',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600',
    span: 'small'
  }
];

// Community showcase projects
const communityPicks = [
  {
    title: '琥珀色床头灯',
    tag: '学生宿舍改造',
    materials: '旧酒瓶 + 铜线',
    quote: '把废弃的威士忌瓶变成温暖的阅读灯，夜晚都变得温柔了。',
    image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600'
  },
  {
    title: '几何拼贴收纳墙',
    tag: '极简收纳',
    materials: '废旧木框 + 环保漆',
    quote: '重新排列的木框，是墙面最好的装饰，也是最实用的收纳。',
    image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600'
  },
  {
    title: '拼贴托特包',
    tag: '快时尚反击',
    materials: '旧牛仔裤 + 帆布',
    quote: '穿不下的三条旧牛仔裤，变成了一只独一无二的通勤包。',
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600'
  }
];

// Material detail sections
const materialDetails = {
  glass: {
    icon: 'liquor',
    title: '玻璃材质：光影的载体',
    description: '玻璃是改造中可塑性极高的材质，通过简单的切割与堆叠即可创造质感。',
    uses: ['桌面花瓶', '香薰蜡烛罐', '调料定制罐'],
    difficulty: '★☆☆☆☆',
    tools: '极简',
    examples: [
      { title: '多肉玻璃房', image: 'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=400' },
      { title: '复古厨房储物', image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=400' }
    ]
  },
  fabric: {
    icon: 'apparel',
    title: '旧衣织物：温暖的触感',
    description: '每一件旧衣服都有它独特的故事，将其裁剪拼贴，能延续这份亲密的陪伴。',
    uses: ['软装抱枕', '拼布地毯', '定制包袋'],
    difficulty: '★★★☆☆',
    tools: '缝纫工具',
    examples: [
      { title: '牛仔拼贴抱枕', image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400' },
      { title: '旧T恤环保袋', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400' }
    ]
  },
  cardboard: {
    icon: 'inventory_2',
    title: '纸板纸箱：结构的魔力',
    description: '快递包装不应是垃圾。利用它的几何结构，可以打造出超轻量的实用家具。',
    uses: ['猫抓板/窝', '抽屉隔板', '桌面支架'],
    difficulty: '★★☆☆☆',
    tools: '美工刀/热熔胶',
    examples: [
      { title: 'DIY猫咪城堡', image: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400' },
      { title: '瓦楞纸灯罩', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400' }
    ]
  }
};

// Beginner guide steps
const beginnerSteps = [
  {
    number: 1,
    title: '发现"可能"',
    description: '观察家里即将丢弃的东西，尝试换个角度（如倒置、切割、重新上色）看它。'
  },
  {
    number: 2,
    title: '最小可行性',
    description: '先从不需要专业工具的项目开始，比如给罐子贴上一圈麻绳。'
  },
  {
    number: 3,
    title: '分享并迭代',
    description: '记录下你的成果。在社区中分享，你会得到意想不到的优化建议。'
  }
];

// Safety rules
const safetyRules = [
  '切割玻璃或金属前，请务必佩戴防护手套和护目镜，并对边缘进行充分打磨。',
  '如涉及电路改造，请确保了解基础用电知识，并使用合格的电子元件。',
  '保持创作环境通风，特别是在使用油漆或强力胶水时。'
];

</script>

<template>
  <div ref="pageRef" class="upcycle-page">
    <!-- Hero Section -->
    <section class="hero-section" data-reveal>
      <div class="hero-content">
        <h1 class="hero-title">让旧物，<br>焕发第2次 <span class="highlight-tertiary">生命</span>。</h1>
        <p class="hero-description">
          旧物改造不仅是回收，更是一种生活艺术。在这里，每一个废弃容器、每一件旧衣，都能在你的灵感中重获新生。
        </p>
        <div class="hero-actions">
          <a href="#material-wall" class="hero-btn hero-btn-primary">开始改造</a>
          <a href="#community-picks" class="hero-btn hero-btn-secondary">浏览案例</a>
        </div>
      </div>
      <div class="hero-image">
        <img 
          src="https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600" 
          alt="改造后的玻璃瓶花瓶"
          width="600"
          height="400"
          class="floating-image"
        />
      </div>
    </section>

    <!-- Material Card Wall -->
    <section id="material-wall" class="material-wall-section" data-reveal style="--reveal-delay: 80ms">
      <h2 class="section-title">
        <span class="title-line"></span>
        灵感素材库
      </h2>
      
      <div class="material-grid">
        <a 
          v-for="material in materials" 
          :key="material.id"
          :href="`#${material.id}`"
          :class="['material-card', `material-card--${material.span}`]"
          @click="scrollToMaterialDetail(material.id, $event)"
        >
          <img :src="material.image" :alt="material.title" width="800" height="533" loading="lazy" class="material-card__image" />
          <div class="material-card__overlay"></div>
          <div class="material-card__content">
            <h3 class="material-card__title">{{ material.title }}</h3>
            <p v-if="material.subtitle" class="material-card__subtitle">{{ material.subtitle }}</p>
          </div>
        </a>
      </div>
    </section>

    <!-- Community Picks Gallery -->
    <section id="community-picks" class="community-section" data-reveal style="--reveal-delay: 120ms">
      <div class="community-header">
        <div>
          <h2 class="community-title">社区精选作品</h2>
          <p class="community-description">
            来自策展人社区的真实创意，不仅仅是改造，更是生活态度的表达。
          </p>
        </div>
      </div>

      <div class="community-grid">
        <article 
          v-for="(pick, index) in communityPicks" 
          :key="index"
          class="community-card"
        >
          <div class="community-card__image-wrapper">
            <img :src="pick.image" :alt="pick.title" width="600" height="750" loading="lazy" class="community-card__image" />
            <span class="community-card__tag">{{ pick.tag }}</span>
          </div>
          <h4 class="community-card__title">{{ pick.title }}</h4>
          <p class="community-card__materials">
            <span class="material-symbols-outlined" aria-hidden="true">recycling</span>
            {{ pick.materials }}
          </p>
          <blockquote class="community-card__quote">{{ pick.quote }}</blockquote>
        </article>
      </div>
    </section>

    <!-- Material Detail Sections -->
    <div class="material-details-wrapper">
      <section 
        v-for="(detail, key) in materialDetails" 
        :key="key"
        :id="key"
        class="material-detail-section"
        data-reveal
        style="--reveal-delay: 140ms"
      >
        <div class="material-detail-header">
          <div class="material-detail-icon">
            <span class="material-symbols-outlined" aria-hidden="true">{{ detail.icon }}</span>
          </div>
          <div>
            <h3 class="material-detail-title">{{ detail.title }}</h3>
            <p class="material-detail-description">{{ detail.description }}</p>
          </div>
        </div>

        <div class="material-detail-content">
          <div class="material-detail-info">
            <div class="material-info-card">
              <h4 class="material-info-title">
                <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
                推荐用途
              </h4>
              <div class="material-tags">
                <span v-for="use in detail.uses" :key="use" class="material-tag">{{ use }}</span>
              </div>
            </div>
            <div class="material-stats">
              <div class="material-stat">
                <span class="material-stat-label">难度等级</span>
                <span class="material-stat-value">{{ detail.difficulty }}</span>
              </div>
              <div class="material-stat">
                <span class="material-stat-label">工具需求</span>
                <span class="material-stat-value">{{ detail.tools }}</span>
              </div>
            </div>
          </div>

          <div class="material-examples">
            <div 
              v-for="(example, idx) in detail.examples" 
              :key="idx"
              class="material-example"
              :style="{ marginTop: idx === 1 ? '2rem' : '0' }"
            >
              <img :src="example.image" :alt="example.title" width="400" height="533" loading="lazy" class="material-example__image" />
              <div class="material-example__caption">
                <p>{{ example.title }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Footer Section -->
    <section class="footer-section" data-reveal style="--reveal-delay: 160ms">
      <div class="footer-grid">
        <!-- Beginner Guide -->
        <div class="beginner-guide">
          <h3 class="footer-title">新手入门三部曲</h3>
          <div class="beginner-steps">
            <div v-for="step in beginnerSteps" :key="step.number" class="beginner-step">
              <div class="step-number">{{ step.number }}</div>
              <div class="step-content">
                <h4 class="step-title">{{ step.title }}</h4>
                <p class="step-description">{{ step.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Safety Rules -->
        <div class="safety-rules">
          <h3 class="footer-title safety-title">
            <span class="material-symbols-outlined" aria-hidden="true">warning</span>
            安全准则
          </h3>
          <ul class="safety-list">
            <li v-for="(rule, index) in safetyRules" :key="index" class="safety-item">
              <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
              <p>{{ rule }}</p>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>


<style scoped>
/* Import Material Symbols */
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.upcycle-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 2rem;
  --hero-cta-primary-bg: linear-gradient(135deg, #2f6547 0%, #6aa27a 100%);
  --hero-cta-primary-shadow: 0 10px 20px rgba(47, 101, 71, 0.18);
  --hero-cta-primary-hover-shadow: 0 14px 26px rgba(47, 101, 71, 0.24);
}

/* Hero Section */
.hero-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  padding: 5rem 0;
  position: relative;
  overflow: hidden;
}

.hero-content {
  max-width: 56rem;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(3rem, 5vw, 4.5rem);
  font-weight: 900;
  color: var(--forest-700);
  line-height: 1.08;
  margin: 0 0 2rem;
  letter-spacing: -0.02em;
}

.highlight-tertiary {
  color: #97490d;
}

.hero-description {
  font-size: 1.25rem;
  line-height: 1.625;
  color: var(--ink-600);
  margin: 0 0 3rem;
  max-width: 42rem;
}

.hero-image {
  position: relative;
  opacity: 0.2;
}

.floating-image {
  width: 100%;
  border-radius: 1.5rem;
  transform: rotate(6deg) scale(1.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Material Wall Section */
.material-wall-section {
  padding: 6rem 0;
}

.section-title {
  font-family: var(--font-display);
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--ink-900);
  margin: 0 0 4rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.title-line {
  width: 3rem;
  height: 2px;
  background: var(--forest-600);
}

.material-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2rem;
  height: 700px;
}

.material-card {
  position: relative;
  border-radius: 1.5rem;
  overflow: hidden;
  text-decoration: none;
  transition: transform 0.3s ease;
}

.material-card:hover {
  transform: translateY(-4px);
}

.material-card:focus-visible {
  outline: 3px solid var(--forest-700);
  outline-offset: 4px;
}

.material-card--large {
  grid-column: span 2;
  grid-row: span 2;
}

.material-card--medium {
  grid-column: span 2;
  grid-row: span 1;
}

.material-card--small {
  grid-column: span 1;
  grid-row: span 1;
}

.material-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s ease;
}

.material-card:hover .material-card__image {
  transform: scale(1.05);
}

.material-card__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
}

.material-card__content {
  position: absolute;
  bottom: 2rem;
  left: 2rem;
  color: white;
}

.material-card__title {
  font-family: var(--font-display);
  font-size: 1.875rem;
  font-weight: 900;
  margin: 0 0 0.5rem;
}

.material-card--small .material-card__title {
  font-size: 1.25rem;
}

.material-card__subtitle {
  margin: 0;
  opacity: 0.8;
  font-size: 0.875rem;
}

/* Community Section */
.community-section {
  padding: 6rem 4rem;
  background: rgba(241, 245, 239, 0.6);
  border-radius: 1.5rem;
  margin: 4rem 0;
}

.community-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 4rem;
  gap: 2rem;
}

.community-title {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 900;
  color: var(--forest-700);
  margin: 0 0 1.5rem;
}

.community-description {
  color: var(--ink-600);
  margin: 0;
  max-width: 36rem;
}

.community-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3rem;
}

.community-card {
  display: flex;
  flex-direction: column;
}

.community-card__image-wrapper {
  position: relative;
  margin-bottom: 1.5rem;
  border-radius: 1.5rem;
  overflow: hidden;
  aspect-ratio: 4/5;
}

.community-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.community-card:hover .community-card__image {
  transform: scale(1.05);
}

.community-card__tag {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--forest-700);
}

.community-card__title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: var(--ink-900);
}

.community-card__materials {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #7f5638;
  margin: 0 0 1rem;
}

.community-card__materials .material-symbols-outlined {
  font-size: 0.875rem;
}

.community-card__quote {
  border-left: 4px solid rgba(147, 238, 171, 0.8);
  padding-left: 1rem;
  font-style: italic;
  color: var(--ink-600);
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.6;
}

/* Material Details */
.material-details-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8rem;
  padding: 4rem 0;
}

.material-detail-section {
  scroll-margin-top: 6rem;
}

.material-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.material-detail-icon {
  width: 4rem;
  height: 4rem;
  border-radius: 1.5rem;
  background: rgba(147, 238, 171, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.material-detail-icon .material-symbols-outlined {
  font-size: 1.875rem;
  color: var(--forest-700);
}

.material-detail-title {
  font-family: var(--font-display);
  font-size: 1.875rem;
  font-weight: 900;
  color: var(--ink-900);
  margin: 0 0 0.5rem;
}

.material-detail-description {
  color: var(--ink-600);
  margin: 0;
}

.material-detail-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
}

.material-detail-info {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.material-info-card {
  background: rgba(241, 245, 239, 0.6);
  padding: 2rem;
  border-radius: 1.5rem;
}

.material-info-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: var(--ink-900);
}

.material-info-title .material-symbols-outlined {
  color: var(--forest-700);
}

.material-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.material-tag {
  padding: 0.5rem 1rem;
  background: rgba(255, 220, 197, 0.8);
  color: #70492c;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.material-stats {
  display: flex;
  gap: 3rem;
  padding: 0 1rem;
}

.material-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.material-stat-label {
  font-size: 0.75rem;
  color: var(--ink-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.material-stat-value {
  font-weight: 700;
  color: var(--forest-700);
}

.material-examples {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.material-example {
  border-radius: 1.5rem;
  overflow: hidden;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.material-example:hover {
  transform: translateY(-4px);
}

.material-example__image {
  width: 100%;
  height: 12rem;
  object-fit: cover;
}

.material-example__caption {
  padding: 1rem;
  background: white;
}

.material-example__caption p {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #97490d;
}

/* Footer Section */
.footer-section {
  margin-top: 8rem;
  padding: 6rem 0 8rem;
  border-top: 1px solid rgba(173, 180, 173, 0.3);
}

.footer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6rem;
}

.footer-title {
  font-family: var(--font-display);
  font-size: 1.875rem;
  font-weight: 900;
  color: var(--ink-900);
  margin: 0 0 3rem;
}

.beginner-steps {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.beginner-step {
  display: flex;
  gap: 1.5rem;
}

.step-number {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--forest-700);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: var(--ink-900);
}

.step-description {
  color: var(--ink-600);
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.6;
}

.safety-rules {
  background: rgba(222, 228, 221, 0.5);
  padding: 3rem;
  border-radius: 1.5rem;
}

.safety-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.safety-title .material-symbols-outlined {
  color: #97490d;
}

.safety-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.safety-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.safety-item .material-symbols-outlined {
  color: var(--forest-700);
  font-size: 0.875rem;
  margin-top: 0.25rem;
  flex-shrink: 0;
}

.safety-item p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ink-700);
  line-height: 1.6;
}

@media (prefers-reduced-motion: reduce) {
  .material-card,
  .material-card__image,
  .community-card__image,
  .material-example {
    transition: none;
  }

  .material-card:hover,
  .material-card:hover .material-card__image,
  .community-card:hover .community-card__image,
  .material-example:hover {
    transform: none;
  }
}

/* Responsive Design */
@media (max-width: 1024px) {
  .hero-section {
    grid-template-columns: 1fr;
  }

  .hero-image {
    display: none;
  }

  .material-grid {
    grid-template-columns: repeat(2, 1fr);
    height: auto;
  }

  .material-card--large,
  .material-card--medium {
    grid-column: span 2;
  }

  .community-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .material-detail-content {
    grid-template-columns: 1fr;
  }

  .footer-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .upcycle-page {
    padding: 0 1rem;
  }

  .hero-section {
    padding: 3rem 0;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .material-wall-section,
  .community-section {
    padding: 3rem 0;
  }

  .community-section {
    padding: 3rem 1.5rem;
  }

  .community-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .material-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .material-card--large,
  .material-card--medium,
  .material-card--small {
    grid-column: span 1;
    grid-row: span 1;
  }

  .material-examples {
    grid-template-columns: 1fr;
  }

  .material-stats {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
