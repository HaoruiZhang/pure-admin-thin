import type { AdkSession, AgentRunRequest } from "@/types";
import { adkService } from "@/api/adk.service";

export function getSessionListByDays(
  currentSession: any,
  sessionList: any[],
  daysRangeStart: number,
  daysRangeEnd: number
) {
  const nowTimestamp = Date.now();
  return sessionList.filter(session => {
    const sessionTimestamp = session.lastUpdateTime * 1000;
    const diffInDays =
      (nowTimestamp - sessionTimestamp) / (1000 * 60 * 60 * 24);
    return diffInDays >= daysRangeStart && diffInDays < daysRangeEnd;
  });
}

export const getNewSession = (userId: string = "user"): AdkSession => {
  return {
    id: "0",
    appName: "agents",
    userId: userId,
    events: [],
    state: { title: "新对话" },
    lastUpdateTime: Date.now() / 1000
  };
};
/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export class URLUtil {
  /**
   * Get the base URL without any path
   * @returns {string} Base URL (protocol + hostname + port)
   */
  static getBaseUrlWithoutPath(): string {
    // Use the URL constructor for robust URL parsing
    const currentUrl = window.location.href;
    const urlObject = new URL(currentUrl);

    // Construct base URL using origin property
    // Origin includes protocol, hostname, and port
    return urlObject.origin + "/dev-ui/";
  }

  /**
   * Get the base URL without any path
   * @returns {string} Base URL (protocol + hostname + port)
   */
  static getApiServerBaseUrl(): string {
    return (window as any)["runtimeConfig"]?.backendUrl;
  }

  static getWSServerUrl(): string {
    const url = this.getApiServerBaseUrl();
    // For adk web, when the api server is not set, use the current host
    if (!url || url == "") {
      return window.location.host;
    }

    // For local development, api server address is passed in runtime_config
    if (url.startsWith("http://")) {
      return url.slice("http://".length);
    } else if (url.startsWith("https://")) {
      return url.slice("https://".length);
    } else {
      return url;
    }
  }
}

export function updateRedirectUri(
  urlString: string,
  newRedirectUri: string
): string {
  try {
    const url = new URL(urlString);
    const searchParams = url.searchParams;
    searchParams.set("redirect_uri", newRedirectUri);
    return url.toString();
  } catch (error) {
    console.warn("Failed to update redirect URI: ", error);
    return urlString;
  }
}
export function openOAuthPopup(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Open OAuth popup
    const popup = window.open(url, "oauthPopup", "width=600,height=700");

    if (!popup) {
      reject("Popup blocked!");
      return;
    }

    // Listen for messages from the popup
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return; // Ignore messages from unknown sources
      }
      const { authResponseUrl } = event.data;
      if (authResponseUrl) {
        resolve(authResponseUrl);
        window.removeEventListener("message", listener);
      } else {
        console.log("【OAuth failed】", event);
      }
    };

    window.addEventListener("message", listener);
  });
}
function fixBase64String(base64: string): string {
  // Replace URL-safe characters if they exist
  base64 = base64.replace(/-/g, "+").replace(/_/g, "/");

  // Fix base64 padding
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }

  return base64;
}
export function formatBase64Data(data: string, mimeType: string) {
  const fixedBase64Data = fixBase64String(data);
  return `data:${mimeType};base64,${fixedBase64Data}`;
}

export function extractScriptContent(str: string) {
  const startTag = "```";
  const endTag = "\n```";
  const startIndex = str.indexOf(startTag);
  if (startIndex === -1) return null; // 未找到开始标记
  const contentStartIndex = startIndex + startTag.length;
  const endIndex = str.indexOf(endTag, contentStartIndex);
  if (endIndex === -1) return null; // 未找到结束标记

  const rawContent = str.substring(contentStartIndex, endIndex);
  const firstNewLineIndex = rawContent.indexOf("\n");

  if (firstNewLineIndex !== -1) {
    const language = rawContent.substring(0, firstNewLineIndex).trim();
    const content = rawContent.substring(firstNewLineIndex + 1);
    return { language, content };
  }

  return { language: "", content: rawContent };
}

export function extractFormConfigs(str: string) {
  const startTag = "<FORM_CONFIG>";
  const endTag = "</FORM_CONFIG>";
  const result = [];

  // 用于存储剩余字符串的部分
  let remaining = "";
  let lastIndex = 0;

  // 查找所有匹配的字段
  let startIndex = str.indexOf(startTag);
  while (startIndex !== -1) {
    const contentStartIndex = startIndex + startTag.length;
    const endIndex = str.indexOf(endTag, contentStartIndex);

    if (endIndex === -1) break; // 未找到结束标记

    // 提取被包裹的内容
    const content = str.substring(contentStartIndex, endIndex);
    result.push(content);

    // 收集本次匹配前的字符串
    remaining += str.substring(lastIndex, startIndex);

    // 更新最后处理的索引位置
    lastIndex = endIndex + endTag.length;

    // 查找下一个匹配
    startIndex = str.indexOf(startTag, lastIndex);
  }

  // 添加最后一部分字符串
  remaining += str.substring(lastIndex);

  return [remaining, result];
}

