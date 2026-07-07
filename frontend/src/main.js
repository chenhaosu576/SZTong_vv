// main.js
// 启动入口。
// 职责:
//   - 创建 Vue 应用 + 注册 Pinia
//   - 注册 router
//   - 导入全局 CSS
//   - 挂载前恢复 authStore 登录态(restoreFromStorage)
//   - 若已登录,启动期 best-effort 调 refreshFromMe 拉取最新 user 字段再 mount
//   - mount('#app')

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "./stores/auth";

import "./style.css";

const app = createApp(App);
app.use(createPinia());

// 路由前先恢复登录态(否则守卫会丢登录)
const authStore = useAuthStore();
authStore.restoreFromStorage();

app.use(router);

if (authStore.isAuthed) {
  authStore.refreshFromMe().finally(() => {
    app.mount("#app");
  });
} else {
  app.mount("#app");
}