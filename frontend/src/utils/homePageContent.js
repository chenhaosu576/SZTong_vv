export const HOME_SECTION_IDS = Object.freeze({
  services: "home-services",
});

const impactPanelModes = {
  public: {
    title: "平台环保数据",
    summary: "未登录时先查看平台公共成果，登录后即可切换到你的个人环保影响力。",
    statsKey: "publicStats",
  },
  personal: {
    title: "我的环保影响力",
    summary: "登录后可查看你的累计减排、回收参与和持续行动进展。",
    statsKey: "personalStats",
  },
};

export function getImpactPanelContent(impact, isLoggedIn) {
  const mode = isLoggedIn ? impactPanelModes.personal : impactPanelModes.public;
  const stats = Array.isArray(impact?.[mode.statsKey]) ? impact[mode.statsKey] : [];

  return {
    title: mode.title,
    summary: mode.summary,
    stats,
  };
}
