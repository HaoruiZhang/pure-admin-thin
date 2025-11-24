import { defineStore } from "pinia";
import type { Ref } from "vue";
import { nextTick } from "vue";
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
  createPollingController
} from "@/views/adk/utils";
import type { PollingController } from "@/views/adk/utils";
import { adkService } from "@/api/adk.service";
// import {URLUtil} from '../../../utils/url-util';
import { AccessiblePromise } from "@/views/adk/utils";
interface SSEController {
  stop: () => void;
  isLoading: any;
}
interface adkChatState {
  sseController: SSEController | null;
  userInput: "";
  selectedFiles?: { file: File; url: string }[];
  streamingTextMessage: any | null;
  isModelThinkingSubject: boolean;
  isUserNewMessage: boolean;
  currentSession: AdkSession;
  sessionList: AdkSession[];
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
  userFormConfig?: any;
  isFinalResponse: boolean;
  updateSessionInterval?: any;
  getListReady?: AccessiblePromise<void>;
  setCurrentSessionReady?: AccessiblePromise<void>;
  sessionPolling?: PollingController;
  lastSessionSyncTime?: number;
  operatingFormIndex?: number;
  isDebugMode: boolean;
}

export const useADKChatStore = defineStore("adkChatStore", {
  state: (): adkChatState => ({
    sseController: null,
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
    redirectUri: URLUtil.getBaseUrlWithoutPath(),
    functionCallEventId: "",
    getListReady: new AccessiblePromise<void>(),
    setCurrentSessionReady: new AccessiblePromise<void>(),
    sessionPolling: undefined,
    lastSessionSyncTime: 0
  }),
  getters: {},
  actions: {
    initStore() {},
    setUserId(userId: string) {
      this.user_info.user_id = userId;
      localStorage?.setItem("stag:user_id", userId);
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
          this.currentSession = getNewSession(this.user_info.user_id);
          this.currentSession.id = res.id;
          this.sessionList.unshift(this.currentSession);
          // this.getSessionList();

          // this.updateSelectedSessionUrl();
        });
      // this.createSession();
      this.eventData.clear();
      this.eventMessageIndexArray = [];
      this.messageList = [];
      // this.artifacts = [];
    },
    async deleteSession(sessionId: string) {
      return adkService
        .deleteSession(this.user_info.user_id, sessionId)
        .then((res: any) => {
          console.log("▶️ 删除会话: ", res);
          this.sessionList = this.sessionList.filter(
            session => session.id !== sessionId
          );
        });
    },
    storeEvents(part: any, e: any, index: number) {
      let title = "";
      console.log(
        "▶️ 存储事件: \npart: ",
        part,
        "\ne: ",
        e,
        "\nindex: ",
        index
      );

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
    },
    resetInput() {
      this.userInput = "";
    },
    getSessionById(id: number | string) {
      return this.sessionList.find(session => session.id === id);
    },
    async getSessionList() {
      adkService.getSessionList(this.user_info.user_id).then((res: any[]) => {
        console.log("▶️ 向ADK后端查询Session列表: ", res);

        if (res.length) {
          const sortedRes = res.sort((a, b) => {
            return b?.lastUpdateTime - a?.lastUpdateTime;
          });
          this.sessionList = sortedRes;
        }
        this.getListReady.resolve();
      });
    },
    async setCurrentSession(newSessionId: number | string) {
      // if (newSessionId === this.currentSession.id) {
      //   return;
      // }
      // const targetSession = await adkService.getSessionDetail(newSessionId);
      adkService
        .getSessionDetail(this.user_info.user_id, newSessionId)
        .then((sessionDetail: AdkSession) => {
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
          }
        });
    },
    startSessionPolling(interval = 5000) {
      if (!this.currentSession?.id) return;
      this.sessionPolling?.stop();
      this.sendLoading = true;
      this.sessionPolling = createPollingController({
        interval,
        autoStart: true,
        immediate: true,
        task: async () => {
          if (!this.currentSession?.id) return;
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
            return;
          }

          const prevEventCount = this.currentSession?.events?.length ?? 0;
          this.currentSession = sessionDetail;
          this.parseSessionDetail(sessionDetail, prevEventCount, false);
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
            this.storeEvents(part, event, index);
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
      needRefresh = true,
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
            this.isUserNewMessage &&
              window.parent.postMessage(
                {
                  key: "userFormConfig",
                  type: "userFormConfig",
                  data: fields
                },
                "*"
              );
            this.insertMessageBeforeLoadingMessage([
              message,
              { ...message, formConfig: { name: "Analysis Form" } }
            ]);
          }
        } else if (part.text.includes("# <must_execute>")) {
          const scriptContent = extractScriptContent(part.text);
          if (scriptContent) {
            // console.log('---- 脚本内容: ', scriptContent);
            // console.log('---- this.sessionId: ', this.sessionId, window.sessionStorage.getItem('sessionId'));
            this.isUserNewMessage &&
              window.parent.postMessage(
                // 新对话的才自动执行
                {
                  key: "mustExecuteScript",
                  type: "mustExecuteScript",
                  script: "```" + scriptContent + "\n\n```",
                  eventId: message.eventId
                },
                "*"
              );
            console.log("📦 从代码块里发送_isFinalResponse");
            window.parent.postMessage(
              {
                key: "isFinalResponse",
                type: "_isFinalResponse",
                sessionId: this.currentSession.id,
                value: true
              },
              "*"
            );
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
          }
        } else {
          // console.log('---- 普通文本消息，插入消息:', message);
          this.insertMessageBeforeLoadingMessage(message);
        }
        return;
      } else if (part.functionCall) {
        message.functionCall = part.functionCall;
        message.eventId = e?.id;
        this.eventMessageIndexArray[index] = part.functionCall;
      } else if (part.functionResponse) {
        message.functionResponse = part.functionResponse;
        message.eventId = e?.id;
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
          part.functionResponse.name &&
          part.functionResponse.name ===
            "extract_user_specified_mime_type_path" &&
          this.isUserNewMessage
        ) {
          window.parent.postMessage(
            {
              key: "specifiedMimePath",
              type: "specifiedMimePath",
              path: part.functionResponse.response.mime_type_path
            },
            "*"
          );
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

      this.checkFinalResponse(part, e ? e : null);

      if (needRefresh && Object.keys(part).length > 0) {
        this.insertMessageBeforeLoadingMessage(message);
      }
    },

    checkFinalResponse(part: any, e?: any) {
      // 判断是否对话结束
      // console.log('【checkFinalResponse】', part, e);
      if (e?.actions.skip_summarization || e?.longRunningToolIds?.length) {
        this.isFinalResponse = true;
      } else if (
        !part.functionResponse &&
        !part.functionCall &&
        !e?.partial &&
        !part.text?.includes("<backend-reply-start>")
      ) {
        this.isFinalResponse = true;
      } else {
        this.isFinalResponse = false;
      }

      if (this.isFinalResponse) {
        console.log("---- 判断出对话已经结束! ");
        this.stopSessionPolling();
        window.parent.postMessage(
          {
            key: "isFinalResponse",
            type: "_isFinalResponse",
            sessionId: this.currentSession.id,
            value: true
          },
          "*"
        );
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
          this.isUserNewMessage &&
            window.parent.postMessage(
              {
                key: "userFormConfig",
                type: "userFormConfig",
                data: fields
              },
              "*"
            );
          this.insertMessageBeforeLoadingMessage([
            lastMessage,
            { ...lastMessage, formConfig: { name: "Analysis Form" } }
          ]);
        }
      } else if (lastMessage.text.includes("# <must_execute>")) {
        const scriptContent = extractScriptContent(lastMessage.text);
        if (scriptContent) {
          // console.log('---- 脚本内容: ', scriptContent);
          this.isUserNewMessage &&
            window.parent.postMessage(
              // 新对话的才自动执行
              {
                key: "mustExecuteScript",
                type: "mustExecuteScript",
                script: "```" + scriptContent + "\n\n```",
                eventId: localStorage.getItem("finalEventId")!
              },
              "*"
            );
          console.log("📦 手动处理最后一条消息发送_isFinalResponse");
          window.parent.postMessage(
            {
              key: "isFinalResponse",
              type: "_isFinalResponse",
              sessionId: this.currentSession.id,
              value: true
            },
            "*"
          );
          this.insertMessageBeforeLoadingMessage([
            lastMessage,
            {
              ...lastMessage,
              taskInfo: {
                eventId: localStorage.getItem("finalEventId")!,
                sessionId: this.currentSession.id,
                state: "success"
              }
            }
          ]);
        }
      } else {
        this.insertMessageBeforeLoadingMessage([lastMessage]);
      }
    },

    async sendMessage2() {
      this.sendLoading = true;

      if (!this.userInput.trim() && this.selectedFiles?.length <= 0) return;

      if (this.updateSessionInterval) {
        clearInterval(this.updateSessionInterval);
        this.updateSessionInterval = null;
      }
      // Add user message
      if (!!this.userInput.trim()) {
        this.messageList.push({ role: "user", text: this.userInput });
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
          newMessage: { role: "user", parts: [{ text: this.userInput }] },
          streaming: true,
          stateDelta: null
        },
        chunk => {
          if (chunk.startsWith('{"error"')) {
            console.log("error", chunk);
            return;
          }
          const chunkJson = JSON.parse(chunk);
          if (chunkJson.error) {
            console.log("error", chunkJson.error);
            return;
          }
          if (chunkJson.content) {
            for (const part of chunkJson.content.parts) {
              index += 1;
              this.processPart(chunkJson, part, index, chunkJson.author);
            }
          } else if (chunkJson.errorMessage) {
            console.log("error, chunkJson, index: ", chunkJson, index);
            this.storeEvents(chunkJson, chunkJson, index);
          }
          // 处理
        },
        err => console.error(err),
        async () => {
          this.sendLoading = false;
          console.log("complete");
          this.handleFinalMessageIfFormConfig();
          const sessionDetail = (await adkService.getSessionDetail(
            this.user_info.user_id,
            this.currentSession.id
          )) as AdkSession;
          if (sessionDetail) {
            this.currentSession = sessionDetail;
            this.lastSessionSyncTime = sessionDetail.lastUpdateTime;
          }
        }
      );
      this.userInput = "";
    },
    processPart(
      chunkJson: any,
      part: any,
      index: number,
      author: string = "bot"
    ) {
      const renderedContent =
        chunkJson.groundingMetadata?.searchEntryPoint?.renderedContent;
      if (part.text) {
        this.isModelThinkingSubject = false;
        const newChunk = part.text;
        if (part.thought) {
          if (newChunk !== this.latestThought) {
            this.storeEvents(part, chunkJson, index);
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
            this.storeEvents(part, chunkJson, index);
            this.eventMessageIndexArray[index] = newChunk;
            this.streamingTextMessage = null;
            localStorage.setItem("finalEventId", chunkJson.id);
            this.scrollToBottomSmooth();
            return;
          }
          this.streamingTextMessage.text += newChunk;
          this.scrollToBottomSmooth();
          if (author === "workflow_agent") {
            window.parent.postMessage(
              {
                key: "workflowContent",
                type: "workflowContent",
                text: this.streamingTextMessage.text
              },
              "*"
            );
          }
        }
      } else if (!part.thought) {
        this.isModelThinkingSubject = false;
        this.storeEvents(part, chunkJson, index);
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
    }
  }
});
