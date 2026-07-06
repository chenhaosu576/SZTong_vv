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