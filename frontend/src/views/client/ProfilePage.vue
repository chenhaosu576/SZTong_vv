<!--
  ProfilePage.vue
  个人中心主页 (薄编排层):
    1) 持有 loading / errorText / profile 三个 ref + loadProfile async (inline 原 useProfileData 职责)
    2) 组合 useProfileCheckIn (打卡) + useProfileCalendar (日历) 两个 composable
    3) 挂载 5 个 panel: ProfileHeaderPanel / ProfileCheckInAlert / ProfileCalendarSection
       / ProfileImpactDashboard / ProfileBottomSectionsPanel
    4) 持有 PROFILE_TASKS / PROFILE_ACHIEVEMENTS / PROFILE_ACTIVITIES 三个静态常量
       (传给 ProfileBottomSectionsPanel)
    5) 派生 levelProgress computed (来自 profile.points)
    6) 页面级 reveal 滚动 (useRevealOnScroll)
  本文件不做: 头像 / 等级瓶子 / blur text / streak card / 图表数据 / 日历格子 / 任务 /
              成就 / 动态 模板 (全部由 panel 承担); 不再持有 avatar / bottle / blur / chart 相关 state。
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


// 计算等级进度百分比
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
      <!-- Header Section: 已迁入 ProfileHeaderPanel (avatar + blur text + bottle + streak card) -->
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

      <!-- Check-in Alert Modal -->
      <div v-if="showCheckInAlert" class="check-in-alert">
        <div class="alert-content">
          <span class="alert-icon">⚠️</span>
          <p class="alert-message">今日已打卡，明天再来吧！</p>
        </div>
      </div>

      <!-- Emission Reduction Calendar -->
      <section ref="calendarSectionRef" class="calendar-section">
        <div class="section-header">
          <h2 class="section-title">减排日历</h2>
          <div class="calendar-controls">
            <div class="legend">
              <div class="legend-item">
                <div class="legend-dot light"></div>
                <span>轻度</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot medium"></div>
                <span>中度</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot heavy"></div>
                <span>显著</span>
              </div>
            </div>
            <div class="month-nav">
              <button class="nav-btn" @click="changeMonth(-1)">‹</button>
              <span class="month-text">{{ monthText }}</span>
              <button class="nav-btn" @click="changeMonth(1)">›</button>
            </div>
          </div>
        </div>
        
        <div class="calendar-grid">
          <!-- Weekday Headers -->
          <div class="calendar-weekday">Mon</div>
          <div class="calendar-weekday">Tue</div>
          <div class="calendar-weekday">Wed</div>
          <div class="calendar-weekday">Thu</div>
          <div class="calendar-weekday">Fri</div>
          <div class="calendar-weekday">Sat</div>
          <div class="calendar-weekday">Sun</div>
          
          <!-- Calendar Days -->
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            :class="[
              'calendar-day',
              {
                'empty': day.empty,
                'today': day.isToday,
                'has-activity': day.intensity > 0,
                'intensity-1': day.intensity === 1,
                'intensity-2': day.intensity === 2,
                'intensity-3': day.intensity === 3,
                'highlighted': highlightedDay === index
              }
            ]"
          >
            <span v-if="!day.empty" class="day-number">{{ day.day }}</span>
            <div v-if="day.intensity > 0" class="activity-icon">
              <span v-if="day.intensity === 3">🌿</span>
              <span v-else-if="day.intensity === 2">🍃</span>
              <span v-else>🌱</span>
            </div>
            <div v-if="day.intensity > 0" class="day-tooltip">
              {{ day.emission.toFixed(1) }}kg CO2 Reduced
            </div>
          </div>
        </div>
        
        <div class="calendar-insight">
          <span class="insight-icon">💡</span>
          <p class="insight-text">
            本月精彩：你已经累计挽救了相当于 <span class="highlight">3 棵成年大树</span> 的碳减排量。
          </p>
        </div>
      </section>

      <!-- Impact Dashboard: 已迁入 ProfileImpactDashboard -->
      <ProfileImpactDashboard
        :points="profile.points"
        :selected-period="selectedPeriod"
        @update:selected-period="selectedPeriod = $event"
      />

      <!-- Tasks and Achievements Grid -->
      <div class="tasks-achievements-grid">
        <!-- Current Tasks -->
        <div class="tasks-section">
          <h2 class="section-title">进行中的任务</h2>
          <div class="tasks-list">
            <div class="task-card">
              <div class="task-header">
                <span class="task-name">废纸回收挑战</span>
                <span class="task-progress-text">6.0 / 10 kg</span>
              </div>
              <div class="task-progress-bar">
                <div class="progress-fill" style="width: 60%"></div>
              </div>
              <div class="task-footer">
                <span class="task-reward">完成后可获得 200 积分</span>
                <span class="task-percentage">60%</span>
              </div>
            </div>
            
            <div class="task-card">
              <div class="task-header">
                <span class="task-name">低碳出行达人</span>
                <span class="task-progress-text">12 / 20 次</span>
              </div>
              <div class="task-progress-bar">
                <div class="progress-fill" style="width: 40%"></div>
              </div>
              <div class="task-footer">
                <span class="task-reward">完成后可获得 150 积分</span>
                <span class="task-percentage">40%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Achievements -->
        <div class="achievements-section">
          <h2 class="section-title">成就勋章</h2>
          <div class="achievements-list">
            <div class="achievement-card unlocked">
              <div class="achievement-icon">🌿</div>
              <span class="achievement-name">节能专家</span>
            </div>
            <div class="achievement-card unlocked">
              <div class="achievement-icon">♻️</div>
              <span class="achievement-name">堆肥先锋</span>
            </div>
            <div class="achievement-card unlocked">
              <div class="achievement-icon">🌳</div>
              <span class="achievement-name">植树大使</span>
            </div>
            <div class="achievement-card locked">
              <div class="achievement-icon">💧</div>
              <span class="achievement-name">节水卫士</span>
            </div>
          </div>
          <button class="view-all-btn">
            查看全部勋章 <span class="arrow">→</span>
          </button>
        </div>
      </div>

      <!-- Recent Activity -->
      <section class="activity-section">
        <h2 class="section-title">最近动态</h2>
        <div class="activity-list">
          <div class="activity-item">
            <div class="activity-icon-wrapper">
              <span class="activity-icon">📦</span>
            </div>
            <div class="activity-content">
              <h4 class="activity-title">成功回收快递纸箱</h4>
              <p class="activity-desc">于 虹桥路 128 号完成回收</p>
            </div>
            <div class="activity-points">
              <div class="points-value positive">+45 pts</div>
              <div class="activity-time">今天 14:20</div>
            </div>
          </div>

          <div class="activity-item">
            <div class="activity-icon-wrapper">
              <span class="activity-icon">🎁</span>
            </div>
            <div class="activity-content">
              <h4 class="activity-title">兑换超市优惠券</h4>
              <p class="activity-desc">消费 500 积分兑换全家满减券</p>
            </div>
            <div class="activity-points">
              <div class="points-value negative">-500 pts</div>
              <div class="activity-time">昨天 09:15</div>
            </div>
          </div>

          <div class="activity-item">
            <div class="activity-icon-wrapper">
              <span class="activity-icon">👍</span>
            </div>
            <div class="activity-content">
              <h4 class="activity-title">社区点赞达人</h4>
              <p class="activity-desc">您的科普文章获得了 50 个赞</p>
            </div>
            <div class="activity-points">
              <div class="points-value positive">+100 pts</div>
              <div class="activity-time">2023.10.24</div>
            </div>
          </div>

          <div class="activity-item">
            <div class="activity-icon-wrapper">
              <span class="activity-icon">🍴</span>
            </div>
            <div class="activity-content">
              <h4 class="activity-title">提交自带餐具打卡</h4>
              <p class="activity-desc">减少了一次性餐具使用</p>
            </div>
            <div class="activity-points">
              <div class="points-value positive">+10 pts</div>
              <div class="activity-time">2023.10.23</div>
            </div>
          </div>
        </div>
      </section>
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


