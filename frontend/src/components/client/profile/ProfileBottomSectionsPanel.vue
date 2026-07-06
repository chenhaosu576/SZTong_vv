<!--
  ProfileBottomSectionsPanel.vue
  页面底部 3 个 sub-section inline:
    1) 任务列表 (.tasks-section + .task-card + 进度条)
    2) 成就勋章 (.achievements-section + .achievement-card + unlocked/locked 态)
    3) 最近动态 (.activity-section + .activity-item + 积分正负色)
  Page 通过 :tasks / :achievements / :activities 三个 prop 喂入静态数组。
  Emits: view-all-achievements (成就区"查看全部"按钮; 当前无真实跳转, 预留接入)。
-->

<script setup>
defineProps({
  tasks: { type: Array, required: true },
  achievements: { type: Array, required: true },
  activities: { type: Array, required: true },
});

const emit = defineEmits(["view-all-achievements"]);
</script>

<template>
  <div class="tasks-achievements-grid">
    <!-- 任务列表 -->
    <div class="tasks-section">
      <h2 class="section-title">进行中的任务</h2>
      <div class="tasks-list">
        <div v-for="task in tasks" :key="task.name" class="task-card">
          <div class="task-header">
            <span class="task-name">{{ task.name }}</span>
            <span class="task-progress-text">{{ task.progressText }}</span>
          </div>
          <div class="task-progress-bar">
            <div class="progress-fill" :style="{ width: task.progress + '%' }"></div>
          </div>
          <div class="task-footer">
            <span class="task-reward">{{ task.reward }}</span>
            <span class="task-percentage">{{ task.progress }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 成就勋章 -->
    <div class="achievements-section">
      <h2 class="section-title">成就勋章</h2>
      <div class="achievements-list">
        <div
          v-for="achievement in achievements"
          :key="achievement.name"
          :class="['achievement-card', achievement.unlocked ? 'unlocked' : 'locked']"
        >
          <div class="achievement-icon">{{ achievement.icon }}</div>
          <span class="achievement-name">{{ achievement.name }}</span>
        </div>
      </div>
      <button class="view-all-btn" @click="emit('view-all-achievements')">
        查看全部勋章 <span class="arrow">→</span>
      </button>
    </div>
  </div>

  <!-- 最近动态 -->
  <section class="activity-section">
    <h2 class="section-title">最近动态</h2>
    <div class="activity-list">
      <div v-for="activity in activities" :key="activity.title" class="activity-item">
        <div class="activity-icon-wrapper">
          <span class="activity-icon">{{ activity.icon }}</span>
        </div>
        <div class="activity-content">
          <h4 class="activity-title">{{ activity.title }}</h4>
          <p class="activity-desc">{{ activity.description }}</p>
        </div>
        <div class="activity-points">
          <div :class="['points-value', activity.pointsVariant]">{{ activity.points }}</div>
          <div class="activity-time">{{ activity.time }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 任务 / 成就 grid 容器 */
.tasks-achievements-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8rem;
  margin-bottom: 6rem;
  animation: fadeInUp 0.5s ease forwards;
  animation-delay: 0.3s;
  opacity: 0;
}

.tasks-section,
.achievements-section {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.section-title {
  font-size: 1.875rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* 任务列表 */
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

/* 成就勋章 */
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

/* 最近动态 */
.activity-section {
  margin-bottom: 6rem;
  animation: fadeInUp 0.5s ease forwards;
  animation-delay: 0.4s;
  opacity: 0;
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

@media (max-width: 1024px) {
  .tasks-achievements-grid {
    grid-template-columns: 1fr;
    gap: 4rem;
  }
}

@media (max-width: 768px) {
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
</style>