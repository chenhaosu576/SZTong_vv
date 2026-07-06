// server.js
// 服务启动入口。
// 职责:
//   - require('./app') 取工厂
//   - 启动期 sequelize.authenticate() 验证数据库连接
//   - 失败 console.error + process.exit(1)（不静默）
//   - app.listen(PORT, cb) 并打印启动横幅
// 使用方: `node src/server.js` / `nodemon src/server.js`

const app = require('./app');
const { sequelize } = require('./config/db');
const { PORT } = require('./config');

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');
  } catch (e) {
    console.error('❌ DB connect failed:', e.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 收智通后端服务已启动: http://localhost:${PORT}`);
    console.log('可用接口:');
    console.log('  - GET  /api/_health/db   (数据库健康检查)');
    console.log('  - GET  /api/location     (百度地图定位)');
    console.log('  - POST /api/chat        (DeepSeek 流式聊天)');
    console.log('  - POST /api/analyze-image (MiniMax 图片识别)');
  });
}

start();
