# 收智通（SZTong）后端分阶段设计方案

> 版本：v1.0
> 编写日期：2026-07-03
> 适用范围：SZTong 当前 C 端原型的后端升级，以及后续 B 端管理能力演进
> 技术路线：Node.js + Express 5 + MySQL 8 + Sequelize

---

## 1. 文档目标

本设计文档面向当前 `E:\vue\SZTong_vv` 项目，目标不是推翻现有前端原型重做，而是在保持既有技术路线的前提下，为项目设计一套可分阶段落地的业务后端方案。

这份方案重点解决四个现实问题：

1. 当前后端 `backend/index.js` 主要承担 AI 与地图代理，尚未承载真实业务。
2. 当前 C 端业务大量依赖 `frontend/src/mock/clientApi.js` 与 `localStorage`，无法跨设备、无法持久化、无法追踪状态流转。
3. 前端已经存在较完整的用户路径，包括登录、预约回收、公益捐赠、订单记录、个人中心、签到积分、FAQ、服务站点等，这些能力需要逐步迁移到真实后端。
4. 项目后续可能扩展 B 端管理后台，因此后端设计必须既能先服务当前 C 端，又能继续演进，而不是一次性做成过重架构。

因此，本方案采用：

- 架构策略：分阶段单体后端
- 迁移策略：双轨兼容、逐页替换
- 技术策略：坚持 `Express + MySQL + Sequelize`

---

## 2. 现状分析

### 2.1 当前仓库结构

项目当前由两个独立 npm 子项目组成：

- `frontend/`：Vue 3 + Vue Router + Vite 的 C 端单页应用
- `backend/`：Express 5 单文件代理服务

后端当前真实提供的接口主要有：

- `GET /api/location`
- `POST /api/chat`
- `POST /api/analyze-image`

这些接口分别服务于：

- 百度地图反向地理编码
- DeepSeek 流式问答
- MiniMax 图片识别

除此之外，C 端的大多数业务数据仍在前端本地：

- 登录注册：`frontend/src/utils/auth.js`
- 预约回收：`frontend/src/mock/clientApi.js`
- 公益捐赠：`frontend/src/mock/clientApi.js`
- 订单记录：`frontend/src/mock/clientApi.js` + `localStorage`
- 个人中心：`frontend/src/mock/clientApi.js` + `frontend/src/mock/timeApi.js`
- FAQ / 首页内容：`frontend/src/mock/clientApi.js`

### 2.2 当前后端存在的问题

1. `backend/index.js` 是单文件结构，难以继续承载更多业务模块。
2. 用户认证仅存在于浏览器 `localStorage`，没有服务端账号体系。
3. 订单、捐赠、签到、积分均未落库，数据不可追溯。
4. 同一类数据被前端以 mock 方式维护，未来改动容易出现前后端脱节。
5. 缺乏统一的状态流转、错误处理、权限控制、日志审计与测试基础。

### 2.3 设计约束

本方案必须尊重以下约束：

- 保持现有后端技术路线：`Express + MySQL + Sequelize`
- 不要求一次性重写前端
- 保留当前 AI 与地图代理能力
- 允许前端在迁移期继续通过 mock 适配层工作
- 优先支撑当前 C 端原型，再扩展 B 端管理能力

---

## 3. 推荐方案与设计原则

### 3.1 备选方案对比

#### 方案 A：一次性完整重构

直接建立完整平台后端，一次性覆盖认证、订单、公益、服务站点、内容运营、B 端、RBAC、审计。

优点：

- 目标架构最整齐
- 不需要经历较长的过渡期

缺点：

- 对当前仓库跳跃过大
- 前端改动面太广
- 风险高，不适合现阶段原型项目

#### 方案 B：分阶段单体后端

先把现有 C 端核心业务迁入一个规范化的 Express 单体后端，再逐步补足 B 端接口、权限与运营能力。

优点：

- 与当前项目最匹配
- 能最快形成“真实业务闭环”
- 便于控制范围和阶段成果

缺点：

- 迁移期会短暂存在 mock 与真实接口并行

#### 方案 C：双轨原型后端

