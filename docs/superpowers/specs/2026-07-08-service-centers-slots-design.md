# 服务站可预约时段接口设计

> Spec for: 新增 `GET /api/v1/client/service-centers/:code/slots`,让"站点 + 可预约时段"这一设计目标闭环
> Date: 2026-07-08
> Author: chenhao + claude
> 范围: 一次性补 backend 一张表 + 一个 endpoint + 一个 seeder。前端**不**动

## 1. 目标

服务站模块目前只有列表和详情,缺可预约时段(slot)入口。本轮落地:

- 一张新表 `service_slots`(按 `SZTong.sql` L157-175 设计稿,但 `001-init-core-tables.sql` bootstrap 没建,本次走 sequelize migration 补上)
- 一个公开 GET 端点 `GET /api/v1/client/service-centers/:code/slots`,返回该站点未来 N 天的所有时段(包含已满)
- 一个 seeder 预生未来 14 天的 slot 行,保证接口一上线就有数据

**不在范围(留给后续 PR):**
- 订单创建时锁 slot(`reserved_count++`、唯一键防超)
- 后台定时 job 滚动续期 / 清理过期 slot
- 前端 `AppointmentPage` 接入 slots(目前用本地常量 `APPOINTMENT_PERIODS`;`frontend/src/api/serviceCenters.js` 不加 `fetchSlots`)
- B 端管理后台对 slot 的 CRUD

## 2. 端点

| 端点 | 方法 | 鉴权 | 数据源 | 消费者 |
| --- | --- | --- | --- | --- |
| `/api/v1/client/service-centers/:code/slots` | GET | 公开 | `service_slots` 表 join `service_centers` | 后续 AppointmentPage 接 |

URL 用 `:code`(对齐现有 `GET /:code` 详情),不是数字 `:id`。前端详情页路由就是按 code 传参,seeders 也按 code 主键。

## 3. 数据模型

### 3.1 新增表(migration 002)

```sql
CREATE TABLE service_slots (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_center_id BIGINT UNSIGNED NOT NULL,
  service_date      DATE NOT NULL,
  period            VARCHAR(30) NOT NULL,
  capacity          INT NOT NULL DEFAULT 3,
  reserved_count    INT NOT NULL DEFAULT 0,
  status            TINYINT NOT NULL DEFAULT 1,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_service_slots_center_date_period (service_center_id, service_date, period),
  KEY idx_service_slots_date_status (service_date, status),
  CONSTRAINT fk_service_slots_center_id FOREIGN KEY (service_center_id) REFERENCES service_centers (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_service_slots_capacity CHECK (capacity >= 0),
  CONSTRAINT chk_service_slots_reserved_count CHECK (reserved_count >= 0),
  CONSTRAINT chk_service_slots_status CHECK (status IN (0, 1)),
  CONSTRAINT chk_service_slots_reserved_lte_capacity CHECK (reserved_count <= capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

不动 `001-init-core-tables.sql`(它有顶部注释明确说"后续 schema 变更走 sequelize-cli migration")。

### 3.2 Sequelize 模型

新增 `backend/src/db/models/serviceSlot.js`:

```js
module.exports = (sequelize, DataTypes) => {
  const ServiceSlot = sequelize.define(
    'ServiceSlot',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      serviceCenterId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'service_center_id' },
      serviceDate:     { type: DataTypes.DATEONLY, allowNull: false, field: 'service_date' },
      period:          { type: DataTypes.STRING(30), allowNull: false },
      capacity:        { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3, validate: { min: 0 } },
      reservedCount:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'reserved_count', validate: { min: 0 } },
      status:          { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1, validate: { isIn: [[0, 1]] } },
    },
    { tableName: 'service_slots' }
  );
  return ServiceSlot;
};
```

`backend/src/db/models/index.js` 注册:

```js
const ServiceSlot = require('./serviceSlot')(sequelize, Sequelize.DataTypes);

// ServiceCenter 1 → N ServiceSlot
ServiceCenter.hasMany(ServiceSlot, { foreignKey: 'serviceCenterId', as: 'slots' });
ServiceSlot.belongsTo(ServiceCenter, { foreignKey: 'serviceCenterId', as: 'serviceCenter' });

