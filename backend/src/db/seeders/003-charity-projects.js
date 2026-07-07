// db/seeders/003-charity-projects.js
// 公益项目 demo 数据 seeder (幂等)。
// 职责:
//   - 8 个 charity_projects (status=1, region 分布: 西部 3 / 华东 2 / 华中 1 / 华南 1 / 华北 1)
//   - 每个项目 2-4 个 charity_project_needs
// 使用方: npm run db:seed
// 幂等: 全部走 findOrCreate by title, needs 走 findOrCreate by (charityProjectId, title)

const { CharityProject, CharityProjectNeed } = require('../models');

const PROJECT_SEEDS = [
  {
    title: '大凉山冬季暖心计划',
    location: '四川·凉山', region: '西部地区', tag: '紧急项目', status: 1,
    urgentDaysThreshold: 7, currentProgress: 72, targetProgress: 1200,
    progressUnit: '件', beneficiary: '瓦吾小学学生',
    coverImage: 'https://images.pexels.com/photos/15311442/pexels-photo-15311442.jpeg',
    description: '瓦吾小学位于海拔 2700 米的山巅,冬长夏短,温差极大。',
    needs: [
      { title: '儿童冬装外套', description: '标准:8 成新以上,无破损,男女不限', sortOrder: 1 },
      { title: '保暖棉鞋 / 运动鞋', description: '标准:全新或近全新,码数 28-38 码', sortOrder: 2 },
      { title: '加厚袜 / 手套 / 围巾', description: '标准:仅限全新', sortOrder: 3 },
    ],
  },
  {
    title: '乡村阅读角落建设',
    location: '甘肃·定西', region: '西部地区', tag: '教育支持', status: 1,
    urgentDaysThreshold: 7, currentProgress: 45, targetProgress: 5000,
    progressUnit: '本', beneficiary: '定西乡村小学',
    description: '为乡村小学搭建可循环的图书角。',
    needs: [
      { title: '青少年绘本', description: '适合 6-12 岁阅读', sortOrder: 1 },
      { title: '文具盒套装', description: '包含笔/尺/橡皮', sortOrder: 2 },
    ],
  },
  {
    title: '社区闲置循环共享舱',
    location: '上海·普陀', region: '华东地区', tag: '社区帮扶', status: 1,
    urgentDaysThreshold: 7, currentProgress: 91, targetProgress: 200,
    progressUnit: '件', beneficiary: '社区困难家庭',
    description: '在社区建立可借用、可捐赠的共享物品舱。',
    needs: [
      { title: '烧水壶', description: '可正常使用的电热水壶', sortOrder: 1 },
      { title: '电风扇', description: '落地式或台扇', sortOrder: 2 },
      { title: '家用梯子', description: '三步梯,稳固即可', sortOrder: 3 },
    ],
  },
  {
    title: '高校毕业季旧物接力',
    location: '上海·杨浦', region: '华东地区', tag: '校园项目', status: 1,
    urgentDaysThreshold: 7, currentProgress: 60, targetProgress: 800,
    progressUnit: '件', beneficiary: '高校毕业生 / 周边社区',
    description: '毕业季宿舍旧物回收并转赠。',
    needs: [
      { title: '宿舍小家电', description: '电吹风/小台灯/电风扇', sortOrder: 1 },
      { title: '教材书籍', description: '可继续使用的教材', sortOrder: 2 },
    ],
  },
  {
    title: '湖南山区学校图书角扩容',
    location: '湖南·怀化', region: '华中地区', tag: '教育支持', status: 1,
    urgentDaysThreshold: 7, currentProgress: 25, targetProgress: 1500,
    progressUnit: '本', beneficiary: '湖南山区小学',
    description: '为湖南山区小学补充课外读物。',
    needs: [
      { title: '课外读物', description: '小学高年级到初中', sortOrder: 1 },
      { title: '字典', description: '新华字典或同级别', sortOrder: 2 },
    ],
  },
  {
    title: '广州社区旧衣回收计划',
    location: '广东·广州', region: '华南地区', tag: '社区帮扶', status: 1,
    urgentDaysThreshold: 7, currentProgress: 55, targetProgress: 600,
    progressUnit: '件', beneficiary: '广州社区困难家庭',
    description: '回收可穿着的旧衣物并分配到社区。',
    needs: [
      { title: '四季外套', description: '干净无破损,适合日常穿着', sortOrder: 1 },
      { title: '儿童衣物', description: '0-12 岁', sortOrder: 2 },
    ],
  },
  {
    title: '北京高校社区循环市集',
    location: '北京·海淀', region: '华北地区', tag: '校园项目', status: 1,
    urgentDaysThreshold: 7, currentProgress: 70, targetProgress: 500,
    progressUnit: '件', beneficiary: '高校学生 / 周边居民',
    description: '校园闲置物品循环市集。',
    needs: [
      { title: '小型生活电器', description: '可正常使用的宿舍电器', sortOrder: 1 },
      { title: '日用杂货', description: '未拆封的生活用品', sortOrder: 2 },
    ],
  },
  {
    title: '云南怒江山村校服计划',
    location: '云南·怒江', region: '西部地区', tag: '紧急项目', status: 1,
    urgentDaysThreshold: 7, currentProgress: 40, targetProgress: 400,
    progressUnit: '套', beneficiary: '怒江山村小学生',
    description: '为云南怒江山村学生补充校服。',
    needs: [
      { title: '儿童校服', description: '适合小学生,夏季/秋季', sortOrder: 1 },
      { title: '配套书包', description: '全新或近全新', sortOrder: 2 },
    ],
  },
];

module.exports = {
  async up() {
    for (const spec of PROJECT_SEEDS) {
      const { needs = [], ...projectFields } = spec;
      const [project] = await CharityProject.findOrCreate({
        where: { title: spec.title },
        defaults: projectFields,
      });
      for (const need of needs) {
        await CharityProjectNeed.findOrCreate({
          where: { charityProjectId: project.id, title: need.title },
          defaults: { ...need, charityProjectId: project.id },
        });
      }
    }
    console.log('OK: 8 个 charity_projects + 18 个 needs 已就位');
  },

  async down() {
    await CharityProjectNeed.destroy({ where: {}, truncate: true, restartIdentity: true });
    await CharityProject.destroy({ where: {}, truncate: true, restartIdentity: true });
    console.log('OK: charity_projects + needs demo 数据已清理');
  },
};