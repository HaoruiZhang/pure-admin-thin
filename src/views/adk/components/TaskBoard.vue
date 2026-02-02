<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useADKChatStore } from "@/store/modules/adk.store";
import { backendService } from "@/api/adk.service";
import { createPollingController, getTaskStatus } from "@/views/adk/utils";
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
  Close
} from "@element-plus/icons-vue";

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
const { currentSession } = storeToRefs(adkStore);

interface TaskItem {
  id: string | number;
  type: "script" | "function";
  name: string;
  status: "pending" | "running" | "success" | "error" | "canceled";
  content: string;
  timestamp?: number;
  details?: any;
}

const taskList = ref<TaskItem[]>([]);
const loading = ref(false);
const taskPolling = ref<PollingController | null>(null);

// 检查是否有运行中的任务
const hasRunningTasks = (): boolean => {
  return taskList.value.some(task => task.status === "running");
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

    taskList.value = tasksData.map((item: any) => ({
      id: item.tagname || item.id,
      type: item.subtype?.startsWith("code/") ? "script" : "function",
      name: item.filename ? item.filename.split("/").pop() : "Task",
      status: getTaskStatus(item),
      content: item.content || item.filename || "",
      timestamp: item.created_at ? new Date(item.created_at).getTime() : 0,
      details: item
    }));

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

// 启动任务轮询
const startTaskPolling = () => {
  if (!visible.value || !currentSession.value?.id) return;

  // 如果已经有轮询在运行，先停止
  stopTaskPolling();

  taskPolling.value = createPollingController({
    task: async () => {
      await fetchTasks();
    },
    interval: 3000, // 每3秒刷新一次
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
          <el-card
            v-for="task in tasks"
            :key="task.id"
            class="task-card"
            shadow="hover"
            :class="`status-${task.status}`"
          >
            <template #header>
              <div class="card-header">
                <div class="task-title">
                  <el-icon class="type-icon" :size="18">
                    <component :is="task.type === 'script' ? Document : Cpu" />
                  </el-icon>
                  <span class="name">{{ task.name }}</span>
                </div>
                <div class="status-actions">
                  <el-tag
                    :type="getStatusColor(task.status)"
                    effect="light"
                    size="small"
                    class="status-tag"
                  >
                    {{ getStatusLabel(task.status) }}
                    <el-icon v-if="task.status === 'running'" class="is-loading"
                      ><Loading
                    /></el-icon>
                  </el-tag>
                  <el-button
                    v-if="task.status === 'running'"
                    type="danger"
                    size="small"
                    :icon="Close"
                    link
                    class="kill-btn"
                    @click.stop="killTask(task)"
                  >
                    终止
                  </el-button>
                </div>
              </div>
            </template>

            <div class="card-content">
              <div class="content-preview">
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
    gap: 8px;
    align-items: center;

    .kill-btn {
      padding: 0 4px;
      font-size: 12px;
    }
  }
}

.card-content {
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
