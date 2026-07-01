<!-- CharityDonationForm.vue -->
<!-- 公益捐赠表单(详情右栏)。
     8 个字段(itemType / itemName / quantity / weight / condition /
     logistics / donorName / phone)+ 错误条 + 提交按钮 + 保存按钮。
     通过 update:* 事件逐字段抛出表单变更,submit 事件触发提交。
     不持有表单状态 —— donationForm 由 view 持有并通过 prop 传入。 -->

<script setup>
defineProps({
  donationForm: { type: Object, required: true },
  submitLoading: { type: Boolean, required: true },
  errorText: { type: String, required: true },
  selectedProjectTitle: { type: String, required: true },
});

defineEmits([
  "update:item-type",
  "update:item-name",
  "update:quantity",
  "update:weight",
  "update:condition",
  "update:logistics",
  "update:donor-name",
  "update:phone",
  "submit",
]);
</script>

<template>
  <div class="form-card">
    <h3>填写你的捐赠信息</h3>
    <div class="form-notice">
      <p class="notice-title">正在为:{{ selectedProjectTitle }} 发起捐赠</p>
      <p class="notice-subtitle">支持类别:衣物、鞋类、学习用品</p>
    </div>

    <div class="form-alert">
      <span class="material-symbols-outlined">info</span>
      <div>
        <p class="alert-title">捐赠特别提醒</p>
        <p class="alert-text">接收:冬衣、棉鞋、围巾。不接收:破损物品、成人正装、内衣裤。</p>
      </div>
    </div>

    <div
      v-if="errorText"
      class="submit-feedback is-error"
      role="alert"
      aria-live="polite"
    >
      <span class="material-symbols-outlined">error</span>
      <div class="submit-feedback-content">
        <p class="submit-feedback-title">{{ errorText }}</p>
      </div>
    </div>

    <form class="donation-form" @submit.prevent="$emit('submit')">
      <div class="form-group">
        <label>捐赠物品类型</label>
        <select
          :value="donationForm.itemType"
          @change="$emit('update:item-type', $event.target.value)"
        >
          <option>冬装外套</option>
          <option>裤装</option>
          <option>鞋类</option>
          <option>配饰 (围巾/手套)</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>具体物品名称</label>
          <input
            :value="donationForm.itemName"
            type="text"
            placeholder="如:加厚羽绒服"
            @input="$emit('update:item-name', $event.target.value)"
          />
        </div>
        <div class="form-group-split">
          <div class="form-group">
            <label>数量</label>
            <input
              :value="donationForm.quantity"
              type="number"
              placeholder="件数"
              @input="$emit('update:quantity', $event.target.value)"
            />
          </div>
          <div class="form-group">
            <label>预估重量</label>
            <div class="input-suffix">
              <input
                :value="donationForm.weight"
                type="number"
                placeholder="重量"
                @input="$emit('update:weight', $event.target.value)"
              />
              <span>kg</span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>新旧程度</label>
        <div class="radio-group">
          <label class="radio-label">
            <input
              :checked="donationForm.condition === '全新'"
              type="radio"
              value="全新"
              @change="$emit('update:condition', '全新')"
            />
            <span>全新</span>
          </label>
          <label class="radio-label">
            <input
              :checked="donationForm.condition === '8成新以上'"
              type="radio"
              value="8成新以上"
              @change="$emit('update:condition', '8成新以上')"
            />
            <span>8成新以上</span>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label>物流配送</label>
        <div class="logistics-options">
          <button
            type="button"
            :class="['logistics-btn', donationForm.logistics === '快递寄送' ? 'active' : '']"
            @click="$emit('update:logistics', '快递寄送')"
          >
            <span class="material-symbols-outlined">local_shipping</span> 快递寄送
          </button>
          <button
            type="button"
            :class="['logistics-btn', donationForm.logistics === '预约上门' ? 'active' : '']"
            @click="$emit('update:logistics', '预约上门')"
          >
            <span class="material-symbols-outlined">hail</span> 预约上门
          </button>
          <button
            type="button"
            :class="['logistics-btn', donationForm.logistics === '站点投递' ? 'active' : '']"
            @click="$emit('update:logistics', '站点投递')"
          >
            <span class="material-symbols-outlined">move_to_inbox</span> 站点投递
          </button>
        </div>
      </div>

      <div class="form-group">
        <input
          :value="donationForm.donorName"
          type="text"
          placeholder="捐赠者姓名"
          @input="$emit('update:donor-name', $event.target.value)"
        />
      </div>
      <div class="form-group">
        <input
          :value="donationForm.phone"
          type="tel"
          placeholder="联系电话"
          @input="$emit('update:phone', $event.target.value)"
        />
      </div>

      <button type="submit" class="btn-submit" :disabled="submitLoading">
        {{ submitLoading ? "提交中..." : "提交捐赠信息" }}
      </button>
      <button type="button" class="btn-save">保存稍后填写</button>
    </form>
  </div>
