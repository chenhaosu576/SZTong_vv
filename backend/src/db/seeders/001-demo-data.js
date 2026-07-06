// db/seeders/001-demo-data.js
// Demo 数据 seeder(幂等)。
// 职责:
//   - 1 个 role (super_admin)
//   - 4 个 service_centers(代码对齐前端 serviceCentersData;由 migration 002 加 code 列支持)
//   - 1 个 admin (admin@szt.com / Admin@2026)
//   - 1 个 user  (user@szt.com / 123456,对齐 C 端 demo 账号)
//   - 4 个 orders(全部归 demo user): 2 recycle + 2 donation
// 使用方: npm run db:seed
// 幂等:全部走 findOrCreate / 重复 findOne + 直接 create

const bcrypt = require('bcryptjs');
const { Role, ServiceCenter, Admin, User, Order, RecycleOrder, DonationOrder } = require('../models');

module.exports = {
  async up() {
    // 1) Role
    const [role] = await Role.findOrCreate({
      where: { code: 'super_admin' },
      defaults: { name: '超级管理员' },
    });

    // 2) ServiceCenter × 4
    const centerSpecs = [
      {
        code: 'xuhui-caohejing',
        name: '徐汇·漕河泾服务站',
        city: '上海', district: '徐汇区', address: '宜山路 501 号',
        businessHours: '09:00-21:00', phone: '021-5600-2101', status: 1,
        description: '面向漕河泾与徐家汇片区提供预约上门、社区定点回收和可复用物品分拣服务,适合办公楼与居民小区的日常回收需求。',
      },
      {
        code: 'changning-zhongshan',
        name: '长宁·中山公园服务站',
        city: '上海', district: '长宁区', address: '凯旋路 1200 号',
        businessHours: '09:00-20:30', phone: '021-5600-2102', status: 1,
        description: '连接中山公园商圈、周边社区与公益机构,支持旧衣筛选、二次流转和积分入账,让可复用物品更快进入再利用链路。',
      },
      {
        code: 'jingan-pengpu',
        name: '静安·彭浦服务站',
        city: '上海', district: '静安区', address: '江场路 80 号',
        businessHours: '10:00-21:00', phone: '021-5600-2103', status: 1,
        description: '服务彭浦与大宁片区的居民回收场景,重点覆盖旧衣、闲置小家电和社区环保活动协同。',
      },
      {
        code: 'putuo-zhenru',
        name: '普陀·真如服务站',
        city: '上海', district: '普陀区', address: '真北路 1000 号',
        businessHours: '09:30-19:30', phone: '021-5600-2104', status: 1,
        description: '提供有害垃圾专项收运和大件家具预约回收,适合需要规范转运、单独标记和安全处理的回收任务。',
      },
    ];
    const centers = {};
    for (const spec of centerSpecs) {
      const [center] = await ServiceCenter.findOrCreate({
        where: { code: spec.code },
        defaults: spec,
      });
      centers[spec.code] = center;
    }

    // 3) Admin
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

    // 4) User
    const userHash = await bcrypt.hash('123456', 10);
    const [user] = await User.findOrCreate({
      where: { email: 'user@szt.com' },
      defaults: {
        passwordHash: userHash,
        displayName: '环保达人',
        status: 1,
        pointsBalance: 286,
      },
    });

    // 5) Orders × 4(全部归 demo user)
    // 注: 订单有 orderNo UNIQUE,幂等通过 where 查 orderNo 实现
    const orderSpecs = [
      {
        orderNo: 'SZT-20260324-001',
        orderType: 'recycle', status: 'pending_review',
        serviceCenterId: centers['xuhui-caohejing'].id,
        contactName: '林岚', contactPhone: '13800001111',
        addressSnapshot: '上海市徐汇区宜山路 501 号',
        scheduledDate: '2026-03-25', scheduledPeriod: '13:00-16:00',
        estimatedWeight: 6.5, estimatedPoints: 45, grantedPoints: 0,
        note: '请上门前 10 分钟电话联系。',
        recycleDetail: { category: '小家电', weightBand: '5-10kg', pickupCode: 'P1234' },
      },
      {
        orderNo: 'SZT-20260320-011',
        orderType: 'recycle', status: 'completed',
        serviceCenterId: centers['changning-zhongshan'].id,
        contactName: '林岚', contactPhone: '13800001111',
        addressSnapshot: '上海市长宁区凯旋路 1200 号',
        scheduledDate: '2026-03-20', scheduledPeriod: '09:00-12:00',
        estimatedWeight: 4.0, estimatedPoints: 18, grantedPoints: 20,
        note: '已完成称重并入库。',
        recycleDetail: { category: '纸塑金属', weightBand: '0-5kg', pickupCode: 'P1023' },
      },
      {
        orderNo: 'SZT-20260316-028',
        orderType: 'donation', status: 'received',
        serviceCenterId: centers['jingan-pengpu'].id,
        contactName: '林岚', contactPhone: '13800001111',
        addressSnapshot: '上海市静安区江场路 80 号',
        scheduledDate: '2026-03-16', scheduledPeriod: '18:00-21:00',
        estimatedPoints: 0, grantedPoints: 46,
        note: '衣物包装完整,已进入复用筛选。',
        donationDetail: {
          projectTitle: '乡村学校暖冬计划', projectLocation: '云南·怒江',
          itemType: '纺织旧衣', itemName: '秋冬棉服',
          quantityText: '6件', weightText: '5kg',
          conditionText: '八成新', logisticsType: '顺丰到付',
        },
      },
      {
        orderNo: 'SZT-20260311-102',
        orderType: 'donation', status: 'cancelled',
        serviceCenterId: centers['putuo-zhenru'].id,
        contactName: '林岚', contactPhone: '13800001111',
        addressSnapshot: '上海市普陀区真北路 1000 号',
        scheduledDate: '2026-03-11', scheduledPeriod: '13:00-16:00',
        estimatedPoints: 0, grantedPoints: 0,
        note: '用户改期后取消,本次未产生运力消耗。',
        cancelReason: '用户改期取消',
        donationDetail: {
          projectTitle: '社区图书角扩容', projectLocation: '上海·浦东',
          itemType: '图书绘本', itemName: '儿童绘本',
          quantityText: '12本', weightText: '3kg',
          conditionText: '九成新', logisticsType: '上门自取',
        },
      },
    ];

    for (const spec of orderSpecs) {
      const exists = await Order.findOne({ where: { orderNo: spec.orderNo } });
      if (exists) continue;

      const { recycleDetail, donationDetail, cancelReason, ...orderFields } = spec;
      if (cancelReason) orderFields.cancelReason = cancelReason;

      const order = await Order.create({
        ...orderFields,
        userId: user.id,
      });

      if (recycleDetail) {
        await RecycleOrder.create({
          orderId: order.id,
          ...recycleDetail,
        });
      }
      if (donationDetail) {
        await DonationOrder.create({
          orderId: order.id,
          ...donationDetail,
        });
      }
    }

    console.log('OK: 4 个 service_centers + 1 admin + 1 user + 4 orders demo 数据已就位');
  },

  async down() {
    // 倒序删
    await DonationOrder.destroy({ where: {}, truncate: true, cascade: true });
    await RecycleOrder.destroy({ where: {}, truncate: true, cascade: true });
    await Order.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: { email: 'user@szt.com' } });
    await Admin.destroy({ where: { username: 'admin@szt.com' } });
    for (const code of ['xuhui-caohejing', 'changning-zhongshan', 'jingan-pengpu', 'putuo-zhenru']) {
      await ServiceCenter.destroy({ where: { code } });
    }
    await Role.destroy({ where: { code: 'super_admin' } });
    console.log('OK: demo 数据已清理');
  },
};
