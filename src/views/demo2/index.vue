<template>
  <div class="stereo-container">
    <!-- 1. Left Navigation Strip -->
    <aside class="nav-strip">
      <div class="logo-area">
        <el-icon :size="24" color="#7957d5"><Platform /></el-icon>
      </div>
      <div class="nav-icons">
        <div class="nav-item">
          <el-icon><Box /></el-icon>
        </div>
        <div class="nav-item">
          <el-icon><Setting /></el-icon>
        </div>
        <div class="nav-item">
          <el-icon><VideoCamera /></el-icon>
        </div>
        <div class="nav-item active">
          <el-icon><Grid /></el-icon>
        </div>
        <div class="nav-item">
          <el-icon><Message /></el-icon>
        </div>
        <div class="nav-item">
          <el-icon><DataAnalysis /></el-icon>
        </div>
      </div>
      <div class="nav-footer">
        <div class="nav-item">
          <el-icon><Setting /></el-icon>
        </div>
      </div>
    </aside>

    <!-- 2. Sidebar List (Dynamic) -->
    <aside class="sidebar-list">
      <div class="sidebar-header">
        <div class="app-name">
          <span class="purple-text">✦</span> StereoMap Agent
        </div>
        <div class="resource-box">
          <el-button plain class="half-btn"
            ><el-icon><Grid /></el-icon> 资源库</el-button
          >
          <el-button plain class="half-btn active"
            ><el-icon><Headset /></el-icon> AI对话框</el-button
          >
        </div>
        <el-button
          class="new-chat-btn"
          color="#f3e8ff"
          text
          @click="createNewChat"
        >
          <el-icon class="mr-1"><Plus /></el-icon> 新建对话
        </el-button>
      </div>

      <div class="history-scroll">
        <!-- Dynamic Group: Today -->
        <div v-if="todayChats.length" class="time-group">
          <div class="group-title">今天</div>
          <div
            v-for="chat in todayChats"
            :key="chat.id"
            class="history-item"
            :class="{ active: activeId === chat.id }"
            @click="switchChat(chat.id)"
          >
            <div class="item-title">{{ chat.title }}</div>
            <div class="item-sub">{{ chat.subTitle }}</div>
          </div>
        </div>

        <!-- Dynamic Group: 7 Days -->
        <div v-if="weekChats.length" class="time-group">
          <div class="group-title">7天前</div>
          <div
            v-for="chat in weekChats"
            :key="chat.id"
            class="history-item"
            :class="{ active: activeId === chat.id }"
            @click="switchChat(chat.id)"
          >
            <div class="item-title">{{ chat.title }}</div>
            <div class="item-sub">{{ chat.subTitle }}</div>
          </div>
        </div>

        <!-- Dynamic Group: 30 Days -->
        <div v-if="monthChats.length" class="time-group">
          <div class="group-title">30天内</div>
          <div
            v-for="chat in monthChats"
            :key="chat.id"
            class="history-item"
            :class="{ active: activeId === chat.id }"
            @click="switchChat(chat.id)"
          >
            <div class="item-title">{{ chat.title }}</div>
            <div class="item-sub">{{ chat.subTitle }}</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 3. Main Chat Area (Dynamic) -->
    <main class="main-area">
      <!-- Header -->
      <header class="chat-header">
        <div class="header-title">StereoMap</div>
        <div class="window-controls">
          <el-icon><Minus /></el-icon>
          <el-icon><CopyDocument /></el-icon>
          <el-icon><Close /></el-icon>
        </div>
      </header>

      <!-- Chat Content -->
      <div class="chat-content">
        <!-- Static Intro (Always at top when no messages) -->
        <div v-if="currentChat.messages.length === 0" class="bot-intro">
          <div class="avatar-row">
            <el-avatar
              :size="50"
              src="https://cdn-icons-png.flaticon.com/512/616/616430.png"
            />
            <div class="intro-text">
              <h3>Hi~需要我帮你做什么？</h3>
              <span class="sub-text">StereoMap Agent</span>
            </div>
          </div>

          <div class="suggestion-chips">
            <div
              class="chip"
              @click="handleSuggestionClick('你能为我做什么？')"
            >
              你能为我做什么？
            </div>
            <div
              class="chip"
              @click="handleSuggestionClick('基于选择的Group对象执行差异分析')"
            >
              基于选择的Group对象执行差异分析
            </div>
            <div
              class="chip"
              @click="handleSuggestionClick('上传文档完成AI智能解析')"
            >
              上传文档完成AI智能解析
            </div>
            <div class="refresh-link" @click="refreshSuggestions">
              <el-icon><Refresh /></el-icon> 换一换
            </div>
          </div>
        </div>

        <!-- Dynamic Messages -->
        <div
          v-for="msg in currentChat.messages"
          :key="msg.id"
          class="message-row"
          :class="msg.role"
        >
          <!-- User Message Style -->
          <template v-if="msg.role === 'user'">
            <div class="bubble user-bubble">
              {{ msg.content }}
            </div>
            <div class="message-actions">
              <el-icon><CopyDocument /></el-icon>
              <el-icon><Edit /></el-icon>
              <el-tag
                size="small"
                effect="plain"
                round
                color="#f3e8ff"
                style="color: #7957d5; border: none"
              >
                <el-icon class="mr-1"><MagicStick /></el-icon> AI文本润色
              </el-tag>
            </div>
          </template>

          <!-- Assistant Message Style (Simple Bubble) -->
          <template v-else>
            <div class="bubble bot-bubble">
              {{ msg.content }}
            </div>
          </template>
        </div>

        <!-- Floating Action Button (if applicable) -->
        <div v-if="showWorkflowButton" class="floating-action">
          <div class="workflow-button">
            帮我生成一份{{ currentChat.title }}分析的标准工作流
          </div>
          <div class="workflow-actions">
            <el-icon><CopyDocument /></el-icon>
            <el-icon><Edit /></el-icon>
            <el-tag
              size="small"
              effect="plain"
              round
              color="#f3e8ff"
              style="color: #7957d5; border: none"
            >
              <el-icon class="mr-1"><MagicStick /></el-icon> AI文本润色
            </el-tag>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-wrapper">
        <div class="quick-actions">
          <div class="action-btn purple">
            <el-icon><Document /></el-icon> AI文档解析
          </div>
          <div class="action-btn purple">
            <el-icon><Picture /></el-icon> AI图片解析
          </div>
          <div class="action-btn purple">
            <el-icon><Reading /></el-icon> AI报告解读
          </div>
        </div>

        <div class="input-box">
          <el-input
            v-model="inputValue"
            type="textarea"
            :rows="4"
            resize="none"
            placeholder="Ask a question or make a request"
            class="custom-textarea"
            @keydown.enter.exact.prevent="handleSend"
          />
          <div class="input-footer">
            <div class="left-tools">
              <el-button link
                ><el-icon :size="18"><Plus /></el-icon
              ></el-button>
              <el-button link
                ><el-icon :size="18"><Box /></el-icon
              ></el-button>
              <el-tag size="small" color="#f3e8ff" class="polish-tag">
                <el-icon><MagicStick /></el-icon> AI文本润色
              </el-tag>
            </div>
            <div class="right-tools">
              <el-button
                type="primary"
                color="#a78bfa"
                circle
                @click="handleSend"
              >
                <el-icon color="white"><Position /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Platform,
  Box,
  Setting,
  VideoCamera,
  Grid,
  Message,
  DataAnalysis,
  Headset,
  Plus,
  Minus,
  CopyDocument,
  Close,
  Refresh,
  Edit,
  MagicStick,
  Document,
  Picture,
  Reading,
  Position
} from "@element-plus/icons-vue";
import { createPollingController } from "../adk/utils/polling";

