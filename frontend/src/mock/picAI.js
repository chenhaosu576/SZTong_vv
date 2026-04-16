/**
 * MiniMax 图片识别 API
 * 使用 MiniMax 多模态模型进行垃圾分类识别
 */

// API 配置 - 后端服务
const API_BASE_URL = "";

/**
 * 将图片文件转换为 base64（优化版本）
 * @param {File} file - 图片文件
 * @returns {Promise<string>} - base64 字符串
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // 检查文件大小，如果太大可能需要压缩
      const base64 = reader.result;
      if (base64.length > 4 * 1024 * 1024) {
        // 图片太大，尝试压缩
        compressImage(file).then(resolve).catch(reject);
      } else {
        resolve(base64);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 压缩图片（如果太大）
 * @param {File} file - 图片文件
 * @returns {Promise<string>} - 压缩后的 base64
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 1024;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 使用 MiniMax AI 识别图片中的废弃物
 * @param {File} file - 图片文件
 * @returns {Promise<Array>} - 识别结果数组
 */
export async function analyzeImageWithAI(file) {
  try {
    console.log("开始 AI 图片识别...");

    // 将图片转换为 base64
    const imageDataUrl = await fileToBase64(file);
    console.log("图片转换完成");

    console.log("开始调用后端图片识别 API...");

    // 调用本地后端 API
    const response = await fetch(`${API_BASE_URL}/api/analyze-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: imageDataUrl
      })
    });

    console.log("API 响应状态:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API 错误响应:", errorText);
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }

    // 后端已处理完成，直接返回结果
    const data = await response.json();
    console.log("API 返回数据:", data);

    if (data && data.length > 0) {
      return data;
    }

    // 返回空结果时显示示例
    return [{
      name: "无法识别",
      category: "其他垃圾",
      score: 0,
      action: "请重新上传清晰的废弃物图片",
      warning: "确保图片中只有单一的废弃物物体"
    }];

  } catch (error) {
    console.error("图片识别失败:", error);
    throw error;
  }
}

/**
 * 解析 AI 返回的内容
 * @param {string} content - AI 返回的内容
 * @returns {Object|null} - 解析后的结果
 */
function parseAIResponse(content) {
  try {
    // 移除可能的 markdown 代码块标记
    let jsonStr = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // 尝试匹配 JSON 对象
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

/**
 * 标准化分类名称
 * @param {string} category - 原始分类
 * @returns {string} - 标准分类
 */
function normalizeCategory(category) {
  if (!category) return "其他垃圾";

  const categoryLower = category.toLowerCase();

  if (categoryLower.includes("可回收") || categoryLower.includes("回收")) {
    return "可回收物";
  }
  if (categoryLower.includes("有害") || categoryLower.includes("toxic") || categoryLower.includes("hazard")) {
    return "有害垃圾";
  }
  if (categoryLower.includes("厨余") || categoryLower.includes("湿垃圾") || categoryLower.includes("食物") || categoryLower.includes("food")) {
    return "厨余垃圾";
  }
  if (categoryLower.includes("其他") || categoryLower.includes("干垃圾") || categoryLower.includes("general")) {
    return "其他垃圾";
  }

  return "其他垃圾";
}

/**
 * 模拟识别（备用方案）
 * @returns {Promise<Array>} - 模拟结果
 */
export async function mockAnalyzeImage() {
  await new Promise(resolve => setTimeout(resolve, 1500));

  return [{
    name: "示例物品",
    category: "可回收物",
    score: 85,
    action: "这是示例结果",
    warning: "AI 识别未启用时显示"
  }];
}

export default {
  analyzeImageWithAI,
  mockAnalyzeImage
};