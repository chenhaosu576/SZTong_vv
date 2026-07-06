// modules/ai/location.service.js
// 百度地图逆地理编码服务。
// 职责:
//   - reverseGeocode({ lat, lng }): 调百度逆地理 API（coordtype=wgs84ll）
//   - 成功：返回 { city: '上海' }（去掉 '市' 后缀）
//   - 失败：throw Error，带 status 字段（400 缺参 / 500 业务失败）
// 使用方: modules/ai/routes.js

const axios = require('axios');
const { AI_KEYS } = require('../../config');

const ENDPOINT = 'https://api.map.baidu.com/reverse_geocoding/v3/';

async function reverseGeocode({ lat, lng }) {
  if (lat == null || lng == null || lat === '' || lng === '') {
    const err = new Error('缺少经纬度参数');
    err.status = 400;
    throw err;
  }

  const url = `${ENDPOINT}?ak=${AI_KEYS.BAIDU_MAP_AK}&output=json&coordtype=wgs84ll&location=${lat},${lng}`;

  let response;
  try {
    response = await axios.get(url);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('百度地图API错误:', error.message);
    const err = new Error(error.message || '定位失败');
    err.status = 500;
    throw err;
  }

  const data = response.data;

  if (data.status === 0 && data.result && data.result.addressComponent) {
    const city = data.result.addressComponent.city;
    return { city: city ? city.replace('市', '') : null };
  }

  const err = new Error('逆地理编码失败');
  err.status = 500;
  throw err;
}

module.exports = { reverseGeocode };
