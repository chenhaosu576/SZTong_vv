<script setup>
import IdentifyInfoCard from "./IdentifyInfoCard.vue";
import IdentifyActionArea from "./IdentifyActionArea.vue";

defineProps({
  viewState: { type: String, required: true }, // 'sample' | 'loading' | 'failed' | 'resolved'
  displayImage: { type: String, required: true },
  displayImageAlt: { type: String, required: true },
  displayResult: { type: Object, required: true },
  displayConfidence: { type: String, required: true },
  displayWarning: { type: String, required: true },
  previewFrameLabel: { type: String, required: true },
  categoryMark: { type: String, required: true },
  showResultActions: { type: Boolean, required: true },
});

const isSample = (state) => state === "sample";
</script>

<template>
  <section class="result-panel" data-reveal style="--reveal-delay: 120ms">
    <div class="result-panel__media">
      <Transition name="result-fade" mode="out-in">
        <div
          :key="displayImage"
          class="preview-stage"
          :class="{
            'is-recognizing': viewState === 'loading',
            'is-sample': isSample(viewState),
          }"
        >
          <img :src="displayImage" :alt="displayImageAlt" />
          <span v-if="isSample(viewState)" class="sample-tag sample-tag--media">示例图片</span>

          <div v-if="viewState === 'loading'" class="preview-stage__scanner" aria-hidden="true">
            <span class="preview-stage__scanner-line" />
          </div>

          <div class="preview-frame">
            <i class="preview-frame__corner preview-frame__corner--tl" />
            <i class="preview-frame__corner preview-frame__corner--tr" />
            <i class="preview-frame__corner preview-frame__corner--bl" />
            <i class="preview-frame__corner preview-frame__corner--br" />

            <div class="preview-frame__label">
              <span class="preview-frame__dot" />
              <span>{{ previewFrameLabel }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <div class="result-panel__body">
      <Transition name="result-fade" mode="out-in">
        <div v-if="viewState === 'loading'" key="loading" class="result-copy result-copy--loading">
          <article class="loading-card" role="status" aria-live="polite">
            <div class="loading-card__signal" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <p class="loading-card__eyebrow">识别加载中</p>
            <h2>AI 正在分析图片</h2>
            <p class="loading-card__description">
              请稍候，我们正在提取图片主体、判断分类，并生成对应的投放建议。
            </p>

            <div class="loading-card__steps" aria-hidden="true">
              <span>读取图像</span>
              <span>特征识别</span>
              <span>生成结果</span>
            </div>
          </article>
        </div>

        <div v-else-if="viewState === 'failed'" key="failed" class="result-copy result-copy--failed">
          <article class="failed-card" role="status" aria-live="polite">
            <p class="failed-card__eyebrow">识别结果</p>
            <h2>{{ displayResult.name }}</h2>
            <p class="failed-card__lead">{{ displayResult.action }}</p>

            <div class="failed-card__tips">
              <article class="info-card info-card--primary">
                <p class="info-card__label">建议重试方式</p>
                <h3>更换清晰、单一主体的图片</h3>
              </article>

              <article class="info-card info-card--warm">
                <p class="info-card__label">拍摄提醒</p>
                <p>{{ displayWarning }}</p>
              </article>
            </div>
          </article>
        </div>

        <div
          v-else
          :key="`${displayResult.name}-${displayResult.category}-${displayConfidence}`"
          class="result-copy"
        >
          <div class="result-head">
            <div class="result-head__copy">
              <div class="result-meta">
                <p class="result-eyebrow">{{ isSample(viewState) ? "系统示例" : "识别结果" }}</p>
                <span v-if="isSample(viewState)" class="sample-tag sample-tag--body">示例结果</span>
              </div>

              <div class="title-row">
                <h2>{{ displayResult.name }}</h2>
                <span class="confidence-pill">{{ displayConfidence }}</span>
              </div>

              <div class="category-row">
                <span class="category-mark">{{ categoryMark }}</span>
                <strong>{{ displayResult.category }}</strong>
              </div>
            </div>
          </div>

          <div class="info-stack">
            <IdentifyInfoCard
              variant="primary"
              label="投放要求"
              :heading="displayResult.action"
            />
            <IdentifyInfoCard
              variant="warm"
              label="特别提醒"
              :body="displayWarning"
            />
          </div>

          <IdentifyActionArea
            v-if="showResultActions"
            primary-to="/recycle-booking"
            primary-label="一键预约回收"
            :secondary="[
              { to: '/charity', label: '公益捐赠' },
              { to: '/upcycle', label: '旧物改造' },
              { to: '/ai-qa', label: '环保助手' },
            ]"
          />
        </div>
      </Transition>
    </div>
  </section>
