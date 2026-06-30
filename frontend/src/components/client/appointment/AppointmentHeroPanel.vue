<!-- AppointmentHeroPanel.vue -->
<!-- Hero 区:标题 + 副标题。仅展示,无 props/emits。 -->

<script setup>
</script>

<template>
  <header class="reference-hero" data-reveal>
    <h1>预约上门回收</h1>
    <p>专业团队准时上门，规范回收，透明结算，为您提供一站式环保服务。</p>
  </header>
</template>

<style scoped>
.reference-hero {
  display: grid;
  gap: 10px;
  padding-top: 6px;
}

.reference-hero h1 {
  margin: 0;
  color: var(--forest-700);
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 4vw, 3.25rem);
  line-height: 1.04;
  letter-spacing: -0.04em;
}

.reference-hero p {
  margin: 0;
  max-width: 42rem;
  color: var(--ink-600);
  font-size: 0.95rem;
  line-height: 1.8;
}
</style>