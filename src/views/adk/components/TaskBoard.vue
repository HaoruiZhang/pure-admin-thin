<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useADKChatStore } from "@/store/modules/adk.store";
import { backendService } from "@/api/adk.service";
import {
  createPollingController,
  getTaskStatus,
  getMessageVisibility
} from "@/views/adk/utils";
import type { PollingController } from "@/views/adk/utils";
import {
  ElDrawer,
  ElCard,
  ElTag,
  ElIcon,
  ElScrollbar,
  ElCollapse,
  ElCollapseItem,
  ElEmpty,
  ElButton,
  ElMessage
} from "element-plus";
import {
  VideoPlay,
  CircleCheck,
  Warning,
  Loading,
  Document,
  Cpu,
  Monitor,
  Close,
  ChatDotRound,
  MagicStick
} from "@element-plus/icons-vue";
import { mdTaskBoard } from "../utils/markdown";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["update:modelValue"]);

const visible = computed({
  get: () => props.modelValue,
  set: val => emit("update:modelValue", val)
});

const adkStore = useADKChatStore();
const { currentSession, messageList } = storeToRefs(adkStore);

interface TaskItem {
  id: string | number;
  type: "script" | "function";
  name: string;
  status: "pending" | "running" | "success" | "error" | "canceled";
  content: string;
  timestamp?: number;
  details?: any;
  question?: string; // 关联的提问内容
  invocationId?: string; // 关联的调用ID
}

const taskList = ref<TaskItem[]>([]);
const loading = ref(false);
const taskPolling = ref<PollingController | null>(null);

// 检查是否有运行中的任务
const hasRunningTasks = (): boolean => {
  return taskList.value.some(task => task.status === "running");
};

// 查找任务对应的提问或代码块
const findQuestionForTask = (invocationId: string) => {
  if (!invocationId || !messageList.value) return "";

  // 找到该任务对应的消息索引（取倒数第二条匹配的）
  const matchedIndices: number[] = [];
  messageList.value.forEach((m, i) => {
    if (
      m.invocationId === invocationId &&
      m.role !== "user" &&
      m.text &&
      getMessageVisibility(m, adkStore) &&
      !m.taskInfo
    )
      matchedIndices.push(i);
  });
  return matchedIndices.length > 0
    ? messageList.value[matchedIndices[matchedIndices.length - 1]].text
    : "";
};

const fetchTasks = async () => {
  if (!currentSession.value?.id) return;
  loading.value = true;
  try {
    const res: any = await backendService.getTaskList({
      session: currentSession.value.id,
      token: adkStore.getToken()
    });

    const tasksData = res?.data?.tasks || [];

    taskList.value = tasksData.map((item: any) => {
      const invocationId = item.tagname || item.id;
      return {
        id: invocationId,
        type: item.subtype?.startsWith("code/") ? "script" : "function",
        name: item.filename ? item.filename.split("/").pop() : "Task",
        status: getTaskStatus(item),
        content: item.content || item.filename || "",
        timestamp: item.created_at ? new Date(item.created_at).getTime() : 0,
        details: item,
        invocationId: invocationId,
        question: findQuestionForTask(invocationId)
      };
    });

    // 如果面板打开且没有运行中的任务，停止轮询
    if (visible.value && !hasRunningTasks()) {
      stopTaskPolling();
    }
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    taskList.value = [];
  } finally {
    loading.value = false;
  }
};

const jumpToChat = (task: TaskItem) => {
  if (!task.invocationId) return;

  // 关闭任务面板
  visible.value = false;

  // 使用 store 中的新方法进行跳转
  adkStore.scrollToElement(String(task.invocationId));
};

// 启动任务轮询
const startTaskPolling = () => {
  if (!visible.value || !currentSession.value?.id) return;

  // 如果已经有轮询在运行，先停止
  stopTaskPolling();

  taskPolling.value = createPollingController({
    task: async () => {
      await fetchTasks();
    },
    interval: 20000, // 每3秒刷新一次
    immediate: false, // 不立即执行，因为已经在打开时执行了一次
    autoStart: true
  });
};

// 停止任务轮询
const stopTaskPolling = () => {
  if (taskPolling.value) {
    taskPolling.value.stop();
    taskPolling.value = null;
  }
};

