<script setup lang="ts">
import { onMounted, ref, nextTick, onUnmounted, watch } from "vue";
import mermaid from "mermaid";

import { storeToRefs } from "pinia";
import { ElMessage, ElLoading } from "element-plus";
import { taskService } from "@/api/adk.service";
import { Edit, Document, ArrowDown } from "@element-plus/icons-vue";
import { md } from "../utils/markdown";
import { onCopyDom, onRunDom } from "../utils";
import { useADKChatStore } from "@/store/modules/adk.store";
import { getMessageVisibility } from "@/views/adk/utils/adk-tool";
const adkStore = useADKChatStore();
const {
  messageList,
  sendLoading,
  currentSession,
  operatingFormEventId,
  operatingFormIndex,
  user_info,
  isDebugMode,
  loginInfo
} = storeToRefs(adkStore);
defineOptions({
  name: "ADK-ChatMessage"
});

// refs
const baseUrl = import.meta.env.VITE_TMPFILE_URL;
const showPreview = ref(false);
const srcList = ref<string[]>([]);
const messageRef = ref<any[]>([]);
// const messageList = ref<EventItem[]>([...sessionRes.events]);

const scrollRef = ref<any>(null);
const messageInnerRef = ref<HTMLElement | null>(null);

const COLLAPSE_THRESHOLD = 4000; // 字符阈值，超过则折叠
const COLLAPSE_PREVIEW_LENGTH = 1200; // 预览长度

const expandedMessageKeys = ref<Set<string>>(new Set());
const expandedFunctionCalls = ref<Set<string>>(new Set());
const markdownCache = new Map<string, { text: string; html: string }>();
const showDelayedLoading = ref(false);
const downloadingPdfPath = ref("");
let delayedLoadingTimer: ReturnType<typeof setTimeout> | null = null;

// 编辑相关状态
const editingMessageIndex = ref<number | null>(null);
const editingText = ref<string>("");
const originalText = ref<string>("");

// 开始编辑消息
const startEditMessage = (index: number, text: string) => {
  editingMessageIndex.value = index;
  editingText.value = text;
  originalText.value = text;
};

// 取消编辑
const cancelEditMessage = () => {
  editingMessageIndex.value = null;
  editingText.value = "";
  originalText.value = "";
};

// 确认编辑并重新发送
const confirmEditMessage = async (index: number) => {
  if (!editingText.value.trim()) return;

  // 保存编辑的文本
  const newText = editingText.value;
  try {
    const deleteRes: any = await taskService.deleteInvocation(
      user_info.value.user_id,
      currentSession.value.id,
      messageList.value[index].invocationId ??
        messageList.value[index + 1].invocationId
    );
    if (deleteRes && deleteRes.success) {
      // 删除该消息及其后的所有消息（因为 sendMessage 会添加新的用户消息）
      messageList.value.splice(index);

      // 设置用户输入
      adkStore.userInput = newText;

      // 重置编辑状态
      cancelEditMessage();

      // 重新发送消息
      await adkStore.sendMessage();
    } else {
      ElMessage.error(deleteRes.message);
    }
  } catch (error) {
    console.error(error);
    ElMessage.error(error);
  }
};

const getMessageKey = (item: any, index: number) => {
  if (item?.eventId) return String(item.eventId);
  if (item?.functionCall?.id) return `fn-call-${item.functionCall.id}`;
  if (item?.functionResponse?.id)
    return `fn-res-${item.functionResponse.id}-${index}`;
  if (item?.taskInfo?.eventId) return `task-${item.taskInfo.eventId}`;
  return `${item?.role || "message"}-${index}`;
};

// 检查 functionCall 是否有对应的 functionResponse
const hasFunctionResponse = (functionCallId: string) => {
  if (!functionCallId) return false;
  return messageList.value.some(
    msg => msg?.functionResponse?.id === functionCallId
  );
};

// 获取对应的 functionResponse
const getFunctionResponse = (functionCallId: string) => {
  if (!functionCallId) return null;
  const message = messageList.value.find(
    msg => msg?.functionResponse?.id === functionCallId
  );
  return message?.functionResponse || null;
};

// 切换 functionCall 的展开/折叠状态
const toggleFunctionCall = (functionCallId: string) => {
  if (!functionCallId) return;
  const next = new Set(expandedFunctionCalls.value);
  if (next.has(functionCallId)) {
    next.delete(functionCallId);
  } else {
    next.add(functionCallId);
  }
  expandedFunctionCalls.value = next;
};

// 检查 functionCall 是否展开
const isFunctionCallExpanded = (functionCallId: string) => {
  return expandedFunctionCalls.value.has(functionCallId);
};

