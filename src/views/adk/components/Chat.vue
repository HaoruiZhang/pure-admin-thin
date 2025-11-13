<script setup lang="ts">
import { ElSplitter, ElSplitterPanel } from "element-plus";

import ChatMessage from "./ChatMessage.vue";
import ChatInput from "./ChatInput.vue";

defineOptions({
  name: "ADK-Chat"
});
</script>

<template>
  <div class="chat-area">
    <el-splitter layout="vertical" style="height: 100%" class="chat-splitter">
      <el-splitter-panel :min="200">
        <ChatMessage :send-loading="true" />
      </el-splitter-panel>
      <el-splitter-panel
        :size="48"
        :resizable="false"
        class="chat-input-buttons"
      >
        <div style="display: flex; /* gap: 0px; */ width: 100%; height: 100%">
          <el-button> AI文档解析 </el-button>
          <el-button> AI图片解析 </el-button>
          <el-button> AI报告解读 </el-button>
        </div>
      </el-splitter-panel>
      <el-splitter-panel
        :size="124"
        :resizable="false"
        class="chat-input-textarea"
      >
        <ChatInput />
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>
<style scoped>
.chat-area {
  height: 100%;
  border-radius: 8px;

  /* padding: 0 12px; */
}
</style>
<style>
.el-splitter.chat-splitter {
  /* border: solid 1px red; */
  .el-splitter-bar {
    display: none;

    .el-splitter-bar__dragger {
      display: none;
    }
  }

  .chat-input-buttons {
    padding: 12px 12px 0;

    button {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: center;
      width: 113px;
      height: 34px;
      padding: 8px 12px;
      background: #f8f5ff;
      border: none;
      border-radius: 8px;

      span {
        font-size: 14px;
        font-style: normal;
        font-weight: 400;
        line-height: 18px; /* 128.571% */
        background: linear-gradient(
          274deg,
          #a204fe 9.79%,
          #5b04fe 20.32%,
          #5f0085 86.84%
        );
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }
  }

  .chat-input-textarea {
    padding: 8px 12px;
  }
}
</style>
