// __tests__/setup-env.js
// Jest setupFiles: 在 test file module 加载前注入 .env.test
// 必须在 require('../../src/app') 之前跑(否则 app.js 顶层 dotenv 先把 .env 注入)
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env.test') });
// 注意: 不能加 override:true —— app.js 的 dotenv.config() 也要工作,
// 二次 dotenv 默认 override:false 会保留我们这里注入的字段
