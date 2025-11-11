import { defineStore } from "pinia";
import type { AdkSession } from "@/types/adk";
import {
  getNewSession,
  URLUtil,
  formatBase64Data,
  extractScriptContent,
  extractFormConfigs,
  getQueryFromId,
  useAgentService
} from "@/views/adk/utils";
import { adkService } from "@/api/adk.service";
// import {URLUtil} from '../../../utils/url-util';
const { runSse, isLoading } = useAgentService();
interface adkChatState {
  userInput: "";
  isUserNewMessage: boolean;
  currentSession: AdkSession;
  sessionList: AdkSession[];
  sendLoading: boolean; //发送消息的loading状态
  messageList: any[];
  eventData: Map<string, any>;
  eventMessageIndexArray: any[];
  longRunningEvents?: any[];
  userSpecifiedPath?: string;
  functionCallEventId?: string;
  user_info?: {
    user_id: string | number;
    access_times?: number;
    access_privilege_bits?: number;
  };
  redirectUri: string;
  userFormConfig?: any;
  isFinalResponse: boolean;
  updateSessionInterval?: any;
}

export const useADKChatStore = defineStore("adkChatStore", {
  state: (): adkChatState => ({
    userInput: "",
    sendLoading: false,
    isUserNewMessage: false,
    currentSession: getNewSession(),
    sessionList: [],
    messageList: [],
    userFormConfig: null,
    isFinalResponse: true,
    eventData: new Map<string, any>(),
    longRunningEvents: [],
    eventMessageIndexArray: [],
    userSpecifiedPath: "",
    user_info: {
      user_id: localStorage?.getItem("stag:user_id") || "0"
    },
    redirectUri: URLUtil.getBaseUrlWithoutPath(),
    functionCallEventId: ""
  }),
  getters: {},
  actions: {
    initStore() {},
    resetInput() {
      this.userInput = "";
    },
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
      adkService
        .getSessionDetail(newSessionId)
        .then((sessionDetail: AdkSession) => {
          console.log("▶️ 获取会话详情: ", sessionDetail);
          if (sessionDetail) {
            this.messageList = [];
            this.currentSession = sessionDetail;
            this.parseSessionDetail(sessionDetail);
            console.log("▶️ 当前messageList: ", this.messageList);
          }
        });
    },
    parseSessionDetail(session: any) {
      let index = 0;
      session.events.forEach((event: any) => {
        event.content?.parts?.forEach((part: any) => {
          this.storeMessage(
            part,
            event,
            index,
            event.author === "user" ? "user" : "bot"
          );
          index += 1;
          // TODO if (event.author && event.author !== "user") {
          //   this.storeEvents(part, event, index);
          // }
        });
      });
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
      console.log(
        "📩【insertMessageBeforeLoadingMessage】, message:",
        message,
        this.messageList
      );
      // console.log('   ---- 当前messages:', this.messageList)
      const lastMessage = this.messageList[this.messageList.length - 1];
      const messagesToInsert = Array.isArray(message) ? message : [message];
      if (lastMessage?.isLoading) {
        // console.log('     ---- 在loading消息前插入消息: ', messagesToInsert);
        this.messageList.splice(
          this.messageList.length - 1,
          0,
          ...messagesToInsert
        );
      } else {
        // console.log('     ---- 直接在末尾插入消息: ', messagesToInsert);
        this.messageList.push(...messagesToInsert);
      }
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
                  data: this.userFormConfig
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
            window.parent.postMessage(
              {
                key: "isFinalResponse",
                type: "isFinalResponse",
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

      if (this.isFinalResponse && this.updateSessionInterval) {
        // console.log('---- 判断出对话已经结束! ')

        if (this.updateSessionInterval) {
          clearInterval(this.updateSessionInterval);
          this.updateSessionInterval = null;
        }

        window.parent.postMessage(
          {
            key: "isFinalResponse",
            type: "isFinalResponse",
            sessionId:
              this.currentSession.id ||
              window.sessionStorage.getItem("sessionId")!,
            value: true
          },
          "*"
        );
      }
    },
    async sendMessage() {
      const req = {
        appName: this.currentSession.appName,
        userId: this.currentSession.userId,
        sessionId: this.currentSession.id,
        newMessage: { role: "user", parts: [{ text: this.userInput }] },
        streaming: true,
        stateDelta: null
      };
      for await (const chunk of runSse(req)) {
        // chunk 是服务端单个 data: 行中的 JSON 字符串
        const obj = JSON.parse(chunk);
        console.log("obj: ", obj, isLoading);
        // 处理 obj ...
      }
    }
  }
});
