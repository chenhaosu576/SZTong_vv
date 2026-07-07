// utils/authConstants.js
// 与原 utils/auth.js 解耦的常量:只保留 AuthPage 真正用的两个。
// 角色 / 密码长度是纯常量,与 localStorage 完全无关,放在 utils/auth.js
// 里会让"切到 Pinia store"显得更复杂。

export const ROLE_CLIENT = "client";
export const MIN_PASSWORD_LENGTH = 6;
