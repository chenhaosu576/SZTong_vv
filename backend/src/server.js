// server.js
// 服务启动入口。
// 职责:
//   - require('./app') 取工厂
//   - app.listen(PORT, cb) 并打印启动横幅
// 使用方: `node src/server.js` / `nodemon src/server.js`

const app = require('./app');
const { PORT } = require('./config');

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 收智通后端服务已启动: http://localhost:${PORT}`);
  console.log('可用接口:');
  console.log('  - GET  /api/location     (百度地图定位)');
  console.log('  - POST /api/chat        (DeepSeek 流式聊天)');
  console.log('  - POST /api/analyze-image (MiniMax 图片识别)');
});
