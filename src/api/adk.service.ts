import { adkHttp, agentHttp, taskHttp } from "@/utils/http";
import type { AgentRunRequest } from "@/types";
import { ref } from "vue";

export type UserResult = {
  success: boolean;
  data: {
    /** 头像 */
    avatar: string;
    /** 用户名 */
    username: string;
    /** 昵称 */
    nickname: string;
    /** 当前登录用户的角色 */
    roles: Array<string>;
    /** 按钮级别权限 */
    permissions: Array<string>;
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

export type RefreshTokenResult = {
  success: boolean;
  data: {
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};
type Result = {
  success: boolean;
  data: Array<any>;
};

/** 登录 */
export const getLogin = (data?: object) => {
  return adkHttp.request<UserResult>("post", "/login", { data });
};

/** 刷新`token` */
export const refreshTokenApi = (data?: object) => {
  return adkHttp.request<RefreshTokenResult>("post", "/refresh-token", {
    data
  });
};

export const getAsyncRoutes = () => {
  return adkHttp.request<Result>("get", "/get-async-routes");
};
export const adkService = {
  // refreshToken: (data?: object) => {
  //   return adkHttp.post("user/token-fresh", { data });
  // },
  getSessionList: (userId: string | number) => {
    return adkHttp.get(`apps/agents/users/${userId}/sessions`);
  },
  getSessionDetail: (userId: string | number, sessionId: number | string) => {
    return adkHttp.get(`apps/agents/users/${userId}/sessions/${sessionId}`);
  },
  createSession: (userId: string | number) => {
    return adkHttp.request(
      "post",
      `/apps/agents/users/${userId}/sessions`,
      null
    );
  },
  deleteSession: (userId: string | number, sessionId: string) => {
    return adkHttp.request(
      "delete",
      `/apps/agents/users/${userId}/sessions/${sessionId}`
    );
  },

  modifyEvent: (
    userId: string,
    sessionId: string,
    eventID: string,
    form: any
  ) => {
    const url = `/apps/agents/users/${userId}/sessions/${sessionId}/events/${eventID}`;

    return adkHttp.request("put", url, {
      data: {
        modified_content: {
          role: "model",
          parts: [
            {
              text: form
            }
          ]
        }
      }
    });
  },

  /**
   * runSseGenerator: 返回一个 AsyncGenerator，按服务端每条 "data:" 行 yield 字符串（JSON 字符串）
   * 调用者负责 JSON.parse 并处理业务逻辑。
   * 返回对象中还包含 stop() 用于取消请求。
   *  响应式停止的用法：
   *  const { runSseGenerator } = useAgentService();
      const { generator, stop } = runSseGenerator(req);
      try {
        for await (const chunk of generator) {
          const obj = JSON.parse(chunk);
          // 处理 obj
        }
      } catch (e) {
        // 处理错误或 AbortError
      } finally {
        stop();
      }
   */
  runSseGenerator: (req: AgentRunRequest) => {
    const controller = new AbortController();
    const signal = controller.signal;
    const isLoading = ref(false);

    async function* gen(): AsyncGenerator<string, void, void> {
      const url = `${import.meta.env.VITE_URL_ADK_BACKEND}/run_sse`;
      isLoading.value = true;
      let response: Response | null = null;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream"
          },
          body: JSON.stringify(req),
          signal
        });

        if (!response.ok || !response.body) {
          throw new Error(
            `SSE request failed: ${response?.status} ${response?.statusText}`
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let lastData = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lastData += decoder.decode(value, { stream: true });

          const parts = lastData.split(/\r?\n/);
          lastData = parts.pop() || "";

          for (const line of parts) {
            if (!line.trim()) continue;
            if (!line.startsWith("data:")) continue;
            const data = line.replace(/^data:\s*/, "");
            try {
              // 校验是否能被解析，不能解析则当作被截断，拼回 lastData
              JSON.parse(data);
              yield data;
            } catch {
              lastData = line + "\n" + lastData;
            }
          }
        }

        // 处理残余（若恰好完整）
        if (lastData) {
          const leftover = lastData.split(/\r?\n/);
          for (const l of leftover) {
            if (!l.trim()) continue;
            if (!l.startsWith("data:")) continue;
            const data = l.replace(/^data:\s*/, "");
            try {
              JSON.parse(data);
              yield data;
            } catch {
              // 忽略不完整残余
            }
          }
        }
      } finally {
        isLoading.value = false;
        // 尝试清理 reader
        try {
          if (response?.body) {
            // @ts-ignore
            const r = response.body.getReader?.();
            if (r) await r.cancel();
          }
        } catch {
          /* ignore */
        }
      }
    }

    return {
      generator: gen(),
      stop: () => {
        try {
          controller.abort();
        } catch {
          /* ignore */
        }
      },
      isLoading
    };
  }
};

export const taskService = {
  rerunTask: (data: {
    user_id: string;
    session_id: string;
    invocation_id: string;
    task_index?: number;
  }) => {
    return taskHttp.request("post", `tasks/rerun`, { data });
  },

  deleteInvocation: (
    user_id: string,
    sessionId: string,
    invocationId: string
  ) => {
    return taskHttp.request(
      "delete",
      `/sessions/${sessionId}/invocations/${invocationId}?user_id=${user_id}`
    );
  }
};

export const backendService = {
  getTaskList: (data: {
    session: string;
    tagname?: string;
    token?: string;
  }) => {
    return agentHttp.request("post", `ssh/task-list`, { data });
  },
  killTask: (data: {
    session: string;
    pid: string;
    tagname?: string;
    token?: string;
    subtype?: string;
  }) => {
    return agentHttp.request("post", `ssh/task-stop`, { data });
  }

  // getTaskDetail: (userId: string | number, taskId: number | string) => {
  //   return agentHttp.get(`apps/agents/users/${userId}/tasks/${taskId}`);
  // },
  // createTask: (userId: string | number) => {
  //   return agentHttp.request(
  //     "post",
  //     `/apps/agents/users/${userId}/tasks`,
  //     null
  //   );
  // },
  // deleteTask: (userId: string | number, taskId: string) => {
  //   return agentHttp.request(
  //     "delete",
  //     `/apps/agents/users/${userId}/tasks/${taskId}`
  //   );
  // },
  // updateTask: (userId: string | number, taskId: string, form: any) => {
  //   return agentHttp.request(
  //     "put",
  //     `/apps/agents/users/${userId}/tasks/${taskId}`,
  //     {
  //       data: {
  //         modified_content: {
  //           role: "model",
  //           parts: [
  //             {
  //               text: form
  //             }
  //           ]
  //         }
  //       }
  //     }
  //   );
  // }
};
