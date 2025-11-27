<script setup lang="ts">
import { ref, watch } from "vue";
import {
  Promotion,
  Paperclip,
  Picture,
  Plus,
  Box,
  Document,
  Reading,
  Refresh
} from "@element-plus/icons-vue";

const props = defineProps<{
  currentChat: any;
}>();

const inputValue = ref("");
const messages = ref<any[]>([]);

// Mock initial welcome state
const isWelcome = ref(true);

watch(
  () => props.currentChat,
  newVal => {
    if (newVal) {
      isWelcome.value = false;
      // Load mock messages for the selected chat
      messages.value = [
        {
          id: 1,
          role: "user",
          content: "帮我生成一份XXX分析的标准工作流"
        },
        {
          id: 2,
          role: "assistant",
          content: "好的，这是为您生成的XXX分析工作流..."
        }
      ];
    } else {
      isWelcome.value = true;
      messages.value = [];
    }
  },
  { immediate: true }
);

const quickActions = [
  "你能为我做什么？",
  "基于选择的Group对象执行差异分析",
  "上传文档完成AI智能解析",
  "我想做SAW聚类分析"
];

const handleSend = () => {
  if (!inputValue.value.trim()) return;

  messages.value.push({
    id: Date.now(),
    role: "user",
    content: inputValue.value
  });

  inputValue.value = "";
  isWelcome.value = false;

  // Simulate AI response
  setTimeout(() => {
    messages.value.push({
      id: Date.now() + 1,
      role: "assistant",
      content: "收到，正在为您处理..."
    });
  }, 1000);
};

const handleQuickAction = (action: string) => {
  inputValue.value = action;
  handleSend();
};
</script>

<template>
  <div class="chat-container">
    <!-- Header -->
    <div class="chat-header">
      <div class="title">StereoMap</div>
      <div class="window-controls">
        <!-- Placeholder for window controls -->
        <span>—</span>
        <span>□</span>
        <span>×</span>
      </div>
    </div>

    <!-- Content Area -->
    <div class="chat-content">
      <!-- Welcome Screen -->
      <div v-if="isWelcome && messages.length === 0" class="welcome-screen">
        <div class="avatar-large">🦉</div>
        <div class="welcome-text">
          <h2>Hi~ 需要我帮你做什么？</h2>
          <p>StereoMap Agent</p>
        </div>

        <div class="quick-actions">
          <div
            v-for="(action, index) in quickActions"
            :key="index"
            class="action-chip"
            @click="handleQuickAction(action)"
          >
            {{ action }}
          </div>
          <div class="refresh-actions">
            <el-icon><Refresh /></el-icon> 换一换
          </div>
        </div>
      </div>

      <!-- Message List -->
      <div v-else class="message-list">
        <!-- Show Welcome Header even in chat if it was the start (optional, keeping simple based on image) -->
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-row"
          :class="msg.role"
        >
          <div v-if="msg.role === 'assistant'" class="message-avatar">🦉</div>
          <div class="message-bubble">
            {{ msg.content }}
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-area-wrapper">
      <!-- Action Chips above input -->
      <div class="input-chips">
        <div class="chip">
          <el-icon><Document /></el-icon> AI文档解析
        </div>
        <div class="chip">
          <el-icon><Picture /></el-icon> AI图片解析
        </div>
        <div class="chip">
          <el-icon><Reading /></el-icon> AI报告解读
        </div>
      </div>

      <div class="input-box">
        <el-input
          v-model="inputValue"
          type="textarea"
          :rows="3"
          placeholder="Ask a question or make a request"
          resize="none"
          class="custom-textarea"
          @keydown.enter.prevent="handleSend"
        />
        <div class="input-footer">
          <div class="attachments">
            <el-icon class="icon-btn"><Plus /></el-icon>
            <el-icon class="icon-btn"><Box /></el-icon>
          </div>
          <div class="send-btn" @click="handleSend">
            <el-icon><Promotion /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chat-container {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
}

.chat-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  border-bottom: 1px solid #f4f4f5;

  .title {
    font-size: 16px;
    font-weight: 600;
  }

  .window-controls {
    position: absolute;
    right: 16px;
    display: flex;
    gap: 12px;
    color: #a1a1aa;
    cursor: pointer;
  }
}

.chat-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 20px;
  overflow-y: auto;
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  max-width: 800px;
  padding-top: 40px;
  margin: 0 auto;

  .avatar-large {
    margin-bottom: 16px;
    font-size: 48px;
  }

  .welcome-text {
    margin-bottom: 30px;

    h2 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: #a1a1aa;
    }
  }

  .quick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;

    .action-chip {
      padding: 8px 16px;
      font-size: 14px;
      color: #52525b;
      cursor: pointer;
      background-color: #f4f4f5;
      border-radius: 8px;

      &:hover {
        background-color: #e4e4e7;
      }
    }

    .refresh-actions {
      display: flex;
      gap: 4px;
      align-items: center;
      width: 100%;
      margin-top: 8px;
      font-size: 13px;
      color: #a1a1aa;
      cursor: pointer;
    }
  }
}

.message-list {
  width: 100%;
  max-width: 800px;
  padding-bottom: 20px;
  margin: 0 auto;

  .message-row {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;

    &.user {
      justify-content: flex-end;

      .message-bubble {
        color: white;
        background-color: #4c576d; /* Dark blue/grey from screenshot */
        border-radius: 12px 12px 0;
      }
    }

    &.assistant {
      justify-content: flex-start;

      .message-bubble {
        color: #333;
        background-color: #f4f4f5;
        border-radius: 0 12px 12px;
      }
    }

    .message-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      font-size: 20px;
      background-color: #eee;
      border-radius: 50%;
    }

    .message-bubble {
      max-width: 70%;
      padding: 12px 16px;
      font-size: 15px;
      line-height: 1.5;
    }
  }
}

.input-area-wrapper {
  box-sizing: border-box;
  width: 100%;
  max-width: 800px;
  padding: 20px;
  margin: 0 auto;

  .input-chips {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;

    .chip {
      display: flex;
      gap: 6px;
      align-items: center;
      padding: 6px 12px;
      font-size: 13px;
      color: #9333ea;
      cursor: pointer;
      background-color: #fcfaff;
      border-radius: 6px;

      &:hover {
        background-color: #f3f0ff;
      }
    }
  }

  .input-box {
    padding: 12px;
    background-color: #fff;
    border: 1px solid #e4e4e7;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgb(0 0 0 / 5%);

    :deep(.el-textarea__inner) {
      padding: 0;
      font-size: 15px;
      border: none;
      box-shadow: none;

      &:focus {
        box-shadow: none;
      }
    }

    .input-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 8px;

      .attachments {
        display: flex;
        gap: 12px;
        color: #a1a1aa;

        .icon-btn {
          font-size: 18px;
          cursor: pointer;

          &:hover {
            color: #71717a;
          }
        }
      }

      .send-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        color: white;
        cursor: pointer;
        background-color: #c084fc; /* Light purple from screenshot */
        border-radius: 6px;

        &:hover {
          background-color: #a855f7;
        }
      }
    }
  }
}
</style>
