// db/seeders/002-demo-content.js
// 第二批 demo 内容 seeder(幂等)。
// 职责:
//   - 在 home_content / faq_content / site_stats / profile_demo_content 各插一行 (id=1)
//   - 给 user@szt.com 写 level_text = 'Lv.4 城市循环合伙人'
// 使用方: npm run db:seed
// 幂等:全部走 findOrCreate + findOne + 直接 update。

const { HomeContent, FaqContent, SiteStats, ProfileDemoContent, User } = require('../models');

module.exports = {
  async up() {
    // 1) home_content(id=1)
    const homePayload = {
      hero: { primaryCta: { to: '/ai-identify' } },
      heroStats: [
        { value: '18,240+', label: '累计服务家庭' },
        { value: '286 吨', label: '进入再生链路的旧物' },
        { value: '96.4%', label: '上门准时完成率' },
        { value: '39', label: '社区协同网点' },
      ],
      principleRail: [
        {
          title: '识别先行',
          note: '用对话和图片识别降低判断成本，让用户先知道怎么分，再决定如何回收。',
        },
        {
          title: '智能调度',
          note: '系统根据品类、地址、时间段和机构运力自动匹配最近可服务网点。',
        },
        {
          title: '结果可追踪',
          note: '每一笔回收都形成订单、积分和减排记录，用户与机构都能看到结果。',
        },
      ],
      cityStages: [
        {
          title: '居民发起',
          text: '从看不懂分类，到几秒钟完成识别和预约，把环保动作变成一件轻松的小事。',
          metric: '平均决策时长缩短 43%',
        },
        {
          title: '社区协同',
          text: '社区回收点、志愿者和服务站统一协同，让不同街区也能共享同一套处理逻辑。',
          metric: '履约效率提升 29%',
        },
        {
          title: '机构回流',
          text: '机构在管理端获得更稳定的派单、入库和复用数据，提升运营连续性。',
          metric: '月度复用率持续增长',
        },
      ],
      institutionSteps: [
        '提交机构资质、覆盖片区与主营回收品类。',
        '接入平台审核与调度规则，建立订单协作关系。',
        '开通机构管理端，查看派单、仓储、排班和报表。',
        '参与城市联营计划，联合开展社区回收活动。',
      ],
      contacts: [
        '商务合作：bd@shouzhitong.cn',
        '机构入驻：partner@shouzhitong.cn',
        '用户支持：400-8855-227',
        '总部地址：上海市徐汇区龙漕路 299 号绿创港 A2',
      ],
    };
    await HomeContent.findOrCreate({
      where: { id: 1 },
      defaults: { payload: homePayload },
    });

    // 2) faq_content(id=1)
    const faqPayload = {
      standards: [
        { name: '可回收物', text: '纸类、塑料、金属、玻璃及其制品，尽量保持清洁干燥后投放。' },
        { name: '有害垃圾', text: '电池、灯管、过期药品、油漆桶等需进入专门回收链路。' },
        { name: '厨余垃圾', text: '剩菜剩饭、果皮、茶渣等易腐有机物，应与包装分离投放。' },
        { name: '其他垃圾', text: '受污染纸巾、一次性餐具、破损陶瓷等难以回收的生活废弃物。' },
      ],
      faqs: [
        {
          category: '塑料类',
          q: '塑料瓶盖需要单独拧开吗？',
          a: '建议瓶身与瓶盖分开投放，便于后续按材质分拣；瓶内液体也要尽量倒空。',
        },
        {
          category: '外卖类',
          q: '外卖盒可以直接扔进可回收物吗？',
          a: '先清掉剩余油污和食物残渣，简单冲洗后再投放，会更利于再生处理。',
        },
        {
          category: '家具类',
          q: '旧家具只能丢弃吗？',
          a: '能复用的家具建议优先捐赠或二次流转；无法复用时再预约大件上门回收。',
        },
        {
          category: '有害类',
          q: '过期药品可以混入厨余垃圾吗？',
          a: '不可以。过期药品应投入社区药品回收箱，避免污染水体和土壤。',
        },
      ],
      science: [
        '1 吨废纸回收后，通常可减少约 17 棵树木砍伐。',
        '铝罐回收再造的能耗，仅为原生铝生产的约 5%。',
        '厨余资源化可以进一步转化为生物质能源与土壤改良材料。',
      ],
      diy: [
        '玻璃瓶改造：阳台水培小花器',
        '旧 T 恤改造：无缝环保购物袋',
        '纸箱改造：桌面抽屉收纳格',
      ],
    };
    await FaqContent.findOrCreate({
      where: { id: 1 },
      defaults: { payload: faqPayload },
    });

    // 3) site_stats(id=1) — 列级字段
    const exists3 = await SiteStats.findByPk(1);
    if (!exists3) {
      await SiteStats.create({
        processedToday: 421,
        activeSites: 39,
        avgResponseHour: 2.1,
        carbonReducedKg: 1860,
      });
    }

    // 4) profile_demo_content(id=1)
    const demoPayload = {
      tracks: [
        { name: '回收活跃度', value: 82 },
        { name: '分类准确率', value: 91 },
        { name: '社区参与度', value: 68 },
      ],
      weeklyTrend: [42, 54, 61, 48, 68, 72, 77],
      badges: ['连续 4 周回收', '旧衣分类达标', '社区环保志愿者'],
      menu: ['地址管理', '回收偏好', '积分兑换', '隐私设置'],
    };
    await ProfileDemoContent.findOrCreate({
      where: { id: 1 },
      defaults: { payload: demoPayload },
    });

    // 5) demo user 写 level_text
    const user = await User.findOne({ where: { email: 'user@szt.com' } });
    if (user && !user.levelText) {
      user.levelText = 'Lv.4 城市循环合伙人';
      await user.save({ fields: ['levelText'] });
    }

    console.log('OK: 4 张内容/统计/demo 表已就位 + demo user.levelText 已写入');
  },

  async down() {
    await ProfileDemoContent.destroy({ where: {}, truncate: true, restartIdentity: true });
    await SiteStats.destroy({ where: {}, truncate: true, restartIdentity: true });
    await FaqContent.destroy({ where: {}, truncate: true, restartIdentity: true });
    await HomeContent.destroy({ where: {}, truncate: true, restartIdentity: true });
    const user = await User.findOne({ where: { email: 'user@szt.com' } });
    if (user) {
      user.levelText = null;
      await user.save({ fields: ['levelText'] });
    }
    console.log('OK: demo content 已清理');
  },
};
