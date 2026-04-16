<script setup>
import { computed, onMounted, ref, onBeforeUnmount, useTemplateRef } from "vue";
import { useRevealOnScroll } from "../../composables/useRevealOnScroll";
import { fetchProfileData } from "../../mock/clientApi";
import { fetchRealDate, fetchCalendarWithOrders } from "../../mock/timeApi";

const pageRef = ref(null);
useRevealOnScroll(pageRef);

const loading = ref(true);
const errorText = ref("");
const profile = ref(null);

// 当前选中的月份
const currentMonth = ref(new Date());
const selectedPeriod = ref('本月'); // 本周, 本月, 季度

// 日历数据
const calendarDays = ref([]);
const orderMap = ref({}); // 订单映射

// 连续打卡数据
const streakDays = ref(42); // 连续打卡天数
const totalRecycles = ref(156); // 总回收次数
const streakRecord = ref(58); // 最长连续记录
const isStreakAnimating = ref(false);
const hasCheckedInToday = ref(false); // 今日是否已打卡
const showCheckInAlert = ref(false); // 显示打卡提示弹窗

// 守护天数 - 从localStorage读取，默认365
const guardianDays = ref(parseInt(localStorage.getItem('guardianDays')) || 365);
const isGuardianDaysUpdating = ref(false);

// 瓶子悬停状态
const isBottleHovered = ref(false);

// 头像相关
const avatarUrl = ref(localStorage.getItem('userAvatar') || null);
const avatarFileInput = ref(null);

// 环境足迹数据 - 根据周期动态变化
const energyData = computed(() => {
  if (selectedPeriod.value === '本周') {
    return {
      value: 458,
      unit: 'kWh',
      trend: '+5.2%',
      chartType: 'bar',
      bars: generateRandomBars(7),
      labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    };
  } else if (selectedPeriod.value === '本月') {
    return {
      value: 1842,
      unit: 'kWh',
      trend: '+8.3%',
      chartType: 'bar',
      bars: generateRandomBars(30),
      labels: Array.from({ length: 30 }, (_, i) => `${i + 1}日`)
    };
  } else { // 季度
    return {
      value: 5526,
      unit: 'kWh',
      trend: '+12.1%',
      chartType: 'line',
      points: generateLineChartPoints(12),
      labels: ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周', '第7周', '第8周', '第9周', '第10周', '第11周', '第12周']
    };
  }
});

const co2Data = computed(() => {
  if (selectedPeriod.value === '本周') {
    return {
      value: 12.4,
      unit: 'kg',
      trend: '+3.8%',
      chartType: 'bar',
      bars: generateRandomBars(7),
      labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    };
  } else if (selectedPeriod.value === '本月') {
    return {
      value: 48.6,
      unit: 'kg',
      trend: '+6.5%',
      chartType: 'bar',
      bars: generateRandomBars(30),
      labels: Array.from({ length: 30 }, (_, i) => `${i + 1}日`)
    };
  } else { // 季度
    return {
      value: 145.8,
      unit: 'kg',
      trend: '+9.7%',
      chartType: 'line',
      points: generateLineChartPoints(12),
      labels: ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周', '第7周', '第8周', '第9周', '第10周', '第11周', '第12周']
    };
  }
});

// 悬停的柱子或数据点索引
const hoveredBarIndex = ref(null);
const hoveredPointIndex = ref(null);

// 生成随机柱状图数据
function generateRandomBars(count) {
  const bars = [];
  const activeCount = Math.floor(count * 0.3); // 30%的柱子是active
  const activeIndices = new Set();
  
  // 随机选择active的柱子索引
  while (activeIndices.size < activeCount) {
    activeIndices.add(Math.floor(Math.random() * count));
  }
  
  for (let i = 0; i < count; i++) {
    const height = Math.floor(Math.random() * 60) + 40; // 40-100%
    const active = activeIndices.has(i);
    bars.push({
      height,
      active,
      value: active ? Math.floor(height * 0.8) : Math.floor(height * 0.5) // active的值更高
    });
  }
  
  return bars;
}

// 生成折线图数据点
function generateLineChartPoints(count) {
  const points = [];
  let lastValue = 50;
  
  for (let i = 0; i < count; i++) {
    // 生成波动的数据，保持趋势
    const change = (Math.random() - 0.3) * 20; // 略微上升趋势
    lastValue = Math.max(30, Math.min(100, lastValue + change));
    const yPercent = 100 - lastValue;
    points.push({
      x: (i / (count - 1)) * 100, // 0-100%
      y: yPercent, // 翻转Y轴，因为CSS中top是从上往下
      value: Math.floor(lastValue) // 实际数值
    });
  }
  
  return points;
}

// 生成SVG路径
function generateLinePath(points) {
  if (points.length === 0) return '';
  
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  
  return path;
}

// 点击头像触发文件选择
function triggerAvatarUpload() {
  avatarFileInput.value?.click();
}

// 处理头像文件选择
function handleAvatarChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件');
    return;
  }
  
  // 验证文件大小（限制5MB）
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过5MB');
    return;
  }
  
  // 读取文件并转换为base64
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    avatarUrl.value = base64;
    // 保存到localStorage
    localStorage.setItem('userAvatar', base64);
  };
  reader.readAsDataURL(file);
}

