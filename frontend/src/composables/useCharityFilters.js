// useCharityFilters.js
// 公益页筛选状态机 (新签名: { projects, regions })。
//
// 职责:
//   - 持有 4 个筛选 ref: selectedCategory / selectedRegion /
//     selectedUrgency / searchKeyword
//   - 派生 filteredProjects(根据 3 个有效筛选条件 + searchKeyword;category
//     后端暂不返回,保持 '全部需求' 默认值不影响过滤)
//   - urgency 直接比 project.urgency (后端算好返回)
//   - 内部 watch(filteredProjects) 在选中项目被踢出时自动清空 selectedProject
//   - 暴露 setter 给 panel 直接调用
//
// 使用方:
//   - CharityPage.vue: const filters = useCharityFilters({ projects, regions });

import { computed, ref, watch } from "vue";

export function useCharityFilters({ projects, regions }) {
  const selectedCategory = ref("全部需求");
  const selectedRegion = ref("全国");
  const selectedUrgency = ref("全部");
  const searchKeyword = ref("");
  const selectedProject = ref(null);

  const filteredProjects = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase();

    return projects.value.filter((project) => {
      // 后端暂不返回 categories 维度, category 筛选不参与过滤 (默认 '全部需求')
      const matchesRegion =
        selectedRegion.value === "全国" || project.region === selectedRegion.value;
      const matchesUrgency =
        selectedUrgency.value === "全部" || project.urgency === selectedUrgency.value;
      const matchesSearch =
        keyword.length === 0 ||
        [project.title, project.beneficiary]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(keyword));

      return matchesRegion && matchesUrgency && matchesSearch;
    });
  });

  watch(
    filteredProjects,
    (nextProjects) => {
      if (
        selectedProject.value &&
        !nextProjects.some((p) => p.id === selectedProject.value.id)
      ) {
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