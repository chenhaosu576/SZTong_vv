// app.js
// Express 应用工厂。
// 职责:
//   - 装载 middleware（cors / json / urlencoded / logger）
//   - 挂载业务路由（/api → routes）
//   - 托管 frontend/dist 静态资源 + SPA fallback
//   - 末尾注册错误中间件
//   - 导出 app 实例（不 listen）
// 使用方: src/server.js 通过 require('./app') 启动

require('dotenv').config();
const path = require('path');
const express = require('express');

const corsMiddleware = require('./config/cors');
const logger = require('./middlewares/logger');
const errorMiddleware = require('./middlewares/error');
const routes = require('./routes');
require('./config/db'); // 触发 Sequelize 实例构造（不连接，连接在 server.js authenticate）

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(logger);

app.use('/api', routes);
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// SPA fallback：除 /api、/uploads、/admin 之外的 GET 全走 frontend 入口
app.get(/^\/(?!api|uploads|admin).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

app.use(errorMiddleware);

module.exports = app;