// 获取 functionCall 的显示文本（优先显示查询内容或函数名）
const getFunctionCallDisplayText = (functionCall: any) => {
  const prefix = "查询";
  if (!functionCall) return "";
  // 优先显示查询内容
  if (functionCall.args?.query) {
    return prefix + functionCall.args.query;
  }
  // 其次显示 agent_name
  if (functionCall.args?.agent_name) {
    return prefix + functionCall.args.agent_name;
  }
  // 最后显示函数名
  return "调用" + functionCall.name || "调用函数";
};

// 获取 functionResponse 的显示内容
const getFunctionResponseDisplay = (functionResponse: any) => {
  if (!functionResponse) return "";
  // 如果有 response 对象，尝试提取有意义的内容
  if (functionResponse.response) {
    // 如果是字符串，直接返回
    if (typeof functionResponse.response === "string") {
      return functionResponse.response;
    }
    // 如果是对象，尝试提取常见字段
    if (typeof functionResponse.response === "object") {
      // 尝试提取 content、result、data 等常见字段
      return (
        functionResponse.response.content ||
        functionResponse.response.result ||
        functionResponse.response.data ||
        JSON.stringify(functionResponse.response, null, 2)
      );
    }
  }
  // 如果没有 response，显示函数名
  return functionResponse.name || "函数响应";
};

const isFunctionResponseStreaming = (functionCallId: string) => {
  const response = getFunctionResponse(functionCallId);
  if (!response) return false;
  const display = getFunctionResponseDisplay(response);
  if (display === null || display === undefined) return true;
  if (typeof display === "string") return display.trim().length === 0;
  return false;
};

const hasPendingFunctionCall = () =>
  messageList.value.some(
    message =>
      message?.functionCall?.id && !hasFunctionResponse(message.functionCall.id)
  );

const clearDelayedLoadingTimer = () => {
  if (!delayedLoadingTimer) return;
  clearTimeout(delayedLoadingTimer);
  delayedLoadingTimer = null;
};

const scheduleDelayedLoading = () => {
  clearDelayedLoadingTimer();
  showDelayedLoading.value = false;
  if (!sendLoading.value || hasPendingFunctionCall()) return;
  delayedLoadingTimer = setTimeout(() => {
    if (!sendLoading.value || hasPendingFunctionCall()) return;
    console.log("😈 执行scheduleDelayedLoading");
    showDelayedLoading.value = true;
  }, 1500);
};

const setExpandedMessageKeys = (
  updater: (prev: Set<string>) => Set<string>
) => {
  expandedMessageKeys.value = updater(expandedMessageKeys.value);
};

const forceDetailsOpen = (html: string) =>
  html.replace(/<details(?![^>]*\sopen\b)([^>]*)>/gi, "<details open$1>");

const cacheMarkdown = (key: string, text: string) => {
  if (!text) return "";
  const cached = markdownCache.get(key);
  if (cached && cached.text === text) {
    return cached.html;
  }
  const html = forceDetailsOpen(md.render(text));
  markdownCache.set(key, { text, html });
  // 在回复完成后再初始化 mermaid，避免流式过程中频繁解析
  if (!sendLoading.value) {
    nextTick(() => {
      initMermaid();
    });
  }
  return html;
};

