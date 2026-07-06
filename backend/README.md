# SZTong Backend

Express 5 后端，P0 阶段接入 MySQL 8 + Sequelize 6。

## 快速启动

```bash
cp .env.example .env
# 编辑 .env，把 DB_PASS=changeme 改为本机 MySQL root 密码
npm install
npm run db:migrate:sql     # 建库 + 7 张核心表
npm run db:seed            # 可选：插 4 行 demo 数据
npm run db:check           # 启动前自检
npm run dev                # 启动后端（http://localhost:8080）
```

## 数据库与迁移

### db:* 命令一览

| 命令 | 作用 |
|------|------|
| `npm run db:migrate:sql` | 执行 `migrations-sql/001-init-core-tables.sql` 建 7 张表 |
| `npm run db:migrate` | 应用 `migrations/` 下的 sequelize-cli 迁移 |
| `npm run db:migrate:undo` | 回滚最近一次迁移 |
| `npm run db:seed` | 跑 seeders（幂等） |
| `npm run db:seed:undo` | 回滚最近一次 seeder |
| `npm run db:check` | 连通自检 + 7 张表 COUNT(*) |

### 当前范围（P0 最小闭环）

7 张核心表：`roles`、`service_centers`、`users`、`admins`、`orders`、`recycle_orders`、`donation_orders`。

SZTong.sql 是全量 21 张表的设计稿；当前只接 7 张；P1 起按下方「未来加表流程」扩到全量。

### 未来加表流程

1. 在仓库根 `SZTong.sql` 加新表 CREATE（保持设计文档与 DB 同步）
2. `npx sequelize-cli migration:generate --name add-<table>` 生成迁移模板
3. 在 `src/db/models/<table>.js` 写 Model，`src/db/models/index.js` 注册关联
4. `npm run db:migrate` 应用；`npm run db:migrate:undo` 回滚

### 反模式（不要做）

- 不要改 `migrations-sql/001-init-core-tables.sql` 重跑
- 不要用 `sequelize.sync({ alter: true })` 改线上 schema
- 不要既改精简 SQL 又改 migration（必然漂移）

## 验证清单

```bash
npm install                   # 0 error
npm run db:migrate:sql        # OK: 7 张表 CREATE 完成
mysql -uroot -p<pass> sztong -e "SHOW TABLES"   # 7 张表名
npm run db:seed               # OK: 4 行 demo 数据已就位
npm run db:check              # JSON 输出 ok: true
npm run dev                   # ✅ DB connected + 启动横幅
curl http://localhost:8080/api/_health/db   # code: 0, table_counts 全数字
```

## 设计文档

- `docs/superpowers/specs/2026-07-06-mysql-sequelize-bootstrap-design.md`（本阶段的 spec）
- `design.md`（项目下一阶段的整体设计稿，v1.0，2026-06-29）