watch(
  () => currentSession.value?.id,
  async id => {
    if (!id) return;

    // 切换 session 时，先静默检查是否有运行中的任务
    try {
      const res: any = await backendService.getTaskList({
        session: id,
        token: adkStore.getToken()
      });
      const tasksData = res?.data?.tasks || [];
      const hasRunning = tasksData.some(
        (item: any) => getTaskStatus(item) === "running"
      );

      if (hasRunning) {
        visible.value = true;
      }
    } catch (error) {
      console.error("Failed to check running tasks on session switch:", error);
    }
  }
);

watch(
  () => visible.value,
  val => {
    if (val) {
      // 面板打开时，先获取一次任务列表
      fetchTasks().then(() => {
        // 如果有运行中的任务，启动轮询
        if (hasRunningTasks()) {
          startTaskPolling();
        }
      });
    } else {
      // 面板关闭时，停止轮询
      stopTaskPolling();
    }
  },
  { immediate: true }
);

// 组件卸载时清理轮询
onBeforeUnmount(() => {
  stopTaskPolling();
});

const tasks = computed(() => taskList.value);

const getStatusColor = (status: string) => {
  switch (status) {
    case "success":
      return "success";
    case "error":
      return "danger";
    case "running":
      return "primary";
    default:
      return "info";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "success":
      return CircleCheck;
    case "error":
      return Warning;
    case "running":
      return Loading;
    default:
      return VideoPlay; // Pending
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    success: "已完成",
    error: "失败",
    running: "进行中",
    pending: "等待中",
    canceled: "已取消"
  };
  return map[status] || status;
};

// 原始状态映射（用于拆分展示程序运行和AI分析状态）
const getRawStatusColor = (status: string) => {
  switch (status) {
    case "DONE":
      return "success";
    case "FAIL":
    case "TIMEOUT":
      return "danger";
    case "RUNNING":
      return "primary";
    case "CANCEL":
      return "info";
    default:
      return "warning";
  }
};

// 连线状态映射
const getLineClass = (task: any) => {
  const pStatus = task.details.status;
  // 程序完成，连线变绿
  if (pStatus === "DONE") return "active-success";
  // 程序失败，连线变红（可选，或者保持灰）
  if (pStatus === "FAIL" || pStatus === "TIMEOUT") return "active-danger";
  return "";
};

const getRawStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    DONE: "完成",
    FAIL: "失败",
    RUNNING: "运行",
    CANCEL: "取消",
    TIMEOUT: "超时",
    PENDING: "等待"
  };
  return map[status] || status || "-";
};

// Formatting helpers
const formatContent = (content: string) => {
  if (!content) return "";
  // If it's a script block, strip backticks for cleaner view or keep them
  return content.length > 100 ? content.slice(0, 100) + "..." : content;
};

const formatDate = (timestamp?: number) => {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString();
};

const viewTaskInfo = (task: TaskItem) => {
  window.parent.postMessage(
    {
      key: "showTaskInfo",
      type: "showTaskInfo",
      taskId: task.id,
      sessionId: currentSession.value.id
    },
    "*"
  );
};

const killTask = async (task: TaskItem) => {
  if (!currentSession.value?.id) {
    ElMessage.error("会话ID不存在");
    return;
  }

  const pid = task.details?.process_id;
  if (!pid) {
    ElMessage.error("任务进程ID不存在");
    return;
  }

  try {
    await backendService.killTask({
      session: currentSession.value.id,
      pid: String(pid),
      tagname: task.details?.tagname,
      token: adkStore.getToken(),
      subtype: task.details?.subtype
    });
    ElMessage.success("任务已终止");
    // 刷新任务列表
    await fetchTasks();
  } catch (error: any) {
    console.error("Failed to kill task:", error);
    ElMessage.error(error?.message || "终止任务失败");
  }
};
</script>