// 初始化 mermaid 图表的缩放功能
const initMermaidZoom = (wrapper: HTMLElement) => {
  if (typeof window === "undefined") return;

  const svg = wrapper.querySelector("svg");
  if (!svg) return;

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;

  // 创建控制按钮容器
  const controls = document.createElement("div");
  controls.className = "mermaid-controls";

  // 更新光标状态
  const updateCursor = () => {
    if (scale > 1) {
      wrapper.style.cursor = isDragging ? "grabbing" : "grab";
      wrapper.classList.add("mermaid-zoomed");
    } else {
      wrapper.style.cursor = "default";
      wrapper.classList.remove("mermaid-zoomed");
    }
  };

  // 更新变换
  const updateTransform = () => {
    svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    svg.style.transformOrigin = "0 0";
    updateCursor();
  };

  // 放大按钮
  const zoomInBtn = document.createElement("button");
  zoomInBtn.className = "mermaid-zoom-btn";
  zoomInBtn.innerHTML = "+";
  zoomInBtn.title = "放大";
  zoomInBtn.onclick = e => {
    e.stopPropagation();
    e.preventDefault();
    scale = Math.min(scale * 1.2, 10);
    updateTransform();
  };

  // 缩小按钮
  const zoomOutBtn = document.createElement("button");
  zoomOutBtn.className = "mermaid-zoom-btn";
  zoomOutBtn.innerHTML = "−";
  zoomOutBtn.title = "缩小";
  zoomOutBtn.onclick = e => {
    e.stopPropagation();
    e.preventDefault();
    scale = Math.max(scale / 1.2, 0.25);
    updateTransform();
  };

  // 重置按钮
  const resetBtn = document.createElement("button");
  resetBtn.className = "mermaid-zoom-btn";
  resetBtn.innerHTML = "↻";
  resetBtn.title = "重置";
  resetBtn.onclick = e => {
    e.stopPropagation();
    e.preventDefault();
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  };

  controls.appendChild(zoomInBtn);
  controls.appendChild(zoomOutBtn);
  controls.appendChild(resetBtn);
  wrapper.appendChild(controls);

  // 鼠标滚轮缩放
  wrapper.addEventListener("wheel", e => {
    if (!e.ctrlKey && !e.metaKey) return; // 需要按住 Ctrl/Cmd
    e.preventDefault();
    e.stopPropagation();

    const rect = wrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldScale = scale;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.25, Math.min(scale * delta, 10));

    // 以鼠标位置为中心缩放
    const scaleChange = scale / oldScale;
    translateX = mouseX - (mouseX - translateX) * scaleChange;
    translateY = mouseY - (mouseY - translateY) * scaleChange;

    updateTransform();
  });

  // 双击重置
  wrapper.addEventListener("dblclick", e => {
    e.preventDefault();
    e.stopPropagation();
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  });

  // 鼠标拖拽平移
  wrapper.addEventListener("mousedown", e => {
    if (e.button !== 0) return; // 只处理左键
    if (scale <= 1) return; // 只有在放大时才允许拖拽

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startTranslateX = translateX;
    startTranslateY = translateY;
    updateCursor();
    e.preventDefault();
  });

  document.addEventListener("mousemove", e => {
    if (!isDragging) return;
    translateX = startTranslateX + (e.clientX - startX);
    translateY = startTranslateY + (e.clientY - startY);
    updateTransform();
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      updateCursor();
    }
  });

  // 设置初始样式
  wrapper.style.position = "relative";
  wrapper.style.overflow = "hidden";
  wrapper.style.cursor = "default";
  svg.style.transition = "transform 0.1s ease-out";
  updateCursor();
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
            // 包装 SVG 以支持缩放功能
            const wrapper = document.createElement("div");
            wrapper.className = "mermaid-wrapper";
            wrapper.innerHTML = svg;
            element.innerHTML = "";
            element.appendChild(wrapper);
            // 初始化缩放功能
            initMermaidZoom(wrapper);
          }
        } catch (error) {
          console.error("Mermaid render error:", error);
          // 渲染失败时标记为 error，避免重复渲染导致的错误刷屏
          element.setAttribute("data-processed", "error");
          element.classList.add("mermaid-error");
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
  if (adkStore.isProgrammaticScroll) {
    // 程序控制的滚动，重置自动滚动禁用状态
    adkStore.setAutoScrollDownDisabled(false);
  } else {
    // 用户手动滚动
    if (sendLoading.value) return;
    const wrapEl = scrollRef.value?.wrapRef;
    if (!wrapEl || !messageInnerRef.value) return;
    const isAtBottom =
      wrapEl.scrollTop + wrapEl.clientHeight >= wrapEl.scrollHeight - 40; // 40px的容差
    // 当用户不在底部时，禁止自动滚动
    adkStore.setAutoScrollDownDisabled(!isAtBottom);
  }
};

const handleClickMessage = (message: any, index: number) => {
  console.log("👻 点击消息: ", message);
  // if (!message.taskInfo && !message.formConfig) return;
  if (message.taskInfo) {
    window.parent.postMessage(
      {
        key: "showTaskInfo",
        type: "showTaskInfo",
        taskId: message.invocationId,
        sessionId: currentSession.value.id
      },
      "*"
    );
  } else if (message.formConfig) {
    operatingFormEventId.value = message.eventId;
    operatingFormIndex.value = index;
    window.parent.postMessage(
      {
        key: "userFormConfig",
        type: "userFormConfig",
        eventId: message.eventId,
        data: JSON.parse(JSON.stringify(message.userFormConfig)),
        sessionId: currentSession.value.id
      },
      "*"
    );
  } else if (message.pptInfo) {
    // window.parent.postMessage(
    //   {
    //     key: "viewPdf",
    //     type: "viewPdf",
    //     projectId: message.pptInfo.projectId,
    //     pdfPath: message.pptInfo.pdfPath,
    //     sessionId: currentSession.value.id
    //   },
    //   "*"
    // );

    const fileName = message.pptInfo.pdfPath.split("/").pop();
    const fileUrl = `${import.meta.env.VITE_TMPFILE_URL}/view_tmp/${fileName}`;
    window.open(fileUrl, "_blank");
  } else if (message.inlineData) {
    showPreview.value = true;
    srcList.value = [message.inlineData.data];
  }
};

