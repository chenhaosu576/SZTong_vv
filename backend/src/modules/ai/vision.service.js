// modules/ai/vision.service.js
// MiniMax 图像识别服务。
// 职责:
//   - analyzeImage({ image }): 调 MiniMax 视觉接口，返回标准化识别结果数组
//   - 复用 ai.util.parseAIResponse / normalizeCategory
//   - 缺图 → throw 400；API 失败 → throw 500
// 使用方: modules/ai/routes.js

const axios = require('axios');
const { AI_KEYS } = require('../../config');
const { parseAIResponse } = require('./ai.util');

const ENDPOINT = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

const SYSTEM_PROMPT = `你是专业的垃圾分类AI助手。请分析用户上传的图片，识别其中的废弃物。

请严格按照以下JSON格式返回结果，不要返回其他任何文字：
{"name":"物品名称","category":"分类","confidence":置信度,"action":"投放建议","warning":"注意事项"}

分类必须是以下四种之一：可回收物、有害垃圾、厨余垃圾、其他垃圾

要求：
1. 只识别图片中最主要的废弃物
2. 正确判断分类
3. 提供准确的投放指导`;

async function analyzeImage({ image }) {
  if (!image) {
    const err = new Error('缺少图片数据');
    err.status = 400;
    throw err;
  }

  const messages = [
    {
      role: 'system',
      content: [{ type: 'text', text: SYSTEM_PROMPT }],
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: '请识别这张图片中的废弃物并进行垃圾分类，只返回JSON' },
        { type: 'image_url', image_url: { url: image } },
      ],
    },
  ];

  let response;
  try {
    response = await axios.post(
      ENDPOINT,
      {
        model: 'abab6.5s-chat',
        messages,
        temperature: 0.3,
        max_tokens: 400,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_KEYS.MINIMAX_API_KEY}`,
        },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('MiniMax API 错误:', error.response?.data || error.message);
    const err = new Error(error.message || '图片识别失败');
    err.status = 500;
    throw err;
  }

  const contentArr =
    response.data.choices &&
    response.data.choices[0] &&
    response.data.choices[0].message.content;
  let aiResponse = '';
  if (Array.isArray(contentArr)) {
    aiResponse = contentArr.map((c) => c.text || c).join('');
  } else if (typeof contentArr === 'string') {
    aiResponse = contentArr;
  }

  const result = parseAIResponse(aiResponse);
  if (result) return [result];

  return [
    {
      name: '无法识别',
      category: '其他垃圾',
      score: 0,
      action: '请重新上传清晰的废弃物图片',
      warning: '确保图片中只有单一的废弃物物体',
    },
  ];
}

module.exports = { analyzeImage };
