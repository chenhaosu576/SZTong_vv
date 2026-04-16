# Cloudflare Pages 自动部署

这个仓库通过 GitHub Actions 构建 `frontend`，并用 Wrangler 上传 `frontend/dist` 到 Cloudflare Pages。

## GitHub 仓库配置

在 GitHub 仓库的 `Settings > Secrets and variables > Actions` 中添加：

- Secret: `CLOUDFLARE_API_TOKEN`
- Secret: `CLOUDFLARE_ACCOUNT_ID`
- Variable: `CLOUDFLARE_PROJECT_NAME`

`CLOUDFLARE_PROJECT_NAME` 不填时，workflow 默认使用 `sztong-vv`。如果 Cloudflare Pages 项目名不同，请设置这个 Variable。

## Cloudflare API Token 权限

创建 API Token 时至少需要：

- Account > Cloudflare Pages > Edit

如果 Token 做了账号范围限制，需要选中当前 Pages 项目所在的 Cloudflare 账号。

## 自动部署规则

- 推送到 `main` 后自动部署生产版本。
- 向 `main` 发起 Pull Request 时会构建并部署同仓库 PR 的预览版本。
- 外部 fork 的 PR 只构建，不会使用 Cloudflare Secret 部署。

## 本地对应命令

```bash
cd frontend
npm ci
npm test -- --passWithNoTests
npm run build
```

CI 上传命令等价于：

```bash
npx wrangler pages deploy frontend/dist --project-name=<CLOUDFLARE_PROJECT_NAME>
```