</template>

<style scoped>
.form-card {
  background: white;
  padding: 32px;
  border-radius: 32px;
  box-shadow: 0 24px 60px rgba(21, 66, 18, 0.1);
  border: 1px solid rgba(66, 73, 62, 0.1);
}

.form-card h3 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink-900);
  margin: 0 0 16px;
}

.form-notice {
  background: rgba(21, 66, 18, 0.05);
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.notice-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #154212;
  margin: 0 0 4px;
}

.notice-subtitle {
  font-size: 0.625rem;
  color: rgba(21, 66, 18, 0.7);
  margin: 0;
}

.form-alert {
  background: rgba(140, 51, 21, 0.1);
  padding: 16px;
  border-radius: 12px;
  display: flex;
  gap: 12px;
  align-items: start;
  border: 1px solid rgba(140, 51, 21, 0.2);
  margin-bottom: 24px;
}

.form-alert .material-symbols-outlined {
  color: #8c3315;
  font-size: 18px;
}

.alert-title {
  font-weight: 700;
  font-size: 0.75rem;
  color: #8c3315;
  margin: 0 0 4px;
}

.alert-text {
  font-size: 0.75rem;
  color: var(--ink-600);
  line-height: 1.6;
  margin: 0;
}

.submit-feedback {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  margin-bottom: 20px;
}

.submit-feedback .material-symbols-outlined {
  font-size: 20px;
  margin-top: 2px;
}

.submit-feedback.is-error {
  background: rgba(176, 42, 55, 0.08);
  color: #b02a37;
}

.submit-feedback-content {
  display: grid;
  gap: 4px;
}

.submit-feedback-title,
.submit-feedback-text {
  margin: 0;
  line-height: 1.6;
}

.submit-feedback-title {
  font-size: 0.9rem;
  font-weight: 700;
}

.submit-feedback-text {
  font-size: 0.78rem;
}

.donation-form {
  display: grid;
  gap: 24px;
}

.form-group {
  display: grid;
  gap: 6px;
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ink-600);
  margin-left: 4px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  background: #efeeea;
  border: none;
  border-radius: 16px;
  font-size: 0.875rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: 2px solid rgba(21, 66, 18, 0.2);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.input-suffix {
  position: relative;
}

.input-suffix span {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: var(--ink-600);
}

.radio-group {
  display: flex;
  gap: 12px;
}

.radio-label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  background: #efeeea;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-label input {
  display: none;
}

.radio-label span {
  font-size: 0.75rem;
  color: var(--ink-600);
}

.radio-label:has(input:checked) {
  background: rgba(21, 66, 18, 0.1);
}

.radio-label:has(input:checked) span {
  color: #154212;
  font-weight: 700;
}

.logistics-options {
  display: flex;
  gap: 8px;
}

.logistics-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #154212;
  background: transparent;
  color: #154212;
  border-radius: 12px;
  font-size: 0.625rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.logistics-btn .material-symbols-outlined {
  font-size: 18px;
}

.logistics-btn.active {
  background: #154212;
  color: white;
}

.btn-submit,
.btn-save {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1.125rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-submit {
  background: linear-gradient(135deg, #154212, #2d5a27);
  color: white;
  box-shadow: 0 8px 24px rgba(21, 66, 18, 0.2);
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(21, 66, 18, 0.3);
}

.btn-submit:disabled {
  opacity: 0.7;
  cursor: wait;
  transform: none;
  box-shadow: none;
}

.btn-save {
  background: transparent;
  color: var(--ink-600);
  font-weight: 600;
  font-size: 0.875rem;
}

.btn-save:hover {
  background: #efeeea;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>