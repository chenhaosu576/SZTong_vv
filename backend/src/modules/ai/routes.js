// modules/ai/routes.js
// AI 模块 HTTP 路由层。
// 职责:
//   - 注册 /api/location、/api/chat、/api/analyze-image 三端点
//   - 调用对应 service；catch 后 next(err) 给 error middleware
//   - /api/chat 的流错误已由 service 内部兜底（写到 SSE 流上），这里不再 fallback
// 使用方: src/routes/index.js 通过 router.use 挂载

const express = require('express');
const locationService = require('./location.service');
const visionService = require('./vision.service');
const chatService = require('./chat.service');

const router = express.Router();

router.get('/location', async (req, res, next) => {
  try {
    const result = await locationService.reverseGeocode({
      lat: req.query.lat,
      lng: req.query.lng,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/chat', async (req, res, next) => {
  try {
    await chatService.streamChat(
      { message: req.body.message, history: req.body.history },
      res
    );
  } catch (err) {
    next(err);
  }
});

router.post('/analyze-image', async (req, res, next) => {
  try {
    const result = await visionService.analyzeImage({ image: req.body.image });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
