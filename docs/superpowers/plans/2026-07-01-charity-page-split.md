# CharityPage 组件拆分实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 1894 行的 `CharityPage.vue` 拆成 view 编排层 + 3 个 composables + 8 个 panels + 1 个 modal + 2 个 utils,view 行数降到 ~200。

**Architecture:** 完全镜像 `AppointmentPage.vue` 拆分风格(commit 8baf71f)。view 只持有 destructured ref 和少量协调函数(如 `onSelectProject`);所有业务状态与逻辑下沉到职责单一的 composables;模板按 UI 区域切为独立 panel,通过 props + emits 与 view 通信。CSS 跟着 markup 搬,view 只留容器/布局/响应式。

**Tech Stack:** Vue 3 `<script setup>` + Composition API + `useRevealOnScroll` composable + `clientApi.js` mock。

**前置阅读:**
- 设计文档:`docs/superpowers/specs/2026-07-01-charity-page-split-design.md`
- 拆分范式参照:`frontend/src/views/client/AppointmentPage.vue` + `frontend/src/components/client/appointment/*.vue` + `frontend/src/composables/useAppointmentForm.js`
- 当前源:`frontend/src/views/client/CharityPage.vue`(1894 行)

**TDD 注:** 项目无 Vitest / Jest / ESLint 配置(见 `frontend/CLAUDE.md`),spec 明确"本次重构不做单元测试,验证全部走 Vite dev server + 浏览器手动"。因此本计划的每个 task 用「dev server 启动 + 浏览器手动验证」替代自动化测试。CI 测试步骤 `--passWithNoTests`,无需调整。

**文件顶部注释要求:** 每个新建文件的顶部必须有一段块注释说明用途 / 职责 / 使用方,这是用户的硬性要求(不是建议)。

---

## 文件结构(锁定)

```
frontend/src/utils/charityConstants.js                       (新建:7 项静态数据)
frontend/src/utils/charityValidation.js                      (新建:校验纯函数)
frontend/src/composables/useCharityFilters.js                (新建:筛选状态机)
frontend/src/composables/useDonationForm.js                  (新建:表单状态)
frontend/src/composables/useDonationSubmit.js                (新建:提交流程)
frontend/src/components/client/charity/
  CharityHeroPanel.vue                                       (新建:hero + 两个 CTA)
  CharityProjectFilters.vue                                  (新建:筛选条)
  CharityProjectCard.vue                                     (新建:单张项目卡)
  CharityProjectsGrid.vue                                    (新建:项目卡片列表)
  CharityDetailPanel.vue                                     (新建:详情左栏)
  CharityDonationForm.vue                                    (新建:详情右栏表单)
  CharitySuccessModal.vue                                    (新建:成功 modal)
  CharityProcessSection.vue                                  (新建:四步流程)
  CharityTrustSection.vue                                    (新建:信任背书)
frontend/src/views/client/CharityPage.vue                    (重写:1894 → ~200)
```

**总任务数**:16(含最终清理与全局验证)

---

## Task 1: 抽出常量工具 `charityConstants.js`

**Files:**
- Create: `frontend/src/utils/charityConstants.js`

无依赖,最先落地。所有 mock 数据和枚举项集中。

- [ ] **Step 1.1: 创建文件**

创建 `frontend/src/utils/charityConstants.js`:

```javascript
// charityConstants.js
// 公益页面共享的静态数据常量。
// 集中在此避免散落到 view / composable 顶部。
//
// 包含:
//   - projects: mock 项目列表(3 项,含进度 / 紧急需求 / 受助方 / 详情等)
//   - categories / urgencyOptions / regionOptions: 筛选条枚举项
//   - processSteps: 四步流程文案
//   - trustFeatures: 信任背书 4 个特性
//   - urgentDaysThreshold: 紧急 / 常态募集的分界天数
//
// 使用方:
//   - CharityPage.vue (顶部 import 透传给 panel)
//   - useCharityFilters.js (urgentDaysThreshold)

export const projects = [
  {
    id: 1,
    title: "大凉山冬季暖心计划",
    location: "四川·凉山",
    region: "西部地区",
    categories: ["衣物", "文具"],
    tag: "紧急项目",
    tagColor: "bg-red-600",
    urgentNeeds: "急需：儿童冬衣 / 棉鞋 / 书包",
    progress: 72,
    current: 864,
    total: 1200,
    unit: "件",
    daysLeft: 14,
    beneficiary: "瓦吾小学学生",
    image: "https://images.pexels.com/photos/15311442/pexels-photo-15311442.jpeg?cs=srgb&dl=pexels-akh-taufiq-202388902-15311442.jpg&fm=jpg",
    description: "瓦吾小学位于海拔2700米的山巅,冬长夏短,温差极大。冬季早晨气温常在零下,许多孩子穿着单薄的布鞋和外套步行数公里上学。我们希望汇聚社会力量,为山区的孩子们送去温暖。",
    needs: [
      { title: "儿童冬装外套", desc: "标准:8 成新以上,无破损,男女不限" },
      { title: "保暖棉鞋 / 运动鞋", desc: "标准:全新或近全新,码数 28-38 码" },
      { title: "加厚袜 / 手套 / 围巾", desc: "标准:仅限全新" },
    ],
  },
  {
    id: 2,
    title: "乡村阅读角落建设",
    location: "甘肃·定西",
    region: "西部地区",
    categories: ["图书", "文具"],
    tag: "教育支持",
    tagColor: "bg-green-600",
    urgentNeeds: "急需:青少年绘本 / 文具盒",
    progress: 45,
    current: 2250,
    total: 5000,
    unit: "本",
    daysLeft: null,
    beneficiary: "定西乡村小学",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-vEYpZWELSaBiQHUCU5s9K4GHjrYKzSyZBrawpw6Lv05z0bZ0wL-uO4j2y-EUe9pBHXaIj-UoJ8Cbvz5cY-yNn2713dOteo3UPa9afcLIqC5tojajG2gJDT-_pzl1vjWCDzwZzWr_a7BgbfG9MsWErniWFYh6p6YuNAay0TlKOwSYtMpIsz0ctwBakfAP0Us2kzxN1rYV_g29cDm8c5m5cutNHoJJEglIZAYa92zWZDeu1K8YVvAPv5vASnLJxvl8T7Smixo3I0I",
  },
  {
    id: 3,
    title: "社区闲置循环共享舱",
    location: "上海·普陀",
    region: "华东地区",
    categories: ["家居", "其他"],
    tag: "社区帮扶",
    tagColor: "bg-green-600",
    urgentNeeds: "急需:烧水壶 / 电风扇 / 梯子",
    progress: 91,
    current: 182,
    total: 200,
    unit: "件",
    daysLeft: 3,
    beneficiary: "社区困难家庭",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhgvU0cLJleG-KawwH5lajDo83Pp50_vmCcVrYuk2zJwomDpIzxFTkrZy8KuqAuLdHnT_-xmiE2DodbiW7Tld_yrexaDnhdbVhn4V-ukUtH9mAvJ3HCXdDfPu3jKF3WyFvA2yAERGVW0LIfwcxETX1xbANp_ihHA52UYVS8UW6_ITa_Q5KuoWy2l3qOPWXjkH5Pumj_vXh4GCisGw8t858XYjUrT8dsYRAgKyziIdpkLMMX_TYh7AJX4S0KrSfe5iouhQTtTOqNTI",
  },
];

export const categories = ["全部需求", "图书", "衣物", "文具", "家居", "其他"];

export const urgencyOptions = ["全部", "紧急募集中", "常态募集中"];

export const urgentDaysThreshold = 7;

export const regionOptions = ["全国", ...new Set(projects.map((project) => project.region))];

export const processSteps = [
  { icon: "search", title: "浏览项目", desc: "查看当前正在募集的公益需求" },
  { icon: "check_circle", title: "选择项目", desc: "找到最匹配您手中物资的受助方向" },
  { icon: "edit_document", title: "填写信息", desc: "登记捐赠详情,选择物流配送方式" },
  { icon: "send", title: "完成提交并等待反馈", desc: "物资送达后您将收到实时签收通知" },
];

export const trustFeatures = [
  { icon: "fact_check", title: "项目真实性审核", desc: "所有发布项目均经过三方机构实地核验与平台二次风控审核。" },
  { icon: "track_changes", title: "物资去向追踪", desc: "从出库、运输到最终发放,每一个节点均同步数字轨迹。" },
  { icon: "rate_review", title: "如何查看签收反馈", desc: "发放完成后,平台会上传受助人签收单及物资分发纪实现场照片。" },
  { icon: "gavel", title: "合规信息披露", desc: "平台财务状况与审计报告定期向公众开放,接受社会化监督。" },
];
```