export function getQueryFromId(
  id: string,
  messageList: any[],
  eventMessageIndexArray: any[]
): string | undefined {
  if (!id) return undefined;

  // 先在 messages 中查找对应的 functionCall
  for (const message of messageList) {
    const fc = message?.functionCall;
    if (fc && fc.id === id) {
      // console.log('📦 查询到对应的functionCall: ', fc.args);
      fc["result"] = "✅";
      return fc.args?.query ?? fc.args?.agent_name;
    }
  }

  // 作为补偿，再在 eventMessageIndexArray 中查找（有时函数调用保存在这里）
  for (const item of eventMessageIndexArray) {
    const fc = item?.functionCall;
    if (fc && fc.id === id) {
      // console.log('📦 查询到对应的functionCall(从eventMessageIndexArray): ', fc.args);
      fc["result"] = "✅";
      return fc.args?.query ?? fc.args?.agent_name;
    }
  }

  // 未找到时返回 undefined
  return undefined;
}

/**
 * runSse: 发起 POST /run_sse 并作为 AsyncGenerator 返回每条 "data:" 行（字符串形式）。
 * 用法：
 *   const { runSse, isLoading } = useAgentService();
 *   for await (const chunk of runSse(req)) {
 *     // chunk 是服务端单个 data: 行中的 JSON 字符串
 *     const obj = JSON.parse(chunk);
 *     // 处理 obj ...
 *   }
 */

// export function useAgentService() {
//   const isLoading = ref(false);

//   /**
//    * runSse: 发起 POST /run_sse 并作为 AsyncGenerator 返回每条 "data:" 行（字符串形式）。
//    * 用法：
//    *   const { runSse, isLoading } = useAgentService();
//    *   for await (const chunk of runSse(req)) {
//    *     // chunk 是服务端单个 data: 行中的 JSON 字符串
//    *     const obj = JSON.parse(chunk);
//    *     // 处理 obj ...
//    *   }
//    */
//   async function* runSse(
//     req: AgentRunRequest
//   ): AsyncGenerator<string, void, void> {
//     const url = "http://172.19.196.165:8002/run_sse";
//     isLoading.value = true;

//     let response: Response | null = null;
//     try {
//       response = await fetch(url, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "text/event-stream"
//         },
//         body: JSON.stringify(req)
//       });

//       if (!response.ok || !response.body) {
//         throw new Error(
//           `SSE request failed: ${response.status} ${response.statusText}`
//         );
//       }

//       const reader = response.body.getReader();
//       const decoder = new TextDecoder("utf-8");
//       let lastData = "";

//       while (true) {
//         const { done, value } = await reader.read();
//         console.log("✔️ done", done);
//         if (done) break;

//         lastData += decoder.decode(value, { stream: true });

//         // 将完整的行拆分出来，最后一段可能是未完成的片段，保留到 lastData
//         const lines = lastData.split(/\r?\n/);
//         lastData = lines.pop() || "";

//         for (const line of lines) {
//           if (!line.trim()) continue;
//           if (!line.startsWith("data:")) continue;
//           const data = line.replace(/^data:\s*/, "");

//           // 校验是否为合法 JSON；若解析失败，认为可能是被拆分，拼回 lastData 并等待下一次
//           try {
//             JSON.parse(data);
//             yield data;
//           } catch (e) {
//             // 把当前行和剩余未完成内容合并，等待下个 chunk
//             console.log("e", e);
//             lastData = line + "\n" + lastData;
//           }
//         }
//       }

//       // 尝试处理剩余的 lastData（如果恰好以完整行结束）
//       if (lastData) {
//         const leftoverLines = lastData.split(/\r?\n/);
//         for (const line of leftoverLines) {
//           if (!line.trim()) continue;
//           if (!line.startsWith("data:")) continue;
//           const data = line.replace(/^data:\s*/, "");
//           try {
//             JSON.parse(data);
//             yield data;
//           } catch {
//             // 忽略不完整或无法解析的残余
//           }
//         }
//       }
//     } catch (err) {
//       // 将错误抛出到调用者
//       throw err;
//     } finally {
//       isLoading.value = false;
//       // 如果需要显式关闭 response.body reader，可在这里做清理
//       try {
//         if (response?.body) {
//           // @ts-ignore
//           const reader = response.body.getReader?.();
//           if (reader) {
//             await reader.cancel();
//           }
//         }
//       } catch {
//         // ignore
//       }
//     }
//   }

//   /**
//    * startSse: 更方便的回调方式，自动消费 generator，返回 stop 控制
//    * onData: 每次接收到 data 行（string）
//    * onError/onComplete 可选
//    */

//   return {
//     runSse,
//     isLoading
//   };
// }
export const getParentEventId = (child: HTMLElement) => {
  const messageBox = child.closest<HTMLElement>("[data-event-id]");
  return messageBox?.dataset.eventId ?? "";
};

export function startSse(
  req: AgentRunRequest,
  onData: (chunk: string) => void,
  onError?: (err: any) => void,
  onComplete?: () => void
) {
  const ctx = adkService.runSseGenerator(req);
  let stopped = false;

  (async () => {
    try {
      for await (const chunk of ctx.generator) {
        if (stopped) break;
        onData(chunk);
      }
      onComplete?.();
    } catch (e) {
      // AbortError 为正常 stop 情况，可根据需要忽略
      onError?.(e);
    }
  })();

  return {
    stop: () => {
      stopped = true;
      ctx.stop();
    },
    isLoading: ctx.isLoading
  };
}
export function processThoughtText(text: string) {
  return text.replace("/*PLANNING*/", "").replace("/*ACTION*/", "");
}