保留当前旧代理结构，同时并行建设一套新业务后端，让前端分页面逐个切换。

优点：

- 兼容性最好

缺点：

- 概念重复
- 维护成本偏高

### 3.2 推荐结论

推荐采用：

**以方案 B 为主，吸收方案 C 的兼容思路。**

也就是：

- 架构上建设一个标准化的单体业务后端
- 迁移上采用双轨兼容，逐页逐模块替换前端 mock

### 3.3 核心设计原则

1. 先服务当前 C 端真实业务，再谈完整平台。
2. 以单体分层结构替代单文件堆叠。
3. 所有核心业务数据必须由后端持有并落库。
4. 前后端接口统一格式、统一前缀、统一错误语义。
5. AI 与地图代理保留，但从孤立代理变为后端内的独立模块。
6. 迁移过程尽量不打碎当前前端页面与 composable 结构。

---

## 4. 后端目标边界与模块划分

### 4.1 后端目标边界

这个项目的后端应该从“第三方代理服务”升级为“面向当前 C 端业务的单体业务后端”。

第一阶段目标不是直接做成一个大而全的平台，而是先接住前端已经真实存在的业务能力：

- 用户注册与登录
- 预约回收
- 公益捐赠
- 订单记录与订单进度
- 个人中心汇总
- 每日签到与积分
- 服务站点与可预约时段
- 首页内容、FAQ、科普信息

### 4.2 模块划分

建议后端拆分为以下 6 个一级业务模块：

#### 1. `auth`

负责：

- 用户注册
- 用户登录
- JWT 发放与校验
- 当前用户信息读取与修改

#### 2. `orders`

负责：

- 回收预约订单
- 公益捐赠订单
- 订单详情
- 订单列表
- 订单状态流转
- 订单状态日志

#### 3. `service-centers`

负责：

- 服务站点列表与详情
- 站点可预约时段
- 站点容量配置
- 预约分配的基础资源支撑

#### 4. `user-growth`

负责：

- 个人中心摘要
- 每日签到
- 签到日历
- 积分流水
- 成长值、碳减排等用户侧长期指标

#### 5. `content`

负责：

- 首页动态内容
- FAQ
- 科普文章
- 公益项目列表与项目详情

#### 6. `ai-proxy`

负责：

- `/api/chat`
- `/api/analyze-image`
- `/api/location`

这一模块在迁移初期继续保持兼容，但内部应服务化，避免长期停留在单文件内联逻辑。

### 4.3 模块边界和未来扩展

这套划分有两个好处：

1. 能精确映射当前前端页面的数据来源。
2. 未来增加 B 端时，不需要重做领域边界，只需要为已有模块补充管理接口与权限控制。

---

## 5. 数据库设计

### 5.1 设计思路

数据库不应一开始就为完整平台铺太多后台专用表，而应先围绕当前 C 端场景建立最小闭环，再为后续扩展预留足够清晰的关系结构。

设计重点：

- 用户数据服务端化
- 订单统一建模
- 公益项目可管理
- 服务站点可配置
- 用户成长体系可追踪
- 状态变化具备日志能力

### 5.2 核心实体

#### 1. 用户相关

`users`

建议字段：

- `id`
- `username` 或 `email`
- `phone`
- `display_name`
- `avatar`
- `password_hash`
- `status`
- `points_balance`
- `growth_value`
- `carbon_reduction_total`
- `created_at`
- `updated_at`

`user_addresses`

建议字段：

- `id`
- `user_id`
- `contact_name`
- `phone`
- `province`
- `city`
- `district`
- `detail_address`
- `is_default`
- `created_at`
- `updated_at`

`user_checkins`

建议字段：

- `id`
- `user_id`
- `checkin_date`
- `points_awarded`
- `created_at`

`points_logs`

建议字段：

- `id`
- `user_id`
- `change_type`
- `change_value`
- `balance_after`
- `source_type`
- `source_id`
- `remark`
- `created_at`

#### 2. 订单相关

建议以统一订单主表承接回收与捐赠，而不是两套完全独立系统。

`orders`

建议字段：

