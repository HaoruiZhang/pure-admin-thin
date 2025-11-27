<template>
  <div class="stereo-container">
    <!-- 1. 左侧导航条 -->
    <aside class="nav-strip">
      <div class="logo-area">
        <el-icon :size="24" color="#7957d5"><Platform /></el-icon>
      </div>
      <div class="nav-icons">
        <div class="nav-item active">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <div class="nav-item">
          <el-icon><Folder /></el-icon>
        </div>
        <div class="nav-item">
          <el-icon><Files /></el-icon>
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

    <!-- 2. 侧边栏列表 -->
    <aside class="sidebar-list">
      <div class="sidebar-header">
        <div class="app-name">
          <span class="purple-star">✦</span> StereoMap Agent
          <div class="header-actions">
            <el-icon class="action-icon"><FullScreen /></el-icon>
            <el-icon class="action-icon"><Close /></el-icon>
          </div>
        </div>
        <div class="resource-box">
          <el-button
            :class="['half-btn', { active: activeTab === 'resource' }]"
            @click="activeTab = 'resource'"
          >
            <el-icon><Grid /></el-icon> 资源库
          </el-button>
          <el-button
            :class="['half-btn', { active: activeTab === 'chat' }]"
            @click="activeTab = 'chat'"
          >
            <el-icon><Headset /></el-icon> AI对话框
          </el-button>
        </div>
        <el-button class="new-chat-btn" @click="createNewChat">
          <el-icon class="mr-1"><CirclePlus /></el-icon> 新建对话
        </el-button>
      </div>

      <div class="history-scroll">
        <div class="section-title">
          <span>对话</span>
          <el-icon class="expand-icon"><ArrowUp /></el-icon>
        </div>

        <!-- 今天 -->
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
            <div v-if="chat.subTitle" class="item-sub">{{ chat.subTitle }}</div>
          </div>
        </div>

        <!-- 7天前 -->
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
          </div>
        </div>

        <!-- 30天内 -->
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
          </div>
        </div>
      </div>
    </aside>

    <!-- 3. 主聊天区域 -->
    <main class="main-area">
      <!-- 顶部标题栏 -->
      <header class="chat-header">
        <div class="header-title">StereoMap</div>
        <div class="window-controls">
          <el-icon><Minus /></el-icon>
          <el-icon><CopyDocument /></el-icon>
          <el-icon><Close /></el-icon>
        </div>
      </header>

      <!-- 聊天内容区域 -->
      <div class="chat-content">
        <!-- AI 问候语 -->
        <div class="bot-intro">
          <div class="avatar-row">
            <el-avatar :size="50" class="owl-avatar">
              <img
                src="https://cdn-icons-png.flaticon.com/512/616/616430.png"
                alt="owl"
              />
            </el-avatar>
            <div class="intro-text">
              <h3>Hi～需要我帮你做什么？</h3>
              <span class="sub-text">StereoMap Agent</span>
            </div>
          </div>

          <div class="suggestion-chips">
            <div class="chip" @click="handleSuggestion('你能为我做什么？')">
              你能为我做什么？
            </div>
            <div
              class="chip"
              @click="handleSuggestion('基于选择的Group对象执行差异分析')"
            >
              基于选择的Group对象执行差异分析
            </div>
            <div
              class="chip"
              @click="handleSuggestion('上传文档完成AI智能解析')"
            >
              上传文档完成AI智能解析
            </div>
            <div class="refresh-link">
              <el-icon><Refresh /></el-icon> 换一换
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div
          v-for="msg in currentChat.messages"
          :key="msg.id"
          class="message-row"
          :class="msg.role"
        >
          <!-- 用户消息 -->
          <template v-if="msg.role === 'user'">
            <div class="bubble user-bubble">
              {{ msg.content }}
            </div>
            <div class="message-actions">
              <el-icon><CopyDocument /></el-icon>
              <el-icon><Edit /></el-icon>
              <el-tag size="small" effect="plain" round class="ai-polish-tag">
                <el-icon class="mr-1"><MagicStick /></el-icon> AI文本润色
              </el-tag>
            </div>
          </template>

          <!-- AI 回复 -->
          <template v-else>
            <div class="bubble bot-bubble">
              {{ msg.content }}
            </div>
          </template>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-wrapper">
        <div class="quick-actions">
          <div class="action-btn">
            <el-icon><Document /></el-icon> AI文档解析
          </div>
          <div class="action-btn">
            <el-icon><Picture /></el-icon> AI图片解析
          </div>
          <div class="action-btn">
            <el-icon><Reading /></el-icon> AI报告解读
          </div>
        </div>

        <div class="input-box">
          <el-input
            v-model="inputValue"
            type="textarea"
            :rows="3"
            resize="none"
            placeholder="Ask a question or make a request"
            class="custom-textarea"
            @keydown.enter.ctrl="sendMessage"
          />
          <div class="input-footer">
            <div class="left-tools">
              <el-button link>
                <el-icon :size="18"><Plus /></el-icon>
              </el-button>
              <el-button link>
                <el-icon :size="18"><Box /></el-icon>
              </el-button>
              <el-tag size="small" class="polish-tag">
                <el-icon><MagicStick /></el-icon> AI文本润色
              </el-tag>
            </div>
            <div class="right-tools">
              <el-button
                type="primary"
                circle
                class="send-btn"
                @click="sendMessage"
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
  ChatDotRound,
  Folder,
  Files,
  DataAnalysis,
  Setting,
  Grid,
  Headset,
  CirclePlus,
  FullScreen,
  Close,
  ArrowUp,
  Minus,
  CopyDocument,
  Refresh,
  Edit,
  MagicStick,
  Document,
  Picture,
  Reading,
  Plus,
  Box,
  Position
} from "@element-plus/icons-vue";

