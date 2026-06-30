<!-- AppointmentLoadingSkeleton.vue -->
<!-- metaLoading 时的主区骨架:4 个 shimmer 卡片。 -->

<template>
  <div class="loading-stack">
    <div class="loading-card loading-card--hero" />
    <div class="loading-card" />
    <div class="loading-card" />
    <div class="loading-card loading-card--summary" />
  </div>
</template>

<style scoped>
.loading-stack {
  display: grid;
  gap: 16px;
}

.loading-card {
  min-height: 140px;
  border-radius: 20px;
  background:
    linear-gradient(90deg, rgba(79, 141, 96, 0.08) 25%, rgba(79, 141, 96, 0.16) 37%, rgba(79, 141, 96, 0.08) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.loading-card--hero {
  min-height: 176px;
}

.loading-card--summary {
  min-height: 120px;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>