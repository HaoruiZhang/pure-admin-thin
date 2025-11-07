// import { CopilotService } from "@/api";
import { defineStore } from "pinia";
import { $t } from "@/plugins/i18n";
import { adkService } from "@/api/adk.service";
// import type { Session } from "@/types";
import type { AdkSession } from "@/types/adk";
interface adkChatState {
  user_info?: {
    user_id: string | number;
    access_times?: number;
    access_privilege_bits?: number;
  };
  sessionList: AdkSession[];
  currentSession: AdkSession;
  sendLoading: boolean; //发送消息的loading状态
}

export const useADKChatStore = defineStore("adkChatStore", {
  state: (): adkChatState => ({
    sendLoading: false,
    sessionList: [],
    currentSession: {
      id: "0",
      appName: "agent",
      userId: localStorage?.getItem("stag:user_id") || "0",
      events: [],
      state: { title: $t("adkChat.pureNewChat") },
      lastUpdateTime: Date.now() / 1000
    }
  }),
  getters: {},
  actions: {
    initStore() {},
    getSessionById(id: number | string) {
      return this.sessionList.find(session => session.id === id);
    },
    async getSessionList() {
      adkService.getSessionList().then((res: any[]) => {
        console.log("▶️ 向ADK后端查询Session列表: ", res);
        if (res.length) {
          this.sessionList = res;
        }
      });
    },
    async setCurrentSession(newSessionId: number | string) {
      // if (newSessionId === this.currentSession.id) {
      //   return;
      // }
      // const targetSession = await adkService.getSessionDetail(newSessionId);
      // console.log("▶️ 获取会话详情: ", targetSession);
      adkService
        .getSessionDetail(newSessionId)
        .then((sessionDetail: AdkSession) => {
          console.log("▶️ 获取会话详情: ", sessionDetail);
          if (sessionDetail) {
            this.currentSession = sessionDetail;
          }
        });
    }
  }
});