<template>
  <el-drawer
    v-model="visible"
    title="任务看板"
    direction="rtl"
    size="520px"
    class="task-board-drawer"
    resizable
    :modal="true"
  >
    <div class="task-board-container">
      <div class="header-info">
        <p>Session ID: {{ currentSession.id }}</p>
        <p>Total Tasks: {{ tasks.length }}</p>
      </div>

      <el-scrollbar>
        <div v-if="tasks.length === 0" class="empty-state">
          <el-empty description="当前会话暂无任务" />
        </div>
        <div v-else class="task-list">
          <template
            v-for="(task, index) in tasks"
            :key="task.id + '_index_' + index"
          >
            <el-card
              v-if="task.question"
              class="task-card"
              shadow="hover"
              :class="`status-${task.status}`"
            >
              <template #header>
                <div class="card-header">
                  <div class="task-title">
                    <el-icon class="type-icon" :size="18">
                      <component
                        :is="task.type === 'script' ? Document : Cpu"
                      />
                    </el-icon>
                    <span class="name">{{ task.name }}</span>
                  </div>
                  <div class="status-actions">
                    <el-tooltip
                      content="跳转到对话"
                      placement="top"
                      :show-after="500"
                    >
                      <el-button
                        v-if="task.invocationId"
                        type="primary"
                        size="small"
                        :icon="ChatDotRound"
                        link
                        class="jump-btn"
                        @click.stop.prevent="jumpToChat(task)"
                      />
                    </el-tooltip>
                    <div class="status-stepper">
                      <!-- 节点1：程序 -->
                      <el-tooltip
                        :content="
                          '程序: ' + getRawStatusLabel(task.details.status)
                        "
                        placement="top"
                      >
                        <div
                          class="step-node"
                          :class="getRawStatusColor(task.details.status)"
                        >
                          <el-icon class="node-icon"><Monitor /></el-icon>
                          <div class="status-dot" />
                        </div>
                      </el-tooltip>

                      <!-- 连接线 -->
                      <div class="step-line" :class="getLineClass(task)">
                        <div class="line-inner" />
                      </div>

                      <!-- 节点2：AI -->
                      <el-tooltip
                        :content="
                          'AI: ' + getRawStatusLabel(task.details.status_ai)
                        "
                        placement="top"
                      >
                        <div
                          class="step-node"
                          :class="getRawStatusColor(task.details.status_ai)"
                        >
                          <el-icon class="node-icon"><MagicStick /></el-icon>
                          <el-icon
                            v-if="
                              task.details.status_ai &&
                              task.details.status_ai !== 'DONE' &&
                              task.details.status_ai !== 'FAIL' &&
                              task.details.status_ai !== 'CANCEL' &&
                              task.details.status_ai !== 'TIMEOUT'
                            "
                            class="is-loading"
                          >
                            <Loading />
                          </el-icon>
                          <div v-else class="status-dot" />
                        </div>
                      </el-tooltip>
                    </div>
                    <el-tooltip
                      content="终止任务"
                      placement="top"
                      :show-after="500"
                    >
                      <el-button
                        v-if="task.status === 'running'"
                        type="danger"
                        size="small"
                        :icon="Close"
                        link
                        class="kill-btn"
                        @click.stop="killTask(task)"
                      />
                    </el-tooltip>
                  </div>
                </div>
              </template>

              <div class="card-content">
                <div class="question-preview">
                  <el-tooltip
                    content="跳转到对话"
                    placement="top"
                    :show-after="500"
                  >
                    <el-icon><ChatDotRound /></el-icon>
                  </el-tooltip>
                  <el-tooltip
                    v-if="task.question"
                    effect="dark"
                    placement="left"
                    popper-class="task-question-tooltip"
                  >
                    <template #content>
                      <div
                        class="tooltip-md-content"
                        v-html="
                          mdTaskBoard
                            .render(task.question)
                            .replace(/<details([^>]*)>/gi, '<details open$1>')
                        "
                      />
                    </template>
                    <span class="question-text">{{ task.question }}</span>
                  </el-tooltip>
                </div>

                <div v-if="false" class="content-preview">
                  {{ formatContent(task.content) }}
                </div>
                <el-collapse class="detail-collapse">
                  <el-collapse-item name="1">
                    <template #title>
                      <div class="collapse-title-row">
                        <span>任务信息</span>
                        <el-button
                          v-if="task.details.subtype.startsWith('code')"
                          link
                          type="primary"
                          size="small"
                          class="task-info-btn"
                          @click.stop="viewTaskInfo(task)"
                        >
                          <el-icon style="margin-right: 4px"
                            ><Monitor />
                          </el-icon>
                          远程查看
                        </el-button>
                      </div>
                    </template>
                    <div class="task-details">
                      <div class="detail-item">
                        <span class="label">Task ID:</span>
                        <span class="value">{{ task.id }}</span>
                      </div>
                      <div v-if="task.details.subtype" class="detail-item">
                        <span class="label">任务类型:</span>
                        <span class="value">{{ task.details.subtype }}</span>
                      </div>
                      <div class="detail-item">
                        <span class="label">程序运行:</span>
                        <span class="value">{{ task.details.status }}</span>
                      </div>
                      <div class="detail-item">
                        <span class="label">AI分析:</span>
                        <span class="value">{{
                          task.details.status_ai || "-"
                        }}</span>
                      </div>

                      <div class="detail-item">
                        <span class="label">创建时间:</span>
                        <span class="value">{{
                          formatDate(task.timestamp)
                        }}</span>
                      </div>
                      <div class="detail-item">
                        <span class="label">更新时间:</span>
                        <span class="value">{{
                          task.details.updated_at || "-"
                        }}</span>
                      </div>
                      <div v-if="task.details.creator" class="detail-item">
                        <span class="label">创建人:</span>
                        <span class="value">{{
                          task.details.creator || "-"
                        }}</span>
                      </div>
                      <div v-if="task.details.filename" class="detail-item">
                        <span class="label">脚本文件:</span>
                        <span class="value">{{
                          task.details.filename || "-"
                        }}</span>
                      </div>
                    </div>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </el-card>
          </template>
        </div>
      </el-scrollbar>
    </div>
  </el-drawer>
