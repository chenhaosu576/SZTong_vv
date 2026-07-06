// middlewares/rbac.js
// RBAC 权限校验 —— 【占位】。
// 职责:
//   - 占位文件，导出 requirePermission(permissionCode) 工厂
//   - 实际 admin.role_id → role_permission → permission 查询推迟到 P0-2
// 使用方: 暂未挂载；P0-2 B 端路由引入

module.exports = function requirePermission(/* permissionCode */) {
  return function rbacPlaceholder(req, res, next) {
    // TODO (P0-2): verify admin has the given permission
    return next();
  };
};
