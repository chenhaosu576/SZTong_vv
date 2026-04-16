export const publicNavLinks = [
  { label: "首页", to: "/" },
  { label: "AI识别", to: "/ai-identify" },
  { label: "回收预约", to: "/recycle-booking" },
  { label: "公益捐赠", to: "/charity" },
  { label: "旧物改造", to: "/upcycle" },
  { label: "环保助手", to: "/ai-qa", activePaths: ["/ai-qa", "/science"] },
];

export const accountMenuLinks = [
  { label: "个人中心", to: "/profile" },
  { label: "服务记录", to: "/orders" },
  { label: "常见问题", to: "/faq" },
];

export const legacyRedirectMap = {
  "/c/home": "/",
  "/c/ai": "/ai-identify",
  "/c/appointment": "/recycle-booking",
  "/c/orders": "/orders",
  "/c/profile": "/profile",
  "/c/faq": "/faq",
};

export function resolveLegacyClientPath(path) {
  return legacyRedirectMap[path] || "";
}

export function findActiveNavPath(path) {
  const activeItem = publicNavLinks.find((item) => {
    if (item.to === path) return true;

    return Array.isArray(item.activePaths) && item.activePaths.includes(path);
  });

  return activeItem?.to || "";
}
