<script setup>
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  MIN_PASSWORD_LENGTH,
  ROLE_CLIENT,
  login,
  register,
} from "../../utils/auth";

const router = useRouter();
const route = useRoute();

const isRightPanelActive = ref(false);
const statusText = ref("");
const isSubmitting = ref(false);
const showLoginPassword = ref(false);
const showRegisterPassword = ref(false);
const showRegisterConfirm = ref(false);
const shakeLoginUsername = ref(false);
const shakeLoginPassword = ref(false);
const passwordStrength = ref(0);
const passwordStrengthText = ref("");
const passwordRequirements = reactive({
  length: false,
  lowercase: false,
  uppercase: false,
  number: false,
  special: false,
});

const loginForm = reactive({
  username: "",
  password: "",
});

const registerForm = reactive({
  displayName: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: ROLE_CLIENT,
});

const roleHints = {
  [ROLE_CLIENT]: "适合居民用户，使用预约回收、订单追踪和环保科普。",
};

const activeRoleHint = computed(() => roleHints[registerForm.role]);

function resolveTarget(user) {
  if (route.query.redirect && typeof route.query.redirect === "string") {
    return route.query.redirect;
  }
  return "/";
}

function setStatus(text) {
  statusText.value = text;
}

function isValidUsername(value) {
  const text = value.trim();
  if (!text) return false;
  if (text.length < 4) return false;
  return true;
}

function validateLogin() {
  if (!isValidUsername(loginForm.username)) {
    return { valid: false, field: "username", message: "请输入有效账号（至少 4 位）" };
  }
  if (!loginForm.password.trim()) {
    return { valid: false, field: "password", message: "请输入密码" };
  }
  return { valid: true };
}

function validateRegister() {
  if (!registerForm.displayName.trim()) {
    return "请填写昵称";
  }
  if (!isValidUsername(registerForm.username)) {
    return "请填写有效账号（至少 4 位）";
  }
  if (registerForm.password.trim().length < MIN_PASSWORD_LENGTH) {
    return `密码至少 ${MIN_PASSWORD_LENGTH} 位`;
  }
  if (registerForm.confirmPassword.trim() !== registerForm.password.trim()) {
    return "两次输入密码不一致";
  }
  return "";
}

async function submitLogin() {
  if (isSubmitting.value) return;
  setStatus("");
  shakeLoginUsername.value = false;
  shakeLoginPassword.value = false;
  
  const validation = validateLogin();
  if (!validation.valid) {
    setStatus(validation.message);
    
    // 触发对应字段的抖动动画
    if (validation.field === "username") {
      shakeLoginUsername.value = true;
      setTimeout(() => {
        shakeLoginUsername.value = false;
      }, 650);
    } else if (validation.field === "password") {
      shakeLoginPassword.value = true;
      setTimeout(() => {
        shakeLoginPassword.value = false;
      }, 650);
    }
    return;
  }

  isSubmitting.value = true;
  const result = login(loginForm.username, loginForm.password);
  isSubmitting.value = false;

  if (!result.ok) {
    setStatus(result.message);
    
    // 登录失败时，根据错误信息判断是账号还是密码错误
    // 这里假设密码错误，你可以根据实际的 result.message 来判断
    if (result.message.includes("密码") || result.message.includes("password")) {
      shakeLoginPassword.value = true;
      setTimeout(() => {
        shakeLoginPassword.value = false;
      }, 650);
    } else if (result.message.includes("账号") || result.message.includes("用户") || result.message.includes("username")) {
      shakeLoginUsername.value = true;
      setTimeout(() => {
        shakeLoginUsername.value = false;
      }, 650);
    } else {
      // 如果无法判断，两个都抖动
      shakeLoginUsername.value = true;
      shakeLoginPassword.value = true;
      setTimeout(() => {
        shakeLoginUsername.value = false;
        shakeLoginPassword.value = false;
      }, 650);
    }
    return;
  }

  router.push(resolveTarget(result.user));
}

async function submitRegister() {
  if (isSubmitting.value) return;
  setStatus("");
  const message = validateRegister();
  if (message) {
    setStatus(message);
    return;
  }

  isSubmitting.value = true;
  const result = register({
    username: registerForm.username,
    password: registerForm.password,
    role: registerForm.role,
    displayName: registerForm.displayName,
  });
  isSubmitting.value = false;

  if (!result.ok) {
    setStatus(result.message);
    return;
  }

  setStatus("注册成功，请登录。");
  isRightPanelActive.value = false;
  loginForm.username = registerForm.username;
  loginForm.password = registerForm.password;
}

