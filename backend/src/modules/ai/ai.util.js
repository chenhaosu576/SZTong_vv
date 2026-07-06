// modules/ai/ai.util.js
// AI 模块通用工具。
// 职责:
//   - parseAIResponse(content): 剥离 markdown code fence，匹配首段 JSON，返回结构化结果；失败返回 null
//   - normalizeCategory(category): 中文/英文别名归一到四类垃圾名
// 使用方: modules/ai/vision.service.js

function parseAIResponse(content) {
  try {
    let jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
      const result = JSON.parse(jsonStr);
      return {
        name: result.name || '未知物品',
        category: normalizeCategory(result.category),
        score: parseInt(result.confidence) || 75,
        action: result.action || '请根据常见分类投放',
        warning: result.warning || '',
      };
    }
  } catch (parseError) {
    // eslint-disable-next-line no-console
    console.error('解析失败:', parseError);
  }
  return null;
}

function normalizeCategory(category) {
  if (!category) return '其他垃圾';
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('可回收') || categoryLower.includes('回收')) return '可回收物';
  if (categoryLower.includes('有害') || categoryLower.includes('toxic') || categoryLower.includes('hazard')) return '有害垃圾';
  if (categoryLower.includes('厨余') || categoryLower.includes('湿垃圾') || categoryLower.includes('食物') || categoryLower.includes('food')) return '厨余垃圾';
  if (categoryLower.includes('其他') || categoryLower.includes('干垃圾') || categoryLower.includes('general')) return '其他垃圾';
  return '其他垃圾';
}

module.exports = { parseAIResponse, normalizeCategory };
