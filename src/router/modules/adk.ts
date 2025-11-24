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
    }
  ]
} satisfies RouteConfigsTable;
