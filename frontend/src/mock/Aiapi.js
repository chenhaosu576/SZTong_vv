import { ref } from "vue";

// API 配置 - 后端服务
const API_BASE_URL = "";

/**
 * 流式调用大模型 API (DeepSeek)
 * @param {string} userMessage - 用户消息
 * @param {Array} history - 聊天历史
 * @param {Function} onChunk - 流式接收数据回调
 * @param {Function} onComplete - 完成回调
 * @param {Function} onError - 错误回调
 */
export function streamChat(userMessage, history, onChunk, onComplete, onError) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

  // 构建消息列表
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

  // 添加历史消息（限制最近10条）
  const recentHistory = history.slice(-10);
  recentHistory.forEach(msg => {
    messages.push({
      role: msg.type === "user" ? "user" : "assistant",
      content: msg.content
    });
  });

  // 添加当前用户消息
  messages.push({
    role: "user",
    content: userMessage
  });

  // 调用本地后端接口
  fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: userMessage,
      history: history
    }),
    signal: controller.signal
  })
    .then(response => {
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
      }
      return response.body;
    })
    .then(body => {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            // 处理剩余缓冲区数据
            if (buffer) {
              try {
                const lines = buffer.split("\n").filter(line => line.trim());
                lines.forEach(line => {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    try {
                      const json = JSON.parse(data);
                      // 后端返回格式: { content: "xxx", done: true }
                      if (json.content) {
                        fullContent += json.content;
                        onChunk(json.content);
                      }
                      if (json.done && json.content) {
                        onComplete(json.content);
                      }
                    } catch (e) {
                      // 忽略解析错误
                    }
                  }
                });
              } catch (e) {
                // 忽略错误
              }
            }
            onComplete(fullContent);
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          lines.forEach(line => {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const json = JSON.parse(data);
                // 后端返回格式: { content: "xxx", done: true }
                if (json.error) {
                  onError(json.error);
                  return;
                }
                if (json.content) {
                  fullContent += json.content;
                  onChunk(json.content);
                }
                if (json.done) {
                  onComplete(fullContent);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          });

          read();
        });
      }

      read();
    })
    .catch(error => {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        onError("请求超时，请稍后重试");
      } else {
        onError(error.message || "网络错误");
      }
    });

  // 返回中止函数
  return {
    abort: () => controller.abort()
  };
}

/**
 * 非流式调用大模型 API（备用方案）
 * @param {string} userMessage - 用户消息
 * @param {Array} history - 聊天历史
 * @returns {Promise<string>} - AI 响应内容
 */
export async function chat(userMessage, history) {
  const messages = [
    {
      role: "system",
      content: "你是收智通的环保智能助手，专门为用户提供关于废品回收、垃圾分类、环保政策等相关问题的解答。请用友好、专业的方式回答用户的问题。回答应该简洁明了，不超过200字。"
    }
  ];

  const recentHistory = history.slice(-10);
  recentHistory.forEach(msg => {
    messages.push({
      role: msg.type === "user" ? "user" : "assistant",
      content: msg.content
    });
  });

  messages.push({
    role: "user",
    content: userMessage
  });

  const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export default {
  streamChat,
  chat
};