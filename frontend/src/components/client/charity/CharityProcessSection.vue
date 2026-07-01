<!-- CharityProcessSection.vue -->
<!-- 公益捐赠的四步流程展示。
     纯展示组件,接收 steps,无交互无 emit。 -->

<script setup>
defineProps({
  steps: { type: Array, required: true },
});
</script>

<template>
  <section class="process-section">
    <h2 class="process-title">简单的四步,完成善意的传递</h2>
    <div class="process-steps">
      <div v-for="(step, index) in steps" :key="index" class="process-step">
        <div class="step-icon">
          <span class="material-symbols-outlined">{{ step.icon }}</span>
        </div>
        <h4>{{ step.title }}</h4>
        <p>{{ step.desc }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.process-section {
  padding: 96px 0;
  text-align: center;
}

.process-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 800;
  color: var(--ink-900);
  margin: 0 0 64px;
}

.process-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 48px;
  position: relative;
}

.process-steps::before {
  content: "";
  position: absolute;
  top: 48px;
  left: 15%;
  right: 15%;
  height: 2px;
  background: linear-gradient(90deg, rgba(45, 90, 39, 0.1), rgba(45, 90, 39, 0.3), rgba(45, 90, 39, 0.1));
  z-index: -1;
}

.process-step {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-icon {
  width: 96px;
  height: 96px;
  background: #eae8e4;
  color: #154212;
  border-radius: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.process-step:hover .step-icon {
  background: #154212;
  color: white;
  transform: rotate(6deg);
}

.step-icon .material-symbols-outlined {
  font-size: 36px;
}

.process-step h4 {
  font-weight: 700;
  color: var(--ink-900);
  margin: 0 0 8px;
}

.process-step p {
  font-size: 0.875rem;
  color: var(--ink-600);
  padding: 0 16px;
  margin: 0;
}

@media (max-width: 1024px) {
  .process-steps {
    grid-template-columns: repeat(2, 1fr);
  }

  .process-steps::before {
    display: none;
  }
}

@media (max-width: 768px) {
  .process-steps {
    grid-template-columns: 1fr;
  }
}
</style>