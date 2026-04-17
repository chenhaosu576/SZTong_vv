<script setup>
import BrandLogo from "./BrandLogo.vue";
</script>

<template>
  <footer class="site-footer">
    <div class="footer-container">
      <section class="branding-section" aria-labelledby="footer-brand-title">
        <div class="brand-info">
          <BrandLogo variant="footer" />
          <span id="footer-brand-title" class="sr-only">收智通</span>
          <p class="brand-description">
            收智通是一个面向城市绿色生活的智能回收服务平台，结合 AI 识别、回收预约、旧物焕新与公益流转，让闲置物品更高效地进入再利用流程。
          </p>
        </div>

        <div class="impact-metrics" aria-label="平台概览">
          <div class="metric-item">
            <span class="metric-label">累计服务案例</span>
            <span class="metric-value">2,450+</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">参与用户</span>
            <span class="metric-value">18k+</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">累计减碳估算</span>
            <span class="metric-value">56 吨</span>
          </div>
        </div>
      </section>

      <section class="nav-section" aria-labelledby="footer-entry-title">
        <span id="footer-entry-title" class="section-title">平台入口</span>
        <nav class="nav-links" aria-label="平台入口">
          <router-link to="/ai-identify" class="nav-link">AI识别</router-link>
          <router-link to="/recycle-booking" class="nav-link">回收预约</router-link>
          <router-link to="/charity" class="nav-link">公益捐赠</router-link>
          <router-link to="/upcycle" class="nav-link">旧物改造</router-link>
          <router-link to="/ai-qa" class="nav-link">环保助手</router-link>
          <router-link to="/faq" class="nav-link">常见问题</router-link>
        </nav>
      </section>

      <section class="value-section" aria-labelledby="footer-value-title">
        <span id="footer-value-title" class="section-title">平台能做什么</span>
        <div class="value-copy">
          <p>
            从物品识别、分类判断到回收处理建议，收智通帮助用户更快完成环保决策。
          </p>
          <p>
            我们希望把复杂的回收流程，变成更容易理解、更愿意参与的日常服务。
          </p>
        </div>
      </section>
    </div>

    <div class="footer-bottom">
      <div class="divider" />
      <div class="bottom-content">
        <p class="signature-text">把环保行动，变成更容易开始的日常选择。</p>
        <p class="copyright-text">© 2026 收智通</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  width: 100%;
  margin-top: 5rem;
  background:
    linear-gradient(180deg, rgba(242, 243, 237, 0.96), rgba(234, 238, 232, 0.98)),
    radial-gradient(circle at top right, rgba(191, 146, 83, 0.16), transparent 28%);
  border-top: 1px solid rgba(46, 89, 62, 0.08);
  border-radius: 3rem 3rem 0 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.footer-container {
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding: 4rem 3rem 3rem;
  display: grid;
  grid-template-columns: 1.45fr 0.85fr 1fr;
  gap: 2rem;
}

.branding-section,
.nav-section,
.value-section {
  min-width: 0;
}

.branding-section {
  display: grid;
  gap: 1.75rem;
}

.brand-info {
  display: grid;
  gap: 1rem;
}

.brand-description,
.value-copy p {
  margin: 0;
  color: rgba(44, 58, 51, 0.82);
  line-height: 1.75;
  font-size: 0.97rem;
}

.impact-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.metric-item {
  display: grid;
  gap: 0.45rem;
  padding: 1rem 1rem 0.95rem;
  border-radius: 1.35rem;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(46, 89, 62, 0.08);
  box-shadow: 0 10px 24px rgba(27, 52, 37, 0.05);
}

.metric-label,
.section-title {
  color: #397051;
  font-family: var(--font-data, "Inter", sans-serif);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.metric-value {
  color: #13271b;
  font-family: var(--font-display, "Plus Jakarta Sans", sans-serif);
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.nav-section,
.value-section {
  display: grid;
  gap: 1rem;
  align-content: start;
  padding: 0.25rem 0;
}

.nav-links {
  display: grid;
  gap: 0.8rem;
}

.nav-link {
  color: rgba(19, 39, 27, 0.72);
  font-family: var(--font-display, "Plus Jakarta Sans", sans-serif);
  font-size: 0.96rem;
  font-weight: 600;
  text-decoration: none;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.nav-link:hover,
.nav-link:focus-visible {
  color: #28583d;
  transform: translateX(2px);
  outline: none;
}

.value-copy {
  display: grid;
  gap: 0.95rem;
  padding: 1rem 1.1rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(46, 89, 62, 0.08);
}

.footer-bottom {
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding: 0 3rem 2.5rem;
}

.divider {
  width: 100%;
  height: 1px;
  margin-bottom: 1.4rem;
  background: linear-gradient(90deg, transparent, rgba(63, 92, 72, 0.2), transparent);
}

.bottom-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.signature-text,
.copyright-text {
  margin: 0;
  color: rgba(53, 68, 60, 0.66);
  font-family: var(--font-data, "Inter", sans-serif);
  font-size: 0.8rem;
}

.signature-text {
  font-weight: 600;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1024px) {
  .footer-container {
    grid-template-columns: 1fr 1fr;
  }

  .branding-section {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .site-footer {
    border-radius: 2rem 2rem 0 0;
  }

  .footer-container,
  .footer-bottom {
    padding-left: 1.35rem;
    padding-right: 1.35rem;
  }

  .footer-container {
    grid-template-columns: 1fr;
    padding-top: 3rem;
  }

  .impact-metrics {
    grid-template-columns: 1fr;
  }

  .bottom-content {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (prefers-color-scheme: dark) {
  .site-footer {
    background:
      linear-gradient(180deg, rgba(25, 35, 29, 0.98), rgba(21, 30, 25, 0.98)),
      radial-gradient(circle at top right, rgba(163, 118, 60, 0.18), transparent 32%);
    border-top-color: rgba(132, 169, 145, 0.08);
  }

  .metric-value,
  .nav-link:hover,
  .nav-link:focus-visible {
    color: #dcebdd;
  }

  .brand-description,
  .value-copy p,
  .nav-link,
  .signature-text,
  .copyright-text {
    color: rgba(221, 234, 223, 0.76);
  }

  .metric-label,
  .section-title {
    color: #96c8a0;
  }

  .metric-item,
  .value-copy {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(150, 200, 160, 0.08);
  }

  .divider {
    background: linear-gradient(90deg, transparent, rgba(150, 200, 160, 0.22), transparent);
  }
}
</style>
