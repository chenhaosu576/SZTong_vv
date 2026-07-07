// useCharityProjects.test.js
// 覆盖: load 成功 / load 失败 (写 errorText) / findProjectById

import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchCharityProjectsMock } = vi.hoisted(() => ({
  fetchCharityProjectsMock: vi.fn(),
}));

vi.mock("@/api/charity", () => ({
  fetchCharityProjects: fetchCharityProjectsMock,
  fetchCharityProjectById: vi.fn(),
}));

import { useCharityProjects } from "../useCharityProjects";

describe("useCharityProjects", () => {
  beforeEach(() => {
    fetchCharityProjectsMock.mockReset();
  });

  it("load 成功: projects/regions 填充, loading=true→false, errorText 空", async () => {
    fetchCharityProjectsMock.mockResolvedValueOnce({
      list: [
        { id: 1, title: "A", region: "西部地区", urgency: "常态募集中" },
        { id: 2, title: "B", region: "华东地区", urgency: "常态募集中" },
      ],
      regions: ["西部地区", "华东地区"],
      total: 2,
    });

    const { projects, regions, loading, errorText, load } = useCharityProjects();

    expect(projects.value).toEqual([]);
    expect(regions.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("");

    const p = load();
    expect(loading.value).toBe(true);
    await p;

    expect(projects.value).toHaveLength(2);
    expect(regions.value).toEqual(["西部地区", "华东地区"]);
    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("");
  });

  it("load 失败: errorText 写中文, projects 保持空, loading 仍回归 false", async () => {
    fetchCharityProjectsMock.mockRejectedValueOnce(new Error("网络异常"));

    const { projects, regions, loading, errorText, load } = useCharityProjects();
    await load();

    expect(projects.value).toEqual([]);
    expect(regions.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("网络异常");
  });

  it("findProjectById: 命中 → 返回项目; 未命中 → 返回 null", async () => {
    fetchCharityProjectsMock.mockResolvedValueOnce({
      list: [{ id: 7, title: "X" }, { id: 8, title: "Y" }],
      regions: [], total: 2,
    });
    const { findProjectById, load } = useCharityProjects();
    await load();

    expect(findProjectById(7).title).toBe("X");
    expect(findProjectById("8").title).toBe("Y");
    expect(findProjectById(999)).toBeNull();
  });
});