// --- 1. Interfaces ---
interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
  subTitle: string;
  group: "today" | "7days" | "30days";
  messages: Message[];
}

// --- 2. Mock Data ---
const conversationList = ref<Conversation[]>([
  {
    id: 1,
    title: "你能帮助我做什么？",
    subTitle: "我想做SAW聚类分析",
    group: "today",
    messages: []
  },
  {
    id: 2,
    title: "我想做SAW聚类分析",
    subTitle: "关于SAW分析方法的讨论",
    group: "today",
    messages: [
      { id: 201, role: "user", content: "我想做SAW聚类分析" },
      {
        id: 202,
        role: "assistant",
        content:
          "SAW聚类分析是一种常用的数据分析方法，我可以帮您生成标准工作流。"
      }
    ]
  },
  {
    id: 3,
    title: "数据清洗方案",
    subTitle: "关于缺失值处理的讨论",
    group: "7days",
    messages: [
      { id: 301, role: "user", content: "这里有许多缺失值，怎么处理？" },
      {
        id: 302,
        role: "assistant",
        content: "常用的方法有均值填充、插值法或直接删除。"
      }
    ]
  },
  {
    id: 4,
    title: "Vue3 组件库选型",
    subTitle: "Element Plus vs Ant Design",
    group: "30days",
    messages: [{ id: 401, role: "user", content: "Vue3 用什么UI库比较好？" }]
  },
  {
    id: 5,
    title: "API 接口文档解析",
    subTitle: "Swagger json导入",
    group: "30days",
    messages: []
  }
]);

// --- 3. State Management ---
const activeId = ref(2); // Default to the second one (has messages)
const inputValue = ref("");

