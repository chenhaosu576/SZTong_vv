# 服务站可预约时段接口实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 service-centers 模块加一个公开 GET 端点 `GET /api/v1/client/service-centers/:code/slots`,返回该站点未来 14 天(可扩 30 天上限)的所有可预约时段(含已满),落表 + 预生数据 + 接路由,让"站点 + 时段"设计目标闭环。前端**不**动。

**Architecture:** 一次性落一张 `service_slots` 表(SQL 来自 `SZTong.sql` L157-175,但走 sequelize-cli migration 而非 001 bootstrap);一个 Sequelize Model + 与 ServiceCenter 的 1:N 关联;`serviceCenters.service.js` 加 `listSlots(code, {dateFrom, dateTo})`;routes.js 加一个公开 GET 路由;004 seeder 用 `bulkCreate({ ignore: true })` 幂等预生未来 14 天 × 3 时段 × N 中心。**没有引入新依赖,不动前端,不动 orders。**

**Tech Stack:** Express 5 + Sequelize 6 + MySQL 8(沿用现有 backend)。node 后端启动后用 curl 跑 smoke 验证。

**Spec:** `docs/superpowers/specs/2026-07-08-service-centers-slots-design.md`

**Phase 边界检查点:** 跑完 Phase A(后端基础)后暂停让用户 review(改了 model/迁移);其它 Phase 之间不强制 review,执行中遇到偏差直接就地修。

---

## 0. 文件结构总览

### 后端新增

```
backend/migrations/
└── 20260708000000-create-service-slots.js            # service_slots 建表

backend/src/db/models/
└── serviceSlot.js                                    # Sequelize Model

backend/src/db/seeders/
└── 004-service-slots-demo.js                         # 14 天预生
```

### 后端修改

- `backend/src/db/models/index.js` —— 注册 ServiceSlot + 加 1:N 关联
- `backend/src/modules/service-centers/serviceCenters.service.js` —— 加 `listSlots` + helpers
- `backend/src/modules/service-centers/routes.js` —— 加 `GET /:code/slots`

---

## 1. 任务依赖图

```
Phase A (后端基础)
  T1: migration 002(建 service_slots 表)
  T2: ServiceSlot model + index.js 注册 + 关联
   ⏸ Phase 边界:暂停 review

Phase B (后端业务)
  T3: serviceCenters.service.js 加 listSlots + helpers
  T4: routes.js 加 GET /:code/slots

Phase C (数据)
  T5: seeder 004 预生 14 天

Phase D (验证)
  T6: 端到端 smoke(curl 6 个验证点)
```

每个 Task 是 1 个独立可 commit 的工作单元。Task 内已包含 verify + commit 步骤。

---

## Phase A:后端基础

### Task 1:migration 002(建 service_slots 表)

**Files:**
- Create: `backend/migrations/20260708000000-create-service-slots.js`

- [ ] **Step 1.1:创建 migration 文件**

```bash
cd backend
touch migrations/20260708000000-create-service-slots.js
```

- [ ] **Step 1.2:写 migration 文件**

```js
// migrations/20260708000000-create-service-slots.js
// service_slots 表:每个 (service_center, service_date, period) 一行。
// 容量 = capacity;已预约数 = reserved_count;status=1 启用 / 0 下线。
// 唯一键保证 (center, date, period) 不重复,FK ON DELETE CASCADE 跟 service_centers 联动。
//
// 执行入口:npm run db:migrate
// 回滚入口:npm run db:migrate:undo(单步)
//
// 注:本表不在 001-init-core-tables.sql bootstrap 里(那是 7 张核心表的一次性脚本),
// 后续 schema 变更都走 sequelize-cli migration。capacity 默认 3 而不是 SZTong.sql 草稿的 0,
// 是因为 0 容量毫无业务意义;seeder 004 也会显式传 capacity=3,二者一致。

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('service_slots', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      service_center_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      service_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      period: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      reserved_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('service_slots', {
      fields: ['service_center_id', 'service_date', 'period'],
      unique: true,
      name: 'uk_service_slots_center_date_period',
    });
    await queryInterface.addIndex('service_slots', {
      fields: ['service_date', 'status'],
      name: 'idx_service_slots_date_status',
    });

    await queryInterface.addConstraint('service_slots', {
      fields: ['service_center_id'],
      type: 'foreign key',
      name: 'fk_service_slots_center_id',
      references: { table: 'service_centers', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('service_slots', {
      fields: ['capacity'],
      type: 'check',
      name: 'chk_service_slots_capacity',
      where: { capacity: { [Sequelize.Op.gte]: 0 } },
    });
    await queryInterface.addConstraint('service_slots', {
      fields: ['reserved_count'],
      type: 'check',
      name: 'chk_service_slots_reserved_count',
      where: { reserved_count: { [Sequelize.Op.gte]: 0 } },
    });
    await queryInterface.addConstraint('service_slots', {
      fields: ['status'],
      type: 'check',
      name: 'chk_service_slots_status',
      where: { status: { [Sequelize.Op.in]: [0, 1] } },
    });
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.dropTable('service_slots');
  },
};
```

