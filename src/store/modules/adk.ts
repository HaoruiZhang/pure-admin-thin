// import { CopilotService } from "@/api";
import { defineStore } from "pinia";
import { $t } from "@/plugins/i18n";
import { adkService } from "@/api/adk.service";
export interface Session {
  id: number | string;
  title: string;

  create_time: number;
  isEdit?: boolean;
  editTitle?: string;
  dropShow?: boolean;
  summary_data?: any; // 文献助手-文献速读页面的AI总结数据
  currentSessionFiles?: any[];
  streaming_task_id?: any;
  attach_id?: string;
  type?: number; // 会话类型 0 普通会话 1 文献助手 2 智能分析 3 生物学解读
  client_type?: number; // 前端页面逻辑类型 0 首页会话 1 文献助手-文献速读页面 2 文献助手-文献问答页面 3 文献助手-详细阅读页面"
  article_info?: any;
  upload_status?: number; // upload_status 上传状态 0 旧版本文档 1 刚启动上传 2 处于分析过程 3 正在embeddings中 4 已完成 5 报错了"
  recommend_questions?: string[];
  file_type?: "pdf";
  is_collected?: boolean; //是否已收藏到文献库
  docList?: any[];
  is_upload?: boolean; // 是否用户上传文件的当前会话
  client_messages?: any[]; // 历史消息
}
interface adkChatState {
  user_info?: {
    user_id: string | number;
    access_times?: number;
    access_privilege_bits?: number;
  };
  session_list: Session[];
  currentSession: Session;
  sendLoading: boolean; //发送消息的loading状态
}

export const useADKChatStore = defineStore("adkChatStore", {
  state: (): adkChatState => ({
    sendLoading: false,
    session_list: [
      {
        id: 0,
        title: "新对话",
        create_time: 1762241623271
      },
      {
        id: 1,
        title: "我想做SAW聚类分析",
        create_time: 1762241523271
      },
      {
        id: 2,
        title: "XXXXXXXXXXXX",
        create_time: 1762141423271
      },
      {
        id: 3,
        title: "XXXXXXXXXXXXXXXXXXXX",
        create_time: 1762041323271
      },
      {
        id: 4,
        title: "XXXXXXXXXXXXXXXX",
        create_time: 1761941223271
      },
      {
        id: 5,
        title: "XXXXXXXXXXXXXXXXXXXXXXXX",
        create_time: 1761881123271
      },
      {
        id: 6,
        title: "XXXXXXXXXXXXXXXXXXXX",
        create_time: 1750041023271
      }
    ],
    currentSession: {
      id: 0,
      title: $t("adkChat.pureNewChat"),
      create_time: 1762241623271
    },
    user_info: {
      user_id: localStorage?.getItem("stag:user_id") || 0
    }
  }),
  getters: {},
  actions: {
    initStore() {},
    getSessionById(id: number | string) {
      return this.session_list.find(session => session.id === id);
    },
    async getSessionList() {
      adkService.getSessionList().then((res: any[]) => {
        console.log("▶️ getSessionList res", res);
        if (res.length) {
          this.session_list = res;
        }
      });
    }
  }
});