// --- 4. Computed Properties ---

// Grouping the sidebar list
const todayChats = computed(() =>
  conversationList.value.filter(c => c.group === "today")
);
const weekChats = computed(() =>
  conversationList.value.filter(c => c.group === "7days")
);
const monthChats = computed(() =>
  conversationList.value.filter(c => c.group === "30days")
);

// Find the currently selected chat object
const currentChat = computed(() => {
  return (
    conversationList.value.find(c => c.id === activeId.value) ||
    conversationList.value[0]
  );
});

// Show workflow button if current chat has specific content
const showWorkflowButton = computed(() => {
  return currentChat.value.messages.some(
    msg => msg.role === "user" && msg.content.includes("SAW")
  );
});

// --- 5. Actions ---
const switchChat = (id: number) => {
  activeId.value = id;
  console.log(`Switched to chat ID: ${id}`);
};

const createNewChat = () => {
  // Simple logic to simulate a new empty chat
  const newId = Math.max(...conversationList.value.map(c => c.id)) + 1;
  conversationList.value.unshift({
    id: newId,
    title: "新对话",
    subTitle: "New Conversation",
    group: "today",
    messages: []
  });
  activeId.value = newId;
};

const handleSuggestionClick = (text: string) => {
  if (!inputValue.value.trim()) {
    inputValue.value = text;
  }
};

const refreshSuggestions = () => {
  // This would typically fetch new suggestions from API
  console.log("Refreshing suggestions...");
};

const handleSend = () => {
  if (!inputValue.value.trim()) return;

  const newMessageId = Date.now();
  const userMessage: Message = {
    id: newMessageId,
    role: "user",
    content: inputValue.value.trim()
  };

  // Add user message to current chat
  const chat = conversationList.value.find(c => c.id === activeId.value);
  if (chat) {
    chat.messages.push(userMessage);
    // Update title if it's a new conversation
    if (chat.title === "新对话") {
      chat.title = inputValue.value.trim().substring(0, 20);
    }
  }

  // Clear input
  inputValue.value = "";

  // Initial AI Message
  const aiMessage: Message = {
    id: newMessageId + 1,
    role: "assistant",
    content: "正在提交请求..."
  };
  if (chat) {
    chat.messages.push(aiMessage);
  }

  // Simulate polling logic
  let pollCount = 0;
  const maxPolls = 4; // Simulate success after 4 polls

  const pollingController = createPollingController({
    interval: 1500, // Poll every 1.5 seconds
    task: async () => {
      pollCount++;
      console.log(`Polling attempt ${pollCount}...`);

      // Update the AI message to show progress
      const targetMsg = chat?.messages.find(m => m.id === aiMessage.id);
      if (targetMsg) {
        targetMsg.content = `正在处理中... (已轮询 ${pollCount} 次)`;
      }

      // Simulate API completion
      if (pollCount >= maxPolls) {
        pollingController.stop();
        if (targetMsg) {
          targetMsg.content = `处理完成！\n\n这是第 ${pollCount} 次轮询后获取到的结果。\n针对您的问题："${userMessage.content}"，系统已生成详细报告。`;
        }
      }
    }
  });

  pollingController.start();
};
</script>

<style lang="scss" scoped>
/* Basic Reset & Layout */
.stereo-container {
  display: flex;
  width: 100%;
  height: 100vh;
  font-family:
    "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", Arial, sans-serif;
  color: #333;
  background-color: #f5f7fa;
}

/* 1. Nav Strip */
.nav-strip {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  width: 60px;
  padding-top: 20px;
  padding-bottom: 20px;
  background-color: #fff;
  border-right: 1px solid #eee;

  .logo-area {
    margin-bottom: 30px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-bottom: 15px;
    color: #909399;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      color: #7957d5;
      background-color: #f3e8ff;
    }

    &.active {
      color: #fff;
      background-color: #7957d5;
      box-shadow: 0 4px 6px rgb(0 0 0 / 10%);
    }
  }

  .nav-footer {
    margin-top: auto;
  }
}

