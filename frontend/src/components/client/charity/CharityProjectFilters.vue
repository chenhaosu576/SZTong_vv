<!-- CharityProjectFilters.vue -->
<!-- 公益项目列表的筛选条。
     区域 select + 紧急度 select + 搜索框 (categories 行临时移除,后端暂未返回 categories 字段)。
     所有字段通过 props 接收,变化通过 update:* 事件抛出,
     不持有任何状态。 -->

<script setup>
defineProps({
  regionOptions: { type: Array, required: true },
  urgencyOptions: { type: Array, required: true },
  selectedRegion: { type: String, required: true },
  selectedUrgency: { type: String, required: true },
  searchKeyword: { type: String, required: true },
});

defineEmits([
  "update:selected-region",
  "update:selected-urgency",
  "update:search-keyword",
]);
</script>

<template>
  <div class="filter-bar">
    <div class="filter-controls">
      <select
        :value="selectedRegion"
        class="filter-select"
        @change="$emit('update:selected-region', $event.target.value)"
      >
        <option v-for="region in regionOptions" :key="region" :value="region">
          {{ region }}
        </option>
      </select>
      <select
        :value="selectedUrgency"
        class="filter-select"
        @change="$emit('update:selected-urgency', $event.target.value)"
      >
        <option v-for="urgency in urgencyOptions" :key="urgency" :value="urgency">
          {{ urgency }}
        </option>
      </select>
      <div class="search-box">
        <span class="material-symbols-outlined">search</span>
        <input
          :value="searchKeyword"
          type="text"
          placeholder="搜索项目或机构名称"
          @input="$emit('update:search-keyword', $event.target.value)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  background: #efeeea;
  padding: 24px;
  border-radius: 24px;
  box-shadow: 0 4px 12px rgba(21, 66, 18, 0.05);
}

.filter-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.filter-btn {
  padding: 10px 20px;
  border-radius: 999px;
  border: none;
  background: white;
  color: var(--ink-600);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn.active {
  background: #154212;
  color: white;
}

.filter-btn:hover:not(.active) {
  background: #e4e2de;
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.filter-select {
  background: white;
  border: none;
  border-radius: 16px;
  padding: 10px 16px;
  font-size: 0.875rem;
  min-width: 120px;
  cursor: pointer;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 256px;
}

.search-box .material-symbols-outlined {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ink-600);
  opacity: 0.6;
}

.search-box input {
  width: 100%;
  padding: 10px 16px 10px 48px;
  background: white;
  border: none;
  border-radius: 16px;
  font-size: 0.875rem;
}

.search-box input:focus {
  outline: 2px solid rgba(21, 66, 18, 0.2);
}

@media (max-width: 768px) {
  .filter-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: 100%;
  }
}
</style>