// 检查今日是否已打卡
function checkTodayCheckIn() {
  const lastCheckInDate = localStorage.getItem('lastCheckInDate');
  const today = new Date().toDateString();
  
  if (lastCheckInDate === today) {
    hasCheckedInToday.value = true;
  } else {
    hasCheckedInToday.value = false;
  }
}

// 趋势图表数据
const trendPeriod = ref('3个月'); // 3个月, 半年, 一年

// 日历相关
const calendarSectionRef = ref(null);
const highlightedDay = ref(null);

// 打卡动画触发
function triggerStreakAnimation() {
  // 检查今日是否已打卡
  if (hasCheckedInToday.value) {
    showCheckInAlert.value = true;
    setTimeout(() => {
      showCheckInAlert.value = false;
    }, 3000);
    return;
  }

  // 执行打卡
  isStreakAnimating.value = true;
  setTimeout(() => {
    isStreakAnimating.value = false;
  }, 1000);
  
  // 增加守护天数并触发动画
  isGuardianDaysUpdating.value = true;
  guardianDays.value++;
  
  // 保存守护天数到localStorage
  localStorage.setItem('guardianDays', guardianDays.value.toString());
  
  setTimeout(() => {
    isGuardianDaysUpdating.value = false;
  }, 600);
  
  // 记录打卡日期
  const today = new Date().toDateString();
  localStorage.setItem('lastCheckInDate', today);
  hasCheckedInToday.value = true;
  
  // 滚动到日历并高亮今天
  scrollToCalendarAndHighlight();
}

// 测试用：恢复打卡状态
function resetCheckInForTesting() {
  localStorage.removeItem('lastCheckInDate');
  hasCheckedInToday.value = false;
  console.log('打卡状态已重置，可以重新打卡了');
}

// 滚动到日历并高亮今天的日期
async function scrollToCalendarAndHighlight() {
  // 等待动画完成
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // 平滑滚动到日历部分
  if (calendarSectionRef.value) {
    calendarSectionRef.value.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  }
  
  // 等待滚动完成后高亮今天
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // 找到今天的日期索引
  const todayIndex = calendarDays.value.findIndex(day => day.isToday);
  if (todayIndex !== -1) {
    highlightedDay.value = todayIndex;
    
    // 如果今天还没有活动，设置为轻度活动
    if (calendarDays.value[todayIndex].intensity === 0) {
      calendarDays.value[todayIndex].intensity = 1;
      calendarDays.value[todayIndex].emission = 2.5;
    }
    
    // 3秒后取消高亮
    setTimeout(() => {
      highlightedDay.value = null;
    }, 3000);
  }
}

// 生成日历数据
function generateCalendar() {
  const days = [];
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();

  // 获取当月第一天是星期几（0=周日，需要转换为1=周一）
  const firstDay = new Date(year, month, 1).getDay();
  const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;

  // 获取当月天数
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 添加空白天
  for (let i = 0; i < firstDayAdjusted; i++) {
    days.push({ empty: true });
  }

  // 添加当月天数
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const orders = orderMap.value[day] || [];
    const hasActivity = orders.length > 0;
    const intensity = hasActivity ? Math.min(orders.length, 3) : 0;

    days.push({
      date: date.toISOString().split('T')[0],
      day,
      month: month + 1,
      year,
      intensity, // 0=无活动, 1=轻度, 2=中度, 3=显著
      emission: intensity * (Math.random() * 4 + 2),
      isToday: date.toDateString() === new Date().toDateString()
    });
  }

  calendarDays.value = days;
}

// 切换月份
async function changeMonth(offset) {
  const newMonth = new Date(currentMonth.value);
  newMonth.setMonth(newMonth.getMonth() + offset);
  currentMonth.value = newMonth;

  // 获取新月份的订单
  const year = newMonth.getFullYear();
  const month = newMonth.getMonth();
  orderMap.value = await fetchCalendarWithOrders(year, month);

  generateCalendar();
}

// 获取月份显示文本
const monthText = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth() + 1;
  return `${year}年 ${month}月`;
});

// 计算等级进度百分比
const levelProgress = computed(() => {
  if (!profile.value) return 70;
  // 假设当前积分8240，下一级需要8690（450积分差距）
  return 70; // 示例值
});

async function loadProfile() {
  loading.value = true;
  errorText.value = "";
  try {
    // 并行执行所有 API 请求
    const [profileData, realDate, ordersData] = await Promise.all([
      fetchProfileData(),
      fetchRealDate(),
      fetchCalendarWithOrders(
        new Date().getFullYear(),
        new Date().getMonth()
      )
    ]);

    profile.value = profileData;

    // 获取真实日期
    if (realDate) {
      currentMonth.value = new Date(realDate.year, realDate.month, 1);
    } else {
      currentMonth.value = new Date();
    }

    // 获取当月订单
    orderMap.value = ordersData;

    generateCalendar();
    checkTodayCheckIn();
  } catch (error) {
    errorText.value = "个人信息加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

onMounted(loadProfile);

// ============ BlurText Component Logic ============
const blurTextRef = useTemplateRef('blurTextRef');
const blurTextInView = ref(true); // 初始设为true，页面加载时就播放
let blurTextObserver = null;

const blurTextContent = computed(() => {
  const days = guardianDays.value;
  return `你已通过回收行动累计为地球守护了 ${days} 天。感谢你的每一份坚持。`;
});

const blurTextElements = computed(() => {
  const text = blurTextContent.value;
  const daysStr = guardianDays.value.toString();
  const daysIndex = text.indexOf(daysStr);
  
  // 将文字分割成字符数组，并标记哪些是天数
  return text.split('').map((char, index) => ({
    char,
    isDays: index >= daysIndex && index < daysIndex + daysStr.length
  }));
});

onMounted(() => {
  // Setup intersection observer for blur text
  if (blurTextRef.value) {
    blurTextObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          blurTextInView.value = true;
          // Don't disconnect so it can re-trigger when scrolling back
        } else {
          // Reset when out of view so it can animate again
          blurTextInView.value = false;
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px'
      }
    );
    blurTextObserver.observe(blurTextRef.value);
  }
});

