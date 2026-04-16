# AppointmentPage.vue 日期范围周切换功能设计

## 1. 需求概述

在 AppointmentPage.vue 的日期选择器区域添加左右箭头按钮，用于切换同一月份内的不同周。

- 当前已有的月份切换按钮：切换不同月份（如4月→5月）
- 新增的周切换按钮：切换同一月份内的不同周（如4/1-4/7 → 4/8-4/14）

## 2. 用户交互确认

- **周切换显示**: 显示日期范围（如 4/1-4/7）
- **不足7天处理**: 显示实际的日期范围（如 4/22-4/30），不足7天也显示
- **边界处理**: 第一周时禁用"上一周"按钮，最后一周时禁用"下一周"按钮

## 3. 技术方案

### 3.1 状态变量

新增一个 `weekOffset` 响应式变量：
- 0 = 第一周（从月份第1天开始）
- 1 = 第二周
- 以此类推

### 3.2 计算属性

**`dateRangeText`** - 当前显示的日期范围文本：
- 格式如 "4/1-4/7"
- 根据当前月份和 weekOffset 计算

**`appointmentDates`** - 修改为基于 month 和 weekOffset 计算：
```javascript
const appointmentDates = computed(() => {
  const baseDate = new Date(currentMonth.value);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  // 计算该月有多少天
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 计算本周的起始日期
  const startDay = weekOffset.value * 7 + 1;
  const endDay = Math.min(startDay + 6, daysInMonth);

  return Array.from({ length: endDay - startDay + 1 }, (_, index) => {
    const day = startDay + index;
    const date = new Date(year, month, day);

    return {
      value: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      weekday: weekdayLabels[date.getDay()],
      dayNumber: String(day).padStart(2, "0"),
      monthDay: `${month + 1}/${day}`,
      isFull: false, // 可根据实际业务逻辑设置
    };
  });
});
```

### 3.3 函数

**`switchWeek(offset)`** - 切换周：
- offset = -1 切换到上一周
- offset = 1 切换到下一周

```javascript
function switchWeek(offset) {
  const newOffset = weekOffset.value + offset;
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const maxWeeks = Math.ceil(daysInMonth / 7) - 1;

  if (newOffset >= 0 && newOffset <= maxWeeks) {
    weekOffset.value = newOffset;
  }
}
```

### 3.4 UI 结构

```
┌─────────────────────────────────────────┐
│  预约时间                    [◀] [4/1-4/7] [▶]  │
├─────────────────────────────────────────┤
│  [4/1]                      │  [4/2]                      │
│   01                          02                            │
│  周三                       周四                       │
│                                 clearly-and-concisely skill if available
  commit the design document to git
- Do NOT invoke any other skill. writing-plans is the next step.

## 4. Error Handling

- API call failures fall back to the browser's current date
- Network errors don't affect the normal page display
- Order data fetch failures show an empty calendar

## 5. File Change List

This is a simple feature addition - no complex spec review loop needed.

| State Variable | Type | Description |
|--------------|------|------------|
| `weekOffset` | `ref<number>` | Current week offset within the month |

| Computed Property | Type | Description |
|----------------|------|------------|
| `dateRangeText` | `computed<string>` | Date range text like "4/1-4/7" |

| Function | Description |
|----------|------------|
| `switchWeek(offset)` | Switch to previous/next week |

## 4. UI Styling

### 4.1 Week Switcher Buttons

Layout: Place alongside the existing month switcher or in a second row

```css
.week-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
}

.week-btn {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(106, 131, 122, 0.25);
  border-radius: 6px;
  background: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--ink-600);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.week-btn:hover:not(:disabled) {
  border-color: #4f8d60;
  background: rgba(79, 141, 96, 0.05);
}

.week-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.week-btn .material-symbols-outlined {
  font-size: 1.1rem;
}

.week-range-text {
  min-width: 70px;
  color: var(--ink-700);
  font-family: var(--font-data);
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
  background: rgba(79, 141, 96, 0.08);
  padding: 4px 8px;
  border-radius: 4px;
}
```

### 4.2 Date Card Layout Adjustments

Update date card gap for better spacing:

```css
.date-card {
  gap: 1px;
}
```

## 5. File Changes

| File | Change Type | Description |
|------|-----------|------------|
| `frontend/src/views/client/AppointmentPage.vue` | Modify | Add week switching feature |

## 6. Acceptance Criteria

1. Week switcher buttons appear in the date picker area
2. Clicking left arrow shows previous week's dates
3. Clicking right arrow shows next week's dates
4. At first week, left button is disabled
5. At last week, right button is disabled
6. Date range text updates correctly (e.g., "4/8-4/14")