- [ ] **Step 1.2: 验证可被 import**

暂时不改原 `CharityPage.vue`。跑 sanity 校验:

```bash
cd frontend && node -e "import('./src/utils/charityConstants.js').then(m => console.log(Object.keys(m)))"
```

Expected: 输出 `["projects", "categories", "urgencyOptions", "urgentDaysThreshold", "regionOptions", "processSteps", "trustFeatures"]`。

如果 import 失败,检查 ESM 语法(`export` 必须用 `export const`,不能用 `export default`)。

- [ ] **Step 1.3: 提交**

```bash
git add frontend/src/utils/charityConstants.js
git commit -m "refactor(charity): extract shared constants to charityConstants.js

Used by upcoming useCharityFilters and CharityPage view. Keeps mock
projects / categories / process steps / trust features in one place."
```

---

## Task 2: 抽出 `charityValidation.js`

**Files:**
- Create: `frontend/src/utils/charityValidation.js`

校验纯函数,无副作用,无依赖。

- [ ] **Step 2.1: 创建文件**

创建 `frontend/src/utils/charityValidation.js`:

```javascript
// charityValidation.js
// 公益捐赠表单的校验纯函数。
//
// 职责:
//   - getDonationValidationMessage(donationForm, selectedProject)
//     返回空字符串表示通过;返回非空字符串表示第一条校验失败信息。
//
// 校验顺序:
//   1. 必须先选中项目
//   2. 物品名称必填
//   3. 数量 / 重量至少填一项
//   4. 捐赠者姓名必填
//   5. 联系电话必填且必须为 11 位 1 开头的手机号
//
// 使用方:
//   - useDonationSubmit.js: handleSubmit 提交前调用

export function getDonationValidationMessage(donationForm, selectedProject) {
  if (!selectedProject) {
    return "请先选择一个公益项目后再提交。";
  }

  if (!String(donationForm.itemName || "").trim()) {
    return "请填写具体物品名称。";
  }

  const quantity = String(donationForm.quantity || "").trim();
  const weight = String(donationForm.weight || "").trim();
  if (!quantity && !weight) {
    return "请至少填写数量或预估重量。";
  }

  if (!String(donationForm.donorName || "").trim()) {
    return "请填写捐赠者姓名。";
  }

  const phone = String(donationForm.phone || "").trim();
  if (!phone) {
    return "请填写联系电话。";
  }

  if (!/^1\d{10}$/.test(phone)) {
    return "请输入有效的 11 位手机号。";
  }

  return "";
}
```

- [ ] **Step 2.2: 验证逻辑正确**

跑快速 sanity 校验:

```bash
cd frontend && node -e "
import('./src/utils/charityValidation.js').then(({ getDonationValidationMessage }) => {
  const empty = { itemName: '', quantity: '', weight: '', donorName: '', phone: '' };
  console.log('no project:', getDonationValidationMessage(empty, null));
  console.log('no name:', getDonationValidationMessage(empty, { id: 1 }));
  console.log('no qty/weight:', getDonationValidationMessage({ ...empty, itemName: 'x' }, { id: 1 }));
  console.log('bad phone:', getDonationValidationMessage({ itemName: 'x', quantity: '1', donorName: 'y', phone: '123' }, { id: 1 }));
  console.log('valid:', getDonationValidationMessage({ itemName: 'x', quantity: '1', donorName: 'y', phone: '13800138000' }, { id: 1 }));
});
"
```

Expected(5 行输出):
```
no project: 请先选择一个公益项目后再提交。
no name: 请填写具体物品名称。
no qty/weight: 请至少填写数量或预估重量。
bad phone: 请输入有效的 11 位手机号。
valid:
```

最后一行应为空字符串(通过校验)。

- [ ] **Step 2.3: 提交**

```bash
git add frontend/src/utils/charityValidation.js
git commit -m "refactor(charity): extract validation to charityValidation.js

Pure function getDonationValidationMessage used by useDonationSubmit.
Same rules as original CharityPage.validateDonationForm."
```

---

## Task 3: 抽出 `useCharityFilters` composable

**Files:**
- Create: `frontend/src/composables/useCharityFilters.js`

筛选状态机。依赖 `charityConstants.js`。

- [ ] **Step 3.1: 创建文件**

创建 `frontend/src/composables/useCharityFilters.js`:

```javascript
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

export function useCharityFilters() {
  const selectedCategory = ref("全部需求");
  const selectedRegion = ref("全国");
  const selectedUrgency = ref("全部");
  const searchKeyword = ref("");
  const selectedProject = ref(null);

  const filteredProjects = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase();

    return require_projects().filter((project) => {
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
```

> ⚠️ **注意:** 上面代码 `require_projects()` 是占位 — 工程化阶段由 view 在调用时通过入参注入 `projects` 常量。请改写为下面的最终版:

把上面文件**整体替换**为以下最终版(把 `require_projects()` 改为入参注入):

```javascript
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
```

> ✅ `getProjectUrgency` 内部导出,但因为只有 composable 内部和 grid 派生 `daysLeftText` 时用,view 直接调用即可,无需在 composable 顶层 export。如未来 grid 需要,可从 composable 顶层 export。

- [ ] **Step 3.2: 验证筛选逻辑**

跑 sanity 校验:

```bash
cd frontend && node -e "
import('./src/utils/charityConstants.js').then(({ projects }) => {
  import('./src/composables/useCharityFilters.js').then(({ useCharityFilters }) => {
    // 不实际调用 setup() —— 只验证 import 路径不报错
    console.log('imports ok, project count:', projects.length);
  });
});
"
```

Expected: `imports ok, project count: 3`。

完整运行时验证需要 Vue 运行时,留到 Task 15 后用浏览器跑。

- [ ] **Step 3.3: 提交**

```bash
git add frontend/src/composables/useCharityFilters.js
git commit -m "refactor(charity): extract useCharityFilters composable

Holds 4 filter refs + filteredProjects computed + watch that auto-clears
selectedProject when it's filtered out. Setters exposed for direct panel
emits."
```

---

## Task 4: 抽出 `useDonationForm` composable

**Files:**
- Create: `frontend/src/composables/useDonationForm.js`

