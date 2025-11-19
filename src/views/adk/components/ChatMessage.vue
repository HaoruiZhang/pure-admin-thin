<script setup lang="ts">
import { onMounted, ref, nextTick, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { md } from "../utils/markdown";
import { onCopyDom, onRunDom } from "../utils";
import { useADKChatStore } from "@/store/modules/adk.store";
import mermaid from "mermaid";
const adkStore = useADKChatStore();
const { messageList, sendLoading, currentSession } = storeToRefs(adkStore);
defineOptions({
  name: "ADK-ChatMessage"
});

// refs
const messageRef = ref<any[]>([]);
// const messageList = ref<EventItem[]>([...sessionRes.events]);

const scrollRef = ref<any>(null);
const messageInnerRef = ref<HTMLElement | null>(null);

const isProgrammaticScroll = ref(true); // 判断是否代码控制滚动
const autoScrollDownDisabled = ref(false); // 为true时，禁止自动滚动

const COLLAPSE_THRESHOLD = 4000; // 字符阈值，超过则折叠
const COLLAPSE_PREVIEW_LENGTH = 1200; // 预览长度

const expandedMessageKeys = ref<Set<string>>(new Set());
const markdownCache = new Map<string, { text: string; html: string }>();

const getMessageKey = (item: any, index: number) => {
  if (item?.eventId) return String(item.eventId);
  if (item?.functionCall?.id) return `fn-call-${item.functionCall.id}`;
  if (item?.functionResponse?.id)
    return `fn-res-${item.functionResponse.id}-${index}`;
  if (item?.taskInfo?.eventId) return `task-${item.taskInfo.eventId}`;
  return `${item?.role || "message"}-${index}`;
};

const setExpandedMessageKeys = (
  updater: (prev: Set<string>) => Set<string>
) => {
  expandedMessageKeys.value = updater(expandedMessageKeys.value);
};

const cacheMarkdown = (key: string, text: string) => {
  if (!text) return "";
  const cached = markdownCache.get(key);
  if (cached && cached.text === text) {
    return cached.html;
  }
  const html = md.render(text);
  markdownCache.set(key, { text, html });
  // 在下一个 tick 初始化 mermaid
  nextTick(() => {
    initMermaid();
  });
  return html;
};

// 初始化 mermaid 图表
const initMermaid = async () => {
  // 确保在浏览器环境中运行
  if (typeof window === "undefined" || !mermaid) return;

  try {
    if (!messageInnerRef.value) return;

    // 查找所有未渲染的 mermaid 元素并渲染
    const mermaidElements = messageInnerRef.value.querySelectorAll(
      "pre.mermaid:not([data-processed])"
    );

    if (mermaidElements && mermaidElements.length > 0) {
      for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i] as HTMLElement;

        // 检查是否已经渲染过（包含 SVG 标签）
        if (element.querySelector("svg")) {
          element.setAttribute("data-processed", "true");
          continue;
        }

        const id = `mermaid-${Date.now()}-${i}`;
        element.setAttribute("data-processed", "true");

        // 优先从 data-code 属性获取原始代码，如果没有则从 textContent 获取
        let code =
          element.getAttribute("data-code") || element.textContent || "";

        // 如果从 data-code 获取，需要解码 HTML 实体
        if (element.getAttribute("data-code")) {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = code;
          code = tempDiv.textContent || tempDiv.innerText || code;
        }

        // 清理代码，移除可能的空白字符
        code = code.trim();

        if (!code) {
          continue;
        }

        try {
          if (mermaid.render) {
            const { svg } = await mermaid.render(id, code);
            element.innerHTML = svg;
          }
        } catch (error) {
          console.error("Mermaid render error:", error);
          // 如果渲染失败，移除 data-processed 标记以便重试
          element.removeAttribute("data-processed");
        }
      }
    }
  } catch (error) {
    console.error("Mermaid initialization error:", error);
  }
};

const shouldCollapseText = (text?: string) =>
  typeof text === "string" && text.length > COLLAPSE_THRESHOLD;

