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
    <!-- <div class="message-area">
      <ChatMessage />
    </div>
    <div class="input-area">
      <ChatInput />
    </div> -->
    <el-splitter layout="vertical" style="height: 100%">
      <el-splitter-panel :min="200" size="80%">
        <ChatMessage :send-loading="true" />
      </el-splitter-panel>

      <el-splitter-panel :min="150" :max="500">
        <ChatInput />
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>
<style scoped>
.chat-area {
  height: 100%;

  /* background-color: #f5f5f5; */

  /* margin-top: 16px; */
  border-radius: 8px;

  .message-area {
    height: calc(100% - 150px);

    /* background-color: #e0e0e0; */
    padding: 16px;
    overflow-y: auto;
  }

  .input-area {
    height: 150px;
    padding: 8px 16px;
    border-top: solid 1px #e0e0e0;

    /* background-color: #d0d0d0; */
  }
}
</style>
