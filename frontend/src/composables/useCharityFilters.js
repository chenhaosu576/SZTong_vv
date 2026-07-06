// useCharityFilters.js
// 公益页筛选状态机。
//
// 职责:
//   - 持有 4 个筛选 ref: selectedCategory / selectedRegion /
//     selectedUrgency / searchKeyword
//   - 派生 filteredProjects(根据 4 个筛选条件 + getProjectUrgency 紧急度)
//   - 内部 watch(filteredProjects) 在选中项目被踢出列表时自动清空
//     selectedProject,模拟原 view 行为
//   - 暴露 setter 给 panel 直接调用(避免 view 中转)
//
// 使用方:
//   - CharityPage.vue: 实例化,把所有筛选字段透传给 CharityProjectFilters,
//     把 filteredProjects 透传给 CharityProjectsGrid。

import { computed, ref, watch } from "vue";
import { urgentDaysThreshold } from "../utils/charityConstants";

function getProjectUrgency(project) {
  if (project.daysLeft !== null && project.daysLeft <= urgentDaysThreshold) {
    return "紧急募集中";
  }
  return "常态募集中";
}

export function useCharityFilters(projects) {
  const selectedCategory = ref("全部需求");
  const selectedRegion = ref("全国");
  const selectedUrgency = ref("全部");
  const searchKeyword = ref("");
  const selectedProject = ref(null);

  const filteredProjects = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesCategory =
        selectedCategory.value === "全部需求" || project.categories.includes(selectedCategory.value);
      const matchesRegion = selectedRegion.value === "全国" || project.region === selectedRegion.value;
      const matchesUrgency =
        selectedUrgency.value === "全部" || getProjectUrgency(project) === selectedUrgency.value;
      const matchesSearch =
        keyword.length === 0 ||
        [project.title, project.location, project.beneficiary, project.urgentNeeds]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(keyword));

      return matchesCategory && matchesRegion && matchesUrgency && matchesSearch;
    });
  });

  watch(
    filteredProjects,
    (nextProjects) => {
      if (selectedProject.value && !nextProjects.some((project) => project.id === selectedProject.value.id)) {
        selectedProject.value = null;
      }
    },
    { immediate: true },
  );

  function selectProject(project) {
    selectedProject.value = project;
  }

  function setSelectedCategory(value) {
    selectedCategory.value = value;
  }
  function setSelectedRegion(value) {
    selectedRegion.value = value;
  }
  function setSelectedUrgency(value) {
    selectedUrgency.value = value;
  }
  function setSearchKeyword(value) {
    searchKeyword.value = value;
  }

  return {
    selectedCategory,
    selectedRegion,
    selectedUrgency,
    searchKeyword,
    selectedProject,
    filteredProjects,
    selectProject,
    setSelectedCategory,
    setSelectedRegion,
    setSelectedUrgency,
    setSearchKeyword,
  };
}