const isMessageCollapsed = (item: any, index: number) => {
  if (!shouldCollapseText(item?.text)) return false;
  const key = getMessageKey(item, index);
  return !expandedMessageKeys.value.has(key);
};

const toggleMessageCollapse = (item: any, index: number) => {
  const key = getMessageKey(item, index);
  setExpandedMessageKeys(prev => {
    const next = new Set(prev);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    return next;
  });
  if (!isMessageCollapsed(item, index)) {
    // 预渲染全文，避免展开瞬间卡顿
    cacheMarkdown(`full-${key}`, item?.text || "");
  }
};

const getCollapsedPreviewHtml = (item: any, index: number) => {
  const key = getMessageKey(item, index);
  const text = item?.text || "";
  const previewText =
    text.slice(0, COLLAPSE_PREVIEW_LENGTH) +
    (text.length > COLLAPSE_PREVIEW_LENGTH ? "..." : "");
  return cacheMarkdown(`preview-${key}`, previewText);
};

const getFullContentHtml = (item: any, index: number) => {
  const key = getMessageKey(item, index);
  return cacheMarkdown(`full-${key}`, item?.text || "");
};

const onScroll = ({ scrollTop }: { scrollTop: number }) => {
  if (isProgrammaticScroll.value) {
    // 延迟重置，避免事件同步问题
    autoScrollDownDisabled.value = false;
    setTimeout(() => {
      isProgrammaticScroll.value = false;
    }, 0);
  } else {
    if (sendLoading.value) return;
    const wrapEl = scrollRef.value?.wrapRef;
    if (!wrapEl || !messageInnerRef.value) return;
    const isAtBottom =
      wrapEl.scrollTop + wrapEl.clientHeight >= wrapEl.scrollHeight - 40; // 40px的容差
    autoScrollDownDisabled.value = !isAtBottom;
  }
};

const viewTaskInfo = (message: any) => {
  console.log(message);
  if (!message.taskInfo && !message.formConfig) return;
  window.parent.postMessage(
    {
      key: "showTaskInfo",
      type: "showTaskInfo",
      eventId: message.eventId,
      sessionId: currentSession.value.id
    },
    "*"
  );
};

onMounted(async () => {
  // 初始化 mermaid（仅在浏览器环境中）
  if (typeof window !== "undefined" && mermaid && mermaid.initialize) {
    try {
      mermaid.initialize({ startOnLoad: false, theme: "default" });
    } catch (error) {
      console.error("Mermaid initialize error:", error);
    }
  }

  // 抛出代码复制按钮点击事件到全局，方便html字符串添加点击事件
  (window as any).onCopyClick = (event: any) => {
    const dom = event.parentNode.parentNode.parentNode?.children[1];
    onCopyDom(dom);
  };
  (window as any).onRunClick = (event: any) => {
    const dom = event.parentNode.parentNode.parentNode?.children[1];
    onRunDom(dom);
  };

  adkStore.registerScrollRef(scrollRef);

  // 监听消息列表变化，初始化 mermaid
  watch(
    () => messageList.value,
    () => {
      nextTick(() => {
        initMermaid();
      });
    },
    { deep: true }
  );
});

onUnmounted(() => {
  (window as any).onCopyClick = null;
  (window as any).onRunClick = null;
});
</script>