表单状态。无依赖。

- [ ] **Step 4.1: 创建文件**

创建 `frontend/src/composables/useDonationForm.js`:

```javascript
// useDonationForm.js
// 公益捐赠表单的本地状态管理。
//
// 职责:
//   - 持有 donationForm ref(8 个字段)
//   - createDefaultDonationForm(): 工厂函数,返回表单默认值
//   - resetForm(): 提交成功后由 useDonationSubmit 回调,清空表单
//
// 不调用任何 API、不感知选中项目、不持有校验逻辑。

import { ref } from "vue";

export function createDefaultDonationForm() {
  return {
    itemType: "冬装外套",
    itemName: "",
    quantity: "",
    weight: "",
    condition: "8成新以上",
    logistics: "快递寄送",
    donorName: "",
    phone: "",
  };
}

export function useDonationForm() {
  const donationForm = ref(createDefaultDonationForm());

  function resetForm() {
    donationForm.value = createDefaultDonationForm();
  }

  return {
    donationForm,
    resetForm,
  };
}
```

- [ ] **Step 4.2: 验证 import**

```bash
cd frontend && node -e "import('./src/composables/useDonationForm.js').then(m => console.log(Object.keys(m)))"
```

Expected: `["createDefaultDonationForm", "useDonationForm"]`。

- [ ] **Step 4.3: 提交**

```bash
git add frontend/src/composables/useDonationForm.js
git commit -m "refactor(charity): extract useDonationForm composable

Holds donationForm ref + factory + resetForm. Used by view and passed
into useDonationSubmit via injection."
```

---

## Task 5: 抽出 `useDonationSubmit` composable

**Files:**
- Create: `frontend/src/composables/useDonationSubmit.js`

提交流程。依赖 `submitDonationRequest`(from `mock/clientApi`)和 `getDonationValidationMessage`。

- [ ] **Step 5.1: 创建文件**

创建 `frontend/src/composables/useDonationSubmit.js`:

```javascript
// useDonationSubmit.js
// 公益捐赠的提交编排 composable。
//
// 职责:
//   - 持有 submitLoading / errorText / submitResult 3 个 ref
//   - handleSubmit(): 校验 → 调 submitDonationRequest → 驱动 submitResult
//     → 触发 onSuccess 回调(由 view 注入,通常是 donationForm.resetForm)
//   - closeSuccessModal(): 清空 submitResult
//
// 通过入参注入 donationForm / getSelectedProject / onSuccess,
// 不直接 import useDonationForm / useCharityFilters(保持纯函数式)。
//
// 使用方:
//   - CharityPage.vue: 实例化,把 submitLoading/errorText/submitResult
//     透传给 CharityDonationForm 和 CharitySuccessModal。

import { ref } from "vue";
import { submitDonation as submitDonationRequest } from "../mock/clientApi";
import { getDonationValidationMessage } from "../utils/charityValidation";

export function useDonationSubmit({ donationForm, getSelectedProject, onSuccess }) {
  const submitLoading = ref(false);
  const errorText = ref("");
  const submitResult = ref(null);

  function resetSubmitState() {
    errorText.value = "";
    submitResult.value = null;
  }

  async function handleSubmit() {
    if (submitLoading.value) {
      return;
    }

    resetSubmitState();

    const form = donationForm.value;
    const selectedProject = getSelectedProject();

    const validationMessage = getDonationValidationMessage(form, selectedProject);
    if (validationMessage) {
      errorText.value = validationMessage;
      return;
    }

    submitLoading.value = true;

    try {
      const payload = {
        projectId: selectedProject.id,
        projectTitle: selectedProject.title,
        projectLocation: selectedProject.location,
        itemType: String(form.itemType || "").trim(),
        itemName: String(form.itemName || "").trim(),
        quantity: String(form.quantity || "").trim(),
        weight: String(form.weight || "").trim(),
        condition: String(form.condition || "").trim(),
        logistics: String(form.logistics || "").trim(),
        donorName: String(form.donorName || "").trim(),
        phone: String(form.phone || "").trim(),
      };
      const result = await submitDonationRequest(payload);

      submitResult.value = {
        message: "捐赠信息提交成功,已同步到服务记录。",
        orderId: result.orderId,
        syncedToOrders: result.syncedToOrders,
      };

      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (error) {
      errorText.value = "提交失败,请稍后重试。";
    } finally {
      submitLoading.value = false;
    }
  }

  function closeSuccessModal() {
    submitResult.value = null;
  }

  return {
    submitLoading,
    errorText,
    submitResult,
    handleSubmit,
    closeSuccessModal,
  };
}
```

- [ ] **Step 5.2: 验证 import 与 mock 调用链**

```bash
cd frontend && node -e "
Promise.all([
  import('./src/composables/useDonationSubmit.js'),
  import('./src/utils/charityValidation.js'),
  import('./src/mock/clientApi.js'),
]).then(([submitMod, _val, _api]) => {
  console.log('useDonationSubmit exports:', Object.keys(submitMod));
});
"
```

Expected: `useDonationSubmit exports: ["useDonationSubmit"]`。

完整端到端验证留到 Task 15 后跑浏览器。

- [ ] **Step 5.3: 提交**

```bash
git add frontend/src/composables/useDonationSubmit.js
git commit -m "refactor(charity): extract useDonationSubmit composable

Handles validation -> submitDonation -> result/error state lifecycle.
Reads donationForm and selectedProject via injected getters to avoid
implicit composable dependencies."
```

---

## Task 6: 抽出 `CharityHeroPanel.vue`

**Files:**
- Create: `frontend/src/components/client/charity/CharityHeroPanel.vue`

Hero 区 + 两个 CTA。**核心改造点**:用 `@click="$emit(...)"` 替换原 view 中 `onMounted + querySelector + removeEventListener` 的反射式绑定。

- [ ] **Step 6.1: 创建文件**

创建 `frontend/src/components/client/charity/CharityHeroPanel.vue`:

```vue
<!-- CharityHeroPanel.vue -->
<!-- 公益页 hero 区。
     包含标题、副标题、两个 CTA 按钮、3 个 feature 条、右侧装饰图。
     两个 CTA 按钮通过 emit('projects-click') / emit('process-click')
     把滚动控制权交给 view(避免反射式 DOM 查询 + 手动事件清理)。
     所有 scoped 样式随 markup 一起搬入。 -->

<script setup>
defineEmits(["projects-click", "process-click"]);
</script>

<template>
  <section class="hero-section">
    <div class="page-width hero-content">
      <div class="hero-text">
        <div class="hero-badge">
          <span class="material-symbols-outlined">favorite</span>
          Digital Curator for Stewardship
        </div>
        <h1 class="hero-title">
          看看哪里正在需要<br /><span class="hero-highlight">书籍、衣物</span>和生活物资
        </h1>
        <p class="hero-desc">
          选择一个正在募集的公益项目,完成本次捐赠,让每一份善意精准送达。
        </p>
        <div class="hero-actions">
          <button type="button" class="hero-btn hero-btn-primary" @click="$emit('projects-click')">立即捐赠</button>
          <button type="button" class="hero-btn hero-btn-secondary" @click="$emit('process-click')">查看项目</button>
        </div>
        <div class="hero-features">
          <div class="feature-item">
            <span class="material-symbols-outlined">verified</span>
            <span>真实需求项目</span>
          </div>
          <div class="feature-item">
            <span class="material-symbols-outlined">visibility</span>
            <span>募集信息透明</span>
          </div>
          <div class="feature-item">
            <span class="material-symbols-outlined">view_object_track</span>
            <span>捐赠进度可追踪</span>
          </div>
        </div>
      </div>
      <div class="hero-image">
        <div class="image-decoration"></div>
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_landxi8cNfe8zj9YpUcgoSOVbL-9o60Cc-cnXf8VqWSOMoFYyHwvfVtGagVTd4LHuEChcmRmDAlhOjKK3t-yE7no2m4pI7rRLmQpxph1JXSNaC00mIKyB6jdrtsZl4xmTuOmE6szpFdLSdfWN9MjUFAuyBzyffLlReMQqznVWWhbanftZoFh2npUN9OccklW9aCtNNcxsGgaK3UefN4ClQJmx43E8_umaNJtwTNOo_O2UpUilfnZFjexuW06KPNrW4rAT6bd0L4"
          alt="志愿者整理捐赠物资"
          class="hero-img"
        />
        <div class="hero-stat">
          <div class="stat-icon">
            <span class="material-symbols-outlined">volunteer_activism</span>
          </div>
          <div>
            <div class="stat-number">12,482+</div>
            <div class="stat-label">物资已成功捐赠</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  padding: 48px 0;
  min-height: 640px;
  display: flex;
  align-items: center;
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}

.hero-text {
  z-index: 10;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(191, 237, 209, 0.6);
  color: var(--forest-700);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 24px;
}

.hero-badge .material-symbols-outlined {
  font-size: 14px;
  font-variation-settings: "FILL" 1;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 5vw, 3.75rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ink-900);
  margin: 0 0 32px;
}

.hero-highlight {
  color: #154212;
  font-style: italic;
}

.hero-desc {
  font-size: 1.25rem;
  line-height: 1.8;
  color: var(--ink-600);
  max-width: 540px;
  margin: 0 0 40px;
}

.hero-actions {
  margin-bottom: 48px;
}

.hero-features {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding-top: 32px;
  border-top: 1px solid rgba(66, 73, 62, 0.3);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #154212;
  font-weight: 600;
}

.feature-item .material-symbols-outlined {
  font-size: 20px;
}

.hero-image {
  position: relative;
  height: 540px;
}

.image-decoration {
  position: absolute;
  inset: 0;
  background: rgba(21, 66, 18, 0.05);
  border-radius: 48px;
  transform: rotate(-3deg) scale(1.05);
}

.hero-img {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 48px;
  box-shadow: 0 24px 60px rgba(21, 66, 18, 0.2);
}

.hero-stat {
  position: absolute;
  bottom: -32px;
  left: -32px;
  z-index: 20;
  background: white;
  padding: 24px;
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(21, 66, 18, 0.15);
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(66, 73, 62, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: rgba(140, 51, 21, 0.1);
  color: #8c3315;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon .material-symbols-outlined {
  font-variation-settings: "FILL" 1;
}

.stat-number {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--ink-900);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--ink-600);
}

@media (max-width: 1024px) {
  .hero-content {
    grid-template-columns: 1fr;
  }

  .hero-image {
    height: 400px;
  }
}
</style>
```

- [ ] **Step 6.2: 验证不破坏原 view**

此时 `CharityPage.vue` 还未引用本组件,新文件是孤立状态。跑 `npm run dev`:

```bash
cd frontend && npm run dev
```

在浏览器打开 `http://localhost:5173/charity`(或任意加载 `CharityPage.vue` 的路由)。**期望**:页面渲染与原版一致,无新增功能。这是 sanity check,确认 panel 文件可被 Vite 解析、无语法错误。

如果 hero 区有任何视觉变化(变窄/变宽/色差),说明 CSS 漏搬,回到 Step 6.1 补全。

- [ ] **Step 6.3: 提交**

```bash
git add frontend/src/components/client/charity/CharityHeroPanel.vue
git commit -m "refactor(charity): extract CharityHeroPanel

Hero with two CTAs that emit projects-click / process-click. Replaces
the original view's onMounted + querySelector + removeEventListener
reflection pattern. Styles moved verbatim from CharityPage.vue."
```

---

## Task 7: 抽出 `CharityProjectFilters.vue`

**Files:**
- Create: `frontend/src/components/client/charity/CharityProjectFilters.vue`

筛选条。接收 7 个 props,emit 7 个 `update:*`。

- [ ] **Step 7.1: 创建文件**

创建 `frontend/src/components/client/charity/CharityProjectFilters.vue`:

```vue
<!-- CharityProjectFilters.vue -->
<!-- 公益项目列表的筛选条。
     类目 chips + 区域 select + 紧急度 select + 搜索框。
     所有字段通过 props 接收,变化通过 update:* 事件抛出,
     不持有任何状态。 -->

<script setup>
defineProps({
  categories: { type: Array, required: true },
  regionOptions: { type: Array, required: true },
  urgencyOptions: { type: Array, required: true },
  selectedCategory: { type: String, required: true },
  selectedRegion: { type: String, required: true },
  selectedUrgency: { type: String, required: true },
  searchKeyword: { type: String, required: true },
});

defineEmits([
  "update:selected-category",
  "update:selected-region",
  "update:selected-urgency",
  "update:search-keyword",
]);
</script>

<template>
  <div class="filter-bar">
    <div class="filter-categories">
      <button
        v-for="cat in categories"
        :key="cat"
        type="button"
        :class="['filter-btn', selectedCategory === cat ? 'active' : '']"
        @click="$emit('update:selected-category', cat)"
      >
        {{ cat }}
      </button>
    </div>
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
```

- [ ] **Step 7.2: 验证 import 与编译**

```bash
cd frontend && npm run dev
```

打开 `/charity` 路由。**期望**:页面渲染无报错(此 panel 暂未接入,孤立 import 不影响原页面)。

Vite 控制台如果有 `defineProps` / `defineEmits` 警告或解析错误,回头修正。

- [ ] **Step 7.3: 提交**

```bash
git add frontend/src/components/client/charity/CharityProjectFilters.vue
git commit -m "refactor(charity): extract CharityProjectFilters

7 props in, 7 update:* events out. Pure presentation, no state."
```

---

## Task 8: 抽出 `CharityProjectCard.vue`

**Files:**
- Create: `frontend/src/components/client/charity/CharityProjectCard.vue`

单张项目卡。接收 `project` / `selected` / `daysLeftText`,emit `donate`。

- [ ] **Step 8.1: 创建文件**

创建 `frontend/src/components/client/charity/CharityProjectCard.vue`:

```vue
<!-- CharityProjectCard.vue -->
<!-- 公益项目列表的单张项目卡。
     接收 project + selected + daysLeftText,emit donate。
     由 CharityProjectsGrid 在 v-for 内调用,donate 在 grid 层
     中转为 select-project(project) 向上抛出。 -->

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
```

- [ ] **Step 8.2: 验证 import 与编译**

```bash
cd frontend && npm run dev
```

打开 `/charity` 路由,确认页面无新报错(此 panel 暂未接入)。如有 CSS 漏搬导致原页面视觉变化,回到 Step 8.1 补全(注意:panel 未接入时不会影响原页面,所以更应关注 Vite 编译错误)。

- [ ] **Step 8.3: 提交**

```bash
git add frontend/src/components/client/charity/CharityProjectCard.vue
git commit -m "refactor(charity): extract CharityProjectCard

Single project card. Emits donate, grid forwards as select-project(project)."
```

