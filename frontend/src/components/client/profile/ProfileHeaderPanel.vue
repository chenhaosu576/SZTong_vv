<!--
  ProfileHeaderPanel.vue
  顶部个人信息整区 (avatar + 认证角标 + 用户名 + 等级身份标签 +
  守护天数 blur 文本 + 等级瓶子 + 连续打卡卡片)。
  4 个 sub-block 全部 inline 在本 panel:
    1) avatar: 校验 + FileReader + localStorage.userAvatar
    2) blur text: IntersectionObserver + 字符级高亮
    3) level bottle: 液体高度 + 4 段波浪 + 气泡 + 玻璃反光 + hover tooltip
    4) streak card: 火焰动画 + 天数 + 已打卡按钮 + 调试 reset 按钮
  页面通过标量 prop 喂入 name / points / levelText / carbonText + 计算好的
  streak / guardian / levelProgress / anim flags，事件通过 check-in /
  reset-check-in emit 上抛。
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const AVATAR_STORAGE_KEY = "userAvatar";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const props = defineProps({
  name: { type: String, default: "" },
  points: { type: Number, default: 0 },
  levelText: { type: String, default: "Lv.1 入门用户" },
  carbonText: { type: String, default: "" },
  guardianDays: { type: Number, default: 0 },
  levelProgress: { type: Number, default: 0 },
  isGuardianDaysUpdating: { type: Boolean, default: false },
  streakDays: { type: Number, default: 0 },
  hasCheckedInToday: { type: Boolean, default: false },
  isStreakAnimating: { type: Boolean, default: false },
  showDebugReset: { type: Boolean, default: false },
});

const emit = defineEmits(["check-in", "reset-check-in"]);

// Avatar
const avatarUrl = ref(localStorage.getItem(AVATAR_STORAGE_KEY) || null);
const avatarFileInput = ref(null);

function triggerAvatarUpload() {
  avatarFileInput.value?.click();
}

function handleAvatarChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("请选择图片文件");
    return;
  }

  if (file.size > MAX_AVATAR_BYTES) {
    alert("图片大小不能超过5MB");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    avatarUrl.value = base64;
    localStorage.setItem(AVATAR_STORAGE_KEY, base64);
  };
  reader.readAsDataURL(file);
}

// Blur text
const blurMessageRef = ref(null);
const blurTextInView = ref(true);
let blurTextObserver = null;

const blurTextContent = `你已通过回收行动累计为地球守护了 ${props.guardianDays} 天。感谢你的每一份坚持。`;

const blurTextElements = computed(() => {
  const text = blurTextContent;
  const highlight = String(props.guardianDays);
  const highlightIndex = text.indexOf(highlight);
  return text.split("").map((char, index) => ({
    char,
    isHighlighted: highlightIndex >= 0 && index >= highlightIndex && index < highlightIndex + highlight.length,
  }));
});

onMounted(() => {
  if (!blurMessageRef.value || typeof IntersectionObserver === "undefined") return;
  blurTextObserver = new IntersectionObserver(
    ([entry]) => {
      blurTextInView.value = entry.isIntersecting;
    },
    { threshold: 0.1, rootMargin: "0px" },
  );
  blurTextObserver.observe(blurMessageRef.value);
});

onBeforeUnmount(() => {
  blurTextObserver?.disconnect();
});

// Bottle hover
const isBottleHovered = ref(false);
</script>

<template>
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
        <input
          ref="avatarFileInput"
          type="file"
          accept="image/*"
          class="avatar-input"
          @change="handleAvatarChange"
        />
        <div class="profile-info">
          <h1 class="profile-name">你好，{{ props.name }}</h1>
          <div class="profile-meta">
            <span class="badge">高级环保达人</span>
            <span class="join-days">已加入 1,240 天</span>
          </div>
        </div>
      </div>
      <p
        ref="blurMessageRef"
        class="profile-message blur-text-container"
      >
        <span
          v-for="(item, index) in blurTextElements"
          :key="index"
          :class="{
            'blur-text-char': true,
            'is-visible': blurTextInView,
            'days-highlight': item.isHighlighted,
            'days-updating': item.isHighlighted && isGuardianDaysUpdating,
          }"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          {{ item.char === ' ' ? ' ' : item.char }}
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
          <div class="bottle-cap">
            <div class="cap-top"></div>
            <div class="cap-rim"></div>
          </div>
          <div class="bottle-neck"></div>
          <div class="bottle-body">
            <div class="bottle-liquid" :style="{ height: levelProgress + '%' }">
              <div class="wave wave-1"></div>
              <div class="wave wave-2"></div>
              <div class="wave wave-3"></div>
              <div class="wave wave-4"></div>
              <div class="bubble bubble-1"></div>
              <div class="bubble bubble-2"></div>
              <div class="bubble bubble-3"></div>
              <div class="bubble bubble-4"></div>
            </div>
            <div class="glass-reflection reflection-left"></div>
            <div class="glass-reflection reflection-right"></div>
          </div>

          <div v-if="isBottleHovered" class="bottle-tooltip">
            <span class="bottle-tooltip-label">当前等级进度</span>
            <span class="bottle-tooltip-progress">{{ levelProgress.toFixed(0) }}%</span>
          </div>
        </div>
      </div>

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
            @click="emit('check-in')"
          >
            <span class="btn-icon-small">✓</span>
          </button>
        </div>
        <button
          v-if="showDebugReset"
          class="reset-checkin-btn"
          @click="emit('reset-check-in')"
          title="测试用：重置打卡状态"
        >
          🔄 恢复打卡
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 6rem;
  padding-bottom: 4rem;
  border-bottom: 1px solid rgba(64, 73, 61, 0.2);
  animation: fadeInUp 0.5s ease forwards;
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

.avatar-input {
  display: none;
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

.bottle-tooltip-label {
  font-size: 0.625rem;
  opacity: 0.9;
  display: block;
  margin-bottom: 0.125rem;
}

.bottle-tooltip-progress {
  font-size: 1rem;
  font-weight: 900;
  display: block;
}

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

@keyframes flameFlicker {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 2px 8px rgba(255, 100, 0, 0.3)); }
  50% { transform: scale(1.05); filter: drop-shadow(0 4px 12px rgba(255, 100, 0, 0.5)); }
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
}

@media (max-width: 768px) {
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