defineOptions({
  name: "Demo4"
});

// ================== 接口定义 ==================
interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
  subTitle?: string;
  group: "today" | "7days" | "30days";
  messages: Message[];
}

// ================== 数据初始化 ==================
const activeTab = ref<"resource" | "chat">("chat");
const activeId = ref(1);
const inputValue = ref("");

// 对话列表模拟数据
const conversationList = ref<Conversation[]>([
  {
    id: 1,
    title: "你能帮助我做什么？",
    subTitle: "我想做SAW聚类分析",
    group: "today",
    messages: [
      { id: 101, role: "user", content: "帮我生成一份XXX分析的标准工作流" }
    ]
  },
  {
    id: 2,
    title: "数据分析助手",
    subTitle: "",
    group: "today",
    messages: [
      { id: 201, role: "user", content: "如何进行数据清洗？" },
      {
        id: 202,
        role: "assistant",
        content:
          "数据清洗通常包括：缺失值处理、异常值检测、数据格式标准化等步骤。"
      }
    ]
  },
  {
    id: 3,
    title: "XXXXXXXXX",
    group: "7days",
    messages: []
  },
  {
    id: 4,
    title: "XXXXXXXXXXXXXXXXXX",
    group: "7days",
    messages: []
  },
  {
    id: 5,
    title: "XXXXXXXXX",
    group: "30days",
    messages: []
  },
  {
    id: 6,
    title: "XXXXXXXXXXXXXXXXXX",
    group: "30days",
    messages: []
  },
  {
    id: 7,
    title: "XXXXXXXXXX",
    group: "30days",
    messages: []
  },
  {
    id: 8,
    title: "XXXXXXXXXXXXXXXXXX",
    group: "30days",
    messages: []
  }
]);

// ================== 计算属性 ==================
const todayChats = computed(() =>
  conversationList.value.filter(c => c.group === "today")
);
const weekChats = computed(() =>
  conversationList.value.filter(c => c.group === "7days")
);
const monthChats = computed(() =>
  conversationList.value.filter(c => c.group === "30days")
);

const currentChat = computed(() => {
  return (
    conversationList.value.find(c => c.id === activeId.value) ||
    conversationList.value[0]
  );
});

// ================== 方法 ==================
const switchChat = (id: number) => {
  activeId.value = id;
  console.log(`切换到对话 ID: ${id}`);
};

const createNewChat = () => {
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

const handleSuggestion = (text: string) => {
  inputValue.value = text;
};

const sendMessage = () => {
  if (!inputValue.value.trim()) return;

  const newMsgId =
    Math.max(...currentChat.value.messages.map(m => m.id), 0) + 1;
  currentChat.value.messages.push({
    id: newMsgId,
    role: "user",
    content: inputValue.value
  });

  // 模拟AI回复
  setTimeout(() => {
    currentChat.value.messages.push({
      id: newMsgId + 1,
      role: "assistant",
      content: "收到您的消息，我正在处理中..."
    });
  }, 500);

  inputValue.value = "";
};
</script>

<style lang="scss" scoped>
/* ================== 基础布局 ================== */
.stereo-container {
  display: flex;
  width: 100%;
  height: 100vh;
  font-family:
    "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  color: #333;
  background-color: #f5f7fa;
}

/* ================== 左侧导航条 ================== */
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

  .nav-icons {
    flex: 1;
  }

  .nav-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-bottom: 15px;
    font-size: 18px;
    color: #909399;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s ease;

    &:hover {
      color: #7957d5;
      background-color: #f3e8ff;
    }

    &.active {
      color: #fff;
      background-color: #2c2c2c;
      box-shadow: 0 4px 8px rgb(0 0 0 / 15%);
    }
  }

  .nav-footer {
    margin-top: auto;
  }
}

