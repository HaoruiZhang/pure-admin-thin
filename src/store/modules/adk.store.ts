import { defineStore } from "pinia";
import type { Ref } from "vue";
import { nextTick } from "vue";
import { ElMessageBox } from "element-plus";
import type { AdkSession } from "@/types/adk";
import {
  getNewSession,
  URLUtil,
  formatBase64Data,
  extractScriptContent,
  extractFormConfigs,
  getQueryFromId,
  startSse,
  processThoughtText,
  createPollingController,
  getTaskStatus
} from "@/views/adk/utils";
import type { PollingController } from "@/views/adk/utils";
import { adkService, backendService } from "@/api/adk.service";
// import {URLUtil} from '../../../utils/url-util';
import { AccessiblePromise } from "@/views/adk/utils";
interface SSEController {
  stop: () => void;
  isLoading: any;
}
interface adkChatState {
  sseController: SSEController | null;
  hideMessageText: string[];
  userInput: string;
  selectedFiles?: { file: File; url: string }[];
  streamingTextMessage: any | null;
  isModelThinkingSubject: boolean;
  isUserNewMessage: boolean;
  currentSession: AdkSession;
  sessionList: AdkSession[];
  backendSessionList: any[];
  sendLoading: boolean; //发送消息的loading状态
  latestThought: string;
  scrollContainer: any;
  scrollRef: Ref<any>;
  messageList: any[];
  eventData: Map<string, any>;
  eventMessageIndexArray: any[];
  longRunningEvents?: any[];
  userSpecifiedPath?: string;
  functionCallEventId?: string;
  operatingFormEventId?: string;
  user_info?: {
    user_id: string;
    access_times?: number;
    access_privilege_bits?: number;
  };
  redirectUri: string;
  specifiedMimePath: string;
  userFormConfig?: any;
  isFinalResponse: boolean;
  updateSessionInterval?: any;
  getListReady?: AccessiblePromise<void>;
  setCurrentSessionReady?: AccessiblePromise<void>;
  sessionPolling?: PollingController;
  lastSessionSyncTime?: number;
  sessionPollingCount?: number; // 轮询计数器，用于跟踪轮询次数
  operatingFormIndex?: number;
  isDebugMode: boolean;
  needToFilterSessionList: boolean;
  token: string;
  loginInfo?: {
    remoter?: string;
    userName?: string;
  };
  autoScrollDownDisabled: boolean; // 为true时，禁止自动滚动
  isProgrammaticScroll: boolean; // 判断是否代码控制滚动
  isAgentUnavailableAlertShowing: boolean; // 是否正在显示 Agent 不可用的弹窗
}