/* Calendar Section */
.calendar-section {
  margin-bottom: 6rem;
}

.calendar-controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.legend {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition: background 0.3s;
}

.legend-item:hover {
  background: rgba(0, 100, 24, 0.05);
}

.legend-item span {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: #40493d;
}

.legend-dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  transition: transform 0.3s;
}

.legend-item:hover .legend-dot {
  transform: scale(1.25);
}

.legend-dot.light {
  background: rgba(0, 100, 24, 0.2);
}

.legend-dot.medium {
  background: rgba(0, 100, 24, 0.6);
}

.legend-dot.heavy {
  background: #006418;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn {
  color: #40493d;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.3s;
}

.nav-btn:hover {
  color: #006418;
}

.month-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1a1c19;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.3s;
}

.month-text:hover {
  color: #006418;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: transparent;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid rgba(64, 73, 61, 0.2);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  margin-bottom: 2rem;
}

.calendar-grid::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(#2E7D32 0.5px, transparent 0.5px);
  background-size: 20px 20px;
  opacity: 0.05;
  pointer-events: none;
}

.calendar-weekday {
  background: rgba(250, 250, 245, 0.6);
  backdrop-filter: blur(4px);
  padding: 0.625rem;
  text-align: center;
  font-size: 0.625rem;
  font-weight: 900;
  color: #40493d;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 1px solid rgba(64, 73, 61, 0.1);
  z-index: 10;
}