</template>

<style scoped>
.result-panel {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  overflow: hidden;
  border-radius: 34px;
  border: 1px solid rgba(46, 93, 63, 0.08);
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    0 28px 60px rgba(29, 58, 40, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.result-panel__media {
  background:
    linear-gradient(180deg, rgba(217, 231, 221, 0.34), rgba(234, 240, 235, 0.1)),
    rgba(224, 236, 228, 0.3);
}

.preview-stage {
  position: relative;
  min-height: 630px;
  overflow: hidden;
}

.preview-stage::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(14, 33, 23, 0.08), transparent 25%, transparent 70%, rgba(14, 33, 23, 0.16)),
    radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.22), transparent 42%);
  pointer-events: none;
}

.preview-stage img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-stage.is-recognizing img {
  filter: saturate(0.92) contrast(1.02);
}

.preview-stage__scanner {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(17, 39, 28, 0.04), rgba(17, 39, 28, 0.2)),
    repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.02) 0,
      rgba(255, 255, 255, 0.02) 6px,
      transparent 6px,
      transparent 12px
    );
}

.preview-stage__scanner-line {
  position: absolute;
  left: 22px;
  right: 22px;
  height: 132px;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    rgba(163, 233, 188, 0),
    rgba(163, 233, 188, 0.22) 28%,
    rgba(163, 233, 188, 0.82) 50%,
    rgba(163, 233, 188, 0.22) 72%,
    rgba(163, 233, 188, 0)
  );
  filter: blur(0.2px);
  animation: scannerSweep 2.3s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

.preview-frame {
  position: absolute;
  inset: 42px;
  border: 2px solid rgba(79, 141, 96, 0.6);
  border-radius: 26px;
  z-index: 1;
}

.preview-frame__corner {
  position: absolute;
  width: 38px;
  height: 38px;
  border-color: var(--moss-500);
  border-style: solid;
}

.preview-frame__corner--tl {
  top: -2px;
  left: -2px;
  border-width: 4px 0 0 4px;
  border-top-left-radius: 18px;
}

.preview-frame__corner--tr {
  top: -2px;
  right: -2px;
  border-width: 4px 4px 0 0;
  border-top-right-radius: 18px;
}

.preview-frame__corner--bl {
  left: -2px;
  bottom: -2px;
  border-width: 0 0 4px 4px;
  border-bottom-left-radius: 18px;
}

.preview-frame__corner--br {
  right: -2px;
  bottom: -2px;
  border-width: 0 4px 4px 0;
  border-bottom-right-radius: 18px;
}

.preview-frame__label {
  position: absolute;
  top: -18px;
  left: 50%;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #5a9768 0%, #4f8d60 55%, #2e5d3f 100%);
  color: #f6fbf7;
  font-family: var(--font-data);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  transform: translateX(-50%);
  box-shadow: 0 14px 26px rgba(46, 93, 63, 0.24);
  white-space: nowrap;
}

.preview-frame__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffffff;
}

.sample-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 248, 231, 0.94);
  color: #8a621d;
  box-shadow:
    inset 0 0 0 1px rgba(194, 131, 47, 0.22),
    0 10px 22px rgba(138, 98, 29, 0.12);
  font-family: var(--font-data);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.sample-tag--media {
  position: absolute;
  top: 26px;
  left: 26px;
  z-index: 2;
}

.sample-tag--body {
  padding: 6px 12px;
}

.result-panel__body {
  padding: clamp(30px, 4vw, 52px);
}

.result-copy {
  display: grid;
  gap: 34px;
}

.result-copy--loading,
.result-copy--failed {
  align-content: center;
  min-height: 100%;
}

.loading-card,
.failed-card {
  display: grid;
  gap: 22px;
  padding: clamp(26px, 3vw, 34px);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 248, 245, 0.96)),
    rgba(255, 255, 255, 0.96);
  box-shadow:
    inset 0 0 0 1px rgba(46, 93, 63, 0.08),
    0 22px 46px rgba(29, 58, 40, 0.08);
}

.loading-card__signal {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.loading-card__signal span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #73b387, #2e5d3f);
  animation: loadingPulse 1.1s ease-in-out infinite;
}

