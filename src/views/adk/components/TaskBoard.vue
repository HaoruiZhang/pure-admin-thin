<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useADKChatStore } from "@/store/modules/adk.store";
import { backendService } from "@/api/adk.service";
import {
  ElDrawer,
  ElCard,
  ElTag,
  ElIcon,
  ElScrollbar,
  ElCollapse,
  ElCollapseItem,
  ElEmpty
} from "element-plus";
import {
  VideoPlay,
  CircleCheck,
  Warning,
  Loading,
  Document,
  Cpu,
  Monitor
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
  id: string;
  type: "script" | "function";
  name: string;
  status: "pending" | "running" | "success" | "error";
  content: string;
  timestamp?: number;
  details?: any;
}

const taskList = ref<TaskItem[]>([]);
const loading = ref(false);

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
      status:
        item.status === "DONE"
          ? "success"
          : item.status === "FAILED"
            ? "error"
            : item.status === "RUNNING"
              ? "running"
              : "pending",
      content: item.filename || "",
      timestamp: item.created_at ? new Date(item.created_at).getTime() : 0,
      details: item
    }));
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    taskList.value = [];
  } finally {
    loading.value = false;
  }
};

watch(
  () => visible.value,
  val => {
    if (val) {
      fetchTasks();
    }
  },
  { immediate: true }
);

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
    pending: "等待中"
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
      eventId: task.id,
      sessionId: currentSession.value.id
    },
    "*"
  );
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
    :modal="false"
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
                      <el-button
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
                      <span>任务信息</span>
                    </div>
                  </template>
                  <div class="task-details">
                    <div class="detail-item">
                      <span class="label">Task ID:</span>
                      <span class="value">{{ task.id }}</span>
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
                    <div class="detail-item">
                      <span class="label">创建人:</span>
                      <span class="value">{{
                        task.details.creator || "-"
                      }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">Tag Name:</span>
                      <span class="value">{{
                        task.details.tagname || "-"
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