.calendar-day {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.02);
  height: 5rem;
  padding: 0.5rem;
  position: relative;
  transition: all 0.3s;
  z-index: 10;
}

.calendar-day.empty {
  background: rgba(238, 238, 233, 0.1);
}

.calendar-day.has-activity {
  cursor: pointer;
}

.calendar-day.has-activity:hover {
  background: white;
  transform: scale(1.05);
  border-color: rgba(0, 100, 24, 0.5);
  z-index: 20;
}

/* Highlighted Day Animation */
.calendar-day.highlighted {
  animation: highlightPulse 2s ease-in-out;
  position: relative;
  z-index: 30;
}

@keyframes highlightPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(0, 100, 24, 0.7);
  }
  10% {
    transform: scale(1.15);
    box-shadow: 0 0 0 10px rgba(0, 100, 24, 0);
  }
  20% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(0, 100, 24, 0);
  }
  30% {
    transform: scale(1.15);
    box-shadow: 0 0 0 10px rgba(0, 100, 24, 0);
  }
  40% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  60% {
    transform: scale(1);
  }
  70% {
    transform: scale(1.08);
  }
  80%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 16px rgba(0, 100, 24, 0.4);
  }
}

.calendar-day.highlighted::before {
  content: '';
  position: absolute;
  inset: -4px;
  border: 3px solid #006418;
  border-radius: 10px;
  animation: borderGlow 2s ease-in-out;
}

@keyframes borderGlow {
  0%, 100% {
    opacity: 0;
  }
  10%, 30% {
    opacity: 1;
    box-shadow: 0 0 20px rgba(0, 100, 24, 0.6);
  }
  40% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
  60% {
    opacity: 0.8;
  }
}

.calendar-day.highlighted::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  color: #006418;
  font-weight: 900;
  animation: checkmarkPop 1s ease-out;
  text-shadow: 0 2px 8px rgba(0, 100, 24, 0.3);
  z-index: 2;
}

@keyframes checkmarkPop {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0) rotate(-180deg);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.3) rotate(10deg);
  }
  70% {
    transform: translate(-50%, -50%) scale(0.9) rotate(-5deg);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
}

.calendar-day.highlighted .activity-icon {
  animation: iconBounce 1s ease-out 0.5s;
}

@keyframes iconBounce {
  0%, 100% {
    transform: translateY(0);
  }
  25% {
    transform: translateY(-10px);
  }
  50% {
    transform: translateY(0);
  }
  75% {
    transform: translateY(-5px);
  }
}

.calendar-day.intensity-1 {
  background: rgba(0, 100, 24, 0.2);
}

.calendar-day.intensity-2 {
  background: rgba(0, 100, 24, 0.2);
}

.calendar-day.intensity-3 {
  background: rgba(0, 100, 24, 0.2);
}

.day-number {
  font-size: 0.625rem;
  font-weight: 700;
  color: rgba(64, 73, 61, 0.4);
}

.calendar-day.has-activity .day-number {
  color: #1a1c19;
  opacity: 1;
  font-weight: 900;
}

.activity-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.day-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #006418;
  color: white;
  font-size: 0.625rem;
  border-radius: 0.25rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.calendar-day:hover .day-tooltip {
  opacity: 1;
}

.calendar-insight {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 100, 24, 0.05);
  border-radius: 9999px;
  border: 1px solid rgba(0, 100, 24, 0.1);
  margin: 0 auto;
  display: flex;
  justify-content: center;
}

.insight-icon {
  font-size: 1.25rem;
}

.insight-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #40493d;
  margin: 0;
}

.insight-text .highlight {
  color: #006418;
  font-weight: 700;
}