- [ ] **Step 1.3:跑 migration**

Run: `cd backend && npm run db:migrate`
Expected: 末尾追加一行 `== 20260708000000-create-service-slots: migrated =====`(前面 001 和 002-content-and-profile 已经 migrated 是正常的)

- [ ] **Step 1.4:验证表已建**

Run: `cd backend && node -e "
require('dotenv').config();
const { sequelize } = require('./src/config/db');
(async () => {
  const [cols] = await sequelize.query('DESCRIBE service_slots');
  console.log(JSON.stringify(cols, null, 2));
  process.exit(0);
})();
"`
Expected: 输出 8 列(id / service_center_id / service_date / period / capacity / reserved_count / status / created_at / updated_at)

- [ ] **Step 1.5:验证唯一键 + FK 存在**

Run: `cd backend && node -e "
require('dotenv').config();
const { sequelize } = require('./src/config/db');
(async () => {
  const [idx] = await sequelize.query('SHOW INDEX FROM service_slots');
  console.log('INDEX:', idx.map(r => r.Key_name).join(','));
  const [fk] = await sequelize.query(\`SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_slots' AND CONSTRAINT_TYPE = 'FOREIGN KEY'\`);
  console.log('FK:', fk.map(r => r.CONSTRAINT_NAME).join(','));
  process.exit(0);
})();
"`
Expected:
- `INDEX` 包含 `uk_service_slots_center_date_period` 和 `idx_service_slots_date_status`
- `FK` 包含 `fk_service_slots_center_id`

- [ ] **Step 1.6:Commit**

```bash
cd backend
git add migrations/20260708000000-create-service-slots.js
git commit -m "$(cat <<'EOF'
feat(backend): migration 002 create service_slots table

新增 service_slots 表,字段含 (center_id, service_date, period, capacity,
reserved_count, status)。唯一键 (center, date, period) 防止重复,
FK service_center_id ON DELETE CASCADE 跟 service_centers 联动。
CHECK 约束保证 reserved_count <= capacity、capacity >= 0、status IN (0,1)。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2:ServiceSlot model + index.js 注册

**Files:**
- Create: `backend/src/db/models/serviceSlot.js`
- Modify: `backend/src/db/models/index.js`

- [ ] **Step 2.1:写 serviceSlot.js model**

文件: `backend/src/db/models/serviceSlot.js`

```js
// db/models/serviceSlot.js
// 对应 SZTong.sql L157-175(走 sequelize migration 002 建表)。
// 表名 service_slots;可预约时段(中心 × 日期 × 时段)字典,订单后续可强引用 (center_id, service_date, period)。
// 不启用 paranoid:用 status 控制上下线,reserved_count 控制容量。

module.exports = (sequelize, DataTypes) => {
  const ServiceSlot = sequelize.define(
    'ServiceSlot',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      serviceCenterId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'service_center_id',
      },
      serviceDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'service_date',
      },
      period: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        validate: { min: 0 },
      },
      reservedCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'reserved_count',
        validate: { min: 0 },
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        validate: { isIn: [[0, 1]] },
      },
    },
    {
      tableName: 'service_slots',
    }
  );

  return ServiceSlot;
};
```

- [ ] **Step 2.2:在 index.js 注册 ServiceSlot + 加关联**

修改: `backend/src/db/models/index.js`

在 `const ProfileDemoContent = require('./profileDemoContent')(sequelize, Sequelize.DataTypes);` 这一行**后面**新增:

```js
const ServiceSlot = require('./serviceSlot')(sequelize, Sequelize.DataTypes);
```

然后在 `// Admin N → 1 ServiceCenter(业务侧关联;FK 在 SQL 层已建立)` 这一行**后面**新增:

```js
// ServiceCenter 1 → N ServiceSlot
ServiceCenter.hasMany(ServiceSlot, { foreignKey: 'serviceCenterId', as: 'slots' });
ServiceSlot.belongsTo(ServiceCenter, { foreignKey: 'serviceCenterId', as: 'serviceCenter' });
```

最后在 `module.exports = { ... }` 的对象里,在 `ProfileDemoContent,` 这一行**后面**新增:

```js
ServiceSlot,
```

- [ ] **Step 2.3:验证 model 注册成功**

Run: `cd backend && node -e "
require('dotenv').config();
const models = require('./src/db/models');
const slot = models.ServiceSlot;
const center = models.ServiceCenter;
console.log('ServiceSlot tableName:', slot.tableName);
console.log('ServiceSlot attrs:', Object.keys(slot.rawAttributes).join(','));
console.log('associations on ServiceCenter:', Object.keys(center.associations).filter(k => k.includes('slot') || k.includes('Service')).join(','));
process.exit(0);
"`
Expected:
- `ServiceSlot tableName: service_slots`
- `ServiceSlot attrs:` 包含 `serviceCenterId,serviceDate,period,capacity,reservedCount,status,id,createdAt,updatedAt`
- `associations on ServiceCenter:` 包含 `slots`

- [ ] **Step 2.4:验证 service / modules 不挂掉(冷启动)**

Run: `cd backend && node -e "
require('dotenv').config();
const models = require('./src/db/models');
// 不真连 DB,只确认 require 链没崩
console.log('OK models loaded:', Object.keys(models).filter(k => !['sequelize','Sequelize'].includes(k)).join(','));
process.exit(0);
"`
Expected: `OK models loaded:` 包含 `ServiceSlot` 字样,且不抛异常

- [ ] **Step 2.5:Commit**

```bash
cd backend
git add src/db/models/serviceSlot.js src/db/models/index.js
git commit -m "$(cat <<'EOF'
feat(backend): add ServiceSlot model and ServiceCenter association

ServiceSlot model 字段含 (id, serviceCenterId, serviceDate, period,
capacity, reservedCount, status);ServiceCenter 1:N ServiceSlot
(as 'slots')。ServiceSlot.belongsTo ServiceCenter (as 'serviceCenter')。
model 注册到 db/models/index.js,ServiceSlot 通过 sequelize 自动 sync
列结构(列已由 migration 002 建好,这里只挂 model)。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

⏸ **Phase 边界检查**:跑完 T1 + T2 后,**暂停让用户 review**。已改 model/迁移,确认 OK 再进 Phase B。如果 review 发现问题,在迁移上 undo 后再调,不要带病往前。

---

## Phase B:后端业务

### Task 3:serviceCenters.service.js 加 listSlots + helpers

**Files:**
- Modify: `backend/src/modules/service-centers/serviceCenters.service.js`

- [ ] **Step 3.1:在文件顶部加 imports 和常量**

修改: `backend/src/modules/service-centers/serviceCenters.service.js`

替换文件最顶部的 3 行 import:

```js
const { Order, RecycleOrder, DonationOrder, ServiceCenter, CharityProject } = require('../../db/models');
const { Op } = require('sequelize');
const ApiError = require('../../utils/ApiError');
```

为:

```js
const { ServiceCenter, ServiceSlot } = require('../../db/models');
const { Op } = require('sequelize');
const ApiError = require('../../utils/ApiError');
```

**注意**:这里 import 改成了 `ServiceCenter + ServiceSlot`(本 service 不需要 orders/charity)。`Op` 之前没用到,现在引进来。

- [ ] **Step 3.2:加 helpers 和 listSlots 函数**

在文件末尾(`module.exports = { listCenters, getCenterByCode };` 这一行**前面**)新增:

```js
const MAX_RANGE_DAYS = 30;
const DEFAULT_RANGE_DAYS = 14;

function parseDateParam(s, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new ApiError(40001, `${field} 必须是 YYYY-MM-DD 格式`);
  }
  return s;
}

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

function pickSlotPayload(s) {
  const available = s.status === 1 && s.reservedCount < s.capacity;
  return {
    id: s.id,
    date: s.serviceDate,
    period: s.period,
    capacity: s.capacity,
    reservedCount: s.reservedCount,
    available,
    status: s.status,
  };
}