function fillClientDemo() {
  isRightPanelActive.value = false;
  loginForm.username = "user@szt.com";
  loginForm.password = "123456";
  setStatus("已填充 C 端测试账号。");
}

function switchToSignUp() {
  isRightPanelActive.value = true;
  setStatus("");
}

function switchToSignIn() {
  isRightPanelActive.value = false;
  setStatus("");
}

function calculatePasswordStrength(password) {
  if (!password) {
    passwordStrength.value = 0;
    passwordStrengthText.value = "";
    passwordRequirements.length = false;
    passwordRequirements.lowercase = false;
    passwordRequirements.uppercase = false;
    passwordRequirements.number = false;
    passwordRequirements.special = false;
    return;
  }

  let strength = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  // 更新要求状态
  passwordRequirements.length = checks.length;
  passwordRequirements.lowercase = checks.lowercase;
  passwordRequirements.uppercase = checks.uppercase;
  passwordRequirements.number = checks.number;
  passwordRequirements.special = checks.special;

  // 计算强度分数
  if (checks.length) strength += 1;
  if (checks.lowercase) strength += 1;
  if (checks.uppercase) strength += 1;
  if (checks.number) strength += 1;
  if (checks.special) strength += 1;

  // 额外加分：长度超过12位
  if (password.length >= 12) strength += 0.5;

  // 归一化到 0-4
  passwordStrength.value = Math.min(strength, 4);

  // 设置文字提示
  if (passwordStrength.value <= 1) {
    passwordStrengthText.value = "弱";
  } else if (passwordStrength.value <= 2) {
    passwordStrengthText.value = "一般";
  } else if (passwordStrength.value <= 3) {
    passwordStrengthText.value = "强";
  } else {
    passwordStrengthText.value = "非常强";
  }
}

function onPasswordInput() {
  calculatePasswordStrength(registerForm.password);
}
</script>

<template>
  <main class="auth-page">
    <div :class="['container', { 'right-panel-active': isRightPanelActive }]" id="container">
      <!-- 注册表单 -->
      <div class="form-container sign-up-container">
        <form @submit.prevent="submitRegister">
          <h1>创建账号</h1>
          <span>使用您的信息进行注册</span>
          
          <input v-model="registerForm.displayName" type="text" placeholder="昵称（例如：绿色生活家）" />
          <input v-model="registerForm.username" type="text" placeholder="账号（邮箱或手机号，至少 4 位）" />
          
          <div class="password-input-wrapper">
            <input
              v-model="registerForm.password"
              :type="showRegisterPassword ? 'text' : 'password'"
              :placeholder="`密码（至少 ${MIN_PASSWORD_LENGTH} 位）`"
              class="password-input"
              @input="onPasswordInput"
            />
            <button class="toggle-password-icon" type="button" @click="showRegisterPassword = !showRegisterPassword" :aria-label="showRegisterPassword ? '隐藏密码' : '显示密码'">
              <svg v-if="!showRegisterPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
          </div>
          
          <!-- 密码强度指示器 -->
          <div v-if="registerForm.password" class="password-strength-container">
            <div class="password-strength-bar">
              <div 
                class="password-strength-fill" 
                :class="`strength-${Math.floor(passwordStrength)}`"
                :style="{ width: `${(passwordStrength / 4) * 100}%` }"
              ></div>
            </div>
            <span class="password-strength-text" :class="`strength-text-${Math.floor(passwordStrength)}`">
              密码强度：{{ passwordStrengthText }}
            </span>
            
            <!-- 密码要求列表 -->
            <ul class="password-requirements">
              <li :class="{ 'requirement-met': passwordRequirements.length }">
                至少 8 个字符
              </li>
              <li :class="{ 'requirement-met': passwordRequirements.lowercase }">
                包含小写字母 (a-z)
              </li>
              <li :class="{ 'requirement-met': passwordRequirements.uppercase }">
                包含大写字母 (A-Z)
              </li>
              <li :class="{ 'requirement-met': passwordRequirements.number }">
                包含数字 (0-9)
              </li>
              <li :class="{ 'requirement-met': passwordRequirements.special }">
                包含特殊字符 (!@#$%^&*)
              </li>
            </ul>
          </div>
          
          <div class="password-input-wrapper">
            <input
              v-model="registerForm.confirmPassword"
              :type="showRegisterConfirm ? 'text' : 'password'"
              placeholder="确认密码"
              class="password-input"
            />
            <button class="toggle-password-icon" type="button" @click="showRegisterConfirm = !showRegisterConfirm" :aria-label="showRegisterConfirm ? '隐藏密码' : '显示密码'">
              <svg v-if="!showRegisterConfirm" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
          </div>
          
          <p class="role-hint">{{ activeRoleHint }}</p>
          
          <button type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? "提交中..." : "注册" }}
          </button>
          
          <p v-if="statusText" class="message" :class="statusText.includes('成功') ? 'success-msg' : 'error-msg'">
            {{ statusText }}
          </p>
        </form>
      </div>

      <!-- 登录表单 -->
      <div class="form-container sign-in-container">
        <form @submit.prevent="submitLogin">
          <h1>登录</h1>
          <span>使用您的账号登录</span>
          
          <input 
            v-model="loginForm.username" 
            type="text" 
            placeholder="账号（邮箱或手机号）"
            :class="{ 'shake-animation': shakeLoginUsername }"
          />
          
          <div class="password-input-wrapper" :class="{ 'shake-animation': shakeLoginPassword }">
            <input
              v-model="loginForm.password"
              :type="showLoginPassword ? 'text' : 'password'"
              placeholder="密码"
              class="password-input"
            />
            <button class="toggle-password-icon" type="button" @click="showLoginPassword = !showLoginPassword" :aria-label="showLoginPassword ? '隐藏密码' : '显示密码'">
              <svg v-if="!showLoginPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
          </div>
          
          <a href="#" class="demo-link" @click.prevent="fillClientDemo">填充测试账号</a>
          
          <button type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? "登录中..." : "登录" }}
          </button>
          
          <p v-if="statusText" class="message" :class="statusText.includes('成功') ? 'success-msg' : 'error-msg'">
            {{ statusText }}
          </p>
        </form>
      </div>

      <!-- 覆盖层容器 -->
      <div class="overlay-container">
        <div class="overlay">
          <div class="overlay-panel overlay-left">
            <h1>欢迎回来！</h1>
            <p>登录后即可进入 C 端用户界面，体验预约回收、AI 识别和个人订单服务</p>
            <button class="ghost" @click="switchToSignIn">登录</button>
          </div>
          <div class="overlay-panel overlay-right">
            <h1>你好，朋友！</h1>
            <p>填写您的个人信息，开始使用收智通服务</p>
            <p class="feature-text">预约回收 · AI 识别 · 订单追踪 · 环保科普</p>
            <button class="ghost" @click="switchToSignUp">注册</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.auth-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-family: var(--font-body);
  background: 
    radial-gradient(circle at 0% 0%, rgba(70, 135, 86, 0.26), transparent 29%),
    radial-gradient(circle at 100% 10%, rgba(198, 158, 104, 0.24), transparent 34%),
    linear-gradient(180deg, #eaf1e7 0%, #f5f5ed 45%, #f1ecde 100%);
  padding: 40px 20px;
  position: relative;
}