onBeforeUnmount(() => {
  blurTextObserver?.disconnect();
});
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
      <!-- Header Section: Profile & Message -->
      <section class="profile-header">
        <div class="header-left">
          <div class="profile-avatar-section">
            <div class="avatar-container">
              <div 
                class="avatar-image" 
                @click="triggerAvatarUpload"
                :style="avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}"
              >
                <span v-if="!avatarUrl">👤</span>
              </div>
              <div class="avatar-upload-hint">
                <span class="upload-icon">📷</span>
              </div>
              <div class="verified-badge">
                <span class="icon">✓</span>
              </div>
            </div>
            <!-- Hidden file input -->
            <input 
              ref="avatarFileInput"
              type="file" 
              accept="image/*"
              style="display: none;"
              @change="handleAvatarChange"
            />
            <div class="profile-info">
              <h1 class="profile-name">你好，{{ profile.name }}</h1>
              <div class="profile-meta">
                <span class="badge">高级环保达人</span>
                <span class="join-days">已加入 1,240 天</span>
              </div>
            </div>
          </div>
          <p 
            ref="blurTextRef" 
            class="profile-message blur-text-container"
          >
            <span
              v-for="(item, index) in blurTextElements"
              :key="index"
              :class="{
                'blur-text-char': true,
                'is-visible': blurTextInView,
                'days-highlight': item.isDays,
                'days-updating': item.isDays && isGuardianDaysUpdating,
              }"
              :style="{ animationDelay: `${index * 50}ms` }"
            >
              {{ item.char === ' ' ? '\u00A0' : item.char }}
            </span>
          </p>
        </div>
        <div class="header-right">
          <div class="level-display">
            <div class="level-info">
              <div class="level-number">Lv. 12</div>
              <div class="level-progress-text">距离 Lv. 13 还需 450 积分</div>
            </div>
            <div 
              class="bottle-container"
              @mouseenter="isBottleHovered = true"
              @mouseleave="isBottleHovered = false"
            >
              <!-- Metal Cap -->
              <div class="bottle-cap">
                <div class="cap-top"></div>
                <div class="cap-rim"></div>
              </div>
              <!-- Narrow Neck -->
              <div class="bottle-neck"></div>
              <!-- Main Body (wider at bottom) -->
              <div class="bottle-body">
                <!-- Liquid with dynamic waves -->
                <div class="bottle-liquid" :style="{ height: levelProgress + '%' }">
                  <!-- Multiple wave layers for intense flowing effect -->
                  <div class="wave wave-1"></div>
                  <div class="wave wave-2"></div>
                  <div class="wave wave-3"></div>
                  <div class="wave wave-4"></div>
                  <!-- Rising bubbles -->
                  <div class="bubble bubble-1"></div>
                  <div class="bubble bubble-2"></div>
                  <div class="bubble bubble-3"></div>
                  <div class="bubble bubble-4"></div>
                </div>
                <!-- Glass reflections -->
                <div class="glass-reflection reflection-left"></div>
                <div class="glass-reflection reflection-right"></div>
              </div>
              
              <!-- Hover Tooltip -->
              <div v-if="isBottleHovered" class="bottle-tooltip">
                <span class="tooltip-label">当前等级进度</span>
                <span class="tooltip-progress">{{ levelProgress.toFixed(0) }}%</span>
              </div>
            </div>
          </div>
          
          <!-- Compact Streak Counter -->
          <div class="compact-streak">
            <div class="compact-streak-main">
              <div class="streak-flame-small" :class="{ 'animating': isStreakAnimating }">
                <span class="flame-emoji-small">🔥</span>
              </div>
              <div class="streak-info-compact">
                <div class="streak-number-compact">{{ streakDays }}</div>
                <div class="streak-label-compact">天连续打卡</div>
              </div>
              <button 
                class="compact-streak-btn" 
                :class="{ 'checked-in': hasCheckedInToday }"
                @click="triggerStreakAnimation"
              >
                <span class="btn-icon-small">✓</span>
              </button>
            </div>
            <!-- 测试按钮 -->
            <button 
              class="reset-checkin-btn"
              @click="resetCheckInForTesting"
              title="测试用：重置打卡状态"
            >
              🔄 恢复打卡
            </button>
          </div>
        </div>
      </section>

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

      <!-- Impact Dashboard -->
      <section class="impact-dashboard">
        <div class="section-header">
          <h2 class="section-title">环境足迹</h2>
          <div class="period-tabs">
            <button 
              :class="['tab', { active: selectedPeriod === '本周' }]"
              @click="selectedPeriod = '本周'"
            >本周</button>
            <button 
              :class="['tab', { active: selectedPeriod === '本月' }]"
              @click="selectedPeriod = '本月'"
            >本月</button>
            <button 
              :class="['tab', { active: selectedPeriod === '季度' }]"
              @click="selectedPeriod = '季度'"
            >季度</button>
          </div>
        </div>
        <div class="metrics-grid">
          <!-- Metric 1: Energy Saved -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">已节约能源</span>
              <span class="metric-trend">
                <span class="trend-icon">↑</span>{{ energyData.trend }}
              </span>
            </div>
            <div class="metric-value">
              {{ energyData.value }} <span class="metric-unit">{{ energyData.unit }}</span>
            </div>
            <!-- 柱状图 -->
            <div v-if="energyData.chartType === 'bar'" class="mini-chart">
              <div 
                v-for="(bar, index) in energyData.bars" 
                :key="index"
                class="bar" 
                :class="{ active: bar.active, hovered: hoveredBarIndex === index }"
                :style="{ height: bar.height + '%' }"
                @mouseenter="hoveredBarIndex = index"
                @mouseleave="hoveredBarIndex = null"
              >
                <div v-if="hoveredBarIndex === index" class="bar-tooltip">
                  <div class="tooltip-label">{{ energyData.labels[index] }}</div>
                  <div class="tooltip-value">{{ bar.value }} kWh</div>
                </div>
              </div>
            </div>
            <!-- 折线图 -->
            <div v-else class="line-chart">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <!-- 渐变填充区域 -->
                <defs>
                  <linearGradient id="energyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#006418;stop-opacity:0.2" />
                    <stop offset="100%" style="stop-color:#006418;stop-opacity:0" />
                  </linearGradient>
                </defs>
                <!-- 填充区域 -->
                <path
                  :d="generateLinePath(energyData.points) + ' L 100 100 L 0 100 Z'"
                  fill="url(#energyGradient)"
                />
                <!-- 折线 -->
                <path
                  :d="generateLinePath(energyData.points)"
                  fill="none"
                  stroke="#006418"
                  stroke-width="2"
                  vector-effect="non-scaling-stroke"
                />
                <!-- 数据点 -->
                <circle
                  v-for="(point, index) in energyData.points"
                  :key="index"
                  :cx="point.x"
                  :cy="point.y"
                  :r="hoveredPointIndex === index ? 4 : 2"
                  :fill="hoveredPointIndex === index ? '#2a6b2c' : '#006418'"
                  @mouseenter="hoveredPointIndex = index"
                  @mouseleave="hoveredPointIndex = null"
                  style="cursor: pointer; transition: all 0.2s;"
                />
              </svg>
              <!-- 折线图提示 -->
              <div 
                v-if="hoveredPointIndex !== null" 
                class="line-tooltip"
                :style="{
                  left: energyData.points[hoveredPointIndex].x + '%',
                  top: energyData.points[hoveredPointIndex].y + '%'
                }"
              >
                <div class="tooltip-label">{{ energyData.labels[hoveredPointIndex] }}</div>
                <div class="tooltip-value">{{ energyData.points[hoveredPointIndex].value }} kWh</div>
              </div>
            </div>
          </div>

          <!-- Metric 2: CO2 Reduced -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">减少二氧化碳</span>
              <span class="metric-trend">
                <span class="trend-icon">↑</span>{{ co2Data.trend }}
              </span>
            </div>
            <div class="metric-value">
              {{ co2Data.value }} <span class="metric-unit">{{ co2Data.unit }}</span>
            </div>
            <!-- 柱状图 -->
            <div v-if="co2Data.chartType === 'bar'" class="mini-chart">
              <div 
                v-for="(bar, index) in co2Data.bars" 
                :key="index"
                class="bar" 
                :class="{ active: bar.active, hovered: hoveredBarIndex === index }"
                :style="{ height: bar.height + '%' }"
                @mouseenter="hoveredBarIndex = index"
                @mouseleave="hoveredBarIndex = null"
              >
                <div v-if="hoveredBarIndex === index" class="bar-tooltip">
                  <div class="tooltip-label">{{ co2Data.labels[index] }}</div>
                  <div class="tooltip-value">{{ (bar.value * 0.15).toFixed(1) }} kg</div>
                </div>
              </div>
            </div>
            <!-- 折线图 -->
            <div v-else class="line-chart">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <!-- 渐变填充区域 -->
                <defs>
                  <linearGradient id="co2Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#006418;stop-opacity:0.2" />
                    <stop offset="100%" style="stop-color:#006418;stop-opacity:0" />
                  </linearGradient>
                </defs>
                <!-- 填充区域 -->
                <path
                  :d="generateLinePath(co2Data.points) + ' L 100 100 L 0 100 Z'"
                  fill="url(#co2Gradient)"
                />
                <!-- 折线 -->
                <path
                  :d="generateLinePath(co2Data.points)"
                  fill="none"
                  stroke="#006418"
                  stroke-width="2"
                  vector-effect="non-scaling-stroke"
                />
                <!-- 数据点 -->
                <circle
                  v-for="(point, index) in co2Data.points"
                  :key="index"
                  :cx="point.x"
                  :cy="point.y"
                  :r="hoveredPointIndex === index ? 4 : 2"
                  :fill="hoveredPointIndex === index ? '#2a6b2c' : '#006418'"
                  @mouseenter="hoveredPointIndex = index"
                  @mouseleave="hoveredPointIndex = null"
                  style="cursor: pointer; transition: all 0.2s;"
                />
              </svg>
              <!-- 折线图提示 -->
              <div 
                v-if="hoveredPointIndex !== null" 
                class="line-tooltip"
                :style="{
                  left: co2Data.points[hoveredPointIndex].x + '%',
                  top: co2Data.points[hoveredPointIndex].y + '%'
                }"
              >
                <div class="tooltip-label">{{ co2Data.labels[hoveredPointIndex] }}</div>
                <div class="tooltip-value">{{ (co2Data.points[hoveredPointIndex].value * 0.15).toFixed(1) }} kg</div>
              </div>
            </div>
          </div>

          <!-- Metric 3: Points -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">当前累计积分</span>
              <span class="metric-rank">月度排行 #42</span>
            </div>
            <div class="metric-value points">
              {{ profile.points }} <span class="metric-unit">pts</span>
            </div>
            <div class="rewards-banner">
              <span class="rewards-icon">🎁</span>
              <span class="rewards-text">您有 2 个可兑换奖励</span>
            </div>
          </div>
        </div>
      </section>

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

