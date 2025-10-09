import { $t } from "@/plugins/i18n";
const { VITE_HIDE_HOME } = import.meta.env;
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/adk",
  name: "ADK",
  component: Layout,
  redirect: "/ui",
  meta: {
    icon: "ep/home-filled",
    title: $t("menus.pureADK"),
    rank: 0
  },
  children: [
    {
      path: "/ui",
      name: "ui",
      component: () => import("@/views/adk/index.vue"),
      meta: {
        title: $t("menus.pureADK"),
        showLink: VITE_HIDE_HOME === "true" ? false : true
      }
    }
  ]
} satisfies RouteConfigsTable;
