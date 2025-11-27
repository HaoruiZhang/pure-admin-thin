<script setup lang="ts">
import { ref } from "vue";
import { Plus, ChatDotRound, Collection } from "@element-plus/icons-vue";

const emit = defineEmits(["select-chat", "new-chat"]);

const activeTab = ref("chat"); // 'resource' | 'chat'

// Mock data for conversation history
const historyGroups = [
  {
    title: "7天前",
    items: [
      { id: 1, title: "XXXXXXXXX" },
      { id: 2, title: "XXXXXXXXXXXXXXXX" }
    ]
  },
  {
    title: "30天内",
    items: [
      { id: 3, title: "XXXXXXXXX" },
      { id: 4, title: "XXXXXXXXXXXXXXXXXX" },
      { id: 5, title: "XXXXXXXXX" },
      { id: 6, title: "XXXXXXXXXXXXXXXXXX" }
    ]
  }
];

const handleSelect = (item: any) => {
  emit("select-chat", item);
};

const handleNewChat = () => {
  emit("new-chat");
};
</script>

<template>
  <div class="sidebar-container">
    <!-- Header -->
    <div class="sidebar-header">
      <div class="logo-area">
        <span class="logo-icon">✨</span>
        <span class="logo-text">StereoMap Agent</span>
      </div>
      <div class="header-actions">
        <!-- Expand/Collapse icon placeholder -->
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-container">
      <div
        class="tab-item"
        :class="{ active: activeTab === 'resource' }"
        @click="activeTab = 'resource'"
      >
        <el-icon><Collection /></el-icon>
        <span>资源库</span>
      </div>
      <div
        class="tab-item"
        :class="{ active: activeTab === 'chat' }"
        @click="activeTab = 'chat'"
      >
        <el-icon><ChatDotRound /></el-icon>
        <span>AI对话框</span>
      </div>
    </div>

    <!-- New Chat Button -->
    <div class="new-chat-btn" @click="handleNewChat">
      <el-icon><Plus /></el-icon>
      <span>新建对话</span>
    </div>

    <!-- Conversation List -->
    <div class="history-list">
      <div
        v-for="(group, index) in historyGroups"
        :key="index"
        class="history-group"
      >
        <div class="group-title">{{ group.title }}</div>
        <div
          v-for="item in group.items"
          :key="item.id"
          class="history-item"
          @click="handleSelect(item)"
        >
          {{ item.title }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sidebar-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 260px;
  height: 100%;
  padding: 16px;
  background-color: #f9f9fb;
  border-right: 1px solid #e4e4e7;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  .logo-area {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 600;
    color: #6b21a8; /* Purple tone */

    .logo-icon {
      margin-right: 8px;
    }
  }
}

.tabs-container {
  display: flex;
  padding: 2px;
  margin-bottom: 16px;
  background-color: #fff;
  border: 1px solid #e4e4e7;
  border-radius: 6px;

  .tab-item {
    display: flex;
    flex: 1;
    gap: 4px;
    align-items: center;
    justify-content: center;
    padding: 6px;
    font-size: 13px;
    color: #71717a;
    cursor: pointer;
    border-radius: 4px;

    &.active {
      font-weight: 500;
      color: #7e22ce; /* Purple text */
      background-color: #f3f0ff; /* Light purple bg */
    }
  }
}

.new-chat-btn {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 10px;
  margin-bottom: 24px;
  font-weight: 500;
  color: #7e22ce;
  cursor: pointer;
  background-color: #f3f0ff;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background-color: #ede9fe;
  }
}

.history-list {
  flex: 1;
  overflow-y: auto;

  .history-group {
    margin-bottom: 20px;

    .group-title {
      padding-left: 8px;
      margin-bottom: 8px;
      font-size: 12px;
      color: #a1a1aa;
    }

    .history-item {
      padding: 8px 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 14px;
      color: #52525b;
      white-space: nowrap;
      cursor: pointer;
      border-radius: 6px;

      &:hover {
        background-color: #e4e4e7;
      }
    }
  }
}
</style>