.loading-card__signal span:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-card__signal span:nth-child(3) {
  animation-delay: 0.3s;
}

.loading-card__eyebrow,
.failed-card__eyebrow {
  margin: 0;
  color: var(--moss-500);
  font-family: var(--font-data);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.loading-card h2,
.failed-card h2 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.loading-card__description,
.failed-card__lead {
  margin: 0;
  color: rgba(76, 103, 93, 0.92);
  font-size: 1.04rem;
  line-height: 1.86;
}

.loading-card__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.loading-card__steps span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  background: rgba(229, 248, 237, 0.84);
  color: var(--forest-700);
  box-shadow: inset 0 0 0 1px rgba(46, 93, 63, 0.08);
  font-size: 0.9rem;
  font-weight: 700;
}

.failed-card {
  background:
    linear-gradient(180deg, rgba(255, 251, 244, 0.98), rgba(255, 255, 255, 0.96)),
    rgba(255, 255, 255, 0.96);
}

.failed-card__tips {
  display: grid;
  gap: 16px;
}

.result-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.result-head__copy {
  display: grid;
  gap: 18px;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.result-eyebrow {
  margin: 0;
  color: rgba(76, 103, 93, 0.82);
  font-family: var(--font-data);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.title-row h2 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 4vw, 4rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
}

.confidence-pill {
  padding: 7px 14px;
  border-radius: 999px;
  background: rgba(229, 248, 237, 0.9);
  color: var(--moss-500);
  box-shadow: inset 0 0 0 1px rgba(46, 93, 63, 0.08);
  font-family: var(--font-data);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.category-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.category-mark {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--moss-500);
  font-size: 1.1rem;
  font-weight: 700;
}

.category-row strong {
  color: var(--moss-500);
  font-family: var(--font-display);
  font-size: 1.95rem;
}

/* .eco-badge removed — no consumer in this component (the resolved branch uses .category-mark instead) */

.info-stack {
  display: grid;
  gap: 16px;
}

/* duplicated .info-card rules — used only by failed-card's static content */
.info-card {
  display: grid;
  gap: 10px;
  padding: 22px 24px;
  border-radius: 20px;
}

.info-card__label {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.info-card h3,
.info-card p {
  margin: 0;
}

.info-card h3 {
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: 1.55rem;
  line-height: 1.52;
}

.info-card p {
  color: rgba(76, 103, 93, 0.92);
  font-size: 1.02rem;
  line-height: 1.84;
}

.info-card--primary {
  border-left: 4px solid var(--moss-500);
  background: rgba(229, 248, 237, 0.46);
}

.info-card--primary .info-card__label {
  color: var(--moss-500);
}

.info-card--warm {
  border-left: 4px solid rgba(194, 131, 47, 0.46);
  background: rgba(194, 131, 47, 0.08);
}

.info-card--warm .info-card__label {
  color: var(--sun-500);
}

/* result-fade transition */
.result-fade-enter-active,
.result-fade-leave-active {
  transition:
    opacity 220ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.result-fade-enter-from,
.result-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes scannerSweep {
  0% {
    top: -132px;
    opacity: 0;
  }

  15%,
  85% {
    opacity: 1;
  }

  100% {
    top: calc(100% + 12px);
    opacity: 0;
  }
}

@keyframes loadingPulse {
  0%,
  100% {
    transform: scale(0.72);
    opacity: 0.48;
  }

  50% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (max-width: 1120px) {
  .result-panel {
    grid-template-columns: 1fr;
  }

  .preview-stage {
    min-height: 520px;
  }
}

@media (max-width: 880px) {
  .result-panel {
    border-radius: 26px;
  }

  .preview-stage {
    min-height: 360px;
  }

  .preview-frame {
    inset: 26px;
  }

  .preview-frame__label {
    max-width: calc(100% - 24px);
    padding-inline: 10px;
    font-size: 0.58rem;
    letter-spacing: 0.08em;
    white-space: normal;
    text-align: center;
  }

  .result-panel__body {
    padding: 24px 20px 22px;
  }

  .result-copy {
    gap: 24px;
  }

  .result-head {
    flex-direction: column;
  }

  .title-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .title-row h2 {
    font-size: 2.25rem;
  }

  .category-row strong {
    font-size: 1.55rem;
  }

  .info-card {
    padding: 18px;
  }

  .info-card h3 {
    font-size: 1.24rem;
  }

  .info-card p {
    font-size: 0.95rem;
  }
}
</style>