.auth-page::before {
  content: "";
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.26), transparent 22%),
    repeating-linear-gradient(
      110deg,
      rgba(255, 255, 255, 0.1) 0,
      rgba(255, 255, 255, 0.1) 1px,
      transparent 1px,
      transparent 16px
    );
  opacity: 0.24;
  pointer-events: none;
}

h1 {
  font-family: var(--font-display);
  font-weight: 700;
  margin: 0;
  font-size: 2rem;
  color: var(--ink-900);
}

p {
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: 0.3px;
  margin: 20px 0 30px;
  color: var(--ink-700);
}

span {
  font-size: 12px;
  color: var(--ink-600);
}

a {
  color: var(--forest-600);
  font-size: 14px;
  text-decoration: none;
  margin: 15px 0;
  transition: color 0.3s ease;
}

.demo-link {
  color: var(--moss-500);
  font-weight: 600;
}

.demo-link:hover {
  color: var(--forest-700);
  text-decoration: underline;
}

button {
  border-radius: 20px;
  border: 1px solid var(--moss-500);
  background: linear-gradient(140deg, var(--forest-700), var(--moss-500) 58%, #5d9a74);
  color: #f7fff9;
  font-size: 12px;
  font-weight: 700;
  padding: 12px 45px;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: all 0.3s ease;
  cursor: pointer;
  font-family: var(--font-body);
}

button:active {
  transform: scale(0.95);
}

button:focus {
  outline: 2px solid var(--moss-300);
  outline-offset: 2px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(31, 89, 57, 0.34);
}

button.ghost {
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.9);
  color: #ffffff;
}

button.ghost:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: #ffffff;
}

form {
  background: 
    linear-gradient(132deg, rgba(255, 255, 255, 0.95), rgba(247, 249, 242, 0.92)),
    var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 0 50px;
  height: 100%;
  text-align: center;
}