</template>

<style scoped lang="scss">
.task-board-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f7fa;
}

.header-info {
  padding: 10px 20px;
  margin-bottom: 10px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;

  p {
    margin: 4px 0;
    font-size: 13px;
    color: #606266;
  }
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px 20px;
}

.task-card {
  border: none;
  border-left: 4px solid transparent;
  transition: all 0.3s;

  &.status-success {
    border-left-color: var(--el-color-success);
  }

  &.status-running {
    border-left-color: var(--el-color-primary);
  }

  &.status-error {
    border-left-color: var(--el-color-danger);
  }

  &.status-canceled {
    border-left-color: var(--el-color-info);
  }

  :deep(.el-card__header) {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  :deep(.el-card__body) {
    padding: 12px 16px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .task-title {
    display: flex;
    gap: 8px;
    align-items: center;
    font-weight: 600;
    color: #303133;

    .type-icon {
      color: #909399;
    }
  }

  .status-actions {
    display: flex;
    flex-shrink: 0; /* 防止被挤压 */
    gap: 2px;
    align-items: center;

    .status-stepper {
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 4px 8px;
      margin: 0 4px;
      background-color: #f7f9fc;
      border-radius: 16px; // 胶囊形状

      .step-node {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        color: #c0c4cc; // 默认灰色

        .node-icon {
          font-size: 16px;
        }

        .status-dot {
          position: absolute;
          right: -2px;
          bottom: -2px;
          width: 6px;
          height: 6px;
          background-color: #dcdfe6;
          border: 1px solid #fff;
          border-radius: 50%;
        }

        &.success {
          color: var(--el-color-success);

          .status-dot {
            background-color: var(--el-color-success);
          }
        }

        &.danger {
          color: var(--el-color-danger);

          .status-dot {
            background-color: var(--el-color-danger);
          }
        }

        &.primary,
        &.active-success {
          color: var(--el-color-primary);

          .status-dot {
            background-color: var(--el-color-primary);
          }
        }

        .is-loading {
          position: absolute;
          right: -4px;
          bottom: -4px;
          font-size: 10px;
          color: var(--el-color-primary);
        }
      }

      .step-line {
        position: relative;
        width: 24px;
        height: 2px;
        background-color: #e4e7ed;
        border-radius: 1px;

        &.active-success {
          background-color: var(--el-color-success);
        }

        &.active-danger {
          background-color: var(--el-color-danger);
        }

        &.active-primary {
          background-color: var(--el-color-primary);
        }
      }
    }

    .jump-btn,
    .kill-btn {
      font-size: 14px; /* 图标稍微大一点 */
    }
  }
}

.card-content {
  .question-preview {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 8px;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    background-color: var(--el-fill-color-light);
    border-radius: 4px;

    .el-icon {
      flex-shrink: 0;
      color: var(--el-color-primary);
      opacity: 0.7;
    }

    .question-text {
      display: -webkit-box;
      overflow: hidden;
      text-overflow: ellipsis;
      -webkit-line-clamp: 3;
      word-break: break-word;
      white-space: normal;
      -webkit-box-orient: vertical;
    }
  }

  .content-preview {
    display: -webkit-box;
    margin-bottom: 8px;
    overflow: hidden;
    -webkit-line-clamp: 2;
    font-size: 13px;
    line-height: 1.5;
    color: #606266;
    -webkit-box-orient: vertical;
  }
}

.detail-collapse {
  :deep(.el-collapse-item__header) {
    height: 32px;
    font-size: 12px;
    color: var(--el-color-primary);
    border: none;
  }

  :deep(.el-collapse-item__wrap) {
    background: transparent;
    border: none;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 0;
  }

  .collapse-title-row {
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding-right: 8px;

    .task-info-btn {
      font-size: 12px;
      // padding: 0 8px;
    }
  }
}

.code-block {
  max-height: 200px;
  padding: 8px;
  margin: 0;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
  color: #333;
  word-break: break-all;
  white-space: pre-wrap;
  background: #f4f4f5;
  border-radius: 4px;
}

.tooltip-md-content {
  max-width: 450px;
  max-height: 500px;
  padding: 4px;
  overflow-y: auto;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    "Helvetica Neue",
    Arial,
    sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #e1e1e1;

  :deep(p) {
    margin: 0 0 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(code) {
    padding: 2px 5px;
    margin: 0 2px;
    font-family: "Fira Code", monospace;
    font-size: 0.9em;
    color: #ff7875;
    background-color: rgb(255 255 255 / 10%);
    border-radius: 3px;
  }

  :deep(pre) {
    padding: 6px;
    // margin: 12px 0;
    overflow-x: auto;
    background-color: #1e1e1e;
    border: 1px solid #333;
    border-radius: 6px;

    code {
      padding: 0;
      margin: 0;
      color: #dcdcdc;
      background-color: transparent;
    }
  }

  :deep(.taskboard-code-wrapper) {
    position: relative;
    margin: 12px 0;

    pre {
      padding: 6px;
      margin: 0;
      overflow-x: auto;
      background-color: #1e1e1e !important;
      border: 1px solid #333 !important;
      border-radius: 6px;

      code {
        padding: 0;
        color: #dcdcdc !important;
        background-color: transparent !important;
      }
    }
  }

  :deep(details) {
    margin: 10px 0;
    border: 1px solid #444;
    border-radius: 6px;
    transition: all 0.3s ease;

    summary {
      padding: 8px 12px;
      font-weight: 500;
      color: #aaa;
      cursor: pointer;
      outline: none;
      list-style: none;
      background-color: rgb(255 255 255 / 5%);

      &::-webkit-details-marker {
        display: none;
      }

      &:hover {
        color: #ddd;
        background-color: rgb(255 255 255 / 8%);
      }

      &::before {
        display: inline-block;
        width: 12px;
        margin-right: 8px;
        content: "▶";
        transition: transform 0.2s;
      }
    }

    &[open] {
      summary {
        border-bottom: 1px solid #444;

        &::before {
          transform: rotate(90deg);
        }
      }

      .thought-content {
        padding: 12px;
        font-style: italic;
        color: #999;
        background-color: rgb(0 0 0 / 10%);
      }
    }
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 20px;
    margin: 10px 0;
  }

  :deep(blockquote) {
    padding-left: 12px;
    margin: 12px 0;
    color: #999;
    border-left: 4px solid #555;
  }
}

.task-details {
  padding: 8px;
  background-color: #f9fafc;
  border-radius: 4px;

  .detail-item {
    display: flex;
    margin-bottom: 6px;
    font-size: 12px;
    line-height: 1.5;

    &:last-child {
      margin-bottom: 0;
    }

    .label {
      flex-shrink: 0;
      width: 70px;
      color: #909399;
    }

    .value {
      flex: 1;
      color: #606266;
      word-break: break-all;
    }
  }
}
</style>
