// Backend Server - 收智通 API 代理服务
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============ 百度地图定位 API ============
app.get('/api/location', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: '缺少经纬度参数' });
  }

  try {
    const baiduAk = process.env.BAIDU_MAP_AK || 'KSefYxBYFyEl3hKq45NSaZBWlWXNMSqf';
    const url = `https://api.map.baidu.com/reverse_geocoding/v3/?ak=${baiduAk}&output=json&coordtype=wgs84ll&location=${lat},${lng}`;

    const response = await axios.get(url);
    const data = response.data;

    if (data.status === 0 && data.result?.addressComponent) {
      const city = data.result.addressComponent.city;
      res.json({ city: city ? city.replace('市', '') : null });
    } else {
      res.status(500).json({ error: '逆地理编码失败' });
    }
  } catch (error) {
    console.error('百度地图API错误:', error.message);
    res.status(500).json({ error: error.message || '定位失败' });
  }
});

// ============ DeepSeek 流式聊天 API ============
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;

  const messages = [
    {
      role: "system",
      content: `你是收智通的环保智能助手，专门为用户提供关于废品回收、垃圾分类、环保政策等相关问题的解答。

请用模块化的方式回答问题，采用以下 JSON 格式：
{
  "modules": [
    {"title": "模块标题", "content": "模块内容", "icon": "图标名"},
    ...
  ]
}

要求：
1. 根据问题内容决定模块数量（1-4个模块）
2. 每个模块的 icon 可选值：info（信息）、recycling（回收）、tips（提示）、location（地点）、time（时间）、eco（环保）、help（帮助）
3. 内容要简洁专业，不超过200字
4. 如果问题简单，可以直接返回单个模块
5. 只返回 JSON，不要其他文字`
    }
  ];

  // 添加历史消息
  if (history && Array.isArray(history)) {
    history.slice(-10).forEach(msg => {
      messages.push({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content
      });
    });
  }

  // 添加当前消息
  messages.push({
    role: "user",
    content: message
  });

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.Deepseek_API_KEY}`
        },
        responseType: 'stream'
      }
    );

    let fullContent = "";

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim());

      lines.forEach(line => {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
            return;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      });
    });

    response.data.on('end', () => {
      res.end();
    });

    response.data.on('error', (err) => {
      console.error('流式响应错误:', err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('DeepSeek API 错误:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message || '请求失败' })}\n\n`);
    res.end();
  }
});

// ============ MiniMax 图片识别 API ============
app.post('/api/analyze-image', async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: '缺少图片数据' });
  }

  const systemPrompt = `你是专业的垃圾分类AI助手。请分析用户上传的图片，识别其中的废弃物。

请严格按照以下JSON格式返回结果，不要返回其他任何文字：
{"name":"物品名称","category":"分类","confidence":置信度,"action":"投放建议","warning":"注意事项"}

分类必须是以下四种之一：可回收物、有害垃圾、厨余垃圾、其他垃圾

要求：
1. 只识别图片中最主要的废弃物
2. 正确判断分类
3. 提供准确的投放指导`;

  const messages = [
    {
      role: "system",
      content: [{ type: "text", text: systemPrompt }]
    },
    {
      role: "user",
      content: [
        { type: "text", text: "请识别这张图片中的废弃物并进行垃圾分类，只返回JSON" },
        { type: "image_url", image_url: { url: image } }
      ]
    }
  ];

  try {
    const response = await axios.post(
      'https://api.minimax.chat/v1/text/chatcompletion_v2',
      {
        model: "abab6.5s-chat",
        messages: messages,
        temperature: 0.3,
        max_tokens: 400
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.Minimax_API_KEY}`
        }
      }
    );

    const contentArr = response.data.choices?.[0]?.message?.content;
    let aiResponse = "";
    if (Array.isArray(contentArr)) {
      aiResponse = contentArr.map(c => c.text || c).join("");
    } else if (typeof contentArr === "string") {
      aiResponse = contentArr;
    }

    const result = parseAIResponse(aiResponse);
    if (result) {
      res.json([result]);
    } else {
      res.json([{
        name: "无法识别",
        category: "其他垃圾",
        score: 0,
        action: "请重新上传清晰的废弃物图片",
        warning: "确保图片中只有单一的废弃物物体"
      }]);
    }

  } catch (error) {
    console.error('MiniMax API 错误:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || '图片识别失败' });
  }
});

// 解析 AI 返回的 JSON
function parseAIResponse(content) {
  try {
    let jsonStr = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
      const result = JSON.parse(jsonStr);
      return {
        name: result.name || "未知物品",
        category: normalizeCategory(result.category),
        score: parseInt(result.confidence) || 75,
        action: result.action || "请根据常见分类投放",
        warning: result.warning || ""
      };
    }
  } catch (parseError) {
    console.error("解析失败:", parseError);
  }
  return null;
}

// 标准化分类名称
function normalizeCategory(category) {
  if (!category) return "其他垃圾";
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes("可回收") || categoryLower.includes("回收")) return "可回收物";
  if (categoryLower.includes("有害") || categoryLower.includes("toxic") || categoryLower.includes("hazard")) return "有害垃圾";
  if (categoryLower.includes("厨余") || categoryLower.includes("湿垃圾") || categoryLower.includes("食物") || categoryLower.includes("food")) return "厨余垃圾";
  if (categoryLower.includes("其他") || categoryLower.includes("干垃圾") || categoryLower.includes("general")) return "其他垃圾";
  return "其他垃圾";
}

// 服务前端静态文件（API路由之后）
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA fallback - 让前端路由正常工作
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 收智通后端服务已启动: http://localhost:${PORT}`);
  console.log(`可用接口:`);
  console.log(`  - GET  /api/location     (百度地图定位)`);
  console.log(`  - POST /api/chat        (DeepSeek 流式聊天)`);
  console.log(`  - POST /api/analyze-image (MiniMax 图片识别)`);
});