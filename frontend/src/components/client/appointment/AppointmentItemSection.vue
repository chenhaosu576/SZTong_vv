<!-- AppointmentItemSection.vue -->
<!-- Section 03 物品详情:分类 + 重量输入 + 备注 + 图片上传。
     内部调用 useWeightRange 和 useAppointmentUpload。
     weightInput 由 view 拥有并通过 prop 传入(供 summary 展示用户实时输入);
     上传是临时态,view 不感知;
     分类与备注通过 update:xxx 事件回写 form。 -->

<script setup>
import { useWeightRange } from "@/composables/useWeightRange";
import { useAppointmentUpload } from "@/composables/useAppointmentUpload";
import { weightPointMap, weightDisplayMap } from "@/utils/appointmentConstants";

const props = defineProps({
  categories: { type: Array, required: true },
  selectedCategory: { type: String, required: true },
  weightInput: { type: String, required: true }, // 由 view 拥有,见 useWeightRange.js 注释
  form: { type: Object, required: true }, // form reactive,由 useAppointmentForm 提供
});

const emit = defineEmits(["update:category", "update:note"]);

const { syncWeightRange, normalizeWeightInput } = useWeightRange({
  form: props.form,
  weightInput: props.weightInput,
  weightPointMap,
  weightDisplayMap,
});

const {
  fileInputRef,
  itemImageName,
  triggerFileSelect,
  handleFileChange,
  clearSelectedFile,
} = useAppointmentUpload();
</script>

<template>
  <section class="section-card">
    <div class="section-head">
      <div class="section-mark">
        <span class="section-badge">03</span>
        <div>
          <h2>物品详情</h2>
        </div>
      </div>
    </div>

    <div class="section-grid section-grid--items">
      <label class="field">
        <span>物品分类</span>
        <select
          :value="selectedCategory"
          @change="$emit('update:category', $event.target.value)"
        >
          <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>

      <label class="field">
        <span>预估重量（kg）</span>
        <div class="weight-input">
          <input
            :value="weightInput"
            type="number"
            min="0"
            step="0.1"
            placeholder="5.5"
            @input="syncWeightRange"
            @blur="normalizeWeightInput"
          />
          <span>KG</span>
        </div>
      </label>
    </div>

    <div class="field field--full upload-field">
      <span>物品备注与图片</span>

      <textarea
        :value="form.note"
        rows="3"
        placeholder="可补充上门提醒、物品数量、电梯/楼层等信息"
        @input="$emit('update:note', $event.target.value)"
      />

      <div class="upload-box" :class="itemImageName ? 'has-file' : ''">
        <input
          ref="fileInputRef"
          class="upload-input"
          type="file"
          accept="image/*"
          @change="handleFileChange"
        />

        <div class="upload-icon">+</div>
        <p class="upload-title">{{ itemImageName || "上传物品图片" }}</p>
        <p class="upload-note">
          {{ itemImageName || "支持拖拽图片至此处（JPG/PNG，最多 3 张）" }}
        </p>

        <div class="upload-actions">
          <button type="button" class="upload-trigger" @click="triggerFileSelect">
            {{ itemImageName ? "重新选择" : "选择图片" }}
          </button>
          <button v-if="itemImageName" type="button" class="upload-clear" @click="clearSelectedFile">
            移除
          </button>
        </div>
      </div>
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

.section-grid--items {
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  margin-bottom: 16px;
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

.field input,
.field select {
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

.field textarea {
  width: 100%;
  min-height: 96px;
  border: 1px solid rgba(106, 131, 122, 0.25);
  border-radius: 8px;
  padding: 0.85rem 0.95rem;
  background: #fff;
  color: var(--ink-800);
  font: inherit;
  line-height: 1.7;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input::placeholder,
.field textarea::placeholder {
  color: rgba(106, 131, 122, 0.55);
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: #4f8d60;
  box-shadow: 0 0 0 3px rgba(79, 141, 96, 0.08);
}

.field select {
  appearance: none;
  padding-right: 2.75rem;
  background-image: linear-gradient(45deg, transparent 50%, #4c675d 50%), linear-gradient(135deg, #4c675d 50%, transparent 50%);
  background-position: calc(100% - 18px) calc(50% - 2px), calc(100% - 12px) calc(50% - 2px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}

.weight-input {
  display: flex;
}

.weight-input input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: 0;
}

.weight-input span {
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border: 1px solid rgba(106, 131, 122, 0.25);
  border-left: 0;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  background: #f6f7f6;
  color: var(--ink-500);
  font-family: var(--font-data);
  font-size: 0.74rem;
}

.upload-field {
  gap: 10px;
}

.upload-box {
  border: 2px dashed rgba(79, 141, 96, 0.18);
  border-radius: 12px;
  background: rgba(247, 248, 247, 0.68);
  min-height: 138px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 22px 18px;
}

.upload-box.has-file {
  border-style: solid;
  background: rgba(79, 141, 96, 0.05);
}

.upload-input {
  display: none;
}

.upload-icon {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(79, 141, 96, 0.12);
  color: #4f8d60;
  font-size: 1.35rem;
  line-height: 1;
  margin-bottom: 4px;
}

.upload-title {
  margin: 0;
  color: var(--ink-700);
  font-size: 0.9rem;
  font-weight: 700;
}

.upload-note {
  margin: 0;
  color: var(--ink-500);
  font-size: 0.68rem;
  line-height: 1.7;
}

.upload-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.upload-trigger,
.upload-clear {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(79, 141, 96, 0.2);
  background: #fff;
  color: var(--forest-700);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.upload-trigger {
  background: rgba(79, 141, 96, 0.08);
}

.upload-trigger:hover,
.upload-clear:hover {
  transform: translateY(-1px);
}

@media (max-width: 720px) {
  .section-card {
    padding: 18px;
  }

  .section-grid--items {
    grid-template-columns: 1fr;
  }

  .upload-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
