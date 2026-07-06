// modules/ai/chat.service.js
// DeepSeek 流式问答服务（SSE）。
// 职责:
//   - streamChat({ message, history }, res): 调 DeepSeek 流式接口，把 chunk 转 SSE 写回 res
//   - SSE 协议 (与原 backend/index.js 完全一致):
//       data: {"content":"..."}      增量 token
//       data: {"done":true,"content":fullContent}   终态
//       data: {"error":"..."}       API 异常
//   - header: res.setHeader 已经被 service 设置（路由层不要再设）
//   - 失败兜底：在 SSE 流上写 error 事件并 res.end()
//
// 使用方: modules/ai/routes.js

const axios = require('axios');
const { AI_KEYS } = require('../../config');

const ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是收智通的环保智能助手，专门为用户提供关于废品回收、垃圾分类、环保政策等相关问题的解答。

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
5. 只返回 JSON，不要其他文字`;

function buildMessages(message, history) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  if (history && Array.isArray(history)) {
    history.slice(-10).forEach((msg) => {
      messages.push({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    });
  }
  messages.push({ role: 'user', content: message });
  return messages;
}

async function streamChat({ message, history }, res) {
  const messages = buildMessages(message, history);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await axios.post(
      ENDPOINT,
      {
        model: 'deepseek-chat',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_KEYS.DEEPSEEK_API_KEY}`,
        },
        responseType: 'stream',
      }
    );

    let fullContent = '';

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter((line) => line.trim());
      lines.forEach((line) => {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
            return;
          }
          try {
            const json = JSON.parse(data);
            const content =
              (json.choices &&
                json.choices[0] &&
                json.choices[0].delta &&
                json.choices[0].delta.content) ||
              '';
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
      // eslint-disable-next-line no-console
      console.error('流式响应错误:', err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('DeepSeek API 错误:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message || '请求失败' })}\n\n`);
    res.end();
  }
}

module.exports = { streamChat };