/* Tasks and Achievements Grid */
.tasks-achievements-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8rem;
  margin-bottom: 6rem;
}

.tasks-section,
.achievements-section {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.task-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.task-card:hover {
  transform: translateY(-2px);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.task-name {
  font-size: 1.25rem;
  font-weight: 700;
  transition: color 0.3s;
}

.task-card:hover .task-name {
  color: #006418;
}

.task-progress-text {
  color: #40493d;
  font-size: 0.875rem;
  font-weight: 500;
}

.task-progress-bar {
  height: 0.5rem;
  width: 100%;
  background: #e8e8e3;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #006418;
  border-radius: 9999px;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
}

.task-reward {
  font-size: 0.75rem;
  color: #40493d;
  font-weight: 500;
}

.task-percentage {
  font-size: 0.75rem;
  font-weight: 900;
  color: #006418;
}

/* Achievements */
.achievements-list {
  display: flex;
  gap: 2.5rem;
  overflow-x: auto;
  padding: 0.5rem 0;
}

.achievements-list::-webkit-scrollbar {
  display: none;
}

.achievement-card {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  transition: transform 0.3s;
}

.achievement-card:hover {
  transform: scale(1.1);
}

.achievement-card.locked {
  opacity: 0.4;
  filter: grayscale(1);
}

.achievement-icon {
  width: 6rem;
  height: 6rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.achievement-card:hover .achievement-icon {
  transform: scale(1.1);
}

.achievement-card.unlocked:nth-child(1) .achievement-icon {
  background: #ffdbce;
  color: #6b4f45;
}

.achievement-card.unlocked:nth-child(2) .achievement-icon {
  background: #acf4a4;
  color: #2a6b2c;
}

.achievement-card.unlocked:nth-child(3) .achievement-icon {
  background: #9df898;
  color: #006418;
}

.achievement-card.locked .achievement-icon {
  background: #eeeee9;
  color: #40493d;
}

.achievement-name {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.view-all-btn {
  font-size: 0.875rem;
  font-weight: 700;
  color: #006418;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: gap 0.3s;
  margin-top: 1rem;
}

.view-all-btn:hover {
  gap: 0.75rem;
}

.arrow {
  font-size: 0.875rem;
}

/* Recent Activity */
.activity-section {
  margin-bottom: 6rem;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.activity-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem;
  background: rgba(244, 244, 239, 0.5);
  transition: background 0.3s;
}

.activity-item:hover {
  background: rgba(238, 238, 233, 0.6);
}

.activity-item:nth-child(even) {
  background: rgba(255, 255, 255, 0);
}

.activity-item:nth-child(even):hover {
  background: rgba(238, 238, 233, 0.6);
}

.activity-icon-wrapper {
  width: 3.5rem;
  height: 3.5rem;
  background: #e3e3de;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon {
  font-size: 1.5rem;
}

.activity-content {
  flex: 1;
  margin-left: 2rem;
}

.activity-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1c19;
  margin: 0 0 0.25rem;
}

.activity-desc {
  font-size: 0.875rem;
  color: #40493d;
  font-weight: 500;
  margin: 0.25rem 0 0;
}

.activity-points {
  text-align: right;
}

.points-value {
  font-size: 1.5rem;
  font-weight: 900;
  margin-bottom: 0.25rem;
}

.points-value.positive {
  color: #006418;
}

.points-value.negative {
  color: #ba1a1a;
}

.activity-time {
  font-size: 0.75rem;
  color: #40493d;
  font-weight: 500;
  margin-top: 0.25rem;
}

/* Responsive Design */
@media (max-width: 1024px) {


  .tasks-achievements-grid {
    grid-template-columns: 1fr;
    gap: 4rem;
  }
}

@media (max-width: 768px) {
  .profile-content {
    padding: 2rem 1rem;
  }


  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .calendar-controls {
    flex-direction: column;
    align-items: flex-start;
  }

  .activity-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .activity-content {
    margin-left: 0;
  }

  .activity-points {
    text-align: left;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
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


.calendar-section {
  animation: fadeInUp 0.5s ease forwards;
  animation-delay: 0.1s;
  opacity: 0;
}


.tasks-achievements-grid {
  animation: fadeInUp 0.5s ease forwards;
  animation-delay: 0.3s;
  opacity: 0;
}

.activity-section {
  animation: fadeInUp 0.5s ease forwards;
  animation-delay: 0.4s;
  opacity: 0;
}
</style>
