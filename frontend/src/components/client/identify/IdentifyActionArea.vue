<script setup>
import { RouterLink } from "vue-router";

defineProps({
  primaryTo: { type: String, required: true },
  primaryLabel: { type: String, required: true },
  secondary: {
    type: Array,
    required: true,
    validator: (arr) => arr.every((item) => typeof item.to === "string" && typeof item.label === "string"),
  },
});
</script>

<template>
  <div class="action-area">
    <RouterLink class="primary-action" :to="primaryTo">{{ primaryLabel }}</RouterLink>

    <div class="secondary-actions">
      <RouterLink
        v-for="item in secondary"
        :key="item.to"
        class="secondary-action"
        :to="item.to"
      >
        {{ item.label }}
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.action-area {
  display: grid;
  gap: 16px;
}

.primary-action,
.secondary-action {
  text-decoration: none;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 68px;
  border-radius: 18px;
  color: #f8fdf9;
  background: linear-gradient(135deg, #5a9768 0%, #4f8d60 45%, #2e5d3f 100%);
  font-family: var(--font-display);
  font-size: 1.48rem;
  font-weight: 800;
  box-shadow: 0 18px 34px rgba(46, 93, 63, 0.18);
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.primary-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 40px rgba(46, 93, 63, 0.2);
}

.secondary-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 84px;
  padding: 0 14px;
  border-radius: 18px;
  color: var(--ink-700);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 0 0 1px rgba(46, 93, 63, 0.1);
  font-family: var(--font-display);
  font-size: 1.14rem;
  font-weight: 700;
  text-align: center;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    background 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.secondary-action:hover {
  transform: translateY(-2px);
  color: var(--forest-700);
  background: rgba(229, 248, 237, 0.84);
}

@media (max-width: 760px) {
  .primary-action {
    min-height: 58px;
    font-size: 1.24rem;
  }

  .secondary-actions {
    grid-template-columns: 1fr;
  }

  .secondary-action {
    min-height: 58px;
    font-size: 1rem;
  }
}
</style>