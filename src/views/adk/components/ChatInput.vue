<script setup lang="ts">
import SendMessage from "@/assets/svg/send_message.svg";
import { storeToRefs } from "pinia";
import { useADKChatStore } from "@/store/modules/adk.store";
const adkStore = useADKChatStore();
const { userInput, sendLoading } = storeToRefs(adkStore);
defineOptions({
  name: "ADK-ChatInput"
});
function sendMessage() {
  if (!userInput.value) return;
  console.log("发送提问: ", userInput.value);
  adkStore.sendMessage();
}

function handleEnter(e: KeyboardEvent) {
  if (!sendLoading.value) {
    // 非回复状态，发送消息
    e.preventDefault();
    sendMessage();
  }
  // 回复状态下，不调用 preventDefault，保持默认的回车换行行为
}

function stopSSE() {
  adkStore.stopSSE();
  adkStore.sendLoading = false;
}
</script>

<template>
  <div class="chat-input">
    <el-input
      v-model="userInput"
      class="adk-user-input"
      style="width: 100%"
      resize="none"
      :rows="3"
      type="textarea"
      placeholder="Ask a question or make a request"
      @keydown.enter.exact="handleEnter"
    />
    <div style="position: relative; width: 100%; height: 20px">
      <el-button
        v-if="!sendLoading"
        style="
          position: absolute;
          right: 0;
          bottom: 0;
          width: 20px;
          height: 20px;
          padding: 0;
          background: linear-gradient(135deg, #7d25bc 0%, #390772 100%);
          border-radius: 5px;
        "
        @click.prevent.stop="sendMessage"
      >
        <SendMessage
          width="14px"
          height="14px"
          style="vertical-align: middle"
        />
      </el-button>
      <el-button
        v-else
        style="
          position: absolute;
          right: 0;
          bottom: 0;
          width: 20px;
          height: 20px;
          padding: 0;
          background: #f56c6c;
          border: none;
          border-radius: 5px;
        "
        @click.prevent.stop="stopSSE"
      >
        <div
          style="width: 8px; height: 8px; background: white; border-radius: 1px"
        />
      </el-button>
    </div>
  </div>
</template>
<style scoped>
.chat-input {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 8px;
  border: solid 1px #eee;
  border-radius: 8px;

  &:hover {
    border: solid 1px #5f0085;
  }
}
</style>
<style>
.adk-user-input {
  border: none;

  .el-textarea__inner {
    box-shadow: none;

    /* padding-bottom: 50px; */
  }
}
</style>
