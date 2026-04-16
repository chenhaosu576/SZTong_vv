# ProfilePage 日历日期与预约关联功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现ProfilePage.vue日历动态获取真实日期，并在日历中显示预约记录

**Architecture:** 在timeApi.js中封装日期API调用和订单关联逻辑，ProfilePage.vue调用这些接口实现日历动态渲染

**Tech Stack:** Vue 3, JavaScript, HTML/CSS

---

## 文件结构

- **Create:** `frontend/src/mock/timeApi.js` - 新增日期API和订单关联逻辑
- **Modify:** `frontend/src/views/client/ProfilePage.vue` - 调用timeApi实现动态日历

---

## 实现计划

### Task 1: 创建 timeApi.js 实现日期API和订单关联

**Files:**
- Create: `frontend/src/mock/timeApi.js`

- [ ] **Step 1: 编写 timeApi.js 基础结构**

```javascript
// 导入clientApi中的fetchOrders函数
import { fetchOrders } from './clientApi';

// 获取真实日期
export async function fetchRealDate() {
  try {
    const response = await fetch('https://cn.apihz.cn/api/time/getday.php');
    const data = await response.json();
    if (data.code === 200) {
      return {
        year: parseInt(data.time.year),
        month: parseInt(data.time.month) - 1,
        day: parseInt(data.time.day)
      };
    }
    throw new Error(data.msg);
  } catch (error) {
    console.error('获取日期失败:', error);
    return null;
  }
}

// 获取带预约关联的日历数据
export async function fetchCalendarWithOrders(year, month) {
  try {
    const orders = await fetchOrders();
    
    const monthOrders = orders.filter(order => {
      if (!order.date) return false;
      const orderDate = new Date(order.date);
      return orderDate.getFullYear() === year && orderDate.getMonth() === month;
    });
    
    const orderMap = {};
    monthOrders.forEach(order => {
      const orderDate = new Date(order.date);
      const day = orderDate.getDate();
      if (!orderMap[day]) {
        orderMap[day] = [];
      }
      orderMap[day].push(order);
    });
    
    return orderMap;
  } catch (error) {
    console.error('获取订单失败:', error);
    return {};
  }
}

// 回退到浏览器日期
export function getFallbackDate() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate()
  };
}
```

- [ ] **Step 2: 保存文件到 frontend/src/mock/timeApi.js**

---

### Task 2: 修改 ProfilePage.vue 调用 timeApi

**Files:**
- Modify: `frontend/src/views/client/ProfilePage.vue:1-30` (imports部分)
- Modify: `frontend/src/views/client/ProfilePage.vue:350-366` (loadProfile函数)
- Modify: `frontend/src/views/client/ProfilePage.vue:292-328` (generateCalendar函数)

- [ ] **Step 1: 添加 timeApi 导入**

在 `<script setup>` 开始处添加：
```javascript
import { fetchRealDate, fetchCalendarWithOrders, getFallbackDate } from "../../mock/timeApi";
```

- [ ] **Step 2: 添加 orderMap 状态变量**

在现有状态变量区域添加：
```javascript
const orderMap = ref({}); // 订单映射
```

- [ ] **Step 3: 修改 loadProfile 函数**

```javascript
async function loadProfile() {
  loading.value = true;
  errorText.value = "";
  try {
    profile.value = await fetchProfileData();
    
    // 获取真实日期
    const realDate = await fetchRealDate();
    if (realDate) {
      currentMonth.value = new Date(realDate.year, realDate.month, 1);
    } else {
      currentMonth.value = new Date();
    }
    
    // 获取当月订单
    const year = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth();
    orderMap.value = await fetchCalendarWithOrders(year, month);
    
    generateCalendar();
    checkTodayCheckIn();
  } catch (error) {
    errorText.value = "个人信息加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}
```

- [ ] **Step 4: 修改 generateCalendar 函数**

将现有的 generateCalendar 函数修改为接收 orderMap 参数：
```javascript
function generateCalendar() {
  const days = [];
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let i = 0; i < firstDayAdjusted; i++) {
    days.push({ empty: true });
  }
  
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
      intensity,
      emission: intensity * (Math.random() * 4 + 2),
      isToday: date.toDateString() === new Date().toDateString()
    });
  }
  
  calendarDays.value = days;
}
```

- [ ] **Step 5: 测试验证**

运行 `npm run dev`，访问 `/profile` 页面：
1. 检查日历是否显示当月日期
2. 提交预约后刷新页面，检查日历是否有活动标记
3. 切换月份检查订单数据更新

---

### Task 3: 验证功能完整性

- [ ] **Step 1: 测试日期API失败时的回退逻辑**

- [ ] **Step 2: 验证不同状态订单的显示**

- [ ] **Step 3: 测试切换月份时的数据更新**

---

## 执行选择

**Plan complete and saved to `docs/superpowers/plans/2026-04-14-profile-calendar-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**