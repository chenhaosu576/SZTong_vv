// useCharityFilters.test.js
// 新签名: useCharityFilters({ projects, regions })
// 覆盖: 4 维筛选 (region/urgency/search + 默认 category 全部需求) +
//       selectedProject 重置 watch +
//       urgency 直接比 project.urgency (不再本地计算)

import { beforeEach, describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import { useCharityFilters } from "../useCharityFilters";

const SAMPLE_PROJECTS = [
  { id: 1, title: "大凉山计划", region: "西部地区", urgency: "紧急募集中", beneficiary: "瓦吾小学" },
  { id: 2, title: "乡村阅读", region: "西部地区", urgency: "常态募集中", beneficiary: "定西小学" },
  { id: 3, title: "上海社区", region: "华东地区", urgency: "常态募集中", beneficiary: "上海社区" },
];

const SAMPLE_REGIONS = ["西部地区", "华东地区"];

describe("useCharityFilters 新签名", () => {
  it("默认 category=全部需求 不影响过滤 (后端未返回 categories)", () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    expect(filters.filteredProjects.value).toHaveLength(3);
  });

  it("region 过滤: 全国 → 全部; 西部地区 → 2 条", () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    filters.setSelectedRegion("西部地区");
    expect(filters.filteredProjects.value.map((p) => p.id)).toEqual([1, 2]);
  });

  it("urgency 过滤: 直接比 project.urgency, 不本地算", () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    filters.setSelectedUrgency("紧急募集中");
    expect(filters.filteredProjects.value.map((p) => p.id)).toEqual([1]);
  });

  it("search 命中 title / beneficiary", () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    filters.setSearchKeyword("瓦吾");
    expect(filters.filteredProjects.value.map((p) => p.id)).toEqual([1]);

    filters.setSearchKeyword("上海");
    expect(filters.filteredProjects.value.map((p) => p.id)).toEqual([3]);
  });

  it("四维组合生效", () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    filters.setSelectedRegion("西部地区");
    filters.setSelectedUrgency("常态募集中");
    filters.setSearchKeyword("阅读");
    expect(filters.filteredProjects.value.map((p) => p.id)).toEqual([2]);
  });

  it("selectedProject 被踢出 → 自动清空 (watch)", async () => {
    const projects = ref(SAMPLE_PROJECTS);
    const regions = ref(SAMPLE_REGIONS);
    const filters = useCharityFilters({ projects, regions });

    filters.selectProject(SAMPLE_PROJECTS[0]);
    expect(filters.selectedProject.value).not.toBeNull();

    filters.setSelectedRegion("华东地区");
    await nextTick();
    expect(filters.selectedProject.value).toBeNull();
  });
});