/* Compact Streak Counter (under bottle) - Flat Design */
.compact-streak {
  margin-top: 1.5rem;
  padding: 0.875rem 1rem;
  background: linear-gradient(135deg, rgba(248, 251, 246, 0.8), rgba(232, 245, 233, 0.8));
  border-radius: 12px;
  border: 1px solid rgba(0, 100, 24, 0.15);
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 280px;
}

.compact-streak-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.streak-flame-small {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.streak-flame-small.animating {
  animation: flameJumpSmall 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes flameJumpSmall {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.3) rotate(-10deg); }
  50% { transform: scale(1.2) rotate(10deg); }
  75% { transform: scale(1.3) rotate(-5deg); }
}

.flame-emoji-small {
  font-size: 1.75rem;
  filter: drop-shadow(0 2px 6px rgba(255, 100, 0, 0.3));
  animation: flameFlicker 2s ease-in-out infinite;
}

.streak-info-compact {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  flex: 1;
}

.streak-number-compact {
  font-size: 1.5rem;
  font-weight: 900;
  color: #006418;
  line-height: 1;
  letter-spacing: -0.02em;
}

.streak-label-compact {
  font-size: 0.625rem;
  font-weight: 600;
  color: #40493d;
  white-space: nowrap;
}

.compact-streak-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  background: linear-gradient(135deg, #006418, #2a6b2c);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 100, 24, 0.3);
  flex-shrink: 0;
}