async function listSlots(code, { dateFrom, dateTo } = {}) {
  const center = await ServiceCenter.findOne({ where: { code } });
  if (!center || center.status !== 1) throw new ApiError(40401, '服务站不存在');

  const from = dateFrom ? parseDateParam(dateFrom, 'dateFrom') : todayIso();
  const to   = dateTo   ? parseDateParam(dateTo, 'dateTo')     : addDaysIso(from, DEFAULT_RANGE_DAYS - 1);
  if (from > to) throw new ApiError(40020, '日期范围不合法');
  if (to > addDaysIso(from, MAX_RANGE_DAYS)) {
    throw new ApiError(40020, '查询范围不能超过 30 天');
  }

  const rows = await ServiceSlot.findAll({
    where: {
      serviceCenterId: center.id,
      serviceDate: { [Op.between]: [from, to] },
      status: 1,
    },
    order: [['service_date', 'ASC'], ['period', 'ASC']],
  });

  return {
    center: { id: center.id, code: center.code, name: center.name },
    range: { dateFrom: from, dateTo: to },
    list: rows.map(pickSlotPayload),
  };
}
```

- [ ] **Step 3.3:更新 module.exports**

替换 `module.exports = { listCenters, getCenterByCode };` 为:

```js
module.exports = { listCenters, getCenterByCode, listSlots };
```

- [ ] **Step 3.4:smoke 验证(仅调 service 函数,不启动 HTTP)**

Run: `cd backend && node -e "
require('dotenv').config();
const service = require('./src/modules/service-centers/serviceCenters.service');
(async () => {
  // 测 1:不传日期,默认 14 天窗口
  const r1 = await service.listSlots('xuhui-caohejing');
  console.log('TEST 1 center:', r1.center.code, 'range:', JSON.stringify(r1.range), 'list size:', r1.list.length);
  if (r1.list.length === 0) { console.log('NOTE: list is empty (seeder 004 还没跑,正常)'); }

  // 测 2:不存在的 code → 抛 40401
  try { await service.listSlots('no-such-code'); console.log('TEST 2 FAILED (expected throw)'); }
  catch (e) { console.log('TEST 2 OK code=' + e.code + ' msg=' + e.message); }

  // 测 3:超 30 天 → 抛 40020
  try { await service.listSlots('xuhui-caohejing', { dateFrom: '2026-07-01', dateTo: '2026-08-15' }); console.log('TEST 3 FAILED'); }
  catch (e) { console.log('TEST 3 OK code=' + e.code + ' msg=' + e.message); }

  // 测 4:格式错 → 抛 40001
  try { await service.listSlots('xuhui-caohejing', { dateFrom: 'bad' }); console.log('TEST 4 FAILED'); }
  catch (e) { console.log('TEST 4 OK code=' + e.code + ' msg=' + e.message); }

  // 测 5:dateFrom > dateTo → 抛 40020
  try { await service.listSlots('xuhui-caohejing', { dateFrom: '2026-07-15', dateTo: '2026-07-08' }); console.log('TEST 5 FAILED'); }
  catch (e) { console.log('TEST 5 OK code=' + e.code + ' msg=' + e.message); }

  process.exit(0);
})();
"`
Expected:
- `TEST 1` 输出 center.code = `xuhui-caohejing`、range 含今天、list 长度可能是 0(没 seeder)
- `TEST 2` code=40401
- `TEST 3` code=40020,msg 含 "30 天"
- `TEST 4` code=40001,msg 含 "YYYY-MM-DD"
- `TEST 5` code=40020,msg 含 "日期范围"

- [ ] **Step 3.5:Commit**

