<!-- AppointmentConfirmSection.vue -->
<!-- Section 04 信息确认:3 个 summary 指标卡。
     summaryMetrics 由 view 派生好后通过 prop 传入(纯展示)。 -->

<script setup>
defineProps({
  summaryMetrics: {
    type: Array, // [{ label, value, detail }]
    required: true,
  },
});
</script>

<template>
  <section class="reference-confirm">
    <div class="section-head section-head--between">
      <div class="section-mark">
        <span class="section-badge">04</span>
        <div class="section-title-inline">
          <h2>信息确认</h2>
          <span class="status-dot" />
        </div>
      </div>
      <p class="section-helper">请在提交前确认以上预约信息</p>
    </div>

    <div class="reference-summary">
      <div class="summary-metrics">
        <article v-for="item in summaryMetrics" :key="item.label" class="summary-card">
          <p>{{ item.label }}</p>
          <strong>{{ item.value }}</strong>
          <span>{{ item.detail }}</span>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reference-confirm {
  display: grid;
  gap: 16px;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 18px;
}

.section-head--between {
  justify-content: space-between;
  gap: 16px;
}

.section-mark,
.section-title-inline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-badge {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #4f8d60;
  color: #fff;
  font-family: var(--font-data);
  font-size: 0.75rem;
  font-weight: 700;
}

.section-head h2 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: 1.08rem;
}

.section-helper {
  margin: 0;
  color: var(--ink-500);
  font-size: 0.72rem;
  letter-spacing: 0.03em;
}

.reference-summary {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 22px rgba(36, 72, 50, 0.05);
  padding: 20px 22px;
  border: 1px solid rgba(79, 141, 96, 0.14);
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.summary-card {
  position: relative;
  padding-left: 14px;
  display: grid;
  gap: 6px;
}

.summary-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 2px;
  border-radius: 999px;
  background: rgba(79, 141, 96, 0.2);
}

.summary-card p {
  margin: 0;
  color: var(--ink-600);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.summary-card strong {
  color: var(--forest-700);
  font-family: var(--font-display);
  font-size: 1.1rem;
  line-height: 1.25;
}

.summary-card span {
  margin: 0;
  color: var(--ink-600);
  font-size: 0.74rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #4f8d60;
  box-shadow: 0 0 0 5px rgba(79, 141, 96, 0.12);
}

@media (max-width: 860px) {
  .summary-metrics {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .section-head,
  .section-head--between {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