---

## Task 9: 抽出 `CharityProjectsGrid.vue`

**Files:**
- Create: `frontend/src/components/client/charity/CharityProjectsGrid.vue`

项目列表 + 空态。grid 层负责把 `donate` 中转为 `select-project(project)`。

- [ ] **Step 9.1: 创建文件**

创建 `frontend/src/components/client/charity/CharityProjectsGrid.vue`:

```vue
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
```

- [ ] **Step 9.2: 验证 import 与编译**

```bash
cd frontend && npm run dev
```

打开 `/charity` 路由,确认 Vite 无报错。

- [ ] **Step 9.3: 提交**

```bash
git add frontend/src/components/client/charity/CharityProjectsGrid.vue
git commit -m "refactor(charity): extract CharityProjectsGrid

Grid + empty state. Forwards card donate as select-project(project).
Derives daysLeftText per project before passing to card."
```

---

## Task 10: 抽出 `CharityDetailPanel.vue`

**Files:**
- Create: `frontend/src/components/client/charity/CharityDetailPanel.vue`

详情左栏。三张 detail card(description / needs / logistics)。

- [ ] **Step 10.1: 创建文件**

创建 `frontend/src/components/client/charity/CharityDetailPanel.vue`:

```vue
<!-- CharityDetailPanel.vue -->
<!-- 公益项目详情左栏。
     三张 detail card:描述 / 当前具体需求 / 物流指引。
     纯展示,接收 project,无交互无 emit。 -->

<script setup>
defineProps({
  project: { type: Object, required: true },
});
</script>

<template>
  <div class="detail-left">
    <div class="detail-card">
      <h2>{{ project.title }}</h2>
      <div class="detail-meta">
        <span><span class="material-symbols-outlined">location_on</span> {{ project.location }}</span>
        <span><span class="material-symbols-outlined">groups</span> 受助: {{ project.beneficiary }}</span>
      </div>
      <p>{{ project.description }}</p>
    </div>

    <div v-if="project.needs" class="detail-card needs-card">
      <h4><span class="material-symbols-outlined">fact_check</span> 当前具体需求</h4>
      <div class="needs-grid">
        <div v-for="need in project.needs" :key="need.title" class="need-item">
          <div class="need-dot"></div>
          <div>
            <p class="need-title">{{ need.title }}</p>
            <p class="need-desc">{{ need.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-card">
      <h4><span class="material-symbols-outlined">local_shipping</span> 捐赠指引及物流</h4>
      <div class="logistics-grid">
        <div>
          <p class="logistics-title">物流配送方式</p>
          <p class="logistics-desc">支持快递寄送至平台转运仓,或预约平台合作物流上门取件。上海、成都地区支持到指定社区站点投递。</p>
        </div>
        <div>
          <p class="logistics-title">全程透明追踪</p>
          <p class="logistics-desc">所有物流环节通过区块链存证,捐赠人可随时查看物资分发照片及受助学校签收单据。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-left {
  display: grid;
  gap: 32px;
}

.detail-card {
  background: white;
  padding: 32px;
  border-radius: 24px;
}

.detail-card h2 {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 800;
  color: var(--ink-900);
  margin: 0 0 16px;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 0.875rem;
  color: var(--ink-600);
  margin-bottom: 24px;
}

.detail-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-meta .material-symbols-outlined {
  font-size: 18px;
}

.detail-card p {
  color: var(--ink-600);
  line-height: 1.8;
  margin: 0;
}

.needs-card {
  border-left: 4px solid #154212;
}

.detail-card h4 {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--ink-900);
  margin: 0 0 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-card h4 .material-symbols-outlined {
  color: #154212;
}

.needs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.need-item {
  display: flex;
  align-items: start;
  gap: 12px;
}

.need-dot {
  width: 8px;
  height: 8px;
  background: #154212;
  border-radius: 50%;
  margin-top: 8px;
  flex-shrink: 0;
}

.need-title {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--ink-900);
  margin: 0 0 4px;
}

.need-desc {
  font-size: 0.75rem;
  color: var(--ink-600);
  margin: 0;
}

.logistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 32px;
}

.logistics-title {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--ink-900);
  margin: 0 0 8px;
}

.logistics-desc {
  font-size: 0.75rem;
  color: var(--ink-600);
  line-height: 1.6;
  margin: 0;
}
</style>
```

- [ ] **Step 10.2: 验证 import 与编译**

```bash
cd frontend && npm run dev
```

打开 `/charity` 路由,确认 Vite 无报错。

- [ ] **Step 10.3: 提交**

```bash
git add frontend/src/components/client/charity/CharityDetailPanel.vue
git commit -m "refactor(charity): extract CharityDetailPanel

Left column of detail section. Three cards (description / needs / logistics). Pure presentation."
```

---

## Task 11: 抽出 `CharityDonationForm.vue`

**Files:**
- Create: `frontend/src/components/client/charity/CharityDonationForm.vue`

详情右栏表单。8 个字段 update:* + submit。

- [ ] **Step 11.1: 创建文件**

创建 `frontend/src/components/client/charity/CharityDonationForm.vue`:

```vue
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
```

- [ ] **Step 11.2: 验证 import 与编译**

```bash
cd frontend && npm run dev
```

打开 `/charity` 路由,确认 Vite 无报错。

- [ ] **Step 11.3: 提交**

```bash
git add frontend/src/components/client/charity/CharityDonationForm.vue
git commit -m "refactor(charity): extract CharityDonationForm

8 fields with individual update:* events + submit. Inline error bar
preserved (no separate ValidationModal per spec decision)."
```

---

## Task 12: 抽出 `CharitySuccessModal.vue`

**Files:**
- Create: `frontend/src/components/client/charity/CharitySuccessModal.vue`

提交成功 modal。`<Transition name="fade">` 包在 modal 内部。

- [ ] **Step 12.1: 创建文件**

创建 `frontend/src/components/client/charity/CharitySuccessModal.vue`:

