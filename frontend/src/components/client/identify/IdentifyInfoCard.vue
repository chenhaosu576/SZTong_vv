<script setup>
defineProps({
  variant: {
    type: String,
    default: "primary",
    validator: (v) => ["primary", "warm"].includes(v),
  },
  label: { type: String, required: true },
  heading: { type: String, default: "" },
  body: { type: String, default: "" },
});
</script>

<template>
  <article class="info-card" :class="`info-card--${variant}`">
    <p class="info-card__label">{{ label }}</p>
    <h3 v-if="heading">{{ heading }}</h3>
    <p v-else-if="body">{{ body }}</p>
    <slot v-else />
  </article>
</template>

<style scoped>
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

@media (max-width: 760px) {
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