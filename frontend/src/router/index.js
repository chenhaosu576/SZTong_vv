import { createRouter, createWebHistory } from "vue-router";
import { getCurrentUser } from "../utils/auth";

import ClientLayout from "../layouts/ClientLayout.vue";

import AuthPage from "../views/auth/AuthPage.vue";
import HomePage from "../views/client/HomePage.vue";
import AiIdentifyPage from "../views/client/AiIdentifyPage.vue";
import AiQaPage from "../views/client/AiQaPage.vue";
import AppointmentPage from "../views/client/AppointmentPage.vue";
import CharityPage from "../views/client/CharityPage.vue";
import UpcyclePage from "../views/client/UpcyclePage.vue";
import SciencePage from "../views/client/SciencePage.vue";
import OrdersPage from "../views/client/OrdersPage.vue";
import ProfilePage from "../views/client/ProfilePage.vue";
import FaqPage from "../views/client/FaqPage.vue";
import ServiceCenterDetailPage from "../views/client/ServiceCenterDetailPage.vue";
import { legacyRedirectMap } from "./siteMap";

const legacyRoutes = Object.entries(legacyRedirectMap).map(([path, redirect]) => ({
  path,
  redirect,
}));

const routes = [
  {
    path: "/auth",
    name: "auth",
    component: AuthPage,
    meta: { cleanPage: true },
  },
  {
    path: "/",
    component: ClientLayout,
    children: [
      {
        path: "",
        name: "client-home",
        component: HomePage,
      },
      {
        path: "ai-identify",
        name: "client-ai-identify",
        component: AiIdentifyPage,
      },
      {
        path: "ai-qa",
        name: "client-ai-qa",
        component: AiQaPage,
      },
      {
        path: "recycle-booking",
        name: "client-recycle-booking",
        component: AppointmentPage,
      },
      {
        path: "charity",
        name: "client-charity",
        component: CharityPage,
      },
      {
        path: "upcycle",
        name: "client-upcycle",
        component: UpcyclePage,
      },
      {
        path: "science",
        name: "client-science",
        component: SciencePage,
      },
      {
        path: "orders",
        name: "client-orders",
        component: OrdersPage,
        meta: { requiresAuth: true },
      },
      {
        path: "profile",
        name: "client-profile",
        component: ProfilePage,
        meta: { requiresAuth: true },
      },
      {
        path: "faq",
        name: "client-faq",
        component: FaqPage,
      },
      {
        path: "service-centers/:siteId",
        name: "client-service-center-detail",
        component: ServiceCenterDetailPage,
      },
    ],
  },
  ...legacyRoutes,
  {
    path: "/c",
    redirect: "/",
  },
  {
    path: "/c/:pathMatch(.*)*",
    redirect: "/",
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, behavior: "smooth" };
  },
});

router.beforeEach((to) => {
  const user = getCurrentUser();

  if (to.name === "auth" && user) {
    return "/";
  }

  if (to.meta.requiresAuth && !user) {
    return {
      path: "/auth",
      query: {
        redirect: to.fullPath,
      },
    };
  }

  return true;
});

export default router;
