import type { AdkSession } from "@/types";
import { $t } from "@/plugins/i18n";

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
    // console.log("diffInDays", diffInDays, daysRangeStart, daysRangeEnd);
    return (
      diffInDays >= daysRangeStart &&
      diffInDays < daysRangeEnd &&
      (session.id === currentSession.id ||
        Object.keys(session.state).length > 0)
    );
  });
}

export const getNewSession = (): AdkSession => {
  return {
    id: "0",
    appName: "agent",
    userId: localStorage?.getItem("stag:user_id") || "0",
    events: [],
    state: { title: $t("adkChat.pureNewChat") },
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
  if (startIndex === -1) return ""; // 未找到开始标记
  const contentStartIndex = startIndex + startTag.length;
  const endIndex = str.indexOf(endTag, contentStartIndex);
  if (endIndex === -1) return ""; // 未找到结束标记
  return str.substring(contentStartIndex, endIndex);
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
