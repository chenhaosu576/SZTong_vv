// db/seeders/001-demo-data.js
// Demo 数据 seeder（幂等）。
// 职责:
//   - 插 1 个 role（super_admin）
//   - 插 1 个 service_center（深圳市南山区测试站点）
//   - 插 1 个 admin（admin@szt.com / Admin@2026）
//   - 插 1 个 user（user@szt.com / 123456，对齐 C 端 demo 账号）
//   - 用 Model.findOrCreate 保证幂等：可重复跑不会重复插
// 使用方: npm run db:seed
// 注意: 不插 orders/recycle_orders/donation_orders（避免误导，等 Service 层做完再插）

const bcrypt = require('bcryptjs');
const { Role, ServiceCenter, Admin, User } = require('../models');

module.exports = {
  async up() {
    // 1) Role
    const [role] = await Role.findOrCreate({
      where: { code: 'super_admin' },
      defaults: { name: '超级管理员' },
    });

    // 2) ServiceCenter
    const [center] = await ServiceCenter.findOrCreate({
      where: { name: '深圳市南山区测试站点' },
      defaults: {
        city: '深圳',
        district: '南山区',
        address: '科苑南路 1001 号',
        businessHours: '09:00-21:00',
        status: 1,
      },
    });

    // 3) Admin（bcrypt cost 10）
    const adminHash = await bcrypt.hash('Admin@2026', 10);
    await Admin.findOrCreate({
      where: { username: 'admin@szt.com' },
      defaults: {
        passwordHash: adminHash,
        realName: '系统管理员',
        roleId: role.id,
        status: 1,
      },
    });

    // 4) User（bcrypt cost 10；密码与 C 端 demo 账号对齐：123456）
    const userHash = await bcrypt.hash('123456', 10);
    await User.findOrCreate({
      where: { email: 'user@szt.com' },
      defaults: {
        passwordHash: userHash,
        displayName: '环保达人',
        status: 1,
        pointsBalance: 286,
      },
    });

    console.log('OK: 4 行 demo 数据已就位');
  },

  async down() {
    await User.destroy({ where: { email: 'user@szt.com' } });
    await Admin.destroy({ where: { username: 'admin@szt.com' } });
    await ServiceCenter.destroy({ where: { name: '深圳市南山区测试站点' } });
    await Role.destroy({ where: { code: 'super_admin' } });
    console.log('OK: demo 数据已清理');
  },
};