<template>
  <div class="chat-message">
    <el-scrollbar
      ref="scrollRef"
      :class="['message-scrollbar', { 'show-stop': sendLoading }]"
      @scroll="onScroll"
      @mouseenter="autoScrollDownDisabled = true"
      @mouseleave="autoScrollDownDisabled = false"
    >
      <div ref="messageInnerRef" class="message-list-inner">
        <template
          v-for="(item, index) in messageList"
          :key="(item.eventId ?? 'user_') + index"
        >
          <div
            v-if="!(item.text && item.text.startsWith('<backend-reply-start>'))"
            :ref="
              el => (el ? (messageRef[index] = el) : delete messageRef[index])
            "
            :class="['message-box', { 'from-user': item.role === 'user' }]"
            :data-event-id="item.eventId ?? ''"
          >
            <div class="mat-col AI-mat">
              <el-button v-if="false && item.role !== 'user'"
                >StAgent
              </el-button>
            </div>
            <div
              :class="[
                'content-box',
                'dark:text-white!',
                {
                  'flex-width':
                    item.functionCall ||
                    item.functionResponse ||
                    item.formConfig ||
                    item.taskInfo,
                  'is-btn-link': item.taskInfo || item.formConfig
                }
              ]"
              @click="viewTaskInfo(item)"
            >
              <div v-if="item.functionCall">
                {{ item.functionCall?.name }}
              </div>
              <div v-if="item.functionResponse">
                {{ item.functionResponse?.name }}
              </div>
              <!-- <span style="white-space: pre-wrap">{{
                item.content.parts[0].text
              }}</span> -->
              <div
                v-if="item.text && !item.formConfig && !item.taskInfo"
                class="message-content"
              >
                <div
                  :class="[
                    'message-html',
                    { collapsed: isMessageCollapsed(item, index) }
                  ]"
                >
                  <div
                    v-if="isMessageCollapsed(item, index)"
                    class="message-html-inner"
                    v-html="getCollapsedPreviewHtml(item, index)"
                  />
                  <div
                    v-else
                    class="message-html-inner"
                    v-html="getFullContentHtml(item, index)"
                  />
                  <div
                    v-if="isMessageCollapsed(item, index)"
                    class="message-html-gradient"
                  />
                </div>
                <el-button
                  v-if="shouldCollapseText(item.text)"
                  class="collapse-btn"
                  link
                  type="primary"
                  @click="toggleMessageCollapse(item, index)"
                >
                  {{ isMessageCollapsed(item, index) ? "展开全部" : "收起" }}
                </el-button>
              </div>
              <div v-if="item.formConfig">Check form config</div>
              <div v-if="item.taskInfo">View task info</div>
            </div>
            <div class="mat-col user-mat">
              <el-button v-if="false && item.role === 'user'">User </el-button>
            </div>
          </div>
        </template>
        <div
          v-if="sendLoading"
          :ref="
            el =>
              el ? (messageRef['loading'] = el) : delete messageRef['loading']
          "
          class="message-box"
        >
          <div class="mat-col AI-mat">
            <el-button v-if="false">StAgent </el-button>
          </div>
          <div class="content-box">
            <span style="white-space: pre-wrap">loading</span>
            <span id="dot" />
          </div>
          <div class="mat-col user-mat" />
        </div>

        <!-- <div :class="['message-box', { 'from-user': item.role === 'user' }]">
          <template
            v-if="
              item.content.parts[0].text &&
              !item.content.parts[0].text.startsWith('<backend-reply-start>')
            "
          >
            <div class="mat-col AI-mat">
              <el-button v-if="item.role !== 'user'">StAgent </el-button>
            </div>
            <div class="content-box">
              <div v-if="item.content.parts[0].functionCall">
                {{ item.content.parts[0].functionCall?.name }}
              </div>
              <div v-if="item.content.parts[0].functionResponse">
                {{ item.content.parts[0].functionResponse?.name }}
              </div>
              <span
                v-if="
                  item.content.parts[0].text &&
                  !item.content.parts[0].text.startsWith(
                    '<backend-reply-start>'
                  )
                "
                style="white-space: pre-wrap"
                >{{ item.content.parts[0].text }}</span
              >
            </div>
            <div class="mat-col user-mat">
              <el-button v-if="item.role === 'user'">User </el-button>
            </div>
          </template>
        </div> -->
      </div>
    </el-scrollbar>
  </div>