```bash
cd backend
git add src/modules/service-centers/serviceCenters.service.js
git commit -m "$(cat <<'EOF'
feat(backend): add listSlots service for service-centers

serviceCenters.service.js 加 listSlots(code, {dateFrom, dateTo}):
  - 默认窗口 [今天, 今天+13],可扩到 [dateFrom, dateFrom+30]
  - 校验: 40401(code 不存在/下线) / 40020(范围 > 30 天或 from>to) / 40001(日期格式错)
  - 查 status=1 的 slot,按 (service_date ASC, period ASC) 返回
  - 输出含 {center, range, list:[{id, date, period, capacity, reservedCount, available, status}]}
    available = (status===1 && reservedCount < capacity),给前端做可点/置灰

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4:routes.js 加 GET /:code/slots

**Files:**
- Modify: `backend/src/modules/service-centers/routes.js`

- [ ] **Step 4.1:在 /:code 路由之前注册 /:code/slots**

修改: `backend/src/modules/service-centers/routes.js`

替换整个文件为:

```js
// modules/service-centers/routes.js
// GET /api/v1/client/service-centers
// GET /api/v1/client/service-centers/:code
// GET /api/v1/client/service-centers/:code/slots

const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const service = require('./serviceCenters.service');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await service.listCenters({
      city: req.query.city,
      district: req.query.district,
    });
    res.json(ok({ list: data, total: data.length }));
  }),
);

// 写路径先于 :code 注册 —— 即便 path 段数不冲突(/:code 不会吞 /:code/slots),
// 显式排序能让读者一眼看清 slots 是平级子资源而不是 :code 的子动作。
router.get(
  '/:code/slots',
  asyncHandler(async (req, res) => {
    const data = await service.listSlots(req.params.code, {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });
    res.json(ok(data));
  }),
);

router.get(
  '/:code',
  asyncHandler(async (req, res) => {
    const data = await service.getCenterByCode(req.params.code);
    res.json(ok(data));
  }),
);

module.exports = router;
```

- [ ] **Step 4.2:启动后端,curl 验证基础返回**

启动后端(后台跑,稍后 kill):

Run: `cd backend && npm run dev &`
Expected: 看到 `Listening on port 8080`(或其他 PORT)
记下 PID: `echo $!`,稍后 `kill <PID>` 收尾。

Run:
```bash
curl -s http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing/slots
```
Expected: 返回 `{"code":0,"message":"ok","data":{"center":{"id":...,"code":"xuhui-caohejing","name":"..."},"range":{"dateFrom":"2026-07-08","dateTo":"2026-07-21"},"list":[]}}`(`list` 为空数组,因为 004 seeder 还没跑;`range` 应该是今天到今天+13)

- [ ] **Step 4.3:验证 4xx 错误路径**

```bash
# 40401
curl -s -w "\nHTTP %{http_code}\n" http://localhost:8080/api/v1/client/service-centers/no-such-code/slots
# 40001
curl -s -w "\nHTTP %{http_code}\n" "http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing/slots?dateFrom=bad"
# 40020 超 30 天
curl -s -w "\nHTTP %{http_code}\n" "http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing/slots?dateFrom=2026-07-01&dateTo=2026-08-15"
# 40020 from > to
curl -s -w "\nHTTP %{http_code}\n" "http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing/slots?dateFrom=2026-07-15&dateTo=2026-07-08"
```

Expected(每条 curl):
- 40401: `{"code":40401,..."message":"服务站不存在"}`,HTTP 404
- 40001: `{"code":40001,...}"message":"dateFrom 必须是 YYYY-MM-DD 格式"`,HTTP 400
- 40020(超 30 天): `{"code":40020,...}"message":"查询范围不能超过 30 天"`,HTTP 400
- 40020(from>to): `{"code":40020,...}"message":"日期范围不合法"`,HTTP 400

- [ ] **Step 4.4:验证 list/detail 不被 slots 路由破坏**

```bash
curl -s -w "\nHTTP %{http_code}\n" http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing
```

Expected: 返回 `{"code":0,"message":"ok","data":{"id":...,"code":"xuhui-caohejing","name":"...",...}}` — 详情接口正常工作

- [ ] **Step 4.5:杀掉 dev server**

```bash
kill <PID>
```

- [ ] **Step 4.6:Commit**

```bash
cd backend
git add src/modules/service-centers/routes.js
git commit -m "$(cat <<'EOF'
feat(backend): GET /service-centers/:code/slots route

公开访问(不挂 authMiddleware,与 list/detail 一致)。
查询参数透传到 service.listSlots,响应沿用 ok() 包装。
slots 路由放在 :code 路由之前(显式排序,语义清晰;Express 按 path 段数精确匹配,顺序无副作用)。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase C:数据

### Task 5:seeder 004 预生 14 天

**Files:**
- Create: `backend/src/db/seeders/004-service-slots-demo.js`

