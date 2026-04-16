# ProfilePage 日历日期与预约关联功能设计

## 1. 需求概述

- 将 ProfilePage.vue 中写死的日期改成动态获取
- 使用阿里云真实日期API：https://cn.apihz.cn/api/time/getday.php
- 用户在 AppointmentPage.vue 完成预约后，在 ProfilePage.vue 的日历中可以看到对应的预约记录

## 2. 用户交互确认

- **日期获取方式**: 使用提供的API获取真实日期
- **预约显示时机**: 所有预约都显示（包含待核验、待上门等状态）
- **日历显示逻辑**: 日历显示当月日期，有预约的日期显示活动标记

## 3. 技术方案

### 3.1 日期API层 (timeApi.js)

新增两个核心函数：

```javascript
// 获取真实日期
export async function fetchRealDate() {
  try {
    const response = await fetch('https://cn.apihz.cn/api/time/getday.php');
    const data = await response.json();
    if (data.code === 200) {
      return {
        year: parseInt(data.time.year),
        month: parseInt(data.time.month) - 1, // JS月份从0开始
        day: parseInt(data.time.day)
      };
    }
    throw new Error(data.msg);
  } catch (error) {
    console.error('获取日期失败:', error);
    return null;
  }
}
```

```javascript
// 获取带预约关联的日历数据
export async function fetchCalendarWithOrders(year, month) {
  // 1. 获取当月所有订单
  const orders = await fetchOrders();
  
  // 2. 过滤当月订单
  const monthOrders = orders.filter(order => {
    if (!order.date) return false;
    const orderDate = new Date(order.date);
    return orderDate.getFullYear() === year && orderDate.getMonth() === month;
  });
  
  // 3. 构建日期映射
  const orderMap = {};
  monthOrders.forEach(order => {
    const day = new Date(order.date).getDate();
    if (!orderMap[day]) {
      orderMap[day] = [];
    }
    orderMap[day].push(order);
  });
  
  return orderMap;
}
```

### 3.2 ProfilePage.vue 改动

**状态变量**:
- `currentMonth` 改为从API获取的真实日期
- 新增 `orderMap` 存储订单映射

**生命周期**:
- `onMounted` 时先调用 `fetchRealDate()` 获取真实日期
- 然后调用 `fetchCalendarWithOrders()` 获取当月订单
- 最后调用 `generateCalendar()`

**日历生成逻辑**:
```javascript
function generateCalendar(orderMap = {}) {
  // ... 原有逻辑 ...
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const orders = orderMap[day] || [];
    const hasActivity = orders.length > 0;
    const intensity = hasActivity ? Math.min(orders.length, 3) : 0;
    
    days.push({
      // ... 原有字段 ...
      intensity,
      hasOrders: hasActivity,
      orderCount: orders.length
    });
  }
}
```

### 3.3 数据流

```
AppointmentPage 提交预约
       ↓
  clientApi.submitAppointment()
       ↓
  localStorage 存储订单
       ↓
ProfilePage 加载时
       ↓
  timeApi.fetchRealDate() 获取真实日期
       ↓
  timeApi.fetchCalendarWithOrders() 获取订单映射
       ↓
  generateCalendar() 渲染带活动标记的日历
```

## 4. 错误处理

- API调用失败时回退到浏览器当前日期
- 网络错误不影响页面正常显示
- 订单数据获取失败时显示空白日历

## 5. 文件改动清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `frontend/src/mock/timeApi.js` | 新增 | 实现日期API和订单关联逻辑 |
| `frontend/src/views/client/ProfilePage.vue` | 修改 | 调用timeApi获取日期和订单 |
| `frontend/src/mock/clientApi.js` | 无改动 | 保持现有订单数据接口 |