/* ================== 侧边栏列表 ================== */
.sidebar-list {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 280px;
  padding: 16px;
  background-color: #fbfbfc;
  border-right: 1px solid #eee;

  .sidebar-header {
    .app-name {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 600;
      color: #333;

      .purple-star {
        margin-right: 8px;
        font-size: 18px;
        color: #7957d5;
      }

      .header-actions {
        display: flex;
        gap: 8px;
        margin-left: auto;

        .action-icon {
          font-size: 14px;
          color: #909399;
          cursor: pointer;

          &:hover {
            color: #7957d5;
          }
        }
      }
    }

    .resource-box {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;

      .half-btn {
        flex: 1;
        padding: 8px 12px;
        font-size: 13px;
        color: #606266;
        background: #fff;
        border: 1px solid #dcdfe6;
        border-radius: 6px;

        &.active {
          color: #7957d5;
          background: #f8f5ff;
          border-color: #d4b8ff;
        }

        &:hover {
          color: #7957d5;
          border-color: #c9a9ff;
        }
      }
    }

    .new-chat-btn {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      height: 42px;
      padding-left: 16px;
      font-size: 14px;
      font-weight: 500;
      color: #7957d5;
      background-color: #f8f5ff;
      border: none;
      border-radius: 8px;

      &:hover {
        background-color: #f0e8ff;
      }
    }
  }

  .history-scroll {
    flex: 1;
    margin-top: 16px;
    overflow-y: auto;

    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 500;
      color: #606266;

      .expand-icon {
        font-size: 12px;
        color: #909399;
        cursor: pointer;
      }
    }

    .time-group {
      margin-bottom: 20px;

      .group-title {
        margin-bottom: 8px;
        font-size: 12px;
        color: #909399;
      }

      .history-item {
        padding: 10px 12px;
        margin-bottom: 4px;
        font-size: 14px;
        color: #606266;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.2s ease;

        &.active {
          color: #333;
          background-color: #e8e8ea;
        }

        &:hover:not(.active) {
          background-color: #f0f0f2;
        }

        .item-title {
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
          white-space: nowrap;
        }

        .item-sub {
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12px;
          color: #909399;
          white-space: nowrap;
        }
      }
    }
  }
}

/* ================== 主聊天区域 ================== */
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
    background: #fff;
    border-bottom: 1px solid #f0f0f0;

    .header-title {
      font-size: 15px;
    }

    .window-controls {
      position: absolute;
      right: 20px;
      display: flex;
      gap: 15px;
      color: #999;
      cursor: pointer;

      .el-icon:hover {
        color: #666;
      }
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

/* ================== 聊天元素样式 ================== */
.bot-intro {
  margin-bottom: 40px;

  .avatar-row {
    display: flex;
    gap: 15px;
    align-items: center;
    margin-bottom: 20px;

    .owl-avatar {
      background: #f5f0ff;
    }

    .intro-text h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: #333;
    }

    .sub-text {
      font-size: 13px;
      color: #909399;
    }
  }

  .suggestion-chips {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;

    .chip {
      padding: 10px 18px;
      font-size: 14px;
      color: #555;
      cursor: pointer;
      background-color: #f2f3f5;
      border-radius: 8px;
      transition: all 0.2s ease;

      &:hover {
        background-color: #e6e8eb;
      }
    }

    .refresh-link {
      display: flex;
      gap: 4px;
      align-items: center;
      margin-top: 8px;
      font-size: 13px;
      color: #909399;
      cursor: pointer;

      &:hover {
        color: #7957d5;
      }
    }
  }
}

.message-row {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 20px;

  &.assistant {
    align-items: flex-start;

    .bot-bubble {
      max-width: 70%;
      padding: 14px 20px;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f5;
      border-radius: 4px 16px 16px;
    }
  }

  &.user {
    align-items: flex-end;

    .user-bubble {
      max-width: 70%;
      padding: 14px 20px;
      font-size: 14px;
      line-height: 1.6;
      color: white;
      background-color: #4f5a70;
      border-radius: 16px 4px 16px 16px;
    }

    .message-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 8px;
      font-size: 14px;
      color: #909399;
      cursor: pointer;

      .el-icon:hover {
        color: #7957d5;
      }

      .ai-polish-tag {
        padding: 4px 10px;
        color: #7957d5;
        background-color: #f8f5ff;
        border: none;
      }
    }
  }
}

/* ================== 输入区域 ================== */
.input-wrapper {
  padding: 16px 40px 32px;
  background-color: #fff;

  .quick-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;

    .action-btn {
      display: flex;
      gap: 6px;
      align-items: center;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      color: #7957d5;
      cursor: pointer;
      background-color: #f9f5ff;
      border-radius: 8px;
      transition: all 0.2s ease;

      &:hover {
        background-color: #f0e8ff;
      }
    }
  }

  .input-box {
    position: relative;
    padding: 12px;
    border: 1px solid #e4e7ed;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgb(0 0 0 / 4%);

    :deep(.el-textarea__inner) {
      padding: 8px 12px;
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
      padding: 0 8px;
      margin-top: 8px;

      .left-tools {
        display: flex;
        gap: 8px;
        align-items: center;

        .polish-tag {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 4px 10px;
          color: #7957d5;
          cursor: pointer;
          background-color: #f8f5ff;
          border: none;
        }
      }

      .send-btn {
        background-color: #a78bfa;
        border: none;

        &:hover {
          background-color: #9672f5;
        }
      }
    }
  }
}

/* ================== 工具类 ================== */
.mr-1 {
  margin-right: 4px;
}
</style>
