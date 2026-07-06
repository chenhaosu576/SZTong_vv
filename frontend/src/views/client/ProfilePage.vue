<!--
  ProfilePage.vue
  个人中心主页 (薄编排层):
    持有 loading / errorText / profile 三态 ref + loadProfile async
    (inline 原 useProfileData 职责); 组合 2 个 composable
    (useProfileCheckIn / useProfileCalendar) 与 5 个 panel
    (Header / CheckInAlert / Calendar / ImpactDashboard / BottomSections);
    持有 3 个静态常量 (PROFILE_TASKS / ACHIEVEMENTS / ACTIVITIES);
    派生 levelProgress computed; 走 useRevealOnScroll 页面级 reveal。
-->

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRevealOnScroll } from "../../composables/useRevealOnScroll";
import { useProfileCheckIn } from "../../composables/useProfileCheckIn";
import { useProfileCalendar } from "../../composables/useProfileCalendar";
import { fetchProfileData } from "../../mock/clientApi";
import { fetchRealDate, fetchCalendarWithOrders } from "../../mock/timeApi";
import ProfileHeaderPanel from "../../components/client/profile/ProfileHeaderPanel.vue";
import ProfileImpactDashboard from "../../components/client/profile/ProfileImpactDashboard.vue";
import ProfileCheckInAlert from "../../components/client/profile/ProfileCheckInAlert.vue";
import ProfileCalendarSection from "../../components/client/profile/ProfileCalendarSection.vue";
import ProfileBottomSectionsPanel from "../../components/client/profile/ProfileBottomSectionsPanel.vue";

const pageRef = ref(null);
useRevealOnScroll(pageRef);

const loading = ref(true);
const errorText = ref("");
const profile = ref(null);

const {
  streakDays,
  guardianDays,
  hasCheckedInToday,
  isStreakAnimating,
  isGuardianDaysUpdating,
  showCheckInAlert,
  checkTodayCheckIn,
  triggerCheckIn,
  resetCheckInForTesting,
} = useProfileCheckIn();

const {
  calendarDays,
  highlightedDay,
  monthText,
  calendarSectionRef,
  setCalendarSectionRef,
  initializeCalendar,
  changeMonth,
  highlightToday,
} = useProfileCalendar();

async function handleCheckIn() {
  const result = triggerCheckIn();
  if (result?.checkedIn) {
    await highlightToday();
  }
}

function handleCalendarReady(el) {
  setCalendarSectionRef(el);
}

const selectedPeriod = ref('本月'); // 本周, 本月, 季度

const levelProgress = computed(() => {
  const points = profile.value?.points ?? 0;
  return Math.min(100, Math.max(0, (points % 1000) / 10));
});

async function loadProfile() {
  loading.value = true;
  errorText.value = "";
  try {
    const [profileData, realDate] = await Promise.all([
      fetchProfileData(),
      fetchRealDate(),
    ]);
    const calendarDate = realDate || {
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      day: new Date().getDate(),
    };
    const ordersData = await fetchCalendarWithOrders(calendarDate.year, calendarDate.month);

    profile.value = profileData;
    initializeCalendar(calendarDate, ordersData);
    checkTodayCheckIn();
  } catch (error) {
    errorText.value = "个人信息加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

onMounted(loadProfile);

const PROFILE_TASKS = [
  { name: "废纸回收挑战", progressText: "6.0 / 10 kg", progress: 60, reward: "完成后可获得 200 积分" },
  { name: "低碳出行达人", progressText: "12 / 20 次", progress: 40, reward: "完成后可获得 150 积分" },
];

const PROFILE_ACHIEVEMENTS = [
  { icon: "🌿", name: "节能专家", unlocked: true },
  { icon: "♻️", name: "堆肥先锋", unlocked: true },
  { icon: "🌳", name: "植树大使", unlocked: true },
  { icon: "💧", name: "节水卫士", unlocked: false },
];

const PROFILE_ACTIVITIES = [
  { icon: "📦", title: "成功回收快递纸箱", description: "于 虹桥路 128 号完成回收", points: "+45 pts", pointsVariant: "positive", time: "今天 14:20" },
  { icon: "🎁", title: "兑换超市优惠券", description: "消费 500 积分兑换全家满减券", points: "-500 pts", pointsVariant: "negative", time: "昨天 09:15" },
  { icon: "👍", title: "社区点赞达人", description: "您的科普文章获得了 50 个赞", points: "+100 pts", pointsVariant: "positive", time: "2023.10.24" },
  { icon: "🍴", title: "提交自带餐具打卡", description: "减少了一次性餐具使用", points: "+10 pts", pointsVariant: "positive", time: "2023.10.23" },
];

</script>

<template>
  <div ref="pageRef" class="profile-page">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="errorText" class="error-state">
      <p>{{ errorText }}</p>
      <button class="btn-retry" @click="loadProfile">重试</button>
    </div>

    <div v-else class="profile-content">
      <ProfileHeaderPanel
        :profile="profile"
        :guardian-days="guardianDays"
        :level-progress="levelProgress"
        :is-guardian-days-updating="isGuardianDaysUpdating"
        :streak-days="streakDays"
        :has-checked-in-today="hasCheckedInToday"
        :is-streak-animating="isStreakAnimating"
        :show-debug-reset="true"
        @check-in="handleCheckIn"
        @reset-check-in="resetCheckInForTesting"
      />

      <ProfileCheckInAlert :visible="showCheckInAlert" />

      <ProfileCalendarSection
        :calendar-days="calendarDays"
        :month-text="monthText"
        :highlighted-day="highlightedDay"
        @ready="handleCalendarReady"
        @change-month="changeMonth"
      />

      <ProfileImpactDashboard
        :points="profile.points"
        :selected-period="selectedPeriod"
        @update:selected-period="selectedPeriod = $event"
      />

      <ProfileBottomSectionsPanel
        :tasks="PROFILE_TASKS"
        :achievements="PROFILE_ACHIEVEMENTS"
        :activities="PROFILE_ACTIVITIES"
        @view-all-achievements="() => {/* TODO: 接入路由跳转 */}"
      />
    </div>
  </div>
</template>

<style scoped>
/* Base Styles */
.profile-page {
  min-height: 100vh;
  background: #fafaf5;
  color: #1a1c19;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(0, 100, 24, 0.2);
  border-top-color: #006418;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-retry {
  padding: 0.75rem 1.5rem;
  background: #006418;
  color: white;
  border: none;
  border-radius: 9999px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.3s;
}

.btn-retry:hover {
  opacity: 0.9;
}

.profile-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 4rem 2rem;
}

@media (max-width: 768px) {
  .profile-content {
    padding: 2rem 1rem;
  }
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
