<!-- AppointmentContactSection.vue -->
<!-- Section 01 联系信息:address / contactName / phone 三字段。
     双向同步通过 update:xxx 事件回写到 view 的 form。 -->

<script setup>
defineProps({
  address: { type: String, required: true },
  contactName: { type: String, required: true },
  phone: { type: String, required: true },
});

defineEmits(["update:address", "update:contact-name", "update:phone"]);
</script>

<template>
  <section class="section-card">
    <div class="section-head">
      <div class="section-mark">
        <span class="section-badge">01</span>
        <div>
          <h2>联系信息</h2>
        </div>
      </div>
    </div>

    <div class="section-grid section-grid--contact">
      <label class="field field--full">
        <span>服务地址</span>
        <input
          :value="address"
          type="text"
          placeholder="请输入详细街道、楼号、门牌号"
          @input="$emit('update:address', $event.target.value)"
        />
      </label>

      <label class="field">
        <span>联系人姓名</span>
        <input
          :value="contactName"
          type="text"
          placeholder="姓名"
          @input="$emit('update:contact-name', $event.target.value)"
        />
      </label>

      <label class="field">
        <span>电话号码</span>
        <input
          :value="phone"
          type="tel"
          inputmode="tel"
          placeholder="请输入 11 位手机号（如 1xx-xxxx-xxxx）"
          @input="$emit('update:phone', $event.target.value)"
        />
      </label>
    </div>
  </section>
</template>

<style scoped>
.section-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 22px rgba(36, 72, 50, 0.05);
  border: 1px solid rgba(79, 141, 96, 0.1);
  padding: 22px 24px;
  border-left: 3px solid rgba(79, 141, 96, 0.35);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 18px;
}

.section-mark {
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

.section-grid {
  display: grid;
  gap: 16px;
}

.section-grid--contact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 8px;
}

.field--full {
  grid-column: 1 / -1;
}

.field span {
  color: var(--ink-500);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.field input {
  width: 100%;
  min-height: 44px;
  border: 1px solid rgba(106, 131, 122, 0.25);
  border-radius: 8px;
  padding: 0.75rem 0.95rem;
  background: #fff;
  color: var(--ink-800);
  font: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input::placeholder {
  color: rgba(106, 131, 122, 0.55);
}

.field input:focus {
  outline: none;
  border-color: #4f8d60;
  box-shadow: 0 0 0 3px rgba(79, 141, 96, 0.08);
}

@media (max-width: 720px) {
  .section-card {
    padding: 18px;
  }

  .section-grid--contact {
    grid-template-columns: 1fr;
  }
}
</style>