// 导出加 ServiceSlot
```

## 4. 接口契约

### 4.1 请求

```
GET /api/v1/client/service-centers/:code/slots?dateFrom=2026-07-08&dateTo=2026-07-22
```

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `dateFrom` | `YYYY-MM-DD` | 否 | 今天(本地) | 起始日期 |
| `dateTo` | `YYYY-MM-DD` | 否 | 今天 + 13 | 结束日期(包含) |
| `:code` | string | 是 | — | 站点的 `code` 字段,如 `xuhui-caohejing` |

**校验**:
- 格式错(`YYYY-MM-DD` 之外)→ 40001
- `dateFrom > dateTo` → 40020 `日期范围不合法`
- `dateTo - dateFrom > 30` → 40020 `查询范围不能超过 30 天`
- `:code` 不存在或 `status != 1` → 40401 `服务站不存在`(对齐 `getCenterByCode` 行为)

### 4.2 响应 200

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "center": { "id": 1, "code": "xuhui-caohejing", "name": "徐汇·漕河泾服务站" },
    "range":  { "dateFrom": "2026-07-08", "dateTo": "2026-07-22" },
    "list": [
      { "id": 101, "date": "2026-07-08", "period": "09:00-12:00", "capacity": 5, "reservedCount": 2, "available": 3, "status": 1 },
      { "id": 103, "date": "2026-07-08", "period": "18:00-21:00", "capacity": 5, "reservedCount": 5, "available": 0, "status": 0 }
    ]
  }
}
```

**字段含义**:
- `capacity` — 该 slot 总容量
- `reservedCount` — 已预约数
- `available` — 布尔:`status === 1 && reservedCount < capacity`(给前端做"可点 / 置灰"用)
- `status` — `0` 表示该 slot 被运营下线(本期不会出现,接口里也过滤掉 `status=0` 的行)

**排序**: `service_date ASC, period ASC`(同一日期按时段顺序;跨日期从早到晚)

**隐含语义**:`status=0` 的 slot 行**不返**给前端(数据库里保留供运营回滚)。前端 `available` 永远 ≤ `capacity`,UI 行为稳定。

### 4.3 service 实现

`backend/src/modules/service-centers/serviceCenters.service.js` 加:

```js
const DEFAULT_PERIODS = ['09:00-12:00', '13:00-16:00', '18:00-21:00'];
const MAX_RANGE_DAYS = 30;
const DEFAULT_RANGE_DAYS = 14;

function parseDate(s, field) {
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

  const from = dateFrom ? parseDate(dateFrom, 'dateFrom') : todayIso();
  const to   = dateTo   ? parseDate(dateTo, 'dateTo')     : addDaysIso(from, DEFAULT_RANGE_DAYS - 1);
  if (from > to) throw new ApiError(40020, '日期范围不合法');
  if (addDaysIso(from, MAX_RANGE_DAYS) < to) {
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

`routes.js` 在 `GET /:code` 之前注册新路由(避免被 `/:code` 吞掉):

```js
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
```

注:`/:code` 路由(详情)在前还是后,Express 会精确匹配路径段数 — `/xuhui-caohejing` 和 `/xuhui-caohejing/slots` 不会冲突,顺序无所谓;但保险起见 slots 路由放前面。

## 5. Seeder

新增 `backend/src/db/seeders/004-service-slots-demo.js`(按数字前缀排在 003 之后):

```js
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
    await ServiceSlot.bulkCreate(
      centers.flatMap((c) =>
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
      ),
      { ignore: true },
    );
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

`bulkCreate({ ignore: true })` 是 Sequelize 在 MySQL 下走 `INSERT IGNORE`,遇唯一键冲突静默跳过 — 多次跑 idempotent。`down` 直接清表(整体回滚用)。

**注意**:本轮 seeder 不删过期 slot — 那是后台清理 job 的活;14 天窗口外的 slot 留作"历史可分析"。

## 6. 测试计划

backend 当前没有自动化测试框架(无 `__tests__/` 目录);按 YAGNI 不引入新框架。本轮验证走 **smoke**:

| 验证点 | 期望 |
| --- | --- |
| 跑 `npm run db:migrate:sql` + seed 链后,MySQL `service_slots` 表有 `(4 中心 × 14 天 × 3 时段) = 168` 行 | count = 168 |
| `GET /api/v1/client/service-centers/xuhui-caohejing/slots` 不传参 | 200,默认 14 天窗口,每中心每天 3 行,全部 `available=true`、`reservedCount=0` |
| `GET /api/v1/client/service-centers/xuhui-caohejing/slots?dateFrom=2026-07-08&dateTo=2026-07-15` | 200,8 天 × 3 时段 = 24 行,`range` echo 正确 |
| `GET /api/v1/client/service-centers/xuhui-caohejing/slots?dateTo=2026-08-15`(跨度 38 天) | 40020 |
| `GET /api/v1/client/service-centers/no-such-code/slots` | 40401 |
| `GET /api/v1/client/service-centers/xuhui-caohejing/slots?dateFrom=bad` | 40001 |

