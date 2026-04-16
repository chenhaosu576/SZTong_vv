const USER_KEY = "szt_user";
const USERS_KEY = "szt_users";

export const ROLE_CLIENT = "client";
export const MIN_PASSWORD_LENGTH = 6;

const demoUsers = [
  {
    username: "user@szt.com",
    password: "123456",
    role: ROLE_CLIENT,
    displayName: "收智通用户",
  },
];

export function initAuthSeed() {
  // 初始化演示账号，方便快速体验 C 端流程
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers));
    return;
  }

  try {
    const users = JSON.parse(raw);
    const merged = [...users];
    for (const demo of demoUsers) {
      if (!users.some((item) => item.username === demo.username)) {
        merged.push(demo);
      }
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(merged));
  } catch {
    localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers));
  }
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getAllUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function login(username, password) {
  const normalizedUsername = username.trim();
  const normalizedPassword = password.trim();
  const user = getAllUsers().find(
    (item) => item.username === normalizedUsername && item.password === normalizedPassword,
  );

  if (!user) {
    return { ok: false, message: "账号或密码错误" };
  }

  const safeUser = {
    username: user.username,
    role: user.role,
    displayName: user.displayName,
  };
  localStorage.setItem(USER_KEY, JSON.stringify(safeUser));

  return { ok: true, user: safeUser };
}

export function register(payload) {
  const users = getAllUsers();
  const normalizedPayload = {
    ...payload,
    username: payload.username.trim(),
    password: payload.password.trim(),
    displayName: payload.displayName.trim(),
  };

  const exists = users.some((item) => item.username === normalizedPayload.username);
  if (exists) {
    return { ok: false, message: "该账号已存在" };
  }

  users.push(normalizedPayload);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return { ok: true };
}

export function logout() {
  localStorage.removeItem(USER_KEY);
}
