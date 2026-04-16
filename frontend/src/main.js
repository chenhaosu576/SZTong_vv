import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { initAuthSeed } from "./utils/auth";
import "./style.css";

initAuthSeed();

createApp(App).use(router).mount("#app");
