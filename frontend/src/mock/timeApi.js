// 导入clientApi中的fetchOrders函数
import { fetchOrders } from './clientApi';

// 获取真实日期 (使用本地日期)
export async function fetchRealDate() {
  // 直接使用本地日期，无需外部 API
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate()
  };
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