- `id`
- `order_no`
- `user_id`
- `order_type` (`recycle` / `donation`)
- `status`
- `service_center_id`
- `contact_name`
- `phone`
- `address_snapshot`
- `scheduled_date`
- `scheduled_period`
- `estimated_weight`
- `actual_weight`
- `points_estimated`
- `points_granted`
- `remark`
- `created_at`
- `updated_at`

`recycle_orders`

建议字段：

- `id`
- `order_id`
- `category`
- `item_images`
- `pickup_code`

`donation_orders`

建议字段：

- `id`
- `order_id`
- `charity_project_id`
- `item_type`
- `item_name`
- `quantity_text`
- `weight_text`
- `condition_text`
- `logistics_type`

`order_status_logs`

建议字段：

- `id`
- `order_id`
- `from_status`
- `to_status`
- `operator_type`
- `operator_id`
- `remark`
- `created_at`

#### 3. 服务资源

`service_centers`

建议字段：

- `id`
- `name`
- `address`
- `phone`
- `latitude`
- `longitude`
- `hours`
- `status`
- `description`
- `created_at`
- `updated_at`

`service_slots`

建议字段：

- `id`
- `service_center_id`
- `service_date`
- `period`
- `capacity`
- `reserved_count`
- `status`
- `created_at`
- `updated_at`

#### 4. 公益内容

`charity_projects`

建议字段：

- `id`
- `title`
- `location`
- `region`
- `status`
- `tag`
- `urgent_days_threshold`
- `current_progress`
- `target_progress`
- `progress_unit`
- `days_left`
- `beneficiary`
- `cover_image`
- `description`
- `created_at`
- `updated_at`

`charity_project_needs`

建议字段：

- `id`
- `charity_project_id`
- `title`
- `description`
- `sort_order`

#### 5. 内容展示

`faq_items`

建议字段：

- `id`
- `category`
- `question`
- `answer`
- `sort_order`
- `status`

`science_articles`

建议字段：

- `id`
- `title`
- `summary`
- `content`
- `cover_image`
- `status`
- `published_at`

`home_content_blocks`

用于首页运营内容动态化，承接当前 `fetchHomeData()` 中不适合硬编码在前端的内容块。

### 5.3 实体关系

建议的核心关系如下：

- `users 1-N orders`
- `users 1-N user_addresses`
- `users 1-N user_checkins`
- `users 1-N points_logs`
- `orders 1-1 recycle_orders`
- `orders 1-1 donation_orders`
- `orders N-1 service_centers`
- `orders 1-N order_status_logs`
- `charity_projects 1-N donation_orders`
- `charity_projects 1-N charity_project_needs`
- `service_centers 1-N service_slots`

### 5.4 统一订单模型的原因

前端当前 `OrdersPage` 已经将“回收预约”和“公益捐赠”统一展示，因此后端采用统一订单主表会有明显优势：

- 前端订单列表查询更简单
- 统计口径更统一
- 状态流转和日志复用度更高
- 后续 B 端订单管理无需分别维护两套流程

---

## 6. API 设计与前端迁移策略

### 6.1 总体设计

接口设计采用：

- 新业务接口：`/api/v1/client/*`
- 兼容旧代理接口：`/api/chat`、`/api/analyze-image`、`/api/location`

这样可以保证：

- 现有 AI 与地图能力不受影响
- 前端可按页面逐步迁移
- 新老接口职责清晰

### 6.2 统一响应格式

建议统一响应结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

