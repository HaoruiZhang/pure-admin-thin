<script setup lang="ts">
import Chat from "./Chat.vue";
import { storeToRefs } from "pinia";
import { useADKChatStore } from "@/store/modules/adk.store";
const adkStore = useADKChatStore();
const { currentSession, messageList, eventData } = storeToRefs(adkStore);
defineOptions({
  name: "ADK-Main"
});
const handleClickAffixButton = () => {
  console.log("");
  console.log("👻 当前会话: ", currentSession.value);
  console.log("👻 当前messageList: ", messageList.value);
  console.log("👻 当前eventData: ", eventData.value);
  console.log("👻 当前adkStore: ", adkStore);
};
</script>

<template>
  <div class="main-panel">
    <div class="top-bar">
      <!-- <div>Session ID</div> -->
      <div>{{ currentSession.id }}</div>
      <!-- <el-divider /> -->
      <!-- <div>End Session</div> -->
      <!-- <div>End Session</div> -->
      <el-affix
        :offset="120"
        style="width: 32px; height: 32px"
        class="affix-button"
      >
        <el-button circle @click="handleClickAffixButton">👻</el-button>
      </el-affix>
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
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    padding-left: 16px;
    font-size: 14px;
    font-weight: 500;

    /* .affix-button {
      position: absolute;
      right: 0;
      top: 0;
    } */

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