const downloadPPT = async (pptInfo: any, type: "pdf" | "pptx" = "pdf") => {
  console.log("👻 下载PPT: ", pptInfo, type);
  const path = type === "pdf" ? pptInfo.pdfPath : pptInfo.pptxPath;
  if (!path) {
    ElMessage.warning(`暂无可用的 ${type.toUpperCase()} 文件`);
    return;
  }
  downloadingPdfPath.value = path;
  try {
    const fileNameFromPath = path.split("/").pop();
    const fileUrl = `${import.meta.env.VITE_TMPFILE_URL}/tmp/${fileNameFromPath}`;
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("下载请求失败");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileNameFromPath || `download.${type}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    ElMessage.success(`${type.toUpperCase()} 下载成功`);
  } catch (error) {
    console.error("下载文件失败:", error);
    ElMessage.error("下载文件失败");
  } finally {
    downloadingPdfPath.value = "";
  }
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

  // 监听消息列表变化，在回复完成后初始化 mermaid
  watch(
    [() => messageList.value, () => sendLoading.value],
    ([, loading]) => {
      if (loading) return;
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
  clearDelayedLoadingTimer();
});

watch(
  [() => messageList.value, () => sendLoading.value],
  () => {
    if (!sendLoading.value) {
      clearDelayedLoadingTimer();
      showDelayedLoading.value = false;
      return;
    }
    scheduleDelayedLoading();
  },
  { deep: true }
);
</script>

<template>
  <div class="chat-message">
    <el-image-viewer
      v-if="showPreview"
      :url-list="srcList"
      show-progress
      :initial-index="0"
      @close="showPreview = false"
    />
    <el-scrollbar
      ref="scrollRef"
      :class="['message-scrollbar', { 'show-stop': sendLoading }]"
      @scroll="onScroll"
      @mouseenter="adkStore.setAutoScrollDownDisabled(true)"
      @mouseleave="adkStore.setAutoScrollDownDisabled(false)"
    >
      <div ref="messageInnerRef" class="message-list-inner">
        <template
          v-for="(item, index) in messageList"
          :key="(item.eventId ?? 'user_') + index"
        >
          <div
            v-if="getMessageVisibility(item, adkStore)"
            :ref="
              el => (el ? (messageRef[index] = el) : delete messageRef[index])
            "
            :class="[
              'message-box',
              {
                'from-user': item.role === 'user',
                'function-call-message': item.functionCall
              }
            ]"
            :data-event-id="item.eventId ?? ''"
            :data-invocation-id="item.invocationId ?? ''"
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
                    item.formConfig ||
                    item.taskInfo ||
                    item.pptInfo,
                  'is-btn-link':
                    item.taskInfo || item.formConfig || item.pptInfo,
                  'has-function-call': item.functionCall,
                  'is-editing':
                    item.role === 'user' && editingMessageIndex === index
                }
              ]"
              @click="handleClickMessage(item, index)"
            >
              <!-- 调试信息 只展示给zhanghaorui和user -->
              <div
                v-if="
                  ['zhanghaorui', 'user'].includes(user_info.user_id) &&
                  isDebugMode
                "
                class="debugger-info"
                style="
                  padding: 4px;
                  font-size: 12px;
                  color: #999;
                  white-space: pre-wrap;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                "
              >
                eventId: {{ item.eventId }} <br />
                functionCall.id: {{ item.functionCall?.id }} <br />
                functionResponse.id: {{ item.functionResponse?.id }} <br />
                formConfig.id: {{ item.formConfig?.id }} <br />
                taskInfo.id: {{ item.taskInfo?.id }} <br />
                invocationId: {{ item.invocationId }}
              </div>
              <!-- functionCall 显示（包含 functionResponse） -->
              <div
                v-if="item.functionCall"
                :class="[
                  'function-call-wrapper',
                  {
                    loading: !hasFunctionResponse(item.functionCall.id),
                    'has-response': hasFunctionResponse(item.functionCall.id),
                    expanded: isFunctionCallExpanded(item.functionCall.id)
                  }
                ]"
                @click="
                  hasFunctionResponse(item.functionCall.id) &&
                  toggleFunctionCall(item.functionCall.id)
                "
              >
                <div class="function-call-content">
                  <span class="function-call-icon">{{
                    hasFunctionResponse(item.functionCall.id) ? "✓" : "🔍"
                  }}</span>
                  <span
                    class="function-call-text"
                    :class="{
                      typing: !hasFunctionResponse(item.functionCall.id)
                    }"
                  >
                    {{ getFunctionCallDisplayText(item.functionCall) }}
                  </span>
                  <span
                    v-if="!hasFunctionResponse(item.functionCall.id)"
                    class="function-call-loading"
                  >
                    <!-- <span class="loading-dot" /> -->
                  </span>
                  <span
                    v-if="
                      hasFunctionResponse(item.functionCall.id) &&
                      !isFunctionCallExpanded(item.functionCall.id)
                    "
                    class="function-call-expand-hint"
                  >
                    ▼
                  </span>
                  <span
                    v-if="
                      hasFunctionResponse(item.functionCall.id) &&
                      isFunctionCallExpanded(item.functionCall.id)
                    "
                    class="function-call-collapse-icon"
                  >
                    ▲
                  </span>
                </div>
                <!-- functionResponse 内容（折叠在 functionCall 中） -->
                <div
                  v-if="
                    hasFunctionResponse(item.functionCall.id) &&
                    isFunctionCallExpanded(item.functionCall.id)
                  "
                  class="function-response-content"
                >
                  <div
                    class="function-response-text"
                    :class="{
                      typing:
                        sendLoading &&
                        isFunctionResponseStreaming(item.functionCall.id)
                    }"
                  >
                    <pre
                      v-if="
                        typeof getFunctionResponseDisplay(
                          getFunctionResponse(item.functionCall.id)
                        ) === 'string'
                      "
                    >
                      {{
                        getFunctionResponseDisplay(
                          getFunctionResponse(item.functionCall.id)
                        )
                      }}
                    </pre>
                    <div v-else>
                      {{
                        getFunctionResponseDisplay(
                          getFunctionResponse(item.functionCall.id)
                        )
                      }}
                    </div>
                  </div>
                </div>
              </div>
              <!-- <span style="white-space: pre-wrap">{{
                item.content.parts[0].text
              }}</span> -->

              <!-- 消息内容 -->
              <div
                v-if="
                  item.text &&
                  !item.formConfig &&
                  !item.taskInfo &&
                  !item.pptInfo
                "
                class="message-content"
              >
                <!-- 用户消息编辑模式 -->
                <div
                  v-if="item.role === 'user' && editingMessageIndex === index"
                  class="edit-message-wrapper"
                >
                  <el-input
                    v-model="editingText"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 10 }"
                    class="edit-textarea"
                    placeholder="编辑消息..."
                    @keydown.enter.ctrl="confirmEditMessage(index)"
                  />
                  <div class="edit-actions">
                    <el-button size="small" @click="cancelEditMessage">
                      Cancel
                    </el-button>
                    <el-button
                      size="small"
                      type="primary"
                      :disabled="!editingText.trim()"
                      @click="confirmEditMessage(index)"
                    >
                      Send
                    </el-button>
                  </div>
                </div>
                <!-- 正常显示模式 -->
                <template v-else>
                  <div
                    :class="[
                      'message-html',
                      'message-md-content',
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
                  <div class="message-actions-row">
                    <el-button
                      v-if="shouldCollapseText(item.text)"
                      class="collapse-btn"
                      link
                      type="primary"
                      @click="toggleMessageCollapse(item, index)"
                    >
                      {{
                        isMessageCollapsed(item, index) ? "展开全部" : "收起"
                      }}
                    </el-button>
                    <!-- 用户消息编辑按钮 -->
                    <!-- <el-button
                      v-if="item.role === 'user' && !sendLoading"
                      class="edit-btn"
                      link
                      type="primary"
                      @click.stop="startEditMessage(index, item.text)"
                    >
                      <el-icon><Edit /></el-icon>
                      编辑
                    </el-button> -->
                  </div>
                </template>
              </div>

              <!--内联图片-->
              <div
                v-if="
                  item.inlineData &&
                  !item.formConfig &&
                  !item.taskInfo &&
                  !item.pptInfo
                "
                class="message-content"
              >
                <div
                  v-if="
                    ['image/png', 'image/svg+xml'].includes(
                      item.inlineData.mimeType
                    )
                  "
                  class="inline-data-content"
                >
                  <img :src="item.inlineData.data" />
                </div>
                <div v-else class="attachment">
                  <a :href="item.inlineData.data" download>{{
                    item.inlineData.displayName || item.inlineData.data
                  }}</a>
                </div>
              </div>

              <!-- 表单配置 -->
              <div v-if="item.formConfig">Check form config</div>
              <!-- 任务信息 -->
              <div v-if="item.taskInfo">View task info</div>
              <!-- PPT 信息 -->
              <div v-if="item.pptInfo" class="ppt-container">
                <!-- 缩略图样式 -->
                <div
                  v-if="item.pptInfo.thumbnailPath"
                  class="ppt-thumbnail-card"
                >
                  <div class="thumbnail-wrapper">
                    <el-image
                      :src="`${baseUrl}/tmp/${item.pptInfo.thumbnailPath.split('/').pop()}`"
                      fit="cover"
                      class="thumbnail-img"
                    />
                    <div class="thumbnail-overlay">
                      <span class="ppt-pages-badge">
                        {{ item.pptInfo.pagesCount }}页
                      </span>
                    </div>
                  </div>
                  <div class="ppt-thumbnail-footer">
                    <div class="ppt-title-row">
                      <el-icon class="ppt-type-icon"><Document /></el-icon>
                      <span class="ppt-title"
                        >演示文稿{{
                          item.pptInfo.pptxPath ? ".pptx" : ".pdf"
                        }}</span
                      >
                    </div>
                    <div class="ppt-actions">
                      <el-button
                        type="primary"
                        size="small"
                        link
                        @click.stop="handleClickMessage(item, index)"
                      >
                        预览
                      </el-button>
                      <el-divider direction="vertical" />
                      <el-button
                        v-if="item.pptInfo?.pdfPath"
                        type="primary"
                        size="small"
                        link
                        :loading="downloadingPdfPath === item.pptInfo.pdfPath"
                        @click.stop="downloadPPT(item.pptInfo, 'pdf')"
                      >
                        PDF
                      </el-button>
                      <el-divider direction="vertical" />
                      <el-button
                        v-if="item.pptInfo?.pptxPath"
                        type="primary"
                        size="small"
                        link
                        :loading="downloadingPdfPath === item.pptInfo.pptxPath"
                        @click.stop="downloadPPT(item.pptInfo, 'pptx')"
                      >
                        PPTX
                      </el-button>
                    </div>
                  </div>
                </div>

                <!-- 普通卡片样式 -->
                <div v-else class="ppt-info-card">
                  <div class="ppt-icon-wrapper">
                    <el-icon :size="32" color="#ff4d4f">
                      <Document />
                    </el-icon>
                  </div>
                  <div class="ppt-content">
                    <div class="ppt-header">
                      <span class="ppt-title"
                        >演示文稿{{
                          item.pptInfo.pptxPath ? ".pptx" : ".pdf"
                        }}</span
                      >
                      <span class="ppt-meta">
                        {{ item.pptInfo.pagesCount }} 页
                      </span>
                    </div>
                    <div class="ppt-actions">
                      <el-button
                        type="primary"
                        size="small"
                        link
                        @click.stop="handleClickMessage(item, index)"
                      >
                        预览
                      </el-button>
                      <el-divider direction="vertical" />
                      <el-button
                        v-if="item.pptInfo?.pdfPath"
                        type="primary"
                        size="small"
                        link
                        :loading="downloadingPdfPath === item.pptInfo.pdfPath"
                        @click.stop="downloadPPT(item.pptInfo, 'pdf')"
                      >
                        PDF
                      </el-button>
                      <el-divider direction="vertical" />
                      <el-button
                        v-if="item.pptInfo?.pptxPath"
                        type="primary"
                        size="small"
                        link
                        :loading="downloadingPdfPath === item.pptInfo.pptxPath"
                        @click.stop="downloadPPT(item.pptInfo, 'pptx')"
                      >
                        PPTX
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="message-actions-row-margin">
                <el-button
                  v-if="
                    item.role === 'user' &&
                    !sendLoading &&
                    editingMessageIndex !== index
                  "
                  class="edit-btn"
                  link
                  type="primary"
                  @click.stop="startEditMessage(index, item.text)"
                >
                  <el-icon>
                    <Edit />
                  </el-icon>
                </el-button>
              </div>
            </div>
            <div class="mat-col user-mat">
              <el-button v-if="false && item.role === 'user'">User </el-button>
            </div>
          </div>
        </template>
        <div
          v-if="showDelayedLoading"
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

  :deep(.highlight-message) {
    animation: highlight-pulse 2s ease-out;
  }

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

          &.is-editing {
            width: calc(100% - 196px);
          }
        }
      }

      &.function-call-message {
        padding: 0;
        background: transparent;
        box-shadow: none;

        .mat-col {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          min-height: 24px;
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
        position: relative;
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

        /* 当包含 functionCall 时，减少 padding 和去掉阴影 */
        &.has-function-call {
          padding: 0 8px;
          background: transparent;
          box-shadow: none;
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

        .message-md-content {
          :deep(p) {
            margin: 0 0 12px;

            &:last-child {
              margin-bottom: 0;
            }
          }

          :deep(ul),
          :deep(ol) {
            padding-left: 20px;
            margin: 10px 0;

            :deep(code) {
              color: #7d0301;
              background-color: #f4f4f4;
            }
          }
        }

        .message-actions-row-margin {
          position: absolute;
          right: 4px;
          bottom: -20px;

          .edit-btn {
            padding: 0;
            font-size: 14px;

            /* opacity: 0; */
            transition: opacity 0.2s;

            .el-icon {
              margin-right: 2px;
            }
          }
        }

        &:hover .edit-btn {
          opacity: 1;
        }

        .message-content {
          display: flex;
          flex-direction: column;
          gap: 8px;

          .inline-data-content:hover {
            cursor: pointer;
          }

          .message-actions-row {
            display: flex;
            gap: 12px;
            align-items: center;
          }

          .edit-btn {
            padding: 0;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.2s;

            .el-icon {
              margin-right: 2px;
            }
          }

          &:hover .edit-btn {
            opacity: 1;
          }

          .edit-message-wrapper {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;

            .edit-textarea {
              width: 100%;

              :deep(.el-textarea__inner) {
                font-family: inherit;
                font-size: 14px;
                line-height: 1.5;
                resize: none;
              }
            }

            .edit-actions {
              display: flex;
              gap: 8px;
              justify-content: flex-end;
            }
          }
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

        .ppt-container {
          width: 100%;
          max-width: 400px;
          margin: 8px 0;
        }

        .ppt-thumbnail-card {
          overflow: hidden;
          background-color: var(--el-fill-color-blank);
          border: 1px solid var(--el-border-color-light);
          border-radius: 12px;
          box-shadow: 0 4px 12px rgb(0 0 0 / 5%);
          transition: all 0.3s ease;

          &:hover {
            border-color: var(--el-color-primary-light-5);
            box-shadow: 0 6px 16px rgb(0 0 0 / 10%);
          }

          .thumbnail-wrapper {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
            background-color: #f5f7fa;

            .thumbnail-img {
              width: 100%;
              height: 100%;
            }

            .thumbnail-overlay {
              position: absolute;
              top: 12px;
              right: 12px;
            }

            .ppt-pages-badge {
              padding: 2px 8px;
              font-size: 12px;
              color: #fff;
              background: rgb(0 0 0 / 40%);
              border-radius: 4px;
              backdrop-filter: blur(4px);
            }
          }

          .ppt-thumbnail-footer {
            padding: 12px 16px;

            .ppt-title-row {
              display: flex;
              gap: 8px;
              align-items: center;
              margin-bottom: 8px;

              .ppt-type-icon {
                font-size: 16px;
                color: #ff4d4f;
              }

              .ppt-title {
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 14px;
                font-weight: 500;
                color: var(--el-text-color-primary);
                white-space: nowrap;
              }
            }

            .ppt-actions {
              display: flex;
              align-items: center;
              justify-content: flex-start;
            }
          }
        }

        .ppt-info-card {
          display: flex;
          gap: 16px;
          align-items: center;
          width: 320px;
          padding: 12px 16px;
          margin: 8px 0;
          background-color: var(--el-fill-color-blank);
          border: 1px solid var(--el-border-color-light);
          border-radius: 8px;
          transition: all 0.2s ease;

          &:hover {
            background-color: var(--el-fill-color-light);
            border-color: var(--el-color-primary-light-5);
          }

          .ppt-icon-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            background-color: #fff1f0;
            border-radius: 6px;
          }

          .ppt-content {
            display: flex;
            flex: 1;
            flex-direction: column;
            gap: 6px;
            min-width: 0;

            .ppt-header {
              display: flex;
              gap: 8px;
              align-items: baseline;
              justify-content: space-between;

              .ppt-title {
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 14px;
                font-weight: 500;
                color: var(--el-text-color-primary);
                white-space: nowrap;
              }

              .ppt-meta {
                flex-shrink: 0;
                font-size: 12px;
                color: var(--el-text-color-secondary);
                opacity: 0.7;
              }
            }

            .ppt-actions {
              display: flex;
              align-items: center;

              .el-button {
                padding: 0;
                font-size: 13px;
              }

              .el-divider--vertical {
                margin: 0 12px;
              }
            }
          }
        }

        /* functionCall 样式 - Cursor 风格，紧凑简洁 */
        .function-call-wrapper {
          display: flex;
          flex-direction: column;
          padding: 0;
          margin: 2px 0;
          background: transparent;
          border: none;
          border-radius: 0;
          transition: all 0.2s ease;

          &.has-response {
            cursor: pointer;

            &:hover {
              .function-call-content {
                background: var(--el-bg-color-page);
              }

              .function-call-expand-hint {
                opacity: 1;
              }
            }
          }

          &.loading {
            .function-call-text {
              opacity: 0.7;
            }
          }

          &.expanded {
            .function-call-content {
              background: var(--el-bg-color-page);
            }
          }

          .function-call-content {
            display: flex;
            gap: 6px;
            align-items: center;
            width: 100%;
            padding: 0 8px;
            border-radius: 4px;
            transition: background 0.2s ease;
          }

          .function-call-icon {
            flex-shrink: 0;
            font-size: 12px;
            line-height: 1;
            opacity: 0.6;

            .has-response & {
              color: var(--el-color-success);
              opacity: 0.8;
            }
          }

          .function-call-text {
            flex: 1;
            font-size: 12px;
            line-height: 1.4;
            color: var(--el-text-color-regular);
            word-break: break-word;
          }

          .function-call-loading {
            position: relative;
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            height: 4px;
            margin-left: 4px;
          }

          .function-call-expand-hint {
            margin-left: auto;
            font-size: 8px;
            color: var(--el-text-color-secondary);
            white-space: nowrap;
            opacity: 0.2;
            transition: opacity 0.2s;
          }

          .function-call-collapse-icon {
            margin-left: auto;
            font-size: 8px;
            line-height: 1;
            color: var(--el-text-color-secondary);
            opacity: 0.2;
            transition: transform 0.2s;
          }

          .loading-dot {
            position: relative;
            display: inline-block;
            width: 3px;
            height: 3px;
            background: var(--el-color-primary);
            border-radius: 50%;
            animation: function-call-pulse 1.4s ease-in-out infinite;

            &::before,
            &::after {
              position: absolute;
              top: 0;
              left: 0;
              display: inline-block;
              width: 3px;
              height: 3px;
              content: "";
              background: var(--el-color-primary);
              border-radius: 50%;
              animation: function-call-pulse 1.4s ease-in-out infinite;
            }

            &::before {
              left: -6px;
              animation-delay: -0.28s;
            }

            &::after {
              left: 6px;
              animation-delay: 0.28s;
            }
          }

          /* functionResponse 内容样式（折叠在 functionCall 中） */
          .function-response-content {
            padding: 8px 12px;
            padding-left: 20px;
            margin-top: 6px;
            background: var(--el-bg-color-page);
            border-left: 2px solid var(--el-border-color-lighter);
            border-radius: 0 4px 4px 0;
            animation: slide-down 0.2s ease-out;
          }

          .function-response-text {
            font-size: 12px;
            line-height: 1.5;
            color: var(--el-text-color-regular);
            word-break: break-word;
            white-space: pre-wrap;

            pre {
              padding: 0;
              margin: 0;
              font-family: inherit;
              font-size: inherit;
              line-height: inherit;
              word-wrap: break-word;
              white-space: pre-wrap;
              background: transparent;
              border: none;
            }
          }
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

      /* Mermaid 图表缩放样式 */
      :deep(.mermaid-wrapper) {
        position: relative;
        min-height: 100px;
        overflow: hidden;
        background: var(--el-bg-color-page);
        border-radius: 4px;

        svg {
          display: block;
          width: 100%;
          height: auto;
        }

        &.mermaid-zoomed {
          cursor: grab;

          &:active {
            cursor: grabbing;
          }
        }
      }

      :deep(.mermaid-controls) {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 10;
        display: flex;
        visibility: hidden;
        gap: 4px;
        padding: 4px;
        background: var(--el-bg-color);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
        opacity: 0;
        transition: opacity 0.2s;
      }

      :deep(.mermaid-wrapper:hover .mermaid-controls) {
        opacity: 1;
      }

      :deep(.mermaid-zoom-btn) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        margin: 0;
        font-size: 16px;
        line-height: 1;
        color: var(--el-text-color-primary);
        cursor: pointer;
        background: var(--el-bg-color);
        border: 1px solid var(--el-border-color);
        border-radius: 4px;
        transition: all 0.2s;

        &:hover {
          color: var(--el-color-primary);
          background: var(--el-color-primary-light-9);
          border-color: var(--el-color-primary);
        }

        &:active {
          transform: scale(0.95);
        }
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
@keyframes highlight-pulse {
  0% {
    background-color: transparent;
    box-shadow: 0 0 0 0 rgb(125 37 188 / 0%);
  }

  20% {
    background-color: rgb(125 37 188 / 15%);
    box-shadow: 0 0 15px 2px rgb(125 37 188 / 30%);
  }

  100% {
    background-color: transparent;
    box-shadow: 0 0 0 0 rgb(125 37 188 / 0%);
  }
}

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

@keyframes function-call-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slide-down {
  from {
    max-height: 0;
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    max-height: 1000px;
    opacity: 1;
    transform: translateY(0);
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

a:any-link {
  color: -webkit-link;
  text-decoration: underline;
  cursor: pointer;
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
  padding: 16px 12px;
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

.message-scrollbar {
  flex: 1;
  margin-bottom: 8px;
}
</style>