</template>
<style scoped>
.chat-message {
  width: 100%;
  height: 100%;

  /* margin-top: 16px; */
  border-radius: 8px;

  .message-list-inner {
    .message-box {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      padding: 16px 12px;
      margin: 4px 0;

      &.from-user {
        justify-content: flex-end;

        .content-box {
          width: unset;

          /* max-width: calc(100% - 176px); */
          max-width: calc(100% - 196px);
        }
      }

      .mat-col {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 80px;
        min-height: 32px;

        button {
          width: 100%;
        }
      }

      .content-box {
        max-width: calc(100% - 196px);
        padding: 12px 16px;

        /* flex: 1; */

        /* width: 100%; */

        /* background-color: var(--el-bg-color-light); */
        font-family: Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;

        /* color: #25282c; */
        word-break: break-word;
        border-radius: 8px;
        box-shadow: rgb(199 199 199 / 50%) 0 2px 8px 0;

        &.flex-width {
          /* 暂时用不到 */
          width: unset;
          max-width: calc(100% - 196px);
        }

        &.is-btn-link {
          cursor: pointer;
        }

        &.is-btn-link:hover {
          color: var(--el-color-primary);
        }

        &.is-btn-link:active {
          color: var(--el-color-primary);
        }

        .message-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .message-html {
          position: relative;

          &.collapsed .message-html-inner {
            max-height: 420px;
            overflow: hidden;
          }
        }

        .message-html-inner {
          width: 100%;
          overflow-wrap: anywhere;
        }

        .message-html-gradient {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 72px;
          pointer-events: none;
          background: linear-gradient(
            180deg,
            rgb(255 255 255 / 0%) 0%,
            var(--el-bg-color) 100%
          );
        }

        .collapse-btn {
          align-self: flex-start;
          padding: 0;
        }
      }

      /* 代码块设置 */
      pre {
        /* margin-top: 24px; */
        position: relative;
        overflow-x: auto;
        word-break: break-all;
        word-wrap: normal;
        white-space: pre-wrap;

        /* margin: 0; */
        border-radius: 4px;
      }

      pre + pre {
        margin-top: 12px;
      }
    }
  }

  /* ol,
  ul,
  menu {
    padding: unset;
    margin: unset;
    list-style: unset;
  } */
}
</style>
<style scoped>
@keyframes dotting {
  25% {
    box-shadow: 4px 0 0 #333;
  }

  50% {
    box-shadow:
      4px 0 0 #333,
      9px 0 0 #333;
  }

  75% {
    box-shadow:
      4px 0 0 #333,
      9px 0 0 #333,
      14px 0 0 #333;
  }
}

@keyframes blinker {
  0% {
    visibility: visible;
  }

  50% {
    visibility: hidden;
  }

  100% {
    visibility: visible;
  }
}

:deep(*) {
  box-sizing: border-box;
}

:deep(#dot) {
  display: inline-block;
  width: 2px;
  height: 2px;
  margin-right: 10px;
  border-radius: 2px;
  animation: dotting 2s infinite step-start;
}

/* 闪烁光标 */
:deep(.typing::after) {
  content: "_";
  animation: blinker 1s step-end infinite;
}

.answer-text {
  pre {
    position: relative;
    margin: 0;
    overflow-x: auto;
    word-break: break-all;
    word-wrap: normal;
    white-space: pre-wrap;
    border-radius: 4px;
  }

  pre + pre {
    margin-top: 12px;
  }
}

/* .chat-preview {
  padding: 24px 0;
  flex: 1;
  display: flex;
  flex-direction: column;
} */

.header {
  padding: 0 30px 24px;

  .title {
    font-size: 16px;
    font-weight: bold;
  }

  .sub-title {
    margin-left: 8px;
    font-size: 12px;
    color: #939cab;
  }
}

:deep(.code-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 16px;
  color: #414855;
  background: #ebedf0;
  border-radius: 4px 4px 0 0;

  .code-action {
    display: flex;

    .code-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 24px;
      font-size: 14px;
      color: #939cab;
      cursor: pointer;
      user-select: none;

      &:hover {
        color: var(--el-color-primary);

        /* &::before {
        background: var(--el-color-primary);
      } */
      }

      /* &::before {
      display: block;
      width: 16px;
      height: 16px;
      margin-right: 4px;
      content: "";
      background: #939cab;
    } */
    }
  }
}