**手动执行顺序**:
1. `cd backend && npx sequelize-cli db:migrate` — 跑 002 建表(001 已被 `npm run db:migrate:sql` 处理)
2. `cd backend && npm run db:seed` — 跑 001 ~ 004 全量 seeder
3. `cd backend && npm run dev` — 启服务
4. 用 curl 跑上面 6 个验证点

后续 PR 引入 jest + sqlite-memory 后再补 `__tests__/integration/service-centers.slots.test.js`。

## 7. 改动文件清单

```
新增:
  backend/migrations/002-create-service-slots.js
  backend/src/db/models/serviceSlot.js
  backend/src/db/seeders/004-service-slots-demo.js

修改:
  backend/src/db/models/index.js                                  (+ServiceSlot 关联 + export)
  backend/src/modules/service-centers/serviceCenters.service.js   (+listSlots + helpers)
  backend/src/modules/service-centers/routes.js                   (+GET /:code/slots)
```

## 8. 已识别风险

| 风险 | 缓解 |
| --- | --- |
| migration 与 001-init-core-tables.sql 不一致(bootstrap 没建 service_slots) | 新环境先跑 `db:migrate:sql`(001 一次性建核心表),再跑 `npx sequelize-cli db:migrate`(002 起本轮 service_slots),最后 `npm run db:seed`(001 ~ 004 全量 seeder)。已部署环境从 002 开始即可。 |
| `bulkCreate({ ignore: true })` 在 sqlite 测试库可能行为不一致 | 本轮不依赖 sqlite 测试,直接连 MySQL 跑 smoke;后续接 jest 再验证。 |
| `period` 用 VARCHAR(30) 自由字符串,后续接 booking 时无法强约束 | 本轮不在范围,记入后续 PR;Booking PR 应改 `period` 为 enum 或建 `service_periods` 字典表。 |
| `defaultValue: 3` 与 SZTong.sql 默认 0 不一致 | SQL 默认 0 是历史设计稿;实际运营 0 容量毫无用处,model 改为 3 更贴近业务。Migration SQL 里保留 `DEFAULT 3` 同步。 |
| `ServiceSlot.findAll` 用 `Op.between` 查 DATE 列,sequelize 把 JS Date 转成 ISO 字符串 | `serviceDate` 是 DATEONLY,`from` / `to` 是 `YYYY-MM-DD` 字符串,Sequelize 会直接当字面量传给 MySQL DATE 比较,**不**走 Date 包装,安全。 |
| 旧用户数据(已存在的 service_slots 行被运营手动改过 capacity)被 004 覆盖 | `ignore: true` 不会更新已存在行,只会插入缺失;旧行保留。 |
| 14 天窗口边界:`dateTo = addDaysIso(from, 13)` 包含今天 + 13 共 14 天 | 与现有 `dateTo` 含端点的语义一致;前端用 `<=` 过滤时不会出现"少一天"问题。 |

## 9. 后续批次(本轮不解决)

1. **Booking 集成** — `POST /client/orders/recycle` 验证 slot 存在 + `status=1` + 剩余容量,事务内 `reserved_count++`;同时把 `Order.scheduled_period` 改成强引用 `ServiceSlot.id` 或 `(center_id, service_date, period)` 三元组。
2. **Slot 管理后台** — B 端 CRUD:调整单 slot capacity、临时关闭某天、批量复制模板。
3. **滚动续期 job** — 每晚 00:00 给所有中心补未来第 15~30 天的 slot,删除 7 天前的过期 slot(留作分析)。
4. **Period 字典化** — 抽 `service_periods` 字典表,`period` 改为外键,支持不同时段不同 capacity(早高峰 09-12 给 5,晚高峰 18-21 给 8 等)。
5. **前端接入** — `frontend/src/api/serviceCenters.js` 加 `fetchServiceCenterSlots`;`AppointmentPage` 改成下拉联动(center → date → period),`useAppointmentForm` 把 hardcoded `APPOINTMENT_PERIODS` 删掉。

---

*Spec 结束*
