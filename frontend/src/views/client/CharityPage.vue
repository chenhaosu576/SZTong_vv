<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { submitDonation as submitDonationRequest } from "../../mock/clientApi";

const selectedCategory = ref("全部需求");
const selectedRegion = ref("全国");
const selectedUrgency = ref("全部");
const searchKeyword = ref("");
const selectedProject = ref(null);
const showDonationForm = ref(false);
const submitLoading = ref(false);
const errorText = ref("");
const submitResult = ref(null);
let cleanupHeroActions = null;

function createDefaultDonationForm() {
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

const donationForm = ref(createDefaultDonationForm());

const categories = ["全部需求", "图书", "衣物", "文具", "家居", "其他"];
const urgencyOptions = ["全部", "紧急募集中", "常态募集中"];
const urgentDaysThreshold = 7;

const projects = [
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
    description: "瓦吾小学位于海拔2700米的山巅，冬长夏短，温差极大。冬季早晨气温常在零下，许多孩子穿着单薄的布鞋和外套步行数公里上学。我们希望汇聚社会力量，为山区的孩子们送去温暖。",
    needs: [
      { title: "儿童冬装外套", desc: "标准：8成新以上，无破损，男女不限" },
      { title: "保暖棉鞋 / 运动鞋", desc: "标准：全新或近全新，码数28-38码" },
      { title: "加厚袜 / 手套 / 围巾", desc: "标准：仅限全新" },
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
    urgentNeeds: "急需：青少年绘本 / 文具盒",
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
    urgentNeeds: "急需：烧水壶 / 电风扇 / 梯子",
    progress: 91,
    current: 182,
    total: 200,
    unit: "件",
    daysLeft: 3,
    beneficiary: "社区困难家庭",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhgvU0cLJleG-KawwH5lajDo83Pp50_vmCcVrYuk2zJwomDpIzxFTkrZy8KuqAuLdHnT_-xmiE2DodbiW7Tld_yrexaDnhdbVhn4V-ukUtH9mAvJ3HCXdDfPu3jKF3WyFvA2yAERGVW0LIfwcxETX1xbANp_ihHA52UYVS8UW6_ITa_Q5KuoWy2l3qOPWXjkH5Pumj_vXh4GCisGw8t858XYjUrT8dsYRAgKyziIdpkLMMX_TYh7AJX4S0KrSfe5iouhQTtTOqNTI",
  },
];

const regionOptions = ["全国", ...new Set(projects.map((project) => project.region))];

function getProjectUrgency(project) {
  if (project.daysLeft !== null && project.daysLeft <= urgentDaysThreshold) {
    return "紧急募集中";
  }

  return "常态募集中";
}

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
      showDonationForm.value = false;
    }
  },
  { immediate: true },
);

const processSteps = [
  { icon: "search", title: "浏览项目", desc: "查看当前正在募集的公益需求" },
  { icon: "check_circle", title: "选择项目", desc: "找到最匹配您手中物资的受助方向" },
  { icon: "edit_document", title: "填写信息", desc: "登记捐赠详情，选择物流配送方式" },
  { icon: "send", title: "完成提交并等待反馈", desc: "物资送达后您将收到实时签收通知" },
];

const trustFeatures = [
  { icon: "fact_check", title: "项目真实性审核", desc: "所有发布项目均经过三方机构实地核验与平台二次风控审核。" },
  { icon: "track_changes", title: "物资去向追踪", desc: "从出库、运输到最终发放，每一个节点均同步数字轨迹。" },
  { icon: "rate_review", title: "如何查看签收反馈", desc: "发放完成后，平台会上传受助人签收单及物资分发纪实现场照片。" },
  { icon: "gavel", title: "合规信息披露", desc: "平台财务状况与审计报告定期向公众开放，接受社会化监督。" },
];

function resetSubmitState() {
  errorText.value = "";
  submitResult.value = null;
}

function closeSuccessModal() {
  submitResult.value = null;
}

function validateDonationForm() {
  if (!selectedProject.value) {
    return "请先选择一个公益项目后再提交。";
  }

  if (!String(donationForm.value.itemName || "").trim()) {
    return "请填写具体物品名称。";
  }

  const quantity = String(donationForm.value.quantity || "").trim();
  const weight = String(donationForm.value.weight || "").trim();
  if (!quantity && !weight) {
    return "请至少填写数量或预估重量。";
  }

  if (!String(donationForm.value.donorName || "").trim()) {
    return "请填写捐赠者姓名。";
  }

  const phone = String(donationForm.value.phone || "").trim();
  if (!phone) {
    return "请填写联系电话。";
  }

  if (!/^1\d{10}$/.test(phone)) {
    return "请输入有效的 11 位手机号。";
  }

  return "";
}