form > * {
  width: 100%;
}

input {
  background: rgba(236, 239, 228, 0.4);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  padding: 12px 15px;
  margin: 8px 0;
  width: 100%;
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--ink-900);
  transition: all 0.3s ease;
  box-sizing: border-box;
}

input::placeholder {
  color: var(--ink-500);
}

input:focus {
  outline: none;
  border-color: var(--moss-500);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 3px rgba(79, 141, 96, 0.1);
}

/* 抖动动画 */
@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-10px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(10px);
  }
}

.shake-animation {
  animation: shake 0.65s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  border-color: rgba(194, 131, 47, 0.6) !important;
  background: rgba(255, 242, 232, 0.5) !important;
}

.shake-animation input {
  border-color: rgba(194, 131, 47, 0.6) !important;
  background: rgba(255, 242, 232, 0.5) !important;
}

.shake-animation .toggle-password-icon {
  animation: shake 0.65s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.password-input-wrapper {
  width: 100%;
  position: relative;
  margin: 8px 0;
  box-sizing: border-box;
}

.password-input-wrapper input {
  width: 100%;
  margin: 0 !important;
  padding-right: 50px !important;
  box-sizing: border-box;
}

.password-input {
  width: 100%;
  box-sizing: border-box;
}

.toggle-password-icon {
  position: absolute !important;
  right: 8px !important;
  top: 50% !important;
  padding: 8px !important;
  margin: 0 !important;
  background: transparent !important;
  border: none !important;
  color: var(--ink-600) !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 6px !important;
  transition: color 0.2s ease, background 0.2s ease !important;
  min-width: 32px !important;
  width: 32px !important;
  height: 32px !important;
  z-index: 10 !important;
  pointer-events: auto !important;
  flex-shrink: 0 !important;
  transform: translateY(-50%) !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  font-size: 14px !important;
}

.toggle-password-icon:hover {
  background: rgba(79, 141, 96, 0.1) !important;
  color: var(--moss-500) !important;
  transform: translateY(-50%) !important;
}

.toggle-password-icon:active {
  background: rgba(79, 141, 96, 0.15) !important;
  transform: translateY(-50%) !important;
}

.toggle-password-icon:focus {
  outline: 2px solid var(--moss-300) !important;
  outline-offset: 2px !important;
  transform: translateY(-50%) !important;
}

.toggle-password-icon svg {
  display: block !important;
  flex-shrink: 0 !important;
  width: 20px !important;
  height: 20px !important;
}

/* 密码强度指示器 */
.password-strength-container {
  width: 100%;
  margin: 8px 0 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.password-strength-bar {
  width: 100%;
  height: 6px;
  background: rgba(236, 239, 228, 0.5);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}

.password-strength-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.password-strength-fill.strength-0,
.password-strength-fill.strength-1 {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
}

.password-strength-fill.strength-2 {
  background: linear-gradient(90deg, #f39c12, #e67e22);
}

.password-strength-fill.strength-3 {
  background: linear-gradient(90deg, #f1c40f, #f39c12);
}

.password-strength-fill.strength-4 {
  background: linear-gradient(90deg, var(--moss-500), var(--forest-600));
}

.password-strength-text {
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  transition: color 0.3s ease;
}

.password-strength-text.strength-text-0,
.password-strength-text.strength-text-1 {
  color: #c0392b;
}

.password-strength-text.strength-text-2 {
  color: #e67e22;
}

.password-strength-text.strength-text-3 {
  color: #f39c12;
}

.password-strength-text.strength-text-4 {
  color: var(--forest-600);
}

/* 密码要求列表 */
.password-requirements {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.password-requirements li {
  font-size: 11px;
  color: var(--ink-600);
  padding-left: 20px;
  position: relative;
  transition: all 0.3s ease;
  text-align: left;
}

.password-requirements li::before {
  content: "✗";
  position: absolute;
  left: 0;
  color: #c0392b;
  font-weight: bold;
  transition: all 0.3s ease;
}

.password-requirements li.requirement-met {
  color: var(--forest-600);
  text-decoration: line-through;
  opacity: 0.7;
}

.password-requirements li.requirement-met::before {
  content: "✓";
  color: var(--moss-500);
}

.role-hint {
  font-size: 11px;
  color: var(--ink-600);
  margin: 5px 0 15px;
  line-height: 1.4;
  padding: 8px 12px;
  background: rgba(236, 239, 228, 0.3);
  border-radius: 8px;
  border-left: 3px solid var(--moss-300);
}

.message {
  font-size: 13px;
  margin: 15px 0 0;
  padding: 10px 14px;
  border-radius: 10px;
  min-height: auto;
  font-weight: 500;
}

.success-msg {
  color: var(--forest-700);
  background: rgba(220, 233, 218, 0.6);
  border: 1px solid var(--moss-300);
}

.error-msg {
  color: #8f431d;
  background: rgba(255, 242, 232, 0.8);
  border: 1px solid rgba(194, 131, 47, 0.3);
}

.container {
  background: 
    linear-gradient(132deg, rgba(255, 255, 255, 0.88), rgba(247, 249, 242, 0.82)),
    var(--surface);
  border-radius: 28px 10px 28px 10px;
  border: 1px solid var(--line-soft);
  box-shadow: var(--shadow-card);
  position: relative;
  overflow: hidden;
  width: 768px;
  max-width: 100%;
  min-height: 520px;
  z-index: 1;
}

.container::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.55);
  pointer-events: none;
  z-index: 1;
}

.container::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 44px;
  height: 44px;
  border-radius: 0 10px 0 14px;
  background: linear-gradient(145deg, rgba(223, 191, 144, 0.24), rgba(140, 186, 145, 0.2));
  pointer-events: none;
  z-index: 1;
}

.form-container {
  position: absolute;
  top: 0;
  height: 100%;
  transition: all 0.6s ease-in-out;
}

.sign-in-container {
  left: 0;
  width: 50%;
  z-index: 2;
}

.container.right-panel-active .sign-in-container {
  transform: translateX(100%);
}

.sign-up-container {
  left: 0;
  width: 50%;
  opacity: 0;
  z-index: 1;
}

.container.right-panel-active .sign-up-container {
  transform: translateX(100%);
  opacity: 1;
  z-index: 5;
  animation: show 0.6s;
}

@keyframes show {
  0%,
  49.99% {
    opacity: 0;
    z-index: 1;
  }

  50%,
  100% {
    opacity: 1;
    z-index: 5;
  }
}

.overlay-container {
  position: absolute;
  top: 0;
  left: 50%;
  width: 50%;
  height: 100%;
  overflow: hidden;
  transition: transform 0.6s ease-in-out;
  z-index: 100;
}

.container.right-panel-active .overlay-container {
  transform: translateX(-100%);
}

.overlay {
  background: 
    radial-gradient(circle at 92% 0%, rgba(180, 206, 122, 0.3), transparent 38%),
    linear-gradient(152deg, rgba(17, 40, 29, 0.95), rgba(34, 67, 49, 0.92)),
    linear-gradient(135deg, var(--forest-700) 0%, var(--moss-500) 100%);
  background-repeat: no-repeat;
  background-size: cover;
  background-position: 0 0;
  color: #ecf8ef;
  position: relative;
  left: -100%;
  height: 100%;
  width: 200%;
  transform: translateX(0);
  transition: transform 0.6s ease-in-out;
}

.overlay::before {
  content: "";
  position: absolute;
  inset: 0;
  background: 
    repeating-linear-gradient(
      110deg,
      rgba(255, 255, 255, 0.05) 0,
      rgba(255, 255, 255, 0.05) 1px,
      transparent 1px,
      transparent 16px
    );
  opacity: 0.3;
  pointer-events: none;
}

.container.right-panel-active .overlay {
  transform: translateX(50%);
}

.overlay-panel {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 0 40px;
  text-align: center;
  top: 0;
  height: 100%;
  width: 50%;
  transform: translateX(0);
  transition: transform 0.6s ease-in-out;
}

.overlay-panel h1 {
  color: #f2fff4;
  font-family: var(--font-display);
  font-size: 2.2rem;
  margin-bottom: 16px;
}

.overlay-panel p {
  color: rgba(221, 240, 225, 0.9);
  line-height: 1.7;
  font-size: 15px;
}

.feature-text {
  font-size: 13px;
  margin: 10px 0 20px;
  opacity: 0.85;
  color: rgba(180, 206, 122, 0.95);
  font-weight: 600;
  letter-spacing: 0.5px;
}

.overlay-left {
  transform: translateX(-20%);
}

.container.right-panel-active .overlay-left {
  transform: translateX(0);
}

.overlay-right {
  right: 0;
  transform: translateX(0);
}

.container.right-panel-active .overlay-right {
  transform: translateX(20%);
}

@media (max-width: 768px) {
  .container {
    width: 100%;
    min-height: 600px;
  }

  h1 {
    font-size: 1.5rem;
  }

  form {
    padding: 0 30px;
  }

  .overlay-panel h1 {
    font-size: 1.8rem;
  }

  .overlay-panel p {
    font-size: 13px;
  }
}
</style>
