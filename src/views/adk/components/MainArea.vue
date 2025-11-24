<script setup lang="ts">
import Chat from "./Chat.vue";
import { ElMessageBox, ElMessage } from "element-plus";
import { storeToRefs } from "pinia";
import { useADKChatStore } from "@/store/modules/adk.store";
const adkStore = useADKChatStore();
const {
  currentSession,
  messageList,
  eventData,
  isDebugMode,
  user_info,
  sessionList
} = storeToRefs(adkStore);
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

const handleDeleteSession = async () => {
  console.log("👻 删除会话: ", currentSession.value);
  const result = await ElMessageBox.confirm("确定要删除会话吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  });
  console.log("👻 删除会话结果: ", result);
  if (result === "confirm") {
    try {
      const index = sessionList.value.findIndex(
        item => item.id === currentSession.value.id
      );
      let nextSession = null;
      if (sessionList.value.length > 1) {
        // 如果是最后一个，切换到上一个；否则切换到下一个
        if (index === sessionList.value.length - 1) {
          nextSession = sessionList.value[index - 1];
        } else {
          nextSession = sessionList.value[index + 1];
        }
      }

      await adkStore.deleteSession(currentSession.value.id);

      if (nextSession) {
        await adkStore.setCurrentSession(nextSession.id);
      } else {
        // 如果没有剩余会话，创建一个新的
        await adkStore.createNewSession();
      }
    } catch (error) {
      console.log("👻 删除会话错误: ", error);
    }
  }
  // await adkStore.deleteSession(currentSession.value.id);
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
      <div v-if="user_info?.user_id === 'zhanghaorui'">
        <el-affix
          :offset="120"
          style="width: 32px; height: 32px"
          class="affix-button"
        >
          <el-button circle @click="handleClickAffixButton">👻</el-button>
        </el-affix>
        <el-affix
          :offset="160"
          style="width: 32px; height: 32px"
          class="affix-button"
        >
          <el-switch v-model="isDebugMode" style="width: 32px; height: 32px" />
        </el-affix>
      </div>
      <div>
        <el-button
          style="width: 18px; height: 24px; padding: 4px"
          @click="handleDeleteSession"
          >🗑️</el-button
        >
      </div>
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