function selectProject(project) {
  selectedProject.value = project;
  showDonationForm.value = true;
  resetSubmitState();
  setTimeout(() => {
    document.getElementById("donation-detail")?.scrollIntoView({ behavior: "smooth" });
  }, 100);
}

function handleProjectsClick() {
  scrollToSection("charity-projects");
}

function handleProcessClick() {
  scrollToSection("charity-process");
}

onMounted(() => {
  const heroActions = document.querySelector(".hero-actions");
  const primaryButton = heroActions?.querySelector(".btn-primary");
  const secondaryButton = heroActions?.querySelector(".btn-secondary");

  primaryButton?.addEventListener("click", handleProjectsClick);
  secondaryButton?.addEventListener("click", handleProcessClick);

  cleanupHeroActions = () => {
    primaryButton?.removeEventListener("click", handleProjectsClick);
    secondaryButton?.removeEventListener("click", handleProcessClick);
  };
});

onBeforeUnmount(() => {
  cleanupHeroActions?.();
});

async function submitDonation() {
  if (submitLoading.value) {
    return;
  }

  resetSubmitState();
  const validationMessage = validateDonationForm();
  if (validationMessage) {
    errorText.value = validationMessage;
    return;
  }

  submitLoading.value = true;

  try {
    const payload = {
      projectId: selectedProject.value.id,
      projectTitle: selectedProject.value.title,
      projectLocation: selectedProject.value.location,
      itemType: String(donationForm.value.itemType || "").trim(),
      itemName: String(donationForm.value.itemName || "").trim(),
      quantity: String(donationForm.value.quantity || "").trim(),
      weight: String(donationForm.value.weight || "").trim(),
      condition: String(donationForm.value.condition || "").trim(),
      logistics: String(donationForm.value.logistics || "").trim(),
      donorName: String(donationForm.value.donorName || "").trim(),
      phone: String(donationForm.value.phone || "").trim(),
    };
    const result = await submitDonationRequest(payload);

    submitResult.value = {
      message: "捐赠信息提交成功，已同步到服务记录。",
      orderId: result.orderId,
      syncedToOrders: result.syncedToOrders,
    };
    donationForm.value = createDefaultDonationForm();
  } catch (error) {
    errorText.value = "提交失败，请稍后重试。";
  } finally {
    submitLoading.value = false;
  }
}
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
</script>

