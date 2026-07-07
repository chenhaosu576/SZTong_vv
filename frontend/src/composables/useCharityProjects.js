// useCharityProjects.js
// CharityPage 单页业务状态机。
// 职责:
//   - 拉 charity_projects 列表 + regions
//   - 暴露 loading / errorText
//   - 暴露 findProjectById 给 form 提交时用
// 使用方: views/client/CharityPage.vue

import { ref } from "vue";
import * as charityApi from "@/api/charity";

export function useCharityProjects() {
  const projects = ref([]);
  const regions = ref([]);
  const loading = ref(false);
  const errorText = ref("");

  async function load() {
    loading.value = true;
    errorText.value = "";
    try {
      const data = await charityApi.fetchCharityProjects();
      projects.value = data.list;
      regions.value = data.regions;
    } catch (e) {
      errorText.value = e?.message || "公益项目加载失败，请稍后重试。";
    } finally {
      loading.value = false;
    }
  }

  function findProjectById(id) {
    return projects.value.find((p) => p.id === Number(id)) || null;
  }

  return { projects, regions, loading, errorText, load, findProjectById };
}