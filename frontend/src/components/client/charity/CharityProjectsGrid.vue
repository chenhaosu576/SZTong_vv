<!-- CharityProjectsGrid.vue -->
<!-- 公益项目列表 + 空态。
     循环渲染 CharityProjectCard,把卡片 donate 中转为
     select-project(project) 向上抛出。
     daysLeftText 在 grid 层基于 project.daysLeft 派生后传给卡片,
     避免卡片内部重复计算紧急度文案。 -->

<script setup>
import CharityProjectCard from "./CharityProjectCard.vue";

const props = defineProps({
  projects: { type: Array, required: true },
  selectedProjectId: { type: Number, default: null },
});

defineEmits(["select-project"]);

function getDaysLeftText(project) {
  if (project.daysLeft === null || project.daysLeft === undefined) {
    return "常态募集";
  }
  return `剩余 ${project.daysLeft} 天`;
}
</script>

<template>
  <div v-if="projects.length" class="projects-grid">
    <CharityProjectCard
      v-for="project in projects"
      :key="project.id"
      :project="project"
      :selected="selectedProjectId === project.id"
      :days-left-text="getDaysLeftText(project)"
      @donate="$emit('select-project', project)"
    />
  </div>
  <div v-else class="projects-empty">
    暂无符合条件的公益项目,请尝试调整筛选条件
  </div>
</template>

<style scoped>
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 32px;
}

.projects-empty {
  padding: 48px 24px;
  border-radius: 24px;
  background: #efeeea;
  color: var(--ink-600);
  text-align: center;
  border: 1px dashed rgba(21, 66, 18, 0.15);
}

@media (max-width: 768px) {
  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style>