/* :deep(.hljs) {
  background: #f3f5f7;
  border-radius: 0 0 4px 4px;
} */

.message:not(:last-child) {
  margin-bottom: 16px;
}

/* .recommend {
  width: 100%;
}

.recommend,
.question {
  .message-box {
    padding: 16px;
  }
}
.answer {
  .message-box {
    position: relative;
    width: 100%;
    padding: 16px 0;
    margin-top: 22px;
    .bot-name {
      position: absolute;
      line-height: 22px;
      top: -26px;
      color: #939cab;
      white-space: nowrap;
    }
  }
}

.recommend,
.question,
.answer {
  display: flex;

  .message-box {
    border-radius: 4px;
    line-height: 1.5;
    margin-left: 8px;

    .answer-text {
      padding: 0 16px;

      :deep(& > *:first-child) {
        margin-top: 0;
      }

      :deep(& > *:last-child) {
        margin-bottom: 0;
      }

      :deep(p) {
        margin: 8px 0;
      }

      :deep(pre) {
        position: relative;
        word-wrap: normal;
        word-break: break-all;
        white-space: pre-wrap;
        overflow-x: auto;
        margin-top: 0;
        border-radius: 4px;
      }

      :deep(&.complete) {
        .typing::after {
          display: none;
        }
      }

      :deep(ol > li) {
        padding-left: 8px;
      }

      :deep(ol),
      :deep(ul) {
        padding-inline-start: 16px;
        & > li::marker {
          color: #bec4cd;
        }
      }
    }

    .answer-footer {
      padding: 8px 16px 0;
    }

    &.max-width {
      min-width: calc(100% - 48px);
    }
  }
}

.question {
  margin-bottom: 16px;
  .message-box {
    background: var(--el-color-primary-p2);
    border: 1px solid #ebedf0;
    position: relative;
    .question-copy {
      position: absolute;
      right: 16px;
      bottom: 20px;
    }

    .filters {
      color: #939cab;
    }
  }
}
.answer,
.recommend {
  .message-box {
    background: rgba(243, 245, 247, 0.3);
    border: 1px solid #ebedf0;

    .answer-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      color: #939cab;

      .action-bar {
        line-height: 16px;
      }

      .answer-pagination {
        display: flex;
        &.hidden {
          z-index: -1;
          opacity: 0;
        }
      }
    }
  }
}

.recommend {
  .message-box {
    width: calc(100% - 48px);
    .title {
      font-weight: bold;
      font-size: 20px;
    }

    .recommend-question {
      color: #939cab;
      font-weight: bold;
      display: flex;
      align-items: center;
      height: 20px;
      margin: 8px 0 4px;
      .svg-icon {
        margin-right: 4px;
        color: #939cab;
        cursor: auto;
      }
    }

    .sub-title {
      color: #939cab;
      margin: 8px 0 0;
    }
    .question-container {
      display: grid;
      justify-content: space-between;
      grid-template-columns: repeat(auto-fill, calc(50% - 4px));
      .question-item {
         background-repeat: no-repeat;
        background-position: center;
        background-size: cover;
        height: 78px;
        border-radius: 2px;
        margin-top: 8px;
        display: flex;
        align-items: center;
        cursor: not-allowed;

        &-text {
          height: 44px;
          line-height: 22px;
          overflow: hidden;
          margin: 0 17px;
        }
      }
    }
  }
}

.message-box .svg-icon {
  cursor: pointer;
  color: #939cab;
  &.active,
  &:hover {
    color: var(--el-color-primary);
  }
  &:not(:last-child) {
    margin-right: 16px;
  }
  &:last-child {
    margin-right: 0;
  }
  &.rotateX180 {
    transform: rotateX(180deg);
    -webkit-transform: rotateX(180deg);
  }
}

.avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #ebedf0 0%, #bec4cd 100%);
  border-radius: 50%;
  font-size: 20px;
  font-weight: bold;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
} */