```vue
<!-- CharitySuccessModal.vue -->
<!-- 公益捐赠提交成功 modal。
     订单号 + RouterLink 跳 /orders + 关闭按钮。
     内部包 <Transition name="fade">,保持与原 view 视觉一致。
     接收 show / result,emit close。 -->

<script setup>
import { RouterLink } from "vue-router";

defineProps({
  show: { type: Boolean, required: true },
  result: { type: Object, default: null },
});

defineEmits(["close"]);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="success-modal-overlay"
      @click.self="$emit('close')"
    >
      <div
        class="success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-success-title"
        aria-live="polite"
      >
        <button type="button" class="success-modal-close" @click="$emit('close')" aria-label="关闭成功提示">
          <span class="material-symbols-outlined">close</span>
        </button>
        <div class="success-modal-icon">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <p class="success-modal-eyebrow">提交成功</p>
        <h3 id="donation-success-title" class="success-modal-title">
          {{ result?.message }}
        </h3>
        <p class="success-modal-text">
          服务单号:{{ result?.orderId }}
        </p>
        <div class="success-modal-actions">
          <RouterLink
            v-if="result?.syncedToOrders"
            to="/orders"
            class="success-modal-link"
          >
            前往服务记录
          </RouterLink>
          <button type="button" class="success-modal-secondary" @click="$emit('close')">
            继续浏览项目
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.success-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 20, 0.45);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 30;
}

.success-modal {
  width: min(100%, 460px);
  position: relative;
  background: #f8f4ec;
  border-radius: 28px;
  padding: 32px 28px 28px;
  box-shadow: 0 24px 80px rgba(16, 24, 20, 0.18);
  display: grid;
  gap: 14px;
  text-align: center;
}

.success-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(21, 66, 18, 0.08);
  color: #154212;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.success-modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto;
  border-radius: 50%;
  background: rgba(21, 66, 18, 0.1);
  color: #154212;
  display: grid;
  place-items: center;
}

.success-modal-icon .material-symbols-outlined {
  font-size: 34px;
}

.success-modal-eyebrow {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2d5a27;
}

.success-modal-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.45rem;
  line-height: 1.4;
  color: var(--ink-900);
}

.success-modal-text {
  margin: 0;
  font-size: 0.92rem;
  color: var(--ink-600);
}

.success-modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 6px;
}

.success-modal-link,
.success-modal-secondary {
  min-height: 48px;
  border-radius: 14px;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  font-size: 0.92rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.success-modal-link {
  background: linear-gradient(135deg, #154212, #2d5a27);
  color: white;
  box-shadow: 0 10px 30px rgba(21, 66, 18, 0.22);
}

.success-modal-secondary {
  background: rgba(21, 66, 18, 0.08);
  color: #154212;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

- [ ] **Step 12.2: 验证 import 与编译**

```bash
cd frontend && npm run dev
```

打开 `/charity` 路由,确认 Vite 无报错。

- [ ] **Step 12.3: 提交**

```bash
git add frontend/src/components/client/charity/CharitySuccessModal.vue
git commit -m "refactor(charity): extract CharitySuccessModal

Wraps Transition + overlay + dialog. Receives show/result, emits close."
```

---

## Task 13: 抽出 `CharityProcessSection.vue`

**Files:**
- Create: `frontend/src/components/client/charity/CharityProcessSection.vue`

四步流程。纯展示。

- [ ] **Step 13.1: 创建文件**

创建 `frontend/src/components/client/charity/CharityProcessSection.vue`:

```vue
<!-- CharityProcessSection.vue -->
<!-- 公益捐赠的四步流程展示。
     纯展示组件,接收 steps,无交互无 emit。 -->

<script setup>
defineProps({
  steps: { type: Array, required: true },
});
</script>

<template>
  <section class="process-section">
    <h2 class="process-title">简单的四步,完成善意的传递</h2>
    <div class="process-steps">
      <div v-for="(step, index) in steps" :key="index" class="process-step">
        <div class="step-icon">
          <span class="material-symbols-outlined">{{ step.icon }}</span>
        </div>
        <h4>{{ step.title }}</h4>
        <p>{{ step.desc }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.process-section {
  padding: 96px 0;
  text-align: center;
}

.process-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 800;
  color: var(--ink-900);
  margin: 0 0 64px;
}

.process-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 48px;
  position: relative;
}

.process-steps::before {
  content: "";
  position: absolute;
  top: 48px;
  left: 15%;
  right: 15%;
  height: 2px;
  background: linear-gradient(90deg, rgba(45, 90, 39, 0.1), rgba(45, 90, 39, 0.3), rgba(45, 90, 39, 0.1));
  z-index: -1;
}

