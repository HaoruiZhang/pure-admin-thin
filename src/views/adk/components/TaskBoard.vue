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
    case "Running":
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
  const isTaskRunning = task.status === "running";

  // 程序完成
  if (pStatus === "DONE") {
    // 如果程序完成了，但整个任务还在运行，说明正在进行后续步骤（AI分析），给连线加流光效果
    if (isTaskRunning) return "active-success-running";
    return "active-success";
  }
  // 程序失败
  if (pStatus === "FAIL" || pStatus === "TIMEOUT") return "active-danger";
  // 程序运行中
  if (pStatus === "RUNNING" || pStatus === "Running") return "active-running";
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
            <div
              v-if="task.question"
              class="task-card-new"
              :class="`status-${task.status}`"
            >
              <!-- 1. 顶部区域：类型图标 + 名称 + 基础操作 -->
              <div class="card-top-row">
                <div class="task-identity">
                  <div class="icon-wrapper">
                    <el-icon :size="18">
                      <component
                        :is="task.type === 'script' ? Document : Cpu"
                      />
                    </el-icon>
                  </div>
                  <div class="name-col">
                    <span class="task-name" :title="task.name">{{
                      task.name
                    }}</span>
                    <span class="task-id" :title="task.id.toString()"
                      >#{{ task.id.toString() }}</span
                    >
                  </div>
                </div>
                <div class="top-actions">
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
                      class="action-btn"
                      @click.stop.prevent="jumpToChat(task)"
                      >跳转</el-button
                    >
                  </el-tooltip>
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
                      class="action-btn kill-btn"
                      @click.stop="killTask(task)"
                      >终止</el-button
                    >
                  </el-tooltip>
                </div>
              </div>

              <!-- 2. 中间区域：问题预览 -->
              <div class="question-box">
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
                  <div class="question-text">{{ task.question }}</div>
                </el-tooltip>
              </div>

              <!-- 3. 底部区域：状态流水线 -->
              <div class="status-pipeline">
                <!-- 节点1：程序运行 -->
                <div class="pipeline-node">
                  <div
                    class="node-icon-circle"
                    :class="getRawStatusColor(task.details.status)"
                  >
                    <el-icon><Monitor /></el-icon>
                  </div>
                  <div class="node-info">
                    <span class="node-label">程序运行</span>
                    <span
                      class="node-status"
                      :class="getRawStatusColor(task.details.status)"
                    >
                      {{ getRawStatusLabel(task.details.status) }}
                    </span>
                  </div>
                </div>

                <!-- 连接线 -->
                <div class="pipeline-line" :class="getLineClass(task)">
                  <div class="line-fill" />
                </div>

                <!-- 节点2：AI分析 -->
                <div class="pipeline-node">
                  <div
                    class="node-icon-circle"
                    :class="[
                      getRawStatusColor(task.details.status_ai),
                      {
                        'is-pending-running':
                          task.status === 'running' &&
                          !['DONE', 'FAIL', 'TIMEOUT', 'CANCEL'].includes(
                            task.details.status_ai
                          )
                      }
                    ]"
                  >
                    <el-icon
                      v-if="
                        task.details.status_ai === 'RUNNING' ||
                        task.details.status_ai === 'Running'
                      "
                      class="is-loading"
                    >
                      <Loading />
                    </el-icon>
                    <el-icon v-else><MagicStick /></el-icon>
                  </div>
                  <div class="node-info">
                    <span class="node-label">AI分析</span>
                    <span
                      class="node-status"
                      :class="getRawStatusColor(task.details.status_ai)"
                    >
                      {{ getRawStatusLabel(task.details.status_ai) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 4. 底部元信息栏 -->
              <div class="footer-meta-row">
                <span class="time-label">{{ formatDate(task.timestamp) }}</span>
                <el-popover placement="top" :width="300" trigger="click">
                  <template #reference>
                    <el-button link size="small" class="detail-btn"
                      >详情</el-button
                    >
                  </template>
                  <div class="task-details-popover">
                    <div class="detail-item">
                      <span class="label">Task ID:</span>
                      <span class="value">{{ task.id }}</span>
                    </div>
                    <div v-if="task.details.subtype" class="detail-item">
                      <span class="label">任务类型:</span>
                      <span class="value">{{ task.details.subtype }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">更新时间:</span>
                      <span class="value">{{
                        task.details.updated_at || "-"
                      }}</span>
                    </div>
                    <div v-if="task.details.filename" class="detail-item">
                      <span class="label">脚本文件:</span>
                      <span class="value">{{
                        task.details.filename || "-"
                      }}</span>
                    </div>
                    <div
                      v-if="task.details.subtype.startsWith('code')"
                      class="detail-actions"
                    >
                      <el-button
                        link
                        type="primary"
                        size="small"
                        @click.stop="viewTaskInfo(task)"
                      >
                        远程查看代码
                      </el-button>
                    </div>
                  </div>
                </el-popover>
              </div>
            </div>
          </template>
        </div>
      </el-scrollbar>
    </div>
  </el-drawer>
</template>

<style scoped lang="scss">


@keyframes pulse-border {
  0% {
    box-shadow: 0 0 0 0 var(--el-color-primary-light-5);
  }

  70% {
    box-shadow: 0 0 0 6px var(--el-color-primary-light-9);
  }

  100% {
    box-shadow: 0 0 0 0 var(--el-color-primary-light-9);
  }
}

@keyframes loading-line {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}

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

.task-card-new {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background-color: #fff;
  border-left: 4px solid transparent;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 5%);
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 16px 0 rgb(0 0 0 / 10%);
    transform: translateY(-2px);
  }

  &.status-success {
    border-left-color: var(--el-color-success);
  }

  &.status-running {
    background-color: var(--el-color-primary-light-9);
    border-left-color: var(--el-color-primary);
  }

  &.status-error {
    border-left-color: var(--el-color-danger);
  }

  &.status-canceled {
    border-left-color: var(--el-color-info);
  }

  /* 1. Top Row */
  .card-top-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    .task-identity {
      display: flex;
      gap: 10px;
      align-items: center;

      .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        color: var(--el-color-primary);
        background-color: var(--el-color-primary-light-9);
        border-radius: 8px;
      }

      .name-col {
        display: flex;
        flex-direction: column;
        line-height: 1.2;

        .task-name {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
          font-weight: 600;
          color: #303133;
          white-space: nowrap;
        }

        .task-id {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: monospace;
          font-size: 12px;
          color: #909399;
          white-space: nowrap;
        }
      }
    }

    .top-actions {
      display: flex;
      gap: 4px;

      .action-btn {
        padding: 4px;
        font-size: 14px;
        color: #909399;

        &.kill-btn {
          margin-left: 0;
        }

        &:hover {
          color: var(--el-color-primary);
          background-color: var(--el-fill-color-light);
        }

        &.kill-btn:hover {
          color: var(--el-color-danger);
        }
      }
    }
  }

  /* 2. Question Box */
  .question-box {
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.6;
    color: #555;
    background-color: #f8f9fa;
    border-radius: 8px;

    .question-text {
      display: -webkit-box;
      overflow: hidden;
      text-overflow: ellipsis;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }

  /* 3. Pipeline */
  .status-pipeline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    margin-bottom: 8px;

    .pipeline-node {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: center;

      .node-icon-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        font-size: 14px;
        color: #c0c4cc;
        background-color: #fff;
        border: 2px solid #e4e7ed;
        border-radius: 50%;
        transition: all 0.3s;

        &.success {
          color: #fff;
          background-color: var(--el-color-success);
          border-color: var(--el-color-success);
        }

        &.danger {
          color: #fff;
          background-color: var(--el-color-danger);
          border-color: var(--el-color-danger);
        }

        &.primary {
          color: var(--el-color-primary);
          border-color: var(--el-color-primary);

          /* 增强阴影可见度 */
          box-shadow: 0 0 0 4px var(--el-color-primary-light-8);
          animation: pulse-border 2s infinite;
        }

        .is-loading {
          animation: rotating 2s linear infinite;
        }
      }

      .is-pending-running {
        color: var(--el-color-primary);
        border-color: var(--el-color-primary-light-5);
        box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
        animation: pulse-border 2s infinite;
      }

      .node-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 1.2;

        .node-label {
          font-size: 12px;
          color: #909399;
        }

        .node-status {
          font-size: 12px;
          font-weight: 500;
          color: #c0c4cc;

          &.success {
            color: var(--el-color-success);
          }

          &.danger {
            color: var(--el-color-danger);
          }

          &.primary {
            color: var(--el-color-primary);
          }
        }
      }
    }

    .pipeline-line {
      position: relative;
      flex: 1;
      height: 2px;
      margin: 0 12px;
      margin-bottom: 34px; /* Align with circles center (28px circle + 6px gap + ~34px text block) -> center is 14px from top */
      background-color: #e4e7ed;

      .line-fill {
        width: 0;
        height: 100%;
        background-color: var(--el-color-success);
        transition: width 0.3s;
      }

      &.active-success .line-fill {
        width: 100%;
      }

      &.active-danger {
        background-color: var(--el-color-danger);
      }

      &.active-running {
        /* 使用更明显的渐变色 */
        background: linear-gradient(
          90deg,
          #e4e7ed 25%,
          var(--el-color-primary) 50%,
          #e4e7ed 75%
        );
        background-size: 200% 100%;
        animation: loading-line 1.5s infinite linear;

        /* 确保覆盖原背景 */
        .line-fill {
          display: none;
        }
      }

      &.active-success-running {
        /* 绿色基础，加流光 */
        background: linear-gradient(
          90deg,
          var(--el-color-success) 25%,
          #95d475 50%,
          var(--el-color-success) 75%
        );
        background-size: 200% 100%;
        animation: loading-line 1.5s infinite linear;

        .line-fill {
          display: none;
        }
      }
    }
  }

  /* 4. Footer Meta */
  .footer-meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px dashed #ebeef5;

    .time-label {
      font-size: 12px;
      color: #909399;
    }

    .detail-btn {
      font-size: 12px;
    }
  }
}

.task-details-popover {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .detail-item {
    display: flex;
    font-size: 12px;

    .label {
      width: 70px;
      color: #909399;
    }

    .value {
      flex: 1;
      color: #606266;
      word-break: break-all;
    }
  }

  .detail-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
}

/* Remove old styles if unused, or keep for compatibility if mixed */
.task-card {
  display: none; /* Hide old cards */
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
