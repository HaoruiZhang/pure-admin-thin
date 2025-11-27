import { $t } from "@/plugins/i18n";
// const { VITE_HIDE_HOME } = import.meta.env;
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/adk",
  name: "ADK",
  component: Layout,
  redirect: "/adk-ui",
  meta: {
    icon: "ep/home-filled",
    title: $t("menus.pureADK"),
    rank: 1
  },
  children: [
    {
      path: "/adk-ui",
      name: "ADK-UI",
      component: () => import("@/views/adk/index.vue"),
      meta: {
        title: $t("menus.pureADK"),
        showLink: true
      }
    },
    {
      path: "/demo",
      name: "DEMO",
      component: () => import("@/views/demo/index.vue"),
      meta: {
        title: "Demo",
        showLink: true
      }
    },
    {
      path: "/demo2",
      name: "DEMO2",
      component: () => import("@/views/demo2/index.vue"),
      meta: {
        title: "Demo2",
        showLink: true
      }
    },
    {
      path: "/demo3-sonnet",
      name: "Demo3Sonnet",
      component: () => import("@/views/demo3-sonnet/index.vue"),
      meta: {
        title: "Demo3-Sonnet",
        showLink: true
      }
    },
    {
      path: "/demo4-opus",
      name: "DEMO4",
      component: () => import("@/views/demo4-opus/index.vue"),
      meta: {
        title: "Demo4",
        showLink: true
      }
    },
    {
      path: "/demo2-gemini3pro",
      name: "Demo2Gemini3Pro",
      component: () => import("@/views/demo2-gemini3pro/index.vue"),
      meta: {
        title: "Demo2-Gemini3Pro",
        showLink: true
      }
    },
    {
      path: "/demo5-auto",
      name: "DEMO5",
      component: () => import("@/views/demo5-auto/index.vue"),
      meta: {
        title: "Demo5-Auto",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