.compact-streak-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 10px rgba(0, 100, 24, 0.4);
}

.compact-streak-btn:active {
  transform: translateY(0);
}

.btn-icon-small {
  font-size: 1.125rem;
  font-weight: 700;
}

/* Checked-in button state */
.compact-streak-btn.checked-in {
  background: linear-gradient(135deg, #9e9e9e, #757575);
  cursor: not-allowed;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.compact-streak-btn.checked-in:hover {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.compact-streak-btn.checked-in .btn-icon-small {
  color: #1a1c19;
}

/* 测试按钮 - 恢复打卡 */
.reset-checkin-btn {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(255, 107, 107, 0.3);
}

.reset-checkin-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 10px rgba(255, 107, 107, 0.4);
  background: linear-gradient(135deg, #ff5252, #e63946);
}

.reset-checkin-btn:active {
  transform: translateY(0);
}

/* Check-in Alert Popup */
.check-in-alert {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  animation: alertSlideDown 0.4s ease-out;
}

@keyframes alertSlideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #fff3cd, #ffeaa7);
  border: 2px solid #ffc107;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  animation: alertPulse 0.5s ease-out;
}

@keyframes alertPulse {
  0% {
    transform: scale(0.9);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.alert-icon {
  font-size: 1.5rem;
  animation: iconShake 0.5s ease-out;
}

@keyframes iconShake {
  0%, 100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-10deg);
  }
  75% {
    transform: rotate(10deg);
  }
}

.alert-message {
  font-size: 0.875rem;
  font-weight: 700;
  color: #856404;
  margin: 0;
  white-space: nowrap;
}

/* Profile Header */
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 6rem;
  padding-bottom: 4rem;
  border-bottom: 1px solid rgba(64, 73, 61, 0.2);
}

.header-left {
  flex: 1;
}

.profile-avatar-section {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.avatar-container {
  position: relative;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.avatar-container:hover {
  transform: scale(1.05);
}

.avatar-container:hover .avatar-upload-hint {
  opacity: 1;
}

.avatar-image {
  width: 7rem;
  height: 7rem;
  border-radius: 50%;
  border: 4px solid #e3e3de;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.5rem;
  background: linear-gradient(135deg, #5c946d, #2f5f43);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.avatar-container:hover .avatar-image {
  border-color: #006418;
  box-shadow: 0 4px 16px rgba(0, 100, 24, 0.3);
}

.avatar-upload-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2.5rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  border-radius: 0 0 50% 50%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 0.25rem;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.upload-icon {
  font-size: 1.25rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.verified-badge {
  position: absolute;
  bottom: 0.25rem;
  right: 0.25rem;
  width: 2rem;
  height: 2rem;
  background: #006418;
  border-radius: 50%;
  border: 2px solid #fafaf5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.verified-badge .icon {
  color: white;
  font-weight: 700;
}

.profile-name {
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}

.profile-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.badge {
  padding: 0.25rem 0.75rem;
  background: #acf4a4;
  color: #307231;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.join-days {
  color: #40493d;
  font-size: 0.875rem;
  font-weight: 500;
}

.profile-message {
  font-size: 1.875rem;
  font-weight: 300;
  color: #40493d;
  line-height: 1.5;
  max-width: 48rem;
  margin-top: 1.5rem;
}

.blur-text-container {
  display: flex;
  flex-wrap: wrap;
}

.blur-text-container span {
  color: #40493d !important;
  font-weight: 300;
}

.blur-text-char {
  display: inline-block;
  opacity: 0;
  filter: blur(10px);
  transform: translateY(-20px);
  will-change: transform, filter, opacity;
}

.blur-text-char.is-visible {
  animation: blurTextIn 0.7s ease forwards;
}

@keyframes blurTextIn {
  55% {
    opacity: 0.7;
    filter: blur(5px);
    transform: translateY(5px);
  }

  100% {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}

.blur-text-container .days-highlight {
  color: #006418 !important;
  font-weight: 700;
}

.blur-text-container .days-updating {
  animation: numberPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.profile-message .highlight {
  color: #006418;
  font-weight: 700;
  display: inline-block;
  transition: all 0.3s ease;
}

.profile-message .highlight.updating {
  animation: numberPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes numberPop {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(1.3);
    color: #2a6b2c;
  }
  50% {
    transform: scale(0.95);
  }
  70% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    color: #006418;
  }
}

/* Header Right - Level Display */
.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.level-display {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.level-info {
  text-align: right;
}

.level-number {
  font-size: 3rem;
  font-weight: 900;
  color: #006418;
}

.level-progress-text {
  font-size: 0.75rem;
  color: #40493d;
  font-weight: 500;
  margin-top: 0.5rem;
}

/* Bottle Container - Classic Milk Bottle Shape */
.bottle-container {
  position: relative;
  width: 4.5rem;
  height: 9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.15));
  cursor: pointer;
  transition: transform 0.3s ease;
}

.bottle-container:hover {
  transform: translateY(-4px);
}

/* Bottle Hover Tooltip */
.bottle-tooltip {
  position: absolute;
  top: -3rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #2f5f43, #006418);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 100, 24, 0.3);
  white-space: nowrap;
  z-index: 100;
  animation: tooltipSlideDown 0.3s ease;
  pointer-events: none;
}

@keyframes tooltipSlideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.bottle-tooltip::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #006418;
}

.tooltip-label {
  font-size: 0.625rem;
  opacity: 0.9;
  display: block;
  margin-bottom: 0.125rem;
}

.tooltip-progress {
  font-size: 1rem;
  font-weight: 900;
  display: block;
}

/* Metal Cap */
.bottle-cap {
  width: 2.2rem;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.cap-top {
  width: 100%;
  height: 0.6rem;
  background: linear-gradient(180deg, #e8e8e8, #b0b0b0);
  border-radius: 0.3rem 0.3rem 0 0;
  box-shadow: 
    inset 0 1px 2px rgba(255, 255, 255, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.2);
}

.cap-rim {
  width: 100%;
  height: 0.4rem;
  background: linear-gradient(180deg, #c0c0c0, #909090);
  box-shadow: 
    inset 0 -1px 2px rgba(0, 0, 0, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Narrow Neck */
.bottle-neck {
  width: 2.2rem;
  height: 1.2rem;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.95),
    rgba(245, 250, 248, 0.9)
  );
  border-left: 2px solid rgba(100, 120, 110, 0.2);
  border-right: 2px solid rgba(100, 120, 110, 0.2);
  box-shadow: 
    inset 2px 0 4px rgba(255, 255, 255, 0.6),
    inset -2px 0 4px rgba(0, 100, 24, 0.05);
  position: relative;
  z-index: 9;
}

/* Main Body - Tapered shape (wider at bottom) */
.bottle-body {
  position: relative;
  width: 4.5rem;
  height: 100%;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.98) 0%,
    rgba(248, 252, 250, 0.95) 30%,
    rgba(245, 250, 248, 0.92) 70%,
    rgba(255, 255, 255, 0.98) 100%
  );
  border-left: 2.5px solid rgba(100, 120, 110, 0.25);
  border-right: 2.5px solid rgba(100, 120, 110, 0.25);
  border-bottom: 3px solid rgba(100, 120, 110, 0.3);
  border-radius: 0 0 0.8rem 0.8rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  box-shadow: 
    inset 3px 0 8px rgba(255, 255, 255, 0.8),
    inset -3px 0 8px rgba(0, 100, 24, 0.08),
    inset 0 -3px 6px rgba(0, 100, 24, 0.05),
    0 6px 20px rgba(0, 0, 0, 0.12);
  clip-path: polygon(
    10% 0%, 90% 0%,
    100% 100%, 0% 100%
  );
}

/* Liquid with intense flow */
.bottle-liquid {
  width: 100%;
  background: linear-gradient(180deg, 
    #7cb68a 0%,
    #5c946d 40%,
    #3d6b4f 80%,
    #2f5f43 100%
  );
  position: relative;
  transition: height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Intense wave animations - faster and more dramatic */
.wave {
  position: absolute;
  top: -25px;
  left: -50%;
  width: 200%;
  height: 50px;
  background: rgba(124, 182, 138, 0.7);
  border-radius: 45%;
}

.wave-1 {
  animation: intensiveWave1 1.8s ease-in-out infinite;
  opacity: 0.9;
  z-index: 4;
}

.wave-2 {
  animation: intensiveWave2 2.2s ease-in-out infinite;
  animation-delay: 0.3s;
  opacity: 0.7;
  background: rgba(92, 148, 109, 0.6);
  z-index: 3;
}

.wave-3 {
  animation: intensiveWave3 2.5s ease-in-out infinite;
  animation-delay: 0.6s;
  opacity: 0.5;
  background: rgba(61, 107, 79, 0.5);
  z-index: 2;
}

.wave-4 {
  animation: intensiveWave4 2s ease-in-out infinite;
  animation-delay: 0.9s;
  opacity: 0.4;
  background: rgba(47, 95, 67, 0.4);
  z-index: 1;
}

/* Intense wave animations with gravity feel */
@keyframes intensiveWave1 {
  0%, 100% {
    transform: translateX(0) translateY(0) rotate(0deg) scaleY(1);
  }
  15% {
    transform: translateX(-8%) translateY(-12px) rotate(3deg) scaleY(1.3);
  }
  30% {
    transform: translateX(-18%) translateY(-18px) rotate(-3deg) scaleY(1.5);
  }
  45% {
    transform: translateX(-28%) translateY(-10px) rotate(2deg) scaleY(1.2);
  }
  60% {
    transform: translateX(-38%) translateY(-15px) rotate(-2deg) scaleY(1.4);
  }
  75% {
    transform: translateX(-48%) translateY(-8px) rotate(1deg) scaleY(1.1);
  }
}

@keyframes intensiveWave2 {
  0%, 100% {
    transform: translateX(0) translateY(0) rotate(0deg) scaleY(1);
  }
  20% {
    transform: translateX(-12%) translateY(-15px) rotate(-3deg) scaleY(1.4);
  }
  40% {
    transform: translateX(-24%) translateY(-22px) rotate(3deg) scaleY(1.6);
  }
  60% {
    transform: translateX(-36%) translateY(-12px) rotate(-2deg) scaleY(1.3);
  }
  80% {
    transform: translateX(-48%) translateY(-18px) rotate(2deg) scaleY(1.5);
  }
}

@keyframes intensiveWave3 {
  0%, 100% {
    transform: translateX(0) translateY(0) rotate(0deg) scaleY(1);
  }
  25% {
    transform: translateX(-15%) translateY(-10px) rotate(2deg) scaleY(1.3);
  }
  50% {
    transform: translateX(-30%) translateY(-20px) rotate(-3deg) scaleY(1.6);
  }
  75% {
    transform: translateX(-45%) translateY(-14px) rotate(2deg) scaleY(1.4);
  }
}

@keyframes intensiveWave4 {
  0%, 100% {
    transform: translateX(0) translateY(0) rotate(0deg) scaleY(1);
  }
  20% {
    transform: translateX(-10%) translateY(-8px) rotate(-2deg) scaleY(1.2);
  }
  40% {
    transform: translateX(-20%) translateY(-16px) rotate(2deg) scaleY(1.5);
  }
  60% {
    transform: translateX(-30%) translateY(-12px) rotate(-1deg) scaleY(1.3);
  }
  80% {
    transform: translateX(-40%) translateY(-10px) rotate(1deg) scaleY(1.2);
  }
}

/* Fast rising bubbles */
.bubble {
  position: absolute;
  bottom: 0;
  width: 7px;
  height: 7px;
  background: radial-gradient(circle, 
    rgba(255, 255, 255, 0.9) 0%,
    rgba(124, 182, 138, 0.4) 70%,
    transparent 100%
  );
  border-radius: 50%;
  opacity: 0;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
}

.bubble-1 {
  left: 20%;
  animation: fastBubbleRise1 2.5s ease-in infinite;
}

.bubble-2 {
  left: 45%;
  animation: fastBubbleRise2 3s ease-in infinite;
  animation-delay: 0.6s;
}

.bubble-3 {
  left: 70%;
  animation: fastBubbleRise3 2.8s ease-in infinite;
  animation-delay: 1.2s;
}

.bubble-4 {
  left: 85%;
  animation: fastBubbleRise4 2.6s ease-in infinite;
  animation-delay: 1.8s;
}

@keyframes fastBubbleRise1 {
  0% {
    bottom: 0;
    opacity: 0;
    transform: translateX(0) scale(0.4);
  }
  5% {
    opacity: 1;
  }
  95% {
    opacity: 0.9;
  }
  100% {
    bottom: 100%;
    opacity: 0;
    transform: translateX(15px) scale(1.2);
  }
}

@keyframes fastBubbleRise2 {
  0% {
    bottom: 0;
    opacity: 0;
    transform: translateX(0) scale(0.4);
  }
  5% {
    opacity: 1;
  }
  95% {
    opacity: 0.9;
  }
  100% {
    bottom: 100%;
    opacity: 0;
    transform: translateX(-20px) scale(1.4);
  }
}

@keyframes fastBubbleRise3 {
  0% {
    bottom: 0;
    opacity: 0;
    transform: translateX(0) scale(0.4);
  }
  5% {
    opacity: 1;
  }
  95% {
    opacity: 0.9;
  }
  100% {
    bottom: 100%;
    opacity: 0;
    transform: translateX(12px) scale(1.1);
  }
}

@keyframes fastBubbleRise4 {
  0% {
    bottom: 0;
    opacity: 0;
    transform: translateX(0) scale(0.4);
  }
  5% {
    opacity: 1;
  }
  95% {
    opacity: 0.9;
  }
  100% {
    bottom: 100%;
    opacity: 0;
    transform: translateX(-10px) scale(1.3);
  }
}

/* Glass reflections */
.glass-reflection {
  position: absolute;
  background: linear-gradient(160deg, 
    rgba(255, 255, 255, 0.7) 0%,
    rgba(255, 255, 255, 0.3) 40%,
    transparent 100%
  );
  border-radius: 9999px;
  pointer-events: none;
}

.reflection-left {
  top: 8%;
  left: 6%;
  width: 14px;
  height: 60%;
  animation: reflectionShimmer 4s ease-in-out infinite;
}

.reflection-right {
  top: 20%;
  right: 8%;
  width: 10px;
  height: 45%;
  opacity: 0.6;
  animation: reflectionShimmer 5s ease-in-out infinite;
  animation-delay: 1.5s;
}

@keyframes reflectionShimmer {
  0%, 100% {
    opacity: 0.5;
    transform: translateY(0);
  }
  50% {
    opacity: 0.9;
    transform: translateY(-5px);
  }
}

/* Impact Dashboard */
.impact-dashboard {
  margin-bottom: 6rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 3rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(64, 73, 61, 0.1);
}

.section-title {
  font-size: 1.875rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.period-tabs {
  display: flex;
  gap: 2rem;
}

.tab {
  font-size: 0.875rem;
  font-weight: 500;
  color: #40493d;
  background: none;
  border: none;
  padding-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 2px solid transparent;
}

.tab.active {
  font-weight: 700;
  color: #006418;
  border-bottom-color: #006418;
}

.tab:hover:not(.active) {
  color: #1a1c19;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4rem;
  align-items: flex-end;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  color: #40493d;
  font-weight: 500;
}

.metric-trend {
  color: #006418;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.metric-rank {
  color: #40493d;
  font-size: 0.75rem;
  font-weight: 500;
}

.metric-value {
  font-size: 3.75rem;
  font-weight: 900;
  letter-spacing: -0.05em;
}

.metric-value.points {
  color: #006418;
}

.metric-unit {
  font-size: 1.25rem;
  font-weight: 500;
  color: #40493d;
  margin-left: 0.25rem;
}

.mini-chart {
  height: 6rem;
  display: flex;
  align-items: flex-end;
  gap: 0.375rem;
  position: relative;
}

.mini-chart .bar {
  flex: 1;
  background: #eeeee9;
  border-radius: 0.125rem 0.125rem 0 0;
  transition: all 0.3s;
  position: relative;
  cursor: pointer;
}

.mini-chart .bar:hover {
  opacity: 0.8;
}

.mini-chart .bar.active {
  background: #006418;
}

.mini-chart .bar.hovered {
  transform: scaleY(1.05);
  filter: brightness(1.1);
}

.bar-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: linear-gradient(135deg, #2f5f43, #006418);
  color: white;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 100, 24, 0.3);
  z-index: 100;
  animation: tooltipFadeIn 0.2s ease;
  pointer-events: none;
}

.bar-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #006418;
}

.tooltip-label {
  font-size: 0.625rem;
  opacity: 0.9;
  margin-bottom: 0.125rem;
}

.tooltip-value {
  font-size: 0.875rem;
  font-weight: 700;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.line-chart {
  height: 6rem;
  width: 100%;
  position: relative;
}

.line-chart svg {
  width: 100%;
  height: 100%;
}

.line-chart path {
  transition: stroke-dashoffset 0.5s ease;
}

.line-chart circle {
  transition: all 0.3s ease;
}

.line-tooltip {
  position: absolute;
  transform: translate(-50%, -120%);
  padding: 0.375rem 0.625rem;
  background: linear-gradient(135deg, #2f5f43, #006418);
  color: white;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 100, 24, 0.3);
  z-index: 100;
  animation: tooltipFadeIn 0.2s ease;
  pointer-events: none;
}

.line-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #006418;
}

.rewards-banner {
  height: 6rem;
  display: flex;
  align-items: center;
  padding: 1.25rem;
  background: rgba(0, 100, 24, 0.05);
  border-radius: 1rem;
  gap: 1rem;
  border: 1px solid rgba(0, 100, 24, 0.1);
}

.rewards-icon {
  font-size: 1.5rem;
}

.rewards-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #006418;
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
  .profile-header {
    flex-direction: column;
  }

  .header-right {
    align-items: flex-start;
    width: 100%;
  }

  .compact-streak {
    max-width: 100%;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  .tasks-achievements-grid {
    grid-template-columns: 1fr;
    gap: 4rem;
  }
}

@media (max-width: 768px) {
  .profile-content {
    padding: 2rem 1rem;
  }

  .profile-avatar-section {
    flex-direction: column;
    text-align: center;
  }

  .profile-name {
    font-size: 2rem;
  }

  .profile-message {
    font-size: 1.25rem;
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

  .level-display {
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .level-info {
    text-align: center;
  }

  .compact-streak {
    margin-top: 1.5rem;
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

@keyframes flameFlicker {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 2px 8px rgba(255, 100, 0, 0.3)); }
  50% { transform: scale(1.05); filter: drop-shadow(0 4px 12px rgba(255, 100, 0, 0.5)); }
}

.profile-header {
  animation: fadeInUp 0.5s ease forwards;
}

.calendar-section {
  animation: fadeInUp 0.5s ease forwards;
  animation-delay: 0.1s;
  opacity: 0;
}

.impact-dashboard {
  animation: fadeInUp 0.5s ease forwards;
  animation-delay: 0.2s;
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