.message-scrollbar {
  flex: 1;
  margin-bottom: 8px;

  /* .message-list-inner {
    padding: 0 70px;
  } */
}

/* .re-answer {
  margin: 16px auto 0;

  .svg-icon {
    margin-right: 4px;
  }
}

.bot-popper-content {
  display: flex;
  padding: 11px 5px;
  .bot-img,
  .bot-avatar {
    height: 40px;
    width: 40px;
    border-radius: 4px;
    margin-right: 16px;
  }

  .bot-avatar {
    background: linear-gradient(135deg, #ebedf0 0%, #bec4cd 100%);
    border-radius: 50%;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bot-des {
    line-height: 1;
    .name {
      font-size: 16px;
      margin-bottom: 10px;
      font-weight: 500;
    }
    .msg {
      color: #414855;
      font-size: 14px;
      font-weight: 400;
    }
  }
}

.bot-bubble-container {
  height: 32px;
  margin: 8px 70px 0;
  width: fit-content;
  position: relative;
  .bot-bubble {
    height: 24px;
    line-height: 24px;
    margin-bottom: 80px;
    font-size: 12px;
    width: fit-content;
    border-radius: 120px;
    border: none;
    padding: 0 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--el-color-primary);
    background: #effaf9;
    display: flex;
    align-items: center;

    img,
    .bot-avatar-small {
      height: 12px;
      width: 12px;
      border-radius: 1px;
      margin-right: 4px;
    }

    .bot-avatar-small {
      background: linear-gradient(135deg, #ebedf0 0%, #bec4cd 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      .svg-icon {
        margin-left: 0;
        &:hover {
          color: #fff;
        }
      }
    }
    &::before {
      position: absolute;
      left: 50%;
      top: 24px;
      transform: translateX(-50%);
      content: "";
      border-width: 5px 5px 0;
      border-style: solid;
      border-color: #effaf9 transparent transparent; /* 粉 透明 透明
      transition: var(--el-transition-all);
    }
  }
}

.reference {
  margin-top: 20px;
  min-width: 200px;
  .header {
    color: #939cab;
    display: flex;
    justify-content: space-between;
    padding: 0 16px 4px;
    .rotate-90 {
      transform: rotate(-90deg);
    }
    .title .el-button.is-link {
      font-size: 16px;
      color: #939cab;
      opacity: 1;
      &:hover {
        color: var(--el-color-primary);
      }
      .svg-icon {
        margin-right: 4px;
      }
    }
  }

  &-item {
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    &:not(:last-child) {
      border-bottom: 1px solid #ebedf0;
    }

    &:last-child {
      margin-bottom: -16px;
    }
    .svg-icon {
      opacity: 0;
    }
    .index {
      color: #bec4cd;
      margin-right: 14px;
    }

    &:hover {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-10);
      .svg-icon {
        opacity: 1;
      }
    }
    a {
      color: #232332;
      text-decoration: none;
      &:hover {
        color: var(--el-color-primary);
      }
    }
  }
}

.input-panel {
  margin: 0 70px;
  min-height: 98px;
  height: fit-content;
  border: 1px solid #ebedf0;
  border-radius: 4px;
  position: relative;
  transition: var(--el-transition-all);

  :deep(.el-textarea) {
    margin-bottom: 40px;
    --el-input-placeholder-color: #bec4cd;
  }

  .svg-icon {
    margin-right: 4px;
  }

  &.focus {
    border-color: var(--el-color-primary);
  }

  :deep(.el-textarea__inner) {
    box-shadow: none;
    padding: 16px 16px 0;
  }
  &-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin: 16px;
    background: transparent;

    .action-bar {
      display: flex;
      &-item {
        display: flex;
        align-items: center;
        color: var(--el-text-color-disabled);
        cursor: not-allowed;
        span {
          @media (max-width: 780px) {
            display: none;
          }
        }
      }
    }
  }
} */
</style>