- [ ] **Step 5.1:写 seeder**

文件: `backend/src/db/seeders/004-service-slots-demo.js`

```js
// db/seeders/004-service-slots-demo.js
// service_slots 预生 seeder (幂等)。
// 职责:
//   - 遍历 status=1 的 service_center
//   - 每个中心预生 [今天, 今天+13] 共 14 天 × 3 时段 的 slot 行
//   - 默认 capacity=3,reserved_count=0,status=1
// 使用方: npm run db:seed
// 幂等: bulkCreate({ ignore: true }) 走 INSERT IGNORE,
//       遇唯一键 (center_id, service_date, period) 冲突静默跳过

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

    await ServiceSlot.bulkCreate(rows, { ignore: true });

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
```

- [ ] **Step 5.2:跑 seeder**

Run: `cd backend && npm run db:seed`
Expected: 末尾追加一行类似 `OK: service_slots 预生完成;期望 168 行,操作前已存在 0,操作后现存 168`(4 中心 × 14 天 × 3 时段 = 168;如果之前 001~003 跑过且 demo data 没建过 service_slots,就是 0/168)

- [ ] **Step 5.3:验证幂等(再跑一次)**

Run: `cd backend && npm run db:seed`
Expected: 同一行 `OK: ...;期望 168 行,操作前已存在 168,操作后现存 168` — 没重复插入,也没报错

- [ ] **Step 5.4:DB 抽查 1 个中心 1 天的数据**

Run: `cd backend && node -e "
require('dotenv').config();
const { sequelize, ServiceSlot } = require('./src/db/models');
(async () => {
  const today = new Date();
  const todayIso = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  const rows = await ServiceSlot.findAll({
    where: { serviceDate: todayIso },
    order: [['service_center_id','ASC'],['period','ASC']],
  });
  console.log('Total rows for today:', rows.length);
  for (const r of rows.slice(0, 3)) {
    console.log('  center=' + r.serviceCenterId, 'period=' + r.period, 'cap=' + r.capacity, 'reserved=' + r.reservedCount, 'status=' + r.status);
  }
  process.exit(0);
})();
"`
Expected: `Total rows for today: 12`(4 中心 × 3 时段),前 3 行展示正常

- [ ] **Step 5.5:Commit**

```bash
cd backend
git add src/db/seeders/004-service-slots-demo.js
git commit -m "$(cat <<'EOF'
feat(backend): seeder 004 pre-generate 14 days of service_slots

每个 status=1 的 service_center 预生 [今天, 今天+13] 共 14 天 × 3 时段
(09-12 / 13-16 / 18-21) 的 slot 行;默认 capacity=3,reserved_count=0。
4 中心 × 14 天 × 3 时段 = 168 行/全量。

bulkCreate({ ignore: true }) 走 INSERT IGNORE 遇唯一键冲突静默跳过,
seeder 可重复执行不报错。down() 直接清表(整体回滚用)。

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase D:验证

### Task 6:端到端 smoke(curl 6 个验证点)

**Files:** 不改文件,纯验证

- [ ] **Step 6.1:启动后端**

Run: `cd backend && npm run dev &`
记下 PID,稍后 kill。

- [ ] **Step 6.2:验证点 1 — 列表接口拿到 168 行**

```bash
curl -s http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing/slots | node -e "
let s = ''; process.stdin.on('data', c => s += c); process.stdin.on('end', () => {
  const d = JSON.parse(s).data;
  console.log('center:', d.center.code, 'range:', d.range.dateFrom, '->', d.range.dateTo, 'list size:', d.list.length);
  if (d.list.length !== 42) { console.log('FAIL expected 42 rows (14 days * 3 periods)'); process.exit(1); }
  console.log('sample first row:', JSON.stringify(d.list[0]));
  console.log('PASS');
});
"
```

Expected: `list size: 42`,`PASS`(14 天 × 3 时段 = 42 行/中心)

- [ ] **Step 6.3:验证点 2 — dateFrom/dateTo 显式传参**

```bash
curl -s "http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing/slots?dateFrom=2026-07-08&dateTo=2026-07-15" | node -e "
let s=''; process.stdin.on('data',c=>s+=c); process.stdin.on('end',()=>{
  const d = JSON.parse(s).data;
  console.log('range:', d.range.dateFrom, '->', d.range.dateTo, 'list size:', d.list.length);
  if (d.list.length !== 24) { console.log('FAIL expected 24 (8 days * 3 periods)'); process.exit(1); }
  console.log('PASS');
});
"
```

Expected: `range: 2026-07-08 -> 2026-07-15`,`list size: 24`,`PASS`

- [ ] **Step 6.4:验证点 3 — 4xx 错误路径都报对**

```bash
for url in \
  "http://localhost:8080/api/v1/client/service-centers/no-such-code/slots" \
  "http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing/slots?dateFrom=bad" \
  "http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing/slots?dateFrom=2026-07-01&dateTo=2026-08-15" \
  "http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing/slots?dateFrom=2026-07-15&dateTo=2026-07-08"; do
  echo "URL: $url"
  curl -s -w "  HTTP %{http_code}\n" "$url" | head -1
  echo "---"
