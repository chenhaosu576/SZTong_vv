// modules/charity/charity.service.js
// 公益项目: 列表 (region/urgency 过滤) + 详情 (联 needs)
//
// 紧急度算法 (实时):
//   daysLeft = (deadline - now) 向上取整
//   urgency  = daysLeft !== null && daysLeft <= urgentDaysThreshold
//              ? '紧急募集中' : '常态募集中'
//
// 使用方: modules/charity/routes.js
// SQL: charity_projects (status=1) + charity_project_needs (1 → N)

const { CharityProject, CharityProjectNeed } = require('../../db/models');
const ApiError = require('../../utils/ApiError');

const MS_PER_DAY = 86400000;

function pickNeedPayload(n) {
  return {
    id: n.id,
    title: n.title,
    description: n.description,
    sortOrder: n.sortOrder,
  };
}

function pickProjectPayload(p, needs, daysLeft, urgency) {
  return {
    id: p.id,
    title: p.title,
    location: p.location,
    region: p.region,
    tag: p.tag,
    urgentDaysThreshold: p.urgentDaysThreshold,
    currentProgress: p.currentProgress,
    targetProgress: p.targetProgress,
    progressUnit: p.progressUnit,
    beneficiary: p.beneficiary,
    coverImage: p.coverImage,
    description: p.description,
    daysLeft,
    urgency,
    needs: (needs || []).map(pickNeedPayload),
  };
}

function computeUrgency(project, now) {
  let daysLeft = null;
  if (project.deadline) {
    const ms = new Date(project.deadline).getTime() - now.getTime();
    daysLeft = ms > 0 ? Math.ceil(ms / MS_PER_DAY) : 0;
  }
  const urgency =
    daysLeft !== null && daysLeft <= project.urgentDaysThreshold
      ? '紧急募集中'
      : '常态募集中';
  return { daysLeft, urgency };
}

async function listProjects({ region, urgency } = {}) {
  const where = { status: 1 };
  if (region && region !== '全国') where.region = region;

  const rows = await CharityProject.findAll({
    where,
    include: [{ model: CharityProjectNeed, as: 'needs' }],
    order: [['currentProgress', 'DESC']],
  });

  const now = new Date();
  const decorated = rows.map((p) => {
    const { daysLeft, urgency: u } = computeUrgency(p, now);
    return pickProjectPayload(p, p.needs, daysLeft, u);
  });

  const filtered =
    !urgency || urgency === '全部'
      ? decorated
      : decorated.filter((p) => p.urgency === urgency);

  const regions = [...new Set(decorated.map((p) => p.region).filter(Boolean))];

  return { list: filtered, regions, total: filtered.length };
}

async function getProjectById(id) {
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(40401, '公益项目不存在');
  }
  const p = await CharityProject.findOne({
    where: { id, status: 1 },
    include: [{ model: CharityProjectNeed, as: 'needs' }],
  });
  if (!p) throw new ApiError(40401, '公益项目不存在');
  const { daysLeft, urgency } = computeUrgency(p, new Date());
  return pickProjectPayload(p, p.needs, daysLeft, urgency);
}

module.exports = { listProjects, getProjectById };