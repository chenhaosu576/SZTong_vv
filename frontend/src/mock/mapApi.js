/**
 * 百度地图定位API
 * 后端代理模式：通过浏览器获取GPS坐标，发送给后端进行逆地理编码
 */

const API_BASE = 'http://localhost:8080';

/**
 * 获取当前城市
 * @returns {Promise<string|null>} 城市名称，定位失败返回null
 */
export async function getCurrentCity() {
  try {
    // 检查浏览器是否支持Geolocation
    if (!navigator.geolocation) {
      console.warn('浏览器不支持Geolocation API');
      return null;
    }

    return new Promise((resolve) => {
      // 获取浏览器定位
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            // 调用后端API获取城市名
            const response = await fetch(`${API_BASE}/api/location?lat=${lat}&lng=${lng}`);
            const data = await response.json();
            resolve(data.city);
          } catch (error) {
            console.error('调用定位API失败:', error);
            resolve(null);
          }
        },
        (error) => {
          console.error('获取定位失败:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 缓存5分钟
        }
      );
    });
  } catch (error) {
    console.error('定位失败:', error);
    return null;
  }
}

export default {
  getCurrentCity
};