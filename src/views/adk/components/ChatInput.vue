<script setup lang="ts">
import { ref } from "vue";
import SendMessage from "@/assets/svg/send_message.svg";
import { storeToRefs } from "pinia";
import { useADKChatStore } from "@/store";
const adkStore = useADKChatStore();
const { sessionList, sendLoading, currentSession, userInput } =
  storeToRefs(adkStore);
defineOptions({
  name: "ADK-ChatInput"
});
function sendMessage() {
  if (!userInput.value) return;
  console.log("发送提问: ", userInput.value);
  adkStore.sendMessage();
}
</script>

<template>
  <div class="chat-input">
    <el-input
      v-model="userInput"
      style="width: 100%"
      resize="none"
      :rows="3"
      type="textarea"
      placeholder="Ask a question or make a request"
    />
    <div style=" position: relative;width: 100%; height: 20px">
      <el-button
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
  border: solid 1px #5f0085;

  /* padding: 16px; */

  /* background-color: #f5f5f5; */

  /* margin-top: 16px; */
  border-radius: 8px;

  /* border: solid 1px green; */

  /* margin-top: 4px; */

  .el-textarea__inner {
    padding-bottom: 50px;
  }
}
</style>
