<!-- CharityProjectCard.vue -->
<!-- 公益项目单卡。接收 project + selected + daysLeftText, emit donate。
     urgency / daysLeft / needs 由后端返回 (project.* 字段直接读)。
     daysLeftText 由 grid/view 拼好传入 (例: "剩余 3 天" / "长期募集")。 -->

<script setup>
defineProps({
  project: { type: Object, required: true },
  selected: { type: Boolean, required: true },
  daysLeftText: { type: String, required: true },
});

defineEmits(["donate"]);
</script>

<template>
  <div :class="['project-card', selected ? 'selected' : '']">
    <div class="project-image">
      <img :src="project.image" :alt="project.title" />
      <span :class="['project-tag', project.tagColor]">{{ project.tag }}</span>
    </div>
    <div class="project-body">
      <div class="project-location">
        <span class="material-symbols-outlined">location_on</span>
        {{ project.location }}
      </div>
      <h3 class="project-title">{{ project.title }}</h3>
      <div class="project-urgent">{{ project.urgentNeeds }}</div>
      <div class="project-progress">
        <div class="progress-info">
          <span>募集进度 {{ project.progress }}%</span>
          <span class="progress-numbers">{{ project.current }} / {{ project.total }} {{ project.unit }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: project.progress + '%' }"></div>
        </div>
        <div class="progress-meta">
          <span class="meta-item">
            <span class="material-symbols-outlined">schedule</span> {{ daysLeftText }}
          </span>
          <span class="meta-beneficiary">受助: {{ project.beneficiary }}</span>
        </div>
      </div>
      <div class="project-actions">
        <button
          type="button"
          :class="['btn-donate', selected ? 'active' : '']"
          @click="$emit('donate')"
        >
          <span class="material-symbols-outlined">edit_square</span>
          {{ selected ? "正在填写" : "我要捐赠" }}
        </button>
        <a href="#" class="btn-detail">详情</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid transparent;
  box-shadow: 0 8px 24px rgba(21, 66, 18, 0.08);
  transition: all 0.3s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(21, 66, 18, 0.12);
}

.project-card.selected {
  border-color: #154212;
  box-shadow: 0 12px 40px rgba(21, 66, 18, 0.15);
}

.project-image {
  position: relative;
  height: 224px;
  overflow: hidden;
}

.project-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-tag {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 4px 12px;
  border-radius: 999px;
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.bg-red-600 {
  background: #8c3315;
}

.bg-green-600 {
  background: #3d6751;
}

.project-body {
  padding: 24px;
}

.project-location {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-600);
  font-size: 0.75rem;
  margin-bottom: 8px;
}

.project-location .material-symbols-outlined {
  font-size: 14px;
}

.project-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink-900);
  margin: 0 0 16px;
}

.project-urgent {
  background: rgba(21, 66, 18, 0.05);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #154212;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 16px;
}

.project-progress {
  margin-bottom: 24px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 0.875rem;
  margin-bottom: 8px;
}

.progress-info span:first-child {
  color: var(--ink-600);
}

.progress-numbers {
  font-weight: 700;
  color: #154212;
}

.progress-bar {
  height: 6px;
  background: #eae8e4;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: #154212;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--ink-600);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-item .material-symbols-outlined {
  font-size: 14px;
}

.meta-beneficiary {
  font-weight: 600;
  color: #3d6751;
}

.project-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-donate {
  flex: 1;
  padding: 12px;
  background: #eae8e4;
  color: var(--ink-900);
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-donate:hover {
  background: #154212;
  color: white;
}

.btn-donate.active {
  background: #154212;
  color: white;
  box-shadow: 0 4px 12px rgba(21, 66, 18, 0.2);
}

.btn-donate .material-symbols-outlined {
  font-size: 14px;
}

.btn-detail {
  padding: 12px 16px;
  color: #154212;
  font-weight: 700;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-detail:hover {
  background: rgba(21, 66, 18, 0.05);
  border-radius: 12px;
}
</style>
