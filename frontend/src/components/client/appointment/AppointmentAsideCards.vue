<!-- AppointmentAsideCards.vue -->
<!-- 侧栏两张卡:服务承诺(promise-card)+ 官方保障(trust-card)。
     同布局合并成单文件以保持样式内聚;后续若需独立演化再拆。 -->

<script setup>
const promiseItems = [
  { title: "准时高效", detail: "专员会在预约时段前联系您，确保上门流程顺畅。" },
  { title: "规范回收", detail: "回收过程公开透明，分类、称重和结算信息一目了然。" },
  { title: "温馨提醒", detail: "请勿混入湿垃圾、危险品及国家明令禁止回收的违禁品。" },
];
</script>

<template>
  <aside class="booking-aside" data-reveal style="--reveal-delay: 150ms">
    <section class="section-card">
      <div class="promise-card">
        <h3>服务承诺</h3>

        <div class="promise-list">
          <article v-for="item in promiseItems" :key="item.title" class="promise-item">
            <span class="promise-dot" />
            <div>
              <h4>{{ item.title }}</h4>
              <p>{{ item.detail }}</p>
            </div>
          </article>
        </div>

        <div class="promise-policy">
          <p>
            <strong>改签政策：</strong>
            预约成功后，如需修改时间请至少提前 4 小时在"我的订单"中操作。
          </p>
        </div>
      </div>
    </section>

    <section class="section-card">
      <div class="trust-card">
        <div class="trust-label">
          <span class="trust-dot" />
          <span>官方保障</span>
        </div>
        <h3>专业回收、准时上门、价格透明。</h3>
        <p>
          我们坚持通过专业化流程，让每一份废弃物都能焕发新生，守护绿色家园。
        </p>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.section-card,
.promise-card,
.trust-card {
  /* 容器基础样式:沿用原 AppointmentPage 中的 scoped 规则 */
}

.section-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 22px rgba(36, 72, 50, 0.05);
  border: 1px solid rgba(79, 141, 96, 0.1);
  padding: 22px 24px;
  border-left: 3px solid rgba(79, 141, 96, 0.35);
}

.booking-aside {
  display: grid;
  gap: 16px;
}

.promise-card,
.trust-card {
  display: grid;
  gap: 18px;
}

.promise-card h3,
.trust-card h3 {
  margin: 0;
  color: var(--ink-900);
  font-family: var(--font-display);
  font-size: 1.1rem;
}

.promise-card h3 {
  margin: 0 0 2px;
  color: var(--forest-700);
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.35;
}

.promise-list {
  display: grid;
  gap: 16px;
}

.promise-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.promise-dot,
.trust-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #4f8d60;
  margin-top: 7px;
}

.promise-item h4 {
  margin: 0 0 6px;
  color: var(--ink-800);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.promise-item p {
  margin: 0;
  color: var(--ink-700);
  font-size: 0.76rem;
  line-height: 1.72;
}

.promise-policy {
  padding: 12px 14px;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(79, 141, 96, 0.1) 0%, rgba(79, 141, 96, 0.06) 100%);
  border: 1px solid rgba(36, 72, 50, 0.12);
}

.promise-policy p {
  margin: 0;
  color: var(--ink-700);
  font-size: 0.7rem;
  line-height: 1.7;
}

.promise-policy strong {
  color: var(--forest-700);
  font-weight: 800;
}

.trust-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4f8d60;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.trust-card {
  background: rgba(79, 141, 96, 0.05);
  border-radius: 12px;
  padding: 2px 0;
}

.trust-card p {
  font-size: 0.72rem;
  line-height: 1.8;
  margin: 0;
  color: var(--ink-600);
}
</style>