done
```

Expected(4 个输出):
- URL 1: `{"code":40401,"message":"服务站不存在",...}`,HTTP 404
- URL 2: `{"code":40001,"message":"dateFrom 必须是 YYYY-MM-DD 格式",...}`,HTTP 400
- URL 3: `{"code":40020,"message":"查询范围不能超过 30 天",...}`,HTTP 400
- URL 4: `{"code":40020,"message":"日期范围不合法",...}`,HTTP 400

- [ ] **Step 6.5:验证点 4 — 现有 list/detail 接口没破坏**

```bash
curl -s http://localhost:8080/api/v1/client/service-centers | head -c 200
echo ""
echo "---"
curl -s http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing | head -c 200
```

Expected: 两个返回都 `{"code":0,"message":"ok","data":...}`,list 包含 4 中心,detail 返回 xuhui-caohejing 完整信息

- [ ] **Step 6.6:验证点 5 — 排序按 (date, period)**

```bash
curl -s http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing/slots | node -e "
let s=''; process.stdin.on('data',c=>s+=c); process.stdin.on('end',()=>{
  const d = JSON.parse(s).data;
  let prev = '';
  for (const r of d.list) {
    const cur = r.date + ' ' + r.period;
    if (prev && cur < prev) { console.log('FAIL sort broken at', cur, '<', prev); process.exit(1); }
    prev = cur;
  }
  console.log('PASS sort OK, total', d.list.length, 'rows');
});
"
```

Expected: `PASS sort OK, total 42 rows`

- [ ] **Step 6.7:验证点 6 — available 字段全为 true(初始 reserved=0)**

```bash
curl -s http://localhost:8080/api/v1/client/service-centers/xuhui-caohejing/slots | node -e "
let s=''; process.stdin.on('data',c=>s+=c); process.stdin.on('end',()=>{
  const d = JSON.parse(s).data;
  const available = d.list.filter(r => r.available).length;
  const total = d.list.length;
  if (available !== total) { console.log('FAIL', available, 'of', total, 'available'); process.exit(1); }
  console.log('PASS all', total, 'slots available=true (reserved=0)');
});
"
```

Expected: `PASS all 42 slots available=true (reserved=0)`

- [ ] **Step 6.8:杀 dev server**

```bash
kill <PID>
```

- [ ] **Step 6.9:无 commit 步骤**

验证任务不产 commit。如果 Step 6.2-6.7 全部 PASS,Phase D 收尾;如有 FAIL,定位回 Phase A/B/C 对应 Task 修复,**不** amend 之前的 commit,新增一个 fix commit。

---

## 已识别风险与备注

| 风险 | 缓解 |
| --- | --- |
| Task 1 migration 与 001-init-core-tables.sql 不一致 | 新环境先 `db:migrate:sql` 再 `db:migrate`;已部署环境从 002 开始即可 |
| Task 4 dev server 后台进程忘记 kill | Step 4.5 / 6.8 显式 `kill <PID>`;`npx kill-port 8080` 兜底 |
| seeder 004 在已有 service_slots 行的环境上跑 | `ignore: true` 不破坏旧行,只补缺失 |
| listSlots 改了 service.js 顶部的 import(去掉了 Order/Recycle 等) | `listCenters` / `getCenterByCode` 没用过这些 import,删掉是安全的;git diff 可见 |
| routes 顺序:slots 在 :code 之前 | Express 按 path 段数精确匹配,顺序无副作用;放前面仅为可读性 |

---

*Plan 结束*