export const useADKChatStore = defineStore("adkChatStore", {
  state: (): adkChatState => ({
    sseController: null,
    hideMessageText: ["表单已完成，请继续"],
    token: "",
    specifiedMimePath: "",
    latestThought: "",
    userInput: "",
    streamingTextMessage: null,
    sendLoading: false,
    scrollContainer: null,
    scrollRef: null,
    isModelThinkingSubject: false,
    isUserNewMessage: false,
    currentSession: getNewSession(),
    operatingFormEventId: "",
    isDebugMode: false,
    operatingFormIndex: 0,
    sessionList: [],
    needToFilterSessionList: false,
    backendSessionList: [],
    messageList: [],
    userFormConfig: null,
    isFinalResponse: true,
    eventData: new Map<string, any>(),
    longRunningEvents: [],
    eventMessageIndexArray: [],
    userSpecifiedPath: "",
    user_info: {
      user_id: localStorage?.getItem("stag:user_id") || "user"
    },
    loginInfo: {
      remoter: "",
      userName: ""
    },
    redirectUri: URLUtil.getBaseUrlWithoutPath(),
    functionCallEventId: "",
    getListReady: new AccessiblePromise<void>(),
    setCurrentSessionReady: new AccessiblePromise<void>(),
    sessionPolling: undefined,
    lastSessionSyncTime: 0,
    sessionPollingCount: 0, // 轮询计数器初始值
    autoScrollDownDisabled: false, // 为true时，禁止自动滚动
    isProgrammaticScroll: true, // 判断是否代码控制滚动
    isAgentUnavailableAlertShowing: false
  }),
  getters: {},
  actions: {
    initStore() {},
    setUserId(userId: string) {
      this.user_info.user_id = userId;
      localStorage?.setItem("stag:user_id", userId);
    },
    setToken(token: string) {
      this.token = token;
      localStorage?.setItem("stag:token", token);
    },
    setBackendUrl(backendUrl: string) {
      localStorage?.setItem(
        import.meta.env.VITE_ENV_MODE + ":backendUrl",
        backendUrl
      );
    },
    setLoginInfo(loginInfo: { remoter: string; userName: string }) {
      this.loginInfo.remoter = loginInfo.remoter;
      this.loginInfo.userName = loginInfo.userName || "";
    },
    clearLoginInfo() {
      this.loginInfo.remoter = "";
      this.loginInfo.userName = "";
    },
    getToken() {
      return this.token;
    },
    registerScrollRef(r: any) {
      this.scrollRef = r;
    },
    unregisterScrollRef() {
      this.scrollRef = null;
    },
    async scrollToBottom() {
      await nextTick();
      setTimeout(() => {
        this.scrollRef.wrapRef.scrollTo({
          top: this.scrollRef.wrapRef.scrollHeight,
          behavior: "smooth"
        });
      }, 500);
    },
    async createNewSession() {
      return adkService
        .createSession(this.user_info.user_id)
        .then((res: any) => {
          this.stopSessionPolling();
          this.stopSSE();
          this.currentSession = getNewSession(this.user_info.user_id);
          this.currentSession.id = res.id;
          this.sessionList.unshift(this.currentSession);
          this.eventData.clear();
          this.eventMessageIndexArray = [];
          this.messageList = [];
          // this.updateSelectedSessionUrl();
        });
      // this.createSession();
      // this.artifacts = [];
    },
    postMessageToParent(message: any) {
      window.parent.postMessage(message, "*");
    },
    async deleteSession(sessionId: string) {
      return adkService
        .deleteSession(this.user_info.user_id, sessionId)
        .then((res: any) => {
          console.log("▶️ 删除会话: ", res);
          this.sessionList = this.sessionList.filter(
            session => session.id !== sessionId
          );
          this.postMessageToParent({
            key: "sessionDeleted",
            sessionId: this.currentSession.id
          });
          this.stopSessionPolling();
        });
    },
    storeEvents(part: any, e: any) {
      let title = "";
      // console.log("▶️ 存储事件:  part: ", part, " e: ", e, " index: ", index);

      if (part.text) {
        title += "text:" + part.text;
      } else if (part.functionCall) {
        title += "functionCall:" + part.functionCall.name;
      } else if (part.functionResponse) {
        title += "functionResponse:" + part.functionResponse.name;
      } else if (part.executableCode) {
        title += "executableCode:" + part.executableCode.code.slice(0, 10);
      } else if (part.codeExecutionResult) {
        title += "codeExecutionResult:" + part.codeExecutionResult.outcome;
      } else if (part.errorMessage) {
        title += "errorMessage:" + part.errorMessage;
      }
      e.title = title;
      this.eventData.set(e.id, e);
      this.eventData = new Map(this.eventData);
    },

    async scrollToBottomSmooth() {
      // 如果用户正在滚动查看历史消息，不执行自动滚动
      // console.log(
      //   "⬇️ scrollToBottomSmooth, this.autoScrollDownDisabled:",
      //   this.autoScrollDownDisabled,
      //   "\n    this.isProgrammaticScroll:",
      //   this.isProgrammaticScroll
      // );
      if (this.autoScrollDownDisabled) return;

      // 标记这是程序控制的滚动
      this.isProgrammaticScroll = true;
      await nextTick();
      const el = this.scrollRef?.wrapRef ?? this.scrollRef;

      if (!el) return;
      try {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "smooth"
        });
      } catch {
        // 兜底：直接设置 scrollTop
        el.scrollTop = el.scrollHeight;
      }
      // 延迟重置标志，让 onScroll 事件能够识别这是程序控制的滚动
      setTimeout(() => {
        this.isProgrammaticScroll = false;
      }, 100);
    },
    setAutoScrollDownDisabled(disabled: boolean) {
      this.autoScrollDownDisabled = disabled;
    },
    resetInput() {
      this.userInput = "";
    },
    getSessionById(id: number | string) {
      return this.sessionList.find(session => session.id === id);
    },
    async getSessionList() {
      adkService
        .getSessionList(this.user_info.user_id)
        .then((res: any[]) => {
          console.log("▶️ 向ADK后端查询Session列表: ", res);

          if (res && res.length) {
            const sortedRes = res.sort((a, b) => {
              return b?.lastUpdateTime - a?.lastUpdateTime;
            });
            this.sessionList = sortedRes;
            this.needToFilterSessionList && this.filterSessionListFromBackend();
          }
          this.getListReady.resolve();
        })
        .catch(err => {
          console.error("❌ 获取Session列表失败: ", err);
          if (!this.isAgentUnavailableAlertShowing) {
            this.isAgentUnavailableAlertShowing = true;
            ElMessageBox.alert("Agent服务不可用，请联系Fas", "提示", {
              confirmButtonText: "确定",
              type: "error",
              showClose: false,
              closeOnClickModal: false,
              closeOnPressEscape: false,
              callback: () => {
                this.isAgentUnavailableAlertShowing = false;
              }
            });
          }
          this.getListReady.resolve();
        });
    },
    filterSessionListFromBackend() {
      const backendSessionIdList = this.backendSessionList.map(
        session => session.session
      );
      this.sessionList = this.sessionList.filter(session =>
        backendSessionIdList.includes(session.id)
      );
    },
    async setCurrentSession(newSessionId: number | string) {
      // if (newSessionId === this.currentSession.id) {
      //   return;
      // }
      // const targetSession = await adkService.getSessionDetail(newSessionId);
      this.stopSessionPolling();
      this.stopSSE();
      adkService
        .getSessionDetail(this.user_info.user_id, newSessionId)
        .then(async (sessionDetail: AdkSession) => {
          console.log("▶️ 获取会话详情: ", sessionDetail);
          if (sessionDetail) {
            this.currentSession = sessionDetail;
            this.parseSessionDetail(sessionDetail);
            window.parent.postMessage(
              {
                key: "updateSessionUrl",
                type: "_updateSessionUrl",
                sessionId: this.currentSession.id
              },
              "*"
            );
            // 查询当前session的tasklist，检查是否有正在运行的任务
            (await this.checkTaskRunning()) && this.startSessionPolling(1);
          }
        });
    },
    /**
     * 检查是否有正在运行的任务
     */
    async checkTaskRunning() {
      const res: any = await backendService.getTaskList({
        session: String(this.currentSession.id),
        token: this.getToken()
      });
      const tasksData = res?.data?.tasks || [];
      const hasRunningTask = tasksData.some(
        (task: any) => getTaskStatus(task) === "running"
      );
      console.log("❓️ 是否有正在运行的任务: ", hasRunningTask);
      return hasRunningTask;
    },

    async startSessionPolling(from: number, queryCount = 4, interval = 5000) {
      if (!this.currentSession?.id) return;
      console.log("🔁🔁 开始轮询: from: ", from);
      this.sessionPolling?.stop();
      this.sendLoading = true;
      await nextTick();
      this.scrollToBottomSmooth();
      // 重置轮询计数器
      this.sessionPollingCount = 0;
      this.sessionPolling = createPollingController({
        interval,
        autoStart: true,
        immediate: false,
        task: async () => {
          if (!this.currentSession?.id) return;
          // 增加轮询计数
          this.sessionPollingCount = (this.sessionPollingCount || 0) + 1;
          // 继续轮询session详情
          const sessionDetail = (await adkService.getSessionDetail(
            this.user_info.user_id,
            this.currentSession.id
          )) as AdkSession;
          const hasUpdates =
            sessionDetail?.lastUpdateTime !== this.lastSessionSyncTime ||
            (sessionDetail?.events?.length ?? 0) !==
              (this.currentSession?.events?.length ?? 0);
          if (!hasUpdates) {
            this.currentSession = sessionDetail;
            this.lastSessionSyncTime = sessionDetail?.lastUpdateTime;
            // 前3次轮询不查询任务状态，直接返回
            if (this.sessionPollingCount <= queryCount) {
              return;
            }
            // 第4次开始才检查任务状态
            // 检查任务状态，若无运行中任务则停止轮询
            if (!(await this.checkTaskRunning())) {
              console.log("❌ 检查到无运行中任务，停止轮询 1");
              this.stopSessionPolling();
            }
            return;
          }

          const prevEventCount = this.currentSession?.events?.length ?? 0;
          this.currentSession = sessionDetail;
          this.parseSessionDetail(sessionDetail, prevEventCount, false);
          // 前3次轮询不查询任务状态
          if (this.sessionPollingCount <= queryCount) {
            return;
          }
          // 第4次开始才检查任务状态
          // 检查任务状态，若无运行中任务则停止轮询
          if (!(await this.checkTaskRunning())) {
            console.log("❌ 检查到无运行中任务，停止轮询 2");
            this.stopSessionPolling();
          }
        },
        onError: err => {
          console.error("❌ Session polling error:", err);
        }
      });
    },
    stopSessionPolling() {
      this.sessionPolling?.stop();
      this.sessionPolling = undefined;
      this.sendLoading = false;
    },
    parseSessionDetail(session: any, startEventIndex = 0, reset = true) {
      if (!session?.events) {
        this.lastSessionSyncTime = session?.lastUpdateTime;
        return;
      }

      let index = reset ? 0 : this.eventMessageIndexArray.length;

      if (reset) {
        this.eventData.clear();
        this.eventMessageIndexArray = [];
        this.messageList = [];
      }

      session.events.slice(startEventIndex).forEach((event: any) => {
        event.content?.parts?.forEach((part: any) => {
          this.storeMessage(
            part,
            event,
            index,
            event.author === "user" ? "user" : "bot"
          );
          index += 1;
          if (event.author && event.author !== "user") {
            this.storeEvents(part, event);
          }
        });
      });
      this.lastSessionSyncTime = session?.lastUpdateTime;
    },
    getAsyncFunctionsFromParts(pendingIds: any[], parts: any[]) {
      for (const part of parts) {
        if (part.functionCall && pendingIds.includes(part.functionCall.id)) {
          this.longRunningEvents.push(part.functionCall);
        }
      }
    },
    renderArtifact(artifactId: string, versionId: string) {
      // Add a placeholder message for the artifact
      // Feed the placeholder with the artifact data after it's fetched
      const message = {
        role: "bot",
        inlineData: {
          data: "",
          mimeType: "image/png"
        }
      };
      console.log("▶️ 渲染Artifact消息: ", artifactId, versionId, message);
      // this.insertMessageBeforeLoadingMessage(message);

      // const currentIndex = this.messageList.length - 2;

      // this.artifactService
      //   .getArtifactVersion(
      //     this.userId,
      //     this.appName,
      //     this.sessionId || window.sessionStorage.getItem("sessionId")!,
      //     artifactId,
      //     versionId
      //   )
      //   .subscribe(res => {
      //     const mimeType = res.inlineData.mimeType;
      //     const base64Data = this.formatBase64Data(
      //       res.inlineData.data,
      //       mimeType
      //     );

      //     const mediaType = getMediaTypeFromMimetype(mimeType);

      //     let inlineData = {
      //       name: this.createDefaultArtifactName(mimeType),
      //       data: base64Data,
      //       mimeType: mimeType,
      //       mediaType
      //     };

      //     messageList[currentIndex] = {
      //       role: "bot",
      //       inlineData
      //     };

      //     // To trigger ngOnChanges in the artifact tab component
      //     this.artifacts = [
      //       ...this.artifacts,
      //       {
      //         id: artifactId,
      //         data: base64Data,
      //         mimeType,
      //         versionId,
      //         mediaType: getMediaTypeFromMimetype(mimeType)
      //       }
      //     ];
      //   });
    },
    insertMessageBeforeLoadingMessage(message: any) {
      const messagesToInsert = Array.isArray(message) ? message : [message];
      this.messageList.push(...messagesToInsert);
      this.scrollToBottomSmooth();
    },
    storeMessage(
      part: any,
      e: any,
      index: number,
      role: string,
      invocationIndex?: number,
      additionalIndeces?: any
    ) {
      if (e?.longRunningToolIds && e.longRunningToolIds.length > 0) {
        this.getAsyncFunctionsFromParts(e.longRunningToolIds, e.content.parts);
        this.functionCallEventId = e.id;
      }
      if (e?.actions && e.actions.artifactDelta) {
        for (const key in e.actions.artifactDelta) {
          if (e.actions.artifactDelta.hasOwnProperty(key)) {
            this.renderArtifact(key, e.actions.artifactDelta[key]);
          }
        }
      }
      // e.author !== "user" && this.checkFinalResponse(part, e ? e : null, index);

      const message: any = {
        role,
        evalStatus: e?.evalStatus,
        failedMetric: e?.failedMetric,
        evalScore: e?.evalScore,
        evalThreshold: e?.evalThreshold,
        actualInvocationToolUses: e?.actualInvocationToolUses,
        expectedInvocationToolUses: e?.expectedInvocationToolUses,
        actualFinalResponse: e?.actualFinalResponse,
        expectedFinalResponse: e?.expectedFinalResponse,
        invocationIndex:
          invocationIndex !== undefined ? invocationIndex : undefined,
        finalResponsePartIndex:
          additionalIndeces?.finalResponsePartIndex !== undefined
            ? additionalIndeces.finalResponsePartIndex
            : undefined,
        toolUseIndex:
          additionalIndeces?.toolUseIndex !== undefined
            ? additionalIndeces.toolUseIndex
            : undefined
      };
      if (part.inlineData) {
        const base64Data = formatBase64Data(
          part.inlineData.data,
          part.inlineData.mimeType
        );
        message.inlineData = {
          displayName: part.inlineData.displayName,
          data: base64Data,
          mimeType: part.inlineData.mimeType
        };
        this.eventMessageIndexArray[index] = part.inlineData;
      } else if (part.text) {
        message.text = part.text;
        message.thought = part.thought ? true : false;
        if (
          e?.groundingMetadata &&
          e.groundingMetadata.searchEntryPoint &&
          e.groundingMetadata.searchEntryPoint.renderedContent
        ) {
          message.renderedContent =
            e.groundingMetadata.searchEntryPoint.renderedContent;
        }
        message.eventId = e?.id;
        message.invocationId = e?.invocationId;
        this.eventMessageIndexArray[index] = part.text;
        if (part.text.includes("<FORM_CONFIG>")) {
          const [cleanedText, fields] = extractFormConfigs(part.text);
          if (cleanedText && fields.length) {
            message.text = cleanedText;
            message.userFormConfig = fields;
            this.userFormConfig = fields;
            localStorage.setItem("formEventID", e?.eventId);
            localStorage.setItem(
              "formMsgIndex",
              this.messageList.length.toString()
            );
            if (this.isUserNewMessage) {
              window.parent.postMessage(
                {
                  key: "userFormConfig",
                  type: "1️⃣userFormConfig",
                  data: fields
                },
                "*"
              );
              console.log("==== 设置operatingFormIndex: ", index + 1);
              this.operatingFormEventId = message.eventId;
              this.operatingFormIndex = index + 1;
              this.stopSessionPolling();
            }

            this.insertMessageBeforeLoadingMessage([
              message,
              { ...message, formConfig: { name: "Analysis Form" } }
            ]);
          } else {
            this.insertMessageBeforeLoadingMessage([message]);
          }
        } else if (part.text.includes("```")) {
          const { language } = extractScriptContent(part.text);
          if (["python", "r", "bash"].includes(language)) {
            this.isUserNewMessage && this.startSessionPolling(2);
            this.insertMessageBeforeLoadingMessage([
              message,
              {
                ...message,
                taskInfo: {
                  eventId: message.eventId,
                  sessionId: this.currentSession.id
                }
              }
            ]);
          } else {
            this.insertMessageBeforeLoadingMessage([message]);
          }
        } else {
          this.insertMessageBeforeLoadingMessage(message);
        }
        return;
      } else if (part.functionCall) {
        message.functionCall = part.functionCall;
        message.eventId = e?.id;
        message.invocationId = e?.invocationId;
        this.eventMessageIndexArray[index] = part.functionCall;
      } else if (part.functionResponse) {
        message.functionResponse = part.functionResponse;

        message.eventId = e?.id;
        message.invocationId = e?.invocationId;
        message.functionResponse["query"] = getQueryFromId(
          part.functionResponse.id,
          this.messageList,
          this.eventMessageIndexArray
        );
        message.functionResponse["hideInChat"] = ![
          "zhanghaorui-",
          "zhanhaojia",
          "liqingjiao-",
          "liugaotong-",
          "zhongzheng-",
          "luhuifang-",
          "zhaoxiong-"
        ].includes(localStorage.getItem("userId") || "");
        if (
          this.isUserNewMessage &&
          part.functionResponse.name &&
          part.functionResponse.name === "extract_user_specified_mime_type_path"
        ) {
          // window.parent.postMessage(
          //   {
          //     key: "specifiedMimePath",
          //     type: "specifiedMimePath",
          //     path: part.functionResponse.response.mime_type_path
          //   },
          //   "*"
          // );
          this.specifiedMimePath =
            part.functionResponse.response.mime_type_path;
          this.isUserNewMessage = false;
        }
        if (
          part.functionResponse.name &&
          part.functionResponse.name === "extract_user_specified_script_path"
        ) {
          this.userSpecifiedPath = part.functionResponse.response.script_path;
          window.parent.postMessage(
            {
              key: "specifiedScriptPath",
              type: "specifiedScriptPath",
              path: this.userSpecifiedPath
            },
            "*"
          );
        }
        this.eventMessageIndexArray[index] = part.functionResponse;

        if (
          part.functionResponse.name === "generate_ppt_from_content" &&
          part.functionResponse.response?.status === "success"
        ) {
          const response = part.functionResponse.response;
          this.insertMessageBeforeLoadingMessage([
            message,
            {
              ...message,
              pptInfo: {
                pdfPath: response.pdf_path,
                pptxPath: response.pptx_path,
                projectId: response.project_id,
                pagesCount: response.pages_count,
                message: response.message,
                status: response.status,
                thumbnailPath: response?.thumbnail_path
              }
            }
          ]);
          return;
        }
      } else if (part.executableCode) {
        message.executableCode = part.executableCode;
        this.eventMessageIndexArray[index] = part.executableCode;
      } else if (part.codeExecutionResult) {
        message.codeExecutionResult = part.codeExecutionResult;
        this.eventMessageIndexArray[index] = part.codeExecutionResult;
        if (e.actions && e.actions.artifact_delta) {
          for (const key in e.actions.artifact_delta) {
            if (e.actions.artifact_delta.hasOwnProperty(key)) {
              this.renderArtifact(key, e.actions.artifact_delta[key]);
            }
          }
        }
      }
      if (Object.keys(part).length > 0) {
        this.insertMessageBeforeLoadingMessage(message);
      }
    },

    handleFinalMessageIfFormConfig() {
      console.log(
        "🛠️📦【runSse完成, 手动处理最后一条消息, messages: 】",
        this.messageList
      ); // green

      const lastMessage = this.messageList[this.messageList.length - 1];
      if (!lastMessage?.text) return;
      this.messageList.pop();
      lastMessage.eventId = localStorage.getItem("finalEventId")!;
      lastMessage.invocationId = localStorage.getItem("finalInvocationId")!;
      if (lastMessage.text.includes("<FORM_CONFIG>")) {
        const [cleanedText, fields] = extractFormConfigs(lastMessage.text);
        if (cleanedText && fields.length) {
          lastMessage.text = cleanedText;
          lastMessage.userFormConfig = fields;
          this.userFormConfig = fields;
          localStorage.setItem("formEventID", lastMessage.eventId);
          localStorage.setItem(
            "formMsgIndex",
            this.messageList.length.toString()
          );
          window.parent.postMessage(
            {
              key: "userFormConfig",
              type: "0️⃣ userFormConfig",
              data: fields
            },
            "*"
          );
          this.operatingFormEventId = lastMessage.eventId;
          this.operatingFormIndex = this.messageList.length + 1;

          this.insertMessageBeforeLoadingMessage([
            lastMessage,
            { ...lastMessage, formConfig: { name: "Analysis Form" } }
          ]);
        }
      } else if (lastMessage.text.includes("```")) {
        const { language } = extractScriptContent(lastMessage.text);
        if (["python", "r", "bash"].includes(language)) {
          this.isUserNewMessage && this.startSessionPolling(2);
          this.insertMessageBeforeLoadingMessage([
            lastMessage,
            {
              ...lastMessage,
              taskInfo: {
                eventId: lastMessage.eventId,
                sessionId: this.currentSession.id
              }
            }
          ]);
        } else {
          this.insertMessageBeforeLoadingMessage([lastMessage]);
        }
      } else {
        this.insertMessageBeforeLoadingMessage([lastMessage]);
      }
    },

    async sendMessage(autoInput = false) {
      const newUserInput = autoInput
        ? this.hideMessageText[0]
        : this.userInput.trim();
      if (!newUserInput && this.selectedFiles?.length <= 0) return;
      if (!this.messageList.length) {
        this.postMessageToParent({
          key: "sessionCreated",
          sessionId: this.currentSession.id
        });
      }
      this.stopSessionPolling();
      this.sendLoading = true;
      if (this.updateSessionInterval) {
        clearInterval(this.updateSessionInterval);
        this.updateSessionInterval = null;
      }
      // Add user message
      if (!!newUserInput) {
        this.messageList.push({ role: "user", text: newUserInput });
        this.isUserNewMessage = true;
      }
      // Add user message attachments
      if (this.selectedFiles?.length > 0) {
        const messageAttachments = this.selectedFiles.map(file => ({
          file: file.file,
          url: file.url
        }));
        this.messageList.push({
          role: "user",
          attachments: messageAttachments
        });
      }
      this.scrollToBottomSmooth();
      let index = this.eventMessageIndexArray.length - 1;
      this.sseController = startSse(
        {
          appName: this.currentSession.appName,
          userId: this.currentSession.userId,
          sessionId: this.currentSession.id,
          newMessage: { role: "user", parts: [{ text: newUserInput }] },
          streaming: true,
          stateDelta: null
        },
        chunk => {
          if (chunk.startsWith('{"error"')) {
            console.log("error", chunk);
            ElMessageBox.confirm(chunk, "Error", {
              confirmButtonText: "OK",
              type: "error",
              center: true
            })
              .then(() => {})
              .catch(() => {});
            return;
          }
          const chunkJson = JSON.parse(chunk);
          // console.log("📩chunkJson: ", chunkJson);
          if (chunkJson.error) {
            console.log("error", chunkJson.error);
            return;
          }
          if (chunkJson.content) {
            for (const part of chunkJson.content.parts) {
              index += 1;
              this.processPart(chunkJson, part, index);
            }
          } else if (chunkJson.errorMessage) {
            console.log("error, chunkJson, index: ", chunkJson, index);
            this.storeEvents(chunkJson, chunkJson);
          }
          // 处理
        },
        err => {
          console.error(err);
          // ElMessageBox.confirm(err, "Error", {
          //   confirmButtonText: "OK",
          //   type: "error",
          //   center: true
          // })
          //   .then(() => {
          //     // ElMessage({
          //     //   type: "success",
          //     //   message: "Delete completed"
          //     // });
          //   })
          //   .catch(() => {
          //     // ElMessage({
          //     //   type: "info",
          //     //   message: "Delete canceled"
          //     // });
          //   });
        },
        // complete 回调
        async () => {
          console.log("🏁🏁🏁runSSE回复结束, 处理最后一条消息🏁🏁🏁");
          this.handleFinalMessageIfFormConfig();
          this.isUserNewMessage = false;
          const sessionDetail = (await adkService.getSessionDetail(
            this.user_info.user_id,
            this.currentSession.id
          )) as AdkSession;
          if (sessionDetail) {
            this.currentSession = sessionDetail;
            this.lastSessionSyncTime = sessionDetail.lastUpdateTime;
            for (let i = 0; i < this.sessionList.length; i++) {
              const session = this.sessionList[i];
              if (session.id === sessionDetail.id) {
                session.state.title = sessionDetail.state?.title;
              }
            }
            this.parseSessionDetail(sessionDetail);
          }
          // window.parent.postMessage(
          //   {
          //     key: "isFinalResponse",
          //     type: "3️⃣_isFinalResponse",
          //     sessionId: this.currentSession.id,
          //     value: true
          //   },
          //   "*"
          // );
          if (this.specifiedMimePath) {
            this.specifiedMimePath = "";
            this.startSessionPolling(4);
          } else {
            setTimeout(async () => {
              if (await this.checkTaskRunning()) {
                this.startSessionPolling(5);
              } else {
                this.sendLoading = false;
              }
            }, 20000);
          }
        }
      );
      !autoInput && (this.userInput = "");
    },
    processPart(chunkJson: any, part: any, index: number) {
      // console.log("🎯processPart", chunkJson, part, index, author);
      const renderedContent =
        chunkJson.groundingMetadata?.searchEntryPoint?.renderedContent;
      if (part.text) {
        this.isModelThinkingSubject = false;
        const newChunk = part.text;
        if (part.thought) {
          if (newChunk !== this.latestThought) {
            this.storeEvents(part, chunkJson);
            const thoughtMessage = {
              role: "bot",
              text: processThoughtText(newChunk),
              thought: true,
              eventId: chunkJson.id
            };
            this.insertMessageBeforeLoadingMessage(thoughtMessage);
          }
          this.latestThought = newChunk;
        } else if (!this.streamingTextMessage) {
          this.streamingTextMessage = {
            role: "bot",
            text: processThoughtText(newChunk),
            thought: part.thought ? true : false,
            eventId: chunkJson.id
          };
          if (renderedContent) {
            this.streamingTextMessage.renderedContent =
              chunkJson.groundingMetadata.searchEntryPoint.renderedContent;
          }
          this.insertMessageBeforeLoadingMessage(this.streamingTextMessage);
        } else {
          if (renderedContent) {
            this.streamingTextMessage.renderedContent =
              chunkJson.groundingMetadata.searchEntryPoint.renderedContent;
          }
          if (newChunk == this.streamingTextMessage.text) {
            this.storeEvents(part, chunkJson);
            this.eventMessageIndexArray[index] = newChunk;
            this.streamingTextMessage = null;
            localStorage.setItem("finalEventId", chunkJson.id);
            localStorage.setItem("finalInvocationId", chunkJson.invocationId);
            this.scrollToBottomSmooth();
            return;
          }
          this.streamingTextMessage.text += newChunk;
          this.scrollToBottomSmooth();
        }
      } else if (!part.thought) {
        this.isModelThinkingSubject = false;
        this.storeEvents(part, chunkJson);
        this.storeMessage(
          part,
          chunkJson,
          index,
          chunkJson.author === "user" ? "user" : "bot"
        );
      } else {
        this.isModelThinkingSubject = true;
      }
    },

    stopSSE() {
      // 主动停止
      this.sseController?.stop?.();
      this.sendLoading = false;
    }
  }
});
