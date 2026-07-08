// db/seeders/004-service-slots-demo.js
// service_slots 预生 seeder (幂等)。
// 职责:
//   - 遍历 status=1 的 service_center
//   - 每个中心预生 [今天, 今天+13] 共 14 天 × 3 时段 的 slot 行
//   - 默认 capacity=3,reserved_count=0,status=1
// 使用方: npm run db:seed
// 幂等: bulkCreate({ ignoreDuplicates: true }) 走 INSERT IGNORE,
//       遇唯一键 (center_id, service_date, period) 冲突静默跳过
//       (v6 选项名;v5 的 `ignore` 在 v6 已改名为 `ignoreDuplicates`)

const { ServiceCenter, ServiceSlot } = require('../models');
const { Op } = require('sequelize');

const PERIODS = ['09:00-12:00', '13:00-16:00', '18:00-21:00'];
const HORIZON_DAYS = 14;
const DEFAULT_CAPACITY = 3;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

module.exports = {
  async up() {
    const centers = await ServiceCenter.findAll({ where: { status: 1 } });
    if (centers.length === 0) {
      console.log('WARN: 没有 status=1 的 service_center,跳过 service_slots 预生');
      return;
    }
    const from = todayIso();
    const to   = addDaysIso(from, HORIZON_DAYS - 1);
    const centerIds = centers.map((c) => c.id);

    const existingCount = await ServiceSlot.count({
      where: {
        serviceCenterId: { [Op.in]: centerIds },
        serviceDate: { [Op.between]: [from, to] },
      },
    });
    const expectedNew = centers.length * HORIZON_DAYS * PERIODS.length;

    const rows = centers.flatMap((c) =>
      Array.from({ length: HORIZON_DAYS }, (_, i) => addDaysIso(from, i)).flatMap((date) =>
        PERIODS.map((period) => ({
          serviceCenterId: c.id,
          serviceDate: date,
          period,
          capacity: DEFAULT_CAPACITY,
          reservedCount: 0,
          status: 1,
        })),
      ),
    );

    await ServiceSlot.bulkCreate(rows, { ignoreDuplicates: true });

    const afterCount = await ServiceSlot.count({
      where: {
        serviceCenterId: { [Op.in]: centerIds },
        serviceDate: { [Op.between]: [from, to] },
      },
    });
    console.log(
      `OK: service_slots 预生完成;期望 ${expectedNew} 行,操作前已存在 ${existingCount},操作后现存 ${afterCount}`,
    );
  },

  async down() {
    await ServiceSlot.destroy({ where: {} });
  },
};