/* 2. Sidebar List */
.sidebar-list {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 260px;
  padding: 20px;
  background-color: #fbfbfc;
  border-right: 1px solid #eee;

  .sidebar-header {
    .app-name {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      font-size: 16px;
      font-weight: bold;

      .purple-text {
        margin-right: 8px;
        font-size: 18px;
        color: #7957d5;
      }
    }

    .resource-box {
      display: flex;
      gap: 8px;
      margin-bottom: 15px;

      .half-btn {
        flex: 1;
        padding: 8px 0;
        font-size: 12px;

        &.active {
          color: #7957d5;
          background-color: #f3e8ff;
          border-color: #7957d5;
        }
      }
    }

    .new-chat-btn {
      justify-content: flex-start;
      width: 100%;
      height: 40px;
      padding-left: 15px;
      font-weight: 600;
      color: #7957d5;
      background-color: #f8f5ff;
      border-radius: 8px;
    }
  }

  .history-scroll {
    flex: 1;
    margin-top: 20px;
    overflow-y: auto;

    .time-group {
      margin-bottom: 25px;

      .group-title {
        margin-bottom: 10px;
        font-size: 12px;
        color: #999;
      }

      .history-item {
        padding: 10px;
        margin-bottom: 5px;
        font-size: 14px;
        color: #606266;
        cursor: pointer;
        border-radius: 8px;
        transition: background 0.2s;

        &.active {
          color: #333;
          background-color: #e8e8e8;
        }

        &:hover:not(.active) {
          background-color: #f0f0f0;
        }

        .item-title {
          margin-bottom: 4px;
          font-weight: 500;
        }

        .item-sub {
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12px;
          color: #999;
          white-space: nowrap;
        }
      }
    }
  }
}

/* 3. Main Area */
.main-area {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  background-color: #fff;

  .chat-header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 50px;
    font-weight: 600;
    color: #444;
    border-bottom: 1px solid #f0f0f0;

    .window-controls {
      position: absolute;
      right: 20px;
      display: flex;
      gap: 15px;
      color: #999;
      cursor: pointer;
    }
  }

  .chat-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    padding: 40px;
    overflow-y: auto;
  }
}

/* Chat Elements */
.bot-intro {
  margin-bottom: 40px;

  .avatar-row {
    display: flex;
    gap: 15px;
    align-items: center;
    margin-bottom: 20px;

    .intro-text h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }

    .sub-text {
      font-size: 12px;
      color: #999;
    }
  }

  .suggestion-chips {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;

    .chip {
      padding: 8px 16px;
      font-size: 14px;
      color: #555;
      cursor: pointer;
      background-color: #f2f3f5;
      border-radius: 6px;
      transition: background 0.2s;

      &:hover {
        background-color: #e6e8eb;
      }
    }

    .refresh-link {
      display: flex;
      gap: 4px;
      align-items: center;
      margin-top: 5px;
      font-size: 12px;
      color: #999;
      cursor: pointer;
    }
  }
}

.message-row {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 20px;

  &.user {
    align-items: flex-end;

    .bubble {
      max-width: 70%;
      padding: 12px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: white;
      background-color: #4f5a70;
      border-radius: 12px 2px 12px 12px;
    }

    .message-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 8px;
      font-size: 14px;
      color: #999;
      cursor: pointer;
    }
  }

  &.assistant {
    align-items: flex-start;

    .bot-bubble {
      max-width: 70%;
      padding: 12px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      background-color: #f4f4f5;
      border-radius: 2px 12px 12px;
    }
  }
}

/* Floating Action Button */
.floating-action {
  position: absolute;
  top: 50%;
  right: 40px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
  transform: translateY(-50%);

  .workflow-button {
    padding: 12px 20px;
    font-size: 14px;
    color: white;
    cursor: pointer;
    background-color: #1e3a8a;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
    transition: all 0.2s;

    &:hover {
      background-color: #1e40af;
      box-shadow: 0 6px 16px rgb(0 0 0 / 20%);
    }
  }

  .workflow-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 14px;
    color: #999;
    cursor: pointer;
  }
}

/* Input Wrapper */
.input-wrapper {
  padding: 20px 40px 40px;
  background-color: #fff;

  .quick-actions {
    display: flex;
    gap: 15px;
    margin-bottom: 10px;

    .action-btn {
      display: flex;
      gap: 6px;
      align-items: center;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      color: #8b5cf6;
      cursor: pointer;
      background-color: #f9f5ff;
      border-radius: 6px;

      &.purple {
        color: #8b5cf6;
        background-color: #f9f5ff;
      }

      &:hover {
        background-color: #f3e8ff;
      }
    }
  }

  .input-box {
    position: relative;
    padding: 10px;
    border: 1px solid #e4e7ed;
    border-radius: 12px;
    box-shadow: 0 2px 12px 0 rgb(0 0 0 / 5%);

    :deep(.el-textarea__inner) {
      padding: 10px;
      font-size: 14px;
      border: none;
      box-shadow: none;

      &::placeholder {
        color: #c0c4cc;
      }
    }

    .input-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      margin-top: 5px;

      .left-tools {
        display: flex;
        gap: 5px;
        align-items: center;

        .polish-tag {
          display: flex;
          gap: 4px;
          align-items: center;
          color: #7957d5;
          cursor: pointer;
          border: none;
        }
      }
    }
  }
}

/* Utility */
.mr-1 {
  margin-right: 4px;
}
</style>
