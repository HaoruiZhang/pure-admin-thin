<script setup lang="ts">
import { ElSplitter, ElSplitterPanel } from "element-plus";
import { onMounted, nextTick } from "vue";
import { storeToRefs } from "pinia";
import LeftSidePanel from "./components/LeftSidePanel.vue";
import MainArea from "./components/MainArea.vue";
import { useADKChatStore } from "@/store";
const adkStore = useADKChatStore();
const { sessionList, sendLoading, currentSession } = storeToRefs(adkStore);

const emit = defineEmits(["getDetail"]);
defineOptions({
  name: "ADK"
});
function init() {
  // 增加监听message事件
  window.addEventListener("message", event => {
    console.log("📢 收到了message事件: 【", event.data.key, "】", event.data);
  });
}
function parseUrlParams() {
  let searchParams = new URLSearchParams(window.location.search);
  if (!searchParams.has("userId") && !searchParams.has("session")) {
    const hash = window.location.hash || "";
    const hashQuery = hash.includes("?") ? hash.split("?")[1] : "";
    searchParams = new URLSearchParams(hashQuery);
  }
  return {
    userId: searchParams.get("userId"),
    sessionId: searchParams.get("session")
  };
}

async function bootstrapSession() {
  const { userId, sessionId } = parseUrlParams();
  userId && adkStore.setUserId(userId);
  const initSessionId = sessionId ?? (await ensureSessionList());
  await adkStore.setCurrentSession(initSessionId);
}

async function ensureSessionList() {
  if (!sessionList.value.length) {
    await adkStore.getSessionList();
    await adkStore.getListReady;
  }
  return sessionList.value[0]?.id;
}

onMounted(async () => {
  console.log("⬇️⬇️⬇️⬇️⬇️⬇️ 挂载了ADK组件 ⬇️⬇️⬇️⬇️⬇️⬇️");
  init();
  await ensureSessionList();
  await bootstrapSession();
  await nextTick();
  adkStore.scrollToBottomSmooth();
});
</script>

<template>
  <div
    class="adk-chat-container"
    style="
      width: 100%;
      height: calc(100% - 4px);
      padding: 4px 0 0;

      /* margin: 4px; */

      /* height: 100%; */
      margin: 0;

      /* border: solid 1px red; */

      /* height: 250px; */
      box-shadow: var(--el-border-color-light) 0 0 10px;
    "
  >
    <el-splitter>
      <el-splitter-panel :min="200" :max="500" :size="280">
        <LeftSidePanel />
      </el-splitter-panel>

      <el-splitter-panel :min="200">
        <MainArea />
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>