.process-step {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-icon {
  width: 96px;
  height: 96px;
  background: #eae8e4;
  color: #154212;
  border-radius: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.process-step:hover .step-icon {
  background: #154212;
  color: white;
  transform: rotate(6deg);
}

.step-icon .material-symbols-outlined {
  font-size: 36px;
}

.process-step h4 {
  font-weight: 700;
  color: var(--ink-900);
  margin: 0 0 8px;
}

.process-step p {
  font-size: 0.875rem;
  color: var(--ink-600);
  padding: 0 16px;
  margin: 0;
}

@media (max-width: 1024px) {
  .process-steps {
    grid-template-columns: repeat(2, 1fr);
  }

  .process-steps::before {
    display: none;
  }
}

@media (max-width: 768px) {
  .process-steps {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 13.2: 验证 import 与编译**

```bash
cd frontend && npm run dev
```

打开 `/charity` 路由,确认 Vite 无报错。

- [ ] **Step 13.3: 提交**

```bash
git add frontend/src/components/client/charity/CharityProcessSection.vue
git commit -m "refactor(charity): extract CharityProcessSection

Four-step process display. Pure presentation, receives steps."
```

---

## Task 14: 抽出 `CharityTrustSection.vue`

**Files:**
- Create: `frontend/src/components/client/charity/CharityTrustSection.vue`

信任背书。纯展示。

- [ ] **Step 14.1: 创建文件**

创建 `frontend/src/components/client/charity/CharityTrustSection.vue`:

```vue
<!-- CharityTrustSection.vue -->
<!-- 公益平台的信任背书区。
     标题 + 承诺文案 + 4 个 feature 卡片。
     纯展示组件,接收 features,无交互无 emit。 -->

<script setup>
defineProps({
  features: { type: Array, required: true },
});
</script>

<template>
  <section class="trust-section">
    <div class="page-width trust-content">
      <div class="trust-text">
        <h2>每一份捐赠<br />都有迹可循</h2>
        <p>GreenArchive 致力于建立极致透明的物资捐赠流程,让捐赠人放心,让受助人暖心。</p>
        <button type="button" class="btn-trust">查看平台透明度报告</button>
      </div>
      <div class="trust-features">
        <div v-for="feature in features" :key="feature.title" class="trust-feature">
          <span class="material-symbols-outlined">{{ feature.icon }}</span>
          <h5>{{ feature.title }}</h5>
          <p>{{ feature.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.trust-section {
  color: white;
  padding: 96px 0;
}

.trust-content {
  background: linear-gradient(180deg, #154212 0%, #124012 100%);
  border-radius: 48px;
  border: 1px solid rgba(191, 237, 209, 0.12);
  box-shadow: 0 30px 80px rgba(6, 28, 9, 0.22);
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 56px;
  align-items: start;
  padding: 56px 64px;
  overflow: hidden;
}

.trust-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 560px;
  padding-top: 8px;
}

.trust-text h2 {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.2;
  color: #f8fff8;
  margin: 0 0 24px;
}

.trust-text p {
  font-size: 1.125rem;
  line-height: 1.8;
  color: rgba(231, 245, 234, 0.82);
  margin: 0 0 32px;
}

.btn-trust {
  padding: 16px 32px;
  background: #bfedd1;
  color: #002113;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-trust:hover {
  background: #a4d1b6;
  box-shadow: 0 8px 24px rgba(191, 237, 209, 0.3);
}

.trust-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.trust-feature {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  padding: 32px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 18px 40px rgba(3, 31, 9, 0.18);
}

.trust-feature .material-symbols-outlined {
  color: #c6ebd2;
  font-size: 24px;
  margin-bottom: 16px;
}

.trust-feature h5 {
  color: #f4fff6;
  font-weight: 700;
  margin: 0 0 8px;
}

.trust-feature p {
  font-size: 0.75rem;
  color: rgba(220, 239, 225, 0.78);
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 1024px) {
  .trust-content {
    grid-template-columns: 1fr;
    gap: 40px;
    padding: 48px 40px;
  }

  .trust-features {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .trust-section {
    padding: 72px 0;
  }

  .trust-content {
    border-radius: 32px;
    padding: 36px 24px;
    gap: 32px;
  }

  .trust-text h2 {
    font-size: 2.1rem;
  }

  .trust-text p {
    font-size: 1rem;
    margin-bottom: 24px;
  }

  .trust-feature {
    padding: 28px 24px;
  }
}
</style>
```

- [ ] **Step 14.2: 验证 import 与编译**

```bash
cd frontend && npm run dev
```

打开 `/charity` 路由,确认 Vite 无报错。

- [ ] **Step 14.3: 提交**

```bash
git add frontend/src/components/client/charity/CharityTrustSection.vue
git commit -m "refactor(charity): extract CharityTrustSection

Trust section. Pure presentation, receives features."
```

---

## Task 15: 重写 `CharityPage.vue` 为编排器

**Files:**
- Modify: `frontend/src/views/client/CharityPage.vue`(1894 行 → ~200 行)

把所有 panel / composable / 常量接入 view。彻底删除原 `<script setup>` 的所有业务 ref / 函数 / mock 数据,以及原 `<style scoped>` 的所有非布局样式。

- [ ] **Step 15.1: 重写整个文件**

**完整替换** `frontend/src/views/client/CharityPage.vue` 内容为以下编排版:

```vue
<!-- CharityPage.vue -->
<!-- 公益捐赠页(view 层)。
     只做编排:实例化 composables、把 props/emits 转发到 panel、
     协调选中项目后滚动到 detail 区。所有业务状态 / 业务逻辑 / 模板细节
     都拆到 composables + components/client/charity/。
     view 只保留布局容器、响应式断点、和两段协调函数。 -->

<script setup>
import { ref } from "vue";

import { useRevealOnScroll } from "@/composables/useRevealOnScroll";
import { useCharityFilters } from "@/composables/useCharityFilters";
import { useDonationForm } from "@/composables/useDonationForm";
import { useDonationSubmit } from "@/composables/useDonationSubmit";
import {
  projects,
  categories,
  urgencyOptions,
  regionOptions,
  processSteps,
  trustFeatures,
} from "@/utils/charityConstants";

import CharityHeroPanel from "@/components/client/charity/CharityHeroPanel.vue";
import CharityProjectFilters from "@/components/client/charity/CharityProjectFilters.vue";
import CharityProjectsGrid from "@/components/client/charity/CharityProjectsGrid.vue";
import CharityDetailPanel from "@/components/client/charity/CharityDetailPanel.vue";
import CharityDonationForm from "@/components/client/charity/CharityDonationForm.vue";
import CharitySuccessModal from "@/components/client/charity/CharitySuccessModal.vue";
import CharityProcessSection from "@/components/client/charity/CharityProcessSection.vue";
import CharityTrustSection from "@/components/client/charity/CharityTrustSection.vue";

const pageRef = ref(null);
useRevealOnScroll(pageRef);

const filters = useCharityFilters(projects);
const donationForm = useDonationForm();
const submit = useDonationSubmit({
  donationForm: donationForm.donationForm,
  getSelectedProject: () => filters.selectedProject.value,
  onSuccess: donationForm.resetForm,
});

function onSelectProject(project) {
  filters.selectProject(project);
  setTimeout(() => {
    document.getElementById("donation-detail")?.scrollIntoView({ behavior: "smooth" });
  }, 100);
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
</script>

<template>
  <main ref="pageRef" class="charity-page" data-reveal>
    <CharityHeroPanel
      @projects-click="() => scrollToSection('charity-projects')"
      @process-click="() => scrollToSection('charity-process')"
    />

    <section id="charity-projects" class="page-width projects-section">
      <div class="section-header">
        <h2>当前募集项目</h2>
        <p>选择你想支持的项目,查看需求物资后发起捐赠</p>
      </div>
      <div class="filter-section">
        <CharityProjectFilters
          :categories="categories"
          :region-options="regionOptions"
          :urgency-options="urgencyOptions"
          :selected-category="filters.selectedCategory.value"
          :selected-region="filters.selectedRegion.value"
          :selected-urgency="filters.selectedUrgency.value"
          :search-keyword="filters.searchKeyword.value"
          @update:selected-category="filters.setSelectedCategory"
          @update:selected-region="filters.setSelectedRegion"
          @update:selected-urgency="filters.setSelectedUrgency"
          @update:search-keyword="filters.setSearchKeyword"
        />
      </div>
      <CharityProjectsGrid
        :projects="filters.filteredProjects.value"
        :selected-project-id="filters.selectedProject.value?.id ?? null"
        @select-project="onSelectProject"
      />
    </section>

    <section
      v-if="filters.selectedProject.value"
      id="donation-detail"
      class="page-width detail-section"
    >
      <div class="detail-content">
        <CharityDetailPanel :project="filters.selectedProject.value" />
        <div class="detail-right">
          <CharityDonationForm
            :donation-form="donationForm.donationForm.value"
            :submit-loading="submit.submitLoading.value"
            :error-text="submit.errorText.value"
            :selected-project-title="filters.selectedProject.value.title"
            @update:item-type="(v) => (donationForm.donationForm.value.itemType = v)"
            @update:item-name="(v) => (donationForm.donationForm.value.itemName = v)"
            @update:quantity="(v) => (donationForm.donationForm.value.quantity = v)"
            @update:weight="(v) => (donationForm.donationForm.value.weight = v)"
            @update:condition="(v) => (donationForm.donationForm.value.condition = v)"
            @update:logistics="(v) => (donationForm.donationForm.value.logistics = v)"
            @update:donor-name="(v) => (donationForm.donationForm.value.donorName = v)"
            @update:phone="(v) => (donationForm.donationForm.value.phone = v)"
            @submit="submit.handleSubmit"
          />
        </div>
      </div>
    </section>

    <CharitySuccessModal
      :show="!!submit.submitResult.value"
      :result="submit.submitResult.value"
      @close="submit.closeSuccessModal"
    />

    <CharityProcessSection id="charity-process" class="page-width" :steps="processSteps" />
    <CharityTrustSection :features="trustFeatures" />
  </main>
</template>

<style scoped>
/* view 只保留布局 / 容器 / 响应式。所有 panel 自带 scoped 样式。 */

.charity-page {
  min-height: 100vh;
}

.page-width {
  /* 占位:全局 .page-width 已在布局层定义,这里不重复;若发现丢失,从此处加回 */
}

.projects-section {
  padding: 64px 0;
}

.section-header {
  margin-bottom: 40px;
}

.section-header h2 {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 800;
  color: var(--ink-900);
  margin: 0 0 8px;
}

.section-header p {
  color: var(--ink-600);
  margin: 0;
}

.filter-section {
  margin-bottom: 40px;
}

.detail-section {
  background: #efeeea;
  padding: 80px 0;
}

.detail-content {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 48px;
  align-items: start;
}

.detail-right {
  position: sticky;
  top: 112px;
}

@media (max-width: 1024px) {
  .detail-content {
    grid-template-columns: 1fr;
  }

  .detail-right {
    position: static;
  }
}
</style>
```

> ⚠️ `.page-width` 类在原 view 是普通的全局类,用于限定内容宽度。如果 `frontend/src/styles/` 或 layout 中没有这个类的全局定义,需要在 view 的 `<style scoped>` 内补回(例如 `max-width: 1200px; margin: 0 auto; padding: 0 24px;`)。先打开 `/charity` 路由检查布局是否居中,如果不居中,补回完整定义。

- [ ] **Step 15.2: 验证 dev server 编译**

```bash
cd frontend && npm run dev
```

打开 `/charity` 路由。**期望**:
- hero 区正常渲染,无控制台错误
- 两个 CTA 按钮可点击,且点击后分别滚到 `charity-projects` / `charity-process`
- 9 个项目卡渲染(原代码是 3 个,但 mock 数据是 3 个,经过筛选默认"全部需求"显示全部)

> 注:项目卡实际数量取决于 `projects` 常量(3 个 mock 项目),不是 9 个。

- [ ] **Step 15.3: 全功能验证清单**

按 spec 的功能验证清单逐项验证:

| 场景 | 操作 | 期望 |
|---|---|---|
| 首次访问 | 打开 `/charity` | hero + 3 张项目卡 + 四步流程 + 信任背书全部可见 |
| 类目筛选 | 点 "衣物" | 项目卡实时缩减为包含 "衣物" 的项目 |
| 区域筛选 | 选 "西部地区" | 项目卡实时缩减为西部地区 |
| 紧急度筛选 | 选 "紧急募集中" | 只剩 daysLeft ≤ 7 的项目 |
| 搜索 | 输入 "大凉山" | 只剩大凉山项目 |
| 选中踢出 | 选中 "大凉山" 后改类目到 "图书" | selectedProject 自动清空,detail 区消失 |
| 点击捐赠 | 点项目卡 "我要捐赠" | 卡片标 selected,detail 出现,100ms 后滚到 detail |
| 提交空表单 | 不填任何字段点提交 | 错误条显示第一条校验提示 |
| 提交合法表单 | 填齐字段点提交 | 提交按钮变 "提交中...",成功后弹 success modal,表单 reset |
| success modal RouterLink | 点 "前往服务记录" | 跳 `/orders` |
| success modal 关闭 | 点 "继续浏览项目" | modal 关闭,留在页面 |
| 滚动 reveal | 滚到不同 section | 各 section 依序 reveal |
| 响应式 ≤ 1024px | 缩窄窗口 | detail 两栏变单列,trust 单列,process 2 列 |
| 响应式 ≤ 768px | 进一步缩窄 | 项目卡单列,filter 垂直堆叠,process 单列 |

任何一项不通过,定位修复:
- CSS 漏搬 → 回到对应 panel task 补全
- props 拼写错 → view 对应 `:prop` 改对
- emit 拼写错 → 对应 panel 的 `defineEmits` 与 view 的 `@event` 名字对齐
- 滚动无效 → 检查 `id` 是否拼写正确
- 校验失败 → 检查 `getDonationValidationMessage` 入参类型

- [ ] **Step 15.4: 验证成功后提交**

```bash
git add frontend/src/views/client/CharityPage.vue
git commit -m "refactor(charity): rewrite CharityPage as thin orchestrator (1894 -> ~200 lines)

View now only:
  - instantiates 3 composables + 8 panel components
  - forwards props/emits
  - owns page-level scrollToSection + onSelectProject coordination
  - keeps layout container + responsive breakpoints

All business state / validation / submit / mock data live in composables
or charityConstants.js. All section markup + scoped CSS live in
components/client/charity/. Hero CTA click events flow via emit instead
of onMounted DOM reflection.

Closes the 'CharityPage is 1894 lines' tech debt. Follows the same
decomposition pattern as AppointmentPage (commit 8baf71f)."
```

---

## Task 16: 全局清理与最终验证

- [ ] **Step 16.1: 检查死代码 / 死 import**

在仓库根目录跑:

```bash
cd frontend && npx eslint --no-eslintrc src/views/client/CharityPage.vue 2>&1 | head -20 || echo "eslint not configured, skipping"
```

(此项目无 ESLint 配置,期望 "eslint not configured, skipping"。)

替代:手工 grep:

```bash
cd frontend && grep -rn "from.*charityConstants\|charityValidation\|useCharityFilters\|useDonationForm\|useDonationSubmit\|CharityHeroPanel\|CharityProjectFilters\|CharityProjectCard\|CharityProjectsGrid\|CharityDetailPanel\|CharityDonationForm\|CharitySuccessModal\|CharityProcessSection\|CharityTrustSection" src/
```

Expected: 仅 `CharityPage.vue` 与各新文件出现引用,无其他地方意外 import。

```bash
cd frontend && grep -n "showDonationForm\|cleanupHeroActions\|handleProjectsClick\|handleProcessClick\|getProjectUrgency\|createDefaultDonationForm\|validateDonationForm" src/views/client/CharityPage.vue
```

Expected: 无任何输出(全部已迁出)。

- [ ] **Step 16.2: 检查死 CSS**

```bash
cd frontend && wc -l src/views/client/CharityPage.vue src/components/client/charity/*.vue
```

Expected:
- `CharityPage.vue`:约 200 行(允许 180-230 浮动)
- 各 panel 文件:每个 50-350 行不等
- 总和与原 1894 行大致相等,只是分散

- [ ] **Step 16.3: 全局回归**

按 Task 15 Step 15.3 的验证清单再跑一次,确认没有回归。

- [ ] **Step 16.4: 视觉回归**

聚焦以下视觉点(与原 view 对照):

- hero 按钮 hover 阴影增强 / translateY
- 项目卡 hover translateY(-4px) + 阴影增强
- 项目卡 `.selected` 边框高亮
- 项目卡捐赠按钮 hover 翻色
- 进度条宽度绑定 `progress%`
- 物流按钮 active 翻色
- 提交按钮 hover translateY(-2px) + 阴影增强,disabled 状态禁用
- success modal 居中 + 背景模糊
- 响应式断点两档:`max-width: 1024px` / `768px`
- `material-symbols-outlined` 图标字体正常显示

任何视觉差异,回到对应 panel task 补 CSS。

- [ ] **Step 16.5: 提交(若有清理)**

如果在 Step 16.1-16.4 发现死代码 / 残留 import / 视觉修复,做一次 commit:

```bash
git add frontend/src/views/client/CharityPage.vue frontend/src/components/client/charity/ frontend/src/composables/ frontend/src/utils/
git commit -m "chore(charity): post-split cleanup and visual regression fixes"
```

如果无任何修复,跳过此 commit。

---

## 风险与注意(从 spec 沿用,执行时随时回查)

- **scoped CSS 中的 `.material-symbols-outlined`**:若发现图标字体未渲染,优先 grep 全局 CSS 是否有该规则;没有的话在用图标的 panel 加 `:deep(.material-symbols-outlined)`。
- **`getSelectedProject` getter 而非值**:`useDonationSubmit` 入参里用
  `() => filters.selectedProject.value`,避免闭包捕获陈旧值。**不要**改写为直接传 ref。
- **`useDonationSubmit` 与 `useDonationForm` 解耦**:view 在 useDonationSubmit
  入参里把 `donationForm.donationForm` 注入;成功后通过 `onSuccess` 回调
  调 `donationForm.resetForm()`。**不要**让 `useDonationSubmit` 直接 import
  `useDonationForm`。
- **view 行数目标 ~200**:允许 180-230 浮动,不要为了"完美 ≤ 200"硬拆反而把
  view 拆得过碎。
- **重构期间不要破坏 UX**:100ms 滚动延时必须保留;`watch(filteredProjects)`
  的 `immediate: true` 不能丢;hero CTA 滚动目标不能错。
- **`@import` Material Symbols 字体**:若原 view 顶部有 `@import
  url("https://fonts.googleapis.com/...")`,**全局 CSS 中若已存在该规则**
  应删除 view 内的 import;否则跟着 `CharityHeroPanel` 一起搬入其 `<style>` 顶部。