<script setup lang="ts">
import Chat from "./Chat.vue";
import { storeToRefs } from "pinia";
import { useADKChatStore } from "@/store/modules/adk.store";
const adkStore = useADKChatStore();
const { currentSession } = storeToRefs(adkStore);
defineOptions({
  name: "ADK-Main"
});
</script>

<template>
  <div class="main-panel">
    <div class="top-bar">
      <!-- <div>Session ID</div> -->
      <div>{{ currentSession.id }}</div>
      <!-- <el-divider /> -->
      <!-- <div>End Session</div> -->
      <!-- <div>End Session</div> -->
    </div>
    <Chat />
  </div>
</template>
<style scoped>
.main-panel {
  width: 100%;

  /* display: flex;
  align-items: center;
  justify-content: center; */
  height: 100%;
  padding: 0 8px;

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    padding-left: 16px;
    font-size: 14px;
    font-weight: 500;

    /* color: #25282c; */

    /* background-color: #ffffff; */
  }

  .chat-area {
    height: calc(100% - 32px);

    /* background-color: #f5f5f5; */

    /* margin-top: 16px; */
    border-radius: 8px;
  }
}
</style>