分页接口建议统一为：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [],
    "total": 0,
    "page": 1,
    "pageSize": 10
  }
}
```

### 6.3 第一批客户端接口

第一阶段优先实现以下接口：

#### 认证与用户

- `POST /api/v1/client/auth/register`
- `POST /api/v1/client/auth/login`
- `GET /api/v1/client/me`
- `PUT /api/v1/client/me`

#### 订单

- `GET /api/v1/client/orders`
- `GET /api/v1/client/orders/:id`
- `POST /api/v1/client/orders/recycle`
- `POST /api/v1/client/orders/donation`

#### 服务站点

- `GET /api/v1/client/service-centers`
- `GET /api/v1/client/service-centers/:id`
- `GET /api/v1/client/service-centers/:id/slots`

### 6.4 第二批客户端接口

第二阶段补充：

#### 个人中心与成长

- `GET /api/v1/client/profile/summary`
- `POST /api/v1/client/check-ins`
- `GET /api/v1/client/check-ins/calendar`
- `GET /api/v1/client/points/logs`

#### 内容

- `GET /api/v1/client/content/home`
- `GET /api/v1/client/content/faq`
- `GET /api/v1/client/content/science`
- `GET /api/v1/client/charity/projects`
- `GET /api/v1/client/charity/projects/:id`

### 6.5 前端迁移顺序

建议按当前页面的重要度和依赖关系迁移：

#### 阶段一

优先打通：

- `AuthPage`
- `AppointmentPage`
- `CharityPage`
- `OrdersPage`

因为这四个页面能最快形成真实业务闭环：

- 用户能登录
- 能提交回收预约
- 能提交公益捐赠
- 能看到自己的真实订单记录

#### 阶段二

再迁移：

- `ProfilePage`
- `HomePage`
- `FaqPage`
- `ServiceCenterDetailPage`

#### 阶段三

逐步把首页运营内容、科普文章、后台管理入口都转入可配置后端。

### 6.6 前端适配策略

不建议立刻删除 `frontend/src/mock/clientApi.js`。

更稳妥的策略是：

1. 保留其函数名不变。
2. 把它从“本地假数据提供者”逐渐改成“接口适配层”。
3. 页面与 composable 尽量不改调用方式，只替换内部实现。

这样可以最大限度降低对现有前端代码组织的破坏。

---

## 7. 后端工程结构设计

### 7.1 目录结构建议

建议将当前 `backend/index.js` 重构为如下结构：

```text
backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── common/
│   │   ├── config/
│   │   ├── db/
│   │   ├── errors/
│   │   ├── middlewares/
│   │   ├── response/
│   │   └── utils/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.validator.js
│   │   │   └── auth.routes.js
│   │   ├── orders/
│   │   ├── service-centers/
│   │   ├── user-growth/
│   │   ├── content/
│   │   └── ai-proxy/
│   ├── models/
│   └── routes/
├── migrations/
├── seeders/
├── .env.example
└── package.json
```

### 7.2 分层职责

#### `routes`

- 定义路由
- 组织中间件
- 不写业务逻辑

#### `controllers`

- 解析请求参数
- 调用 service
- 返回统一响应

#### `services`

- 承担核心业务逻辑
- 处理事务
- 编排多个 model 的读写

#### `models`

- 定义 Sequelize 模型与关联关系

#### `validators`

- 使用 `Joi` 或 `Zod` 做参数校验

#### `common`

- 鉴权中间件
- 错误类
- 响应封装
- 日志
- 配置
- 数据库连接

### 7.3 为什么采用单体分层

当前项目规模与复杂度尚不适合引入微服务或更重的架构。

单体分层的优势是：

- 容易上手
- 与现有 Express 技术路线兼容
- 适合课程项目或中小型平台演进
- 在功能增长后仍能保持可维护性

---

## 8. 状态流转、错误处理与安全设计

### 8.1 订单状态流转

建议把订单状态设计成可控流转，而不是任意更新字符串。

例如：

- 回收预约：
  - `pending_review`
  - `confirmed`
  - `assigned`
  - `in_progress`
  - `completed`
  - `cancelled`

- 公益捐赠：
  - `submitted`
  - `accepted`
  - `in_transit`
  - `received`
  - `completed`
  - `cancelled`

所有流转都应写入 `order_status_logs`。

### 8.2 错误处理

建议建立统一错误机制：

- 参数校验错误：400
- 未登录：401
- 无权限：403
- 资源不存在：404
- 业务冲突：409
- 服务端异常：500

并统一输出格式，例如：

```json
{
  "code": 40001,
  "message": "参数校验失败",
  "data": null
}
```

### 8.3 安全设计

初期至少要包含：

- 密码哈希：`bcrypt`
- 用户鉴权：`JWT`
- 环境变量管理：`dotenv`
- 跨域配置：限制可用域名
- 接口限流：对 AI 与登录接口加保护
- 参数校验：防止脏数据入库
- 上传限制：如果后续支持图片上传，限制类型与大小

### 8.4 AI 与第三方代理安全

当前 AI 和地图能力仍然依赖第三方接口，因此必须继续保持：

- API Key 只存在后端
- 前端不直接访问第三方密钥接口
- 第三方异常被后端统一转义与兜底

---

## 9. 分阶段实施计划

### 9.1 P0：后端骨架与最小闭环

目标：

- 搭好标准化 Express 后端骨架
- 接入 MySQL 与 Sequelize
- 建立用户、订单、服务站点核心表
- 保留并迁移 AI 代理模块

完成项建议：

- `app.js` / `server.js`
- 数据库连接与模型初始化
- JWT 鉴权中间件
- 用户注册登录
- 回收预约创建
- 公益捐赠创建
- 订单列表与详情
- 服务站点列表与详情

### 9.2 P1：C 端主链迁移

目标：

- 把当前最关键的 C 端流程迁移到真实接口

完成项建议：

- `AuthPage` 接真实登录注册
- `AppointmentPage` 接真实回收下单
- `CharityPage` 接真实公益捐赠
- `OrdersPage` 接真实订单记录

### 9.3 P2：个人中心与内容迁移

目标：

- 让个人中心与内容类页面摆脱 mock

完成项建议：

- 签到接口
- 日历接口
- 积分流水接口
- 个人中心摘要接口
- 首页内容接口
- FAQ 接口
- 科普内容接口

### 9.4 P3：B 端准备与运营能力增强

目标：

- 为未来后台管理做好领域支撑

完成项建议：

- 站点时段管理
- 公益项目 CRUD
- 内容管理接口
- 订单状态管理接口
- 日志与审计基础

### 9.5 P4：完整平台扩展

目标：

- 面向 B 端与多角色管理继续扩展

完成项建议：

- 管理员登录
- RBAC
- 审计日志
- 仪表盘统计
- 内容运营后台

---

## 10. 测试与验证策略

### 10.1 测试优先级

建议采用“先服务层、后路由层、再联调”的顺序。

#### 单元测试

重点覆盖：

- 积分计算
- 订单状态流转
- 参数转换
- 用户鉴权工具函数

#### 集成测试

重点覆盖：

- 注册 / 登录
- 创建回收订单
- 创建捐赠订单
- 查询订单列表
- 签到与积分变化

#### 前后端联调验证

重点验证：

- 登录后 JWT 注入是否正确
- 订单提交后是否能在 `OrdersPage` 展示
- 捐赠提交是否同步进订单记录
- 个人中心签到与日历是否联动

### 10.2 验证原则

当前前端已有基础 UI 和交互，因此每迁移一页，都应做一次真实浏览器验证，而不能只依赖接口测试。

---

## 11. 风险与控制措施

### 11.1 最大风险

1. 前端 mock 与真实接口字段不一致
2. 订单模型一开始拆得太散，导致前端接入复杂
3. 个人中心指标全部做成动态计算，导致早期实现成本过高
4. 旧代理逻辑与新业务逻辑混在一起，继续演化成“大单文件”

### 11.2 控制策略

1. 保留 `clientApi.js` 作为过渡适配层，减少页面改动面。
2. 订单先统一主表，差异字段再扩展，不做两套完全分裂模型。
3. 个人中心中的部分指标可先落聚合字段，后续再逐步精细化。
4. AI 代理尽早抽离成独立模块，避免继续堆在 `backend/index.js`。

---

## 12. 结论

对当前 `SZTong_vv` 项目来说，最合适的后端方案不是一步到位做成完整平台，而是：

- 以 `Express + MySQL + Sequelize` 为基础
- 把现有 C 端真实业务先迁入一个标准化单体业务后端
- 采用双轨兼容策略逐页替换前端 mock
- 在完成真实业务闭环后，再逐步长出 B 端管理能力

这条路线既尊重你当前仓库的现实状态，也能保证后续继续扩展时不需要推翻重来。

如果后续进入实现阶段，建议下一步按照本设计继续细化为一份后端实施计划，明确每个阶段的表、接口、测试与页面迁移清单。