<template>
  <main class="charity-page">
    <!-- Hero Banner -->
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
            选择一个正在募集的公益项目，完成本次捐赠，让每一份善意精准送达。
          </p>
          <div class="hero-actions">
            <button class="btn-primary">查看募集项目</button>
            <button class="btn-secondary">了解捐赠流程</button>
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

    <!-- Project Listing -->
    <section id="charity-projects" class="page-width projects-section">
      <div class="section-header">
        <h2>当前募集项目</h2>
        <p>选择你想支持的项目，查看需求物资后发起捐赠</p>
      </div>
      <div class="filter-section">
        <div class="filter-bar">
          <div class="filter-categories">
            <button
              v-for="cat in categories"
              :key="cat"
              :class="['filter-btn', selectedCategory === cat ? 'active' : '']"
              @click="selectedCategory = cat"
            >
              {{ cat }}
            </button>
          </div>
          <div class="filter-controls">
            <select v-model="selectedRegion" class="filter-select">
              <option v-for="region in regionOptions" :key="region" :value="region">
                {{ region }}
              </option>
            </select>
            <select v-model="selectedUrgency" class="filter-select">
              <option v-for="urgency in urgencyOptions" :key="urgency" :value="urgency">
                {{ urgency }}
              </option>
            </select>
            <div class="search-box">
              <span class="material-symbols-outlined">search</span>
              <input v-model.trim="searchKeyword" type="text" placeholder="搜索项目或机构名称" />
            </div>
          </div>
        </div>
      </div>
      <div v-if="filteredProjects.length" class="projects-grid">
        <div
          v-for="project in filteredProjects"
          :key="project.id"
          :class="['project-card', selectedProject?.id === project.id ? 'selected' : '']"
        >
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
                <span v-if="project.daysLeft" class="meta-item">
                  <span class="material-symbols-outlined">schedule</span> 剩余 {{ project.daysLeft }} 天
                </span>
                <span v-else class="meta-item">
                  <span class="material-symbols-outlined">schedule</span> 常态募集
                </span>
                <span class="meta-beneficiary">受助: {{ project.beneficiary }}</span>
              </div>
            </div>
            <div class="project-actions">
              <button
                :class="['btn-donate', selectedProject?.id === project.id ? 'active' : '']"
                @click="selectProject(project)"
              >
                <span class="material-symbols-outlined">edit_square</span>
                {{ selectedProject?.id === project.id ? "正在填写" : "我要捐赠" }}
              </button>
              <a href="#" class="btn-detail">详情</a>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="projects-empty">
        暂无符合条件的公益项目，请尝试调整筛选条件
      </div>
    </section>

    <!-- Detail & Donation Form -->
    <section v-if="showDonationForm && selectedProject" id="donation-detail" class="detail-section">
      <div class="page-width detail-content">
        <div class="detail-left">
          <div class="detail-card">
            <h2>{{ selectedProject.title }}</h2>
            <div class="detail-meta">
              <span><span class="material-symbols-outlined">location_on</span> {{ selectedProject.location }}</span>
              <span><span class="material-symbols-outlined">groups</span> 受助: {{ selectedProject.beneficiary }}</span>
            </div>
            <p>{{ selectedProject.description }}</p>
          </div>

          <div v-if="selectedProject.needs" class="detail-card needs-card">
            <h4><span class="material-symbols-outlined">fact_check</span> 当前具体需求</h4>
            <div class="needs-grid">
              <div v-for="need in selectedProject.needs" :key="need.title" class="need-item">
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
                <p class="logistics-desc">支持快递寄送至平台转运仓，或预约平台合作物流上门取件。上海、成都地区支持到指定社区站点投递。</p>
              </div>
              <div>
                <p class="logistics-title">全程透明追踪</p>
                <p class="logistics-desc">所有物流环节通过区块链存证，捐赠人可随时查看物资分发照片及受助学校签收单据。</p>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-right">
          <div class="form-card">
            <h3>填写你的捐赠信息</h3>
            <div class="form-notice">
              <p class="notice-title">正在为：{{ selectedProject.title }} 发起捐赠</p>
              <p class="notice-subtitle">支持类别：衣物、鞋类、学习用品</p>
            </div>

            <div class="form-alert">
              <span class="material-symbols-outlined">info</span>
              <div>
                <p class="alert-title">捐赠特别提醒</p>
                <p class="alert-text">接收：冬衣、棉鞋、围巾。不接收：破损物品、成人正装、内衣裤。</p>
              </div>
            </div>

            <div
              v-if="errorText"
              class="submit-feedback is-error"
              role="alert"
              aria-live="polite"
            >
              <span class="material-symbols-outlined">
                error
              </span>
              <div class="submit-feedback-content">
                <p class="submit-feedback-title">
                  {{ errorText }}
                </p>
              </div>
            </div>

            <form @submit.prevent="submitDonation" class="donation-form">
              <div class="form-group">
                <label>捐赠物品类型</label>
                <select v-model="donationForm.itemType">
                  <option>冬装外套</option>
                  <option>裤装</option>
                  <option>鞋类</option>
                  <option>配饰 (围巾/手套)</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>具体物品名称</label>
                  <input v-model="donationForm.itemName" type="text" placeholder="如：加厚羽绒服" />
                </div>
                <div class="form-group-split">
                  <div class="form-group">
                    <label>数量</label>
                    <input v-model="donationForm.quantity" type="number" placeholder="件数" />
                  </div>
                  <div class="form-group">
                    <label>预估重量</label>
                    <div class="input-suffix">
                      <input v-model="donationForm.weight" type="number" placeholder="重量" />
                      <span>kg</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>新旧程度</label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input v-model="donationForm.condition" type="radio" value="全新" />
                    <span>全新</span>
                  </label>
                  <label class="radio-label">
                    <input v-model="donationForm.condition" type="radio" value="8成新以上" />
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
                    @click="donationForm.logistics = '快递寄送'"
                  >
                    <span class="material-symbols-outlined">local_shipping</span> 快递寄送
                  </button>
                  <button
                    type="button"
                    :class="['logistics-btn', donationForm.logistics === '预约上门' ? 'active' : '']"
                    @click="donationForm.logistics = '预约上门'"
                  >
                    <span class="material-symbols-outlined">hail</span> 预约上门
                  </button>
                  <button
                    type="button"
                    :class="['logistics-btn', donationForm.logistics === '站点投递' ? 'active' : '']"
                    @click="donationForm.logistics = '站点投递'"
                  >
                    <span class="material-symbols-outlined">move_to_inbox</span> 站点投递
                  </button>
                </div>
              </div>

              <div class="form-group">
                <input v-model="donationForm.donorName" type="text" placeholder="捐赠者姓名" />
              </div>
              <div class="form-group">
                <input v-model="donationForm.phone" type="tel" placeholder="联系电话" />
              </div>

              <button type="submit" class="btn-submit" :disabled="submitLoading">
                {{ submitLoading ? "提交中..." : "提交捐赠信息" }}
              </button>
              <button type="button" class="btn-save">保存稍后填写</button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <Transition name="fade">
      <div
        v-if="submitResult"
        class="success-modal-overlay"
        @click.self="closeSuccessModal"
      >
        <div
          class="success-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="donation-success-title"
          aria-live="polite"
        >
          <button type="button" class="success-modal-close" @click="closeSuccessModal" aria-label="关闭成功提示">
            <span class="material-symbols-outlined">close</span>
          </button>
          <div class="success-modal-icon">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <p class="success-modal-eyebrow">提交成功</p>
          <h3 id="donation-success-title" class="success-modal-title">
            {{ submitResult.message }}
          </h3>
          <p class="success-modal-text">
            服务单号：{{ submitResult.orderId }}
          </p>
          <div class="success-modal-actions">
            <RouterLink
              v-if="submitResult.syncedToOrders"
              to="/orders"
              class="success-modal-link"
            >
              前往服务记录
            </RouterLink>
            <button type="button" class="success-modal-secondary" @click="closeSuccessModal">
              继续浏览项目
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Process Steps -->
    <section id="charity-process" class="page-width process-section">
      <h2 class="process-title">简单的四步，完成善意的传递</h2>
      <div class="process-steps">
        <div v-for="(step, index) in processSteps" :key="index" class="process-step">
          <div class="step-icon">
            <span class="material-symbols-outlined">{{ step.icon }}</span>
          </div>
          <h4>{{ step.title }}</h4>
          <p>{{ step.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Trust Section -->
    <section class="trust-section">
      <div class="page-width trust-content">
        <div class="trust-text">
          <h2>每一份捐赠<br />都有迹可循</h2>
          <p>GreenArchive 致力于建立极致透明的物资捐赠流程，让捐赠人放心，让受助人暖心。</p>
          <button class="btn-trust">查看平台透明度报告</button>
        </div>
        <div class="trust-features">
          <div v-for="feature in trustFeatures" :key="feature.title" class="trust-feature">
            <span class="material-symbols-outlined">{{ feature.icon }}</span>
            <h5>{{ feature.title }}</h5>
            <p>{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");

.charity-page {
  min-height: 100vh;
}

/* Hero Section */
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
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 48px;
}

.btn-primary,
.btn-secondary {
  padding: 16px 32px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1.125rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #154212, #2d5a27);
  color: white;
  box-shadow: 0 8px 24px rgba(21, 66, 18, 0.2);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(21, 66, 18, 0.3);
}

.btn-secondary {
  background: #eae8e4;
  color: var(--ink-900);
}

.btn-secondary:hover {
  background: #e4e2de;
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

/* Filter Section */
.filter-section {
  margin-bottom: 40px;
}

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

/* Projects Section */
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

/* Detail Section */
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

/* Form Card */
.detail-right {
  position: sticky;
  top: 112px;
}

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

/* Process Section */
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

/* Trust Section */
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

/* Responsive */
@media (max-width: 1024px) {
  .hero-content,
  .detail-content,
  .trust-content {
    grid-template-columns: 1fr;
  }

  .hero-image {
    height: 400px;
  }

  .detail-right {
    position: static;
  }

  .process-steps {
    grid-template-columns: repeat(2, 1fr);
  }

  .process-steps::before {
    display: none;
  }

  .trust-features {
    grid-template-columns: 1fr;
  }

  .trust-content {
    gap: 40px;
    padding: 48px 40px;
  }
}

@media (max-width: 768px) {
  .projects-grid {
    grid-template-columns: 1fr;
  }

  .filter-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: 100%;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .process-steps {
    grid-template-columns: 1fr;
  }

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
