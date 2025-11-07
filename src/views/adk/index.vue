<script setup lang="ts">
import { ElSplitter, ElSplitterPanel } from "element-plus";
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import LeftSidePanel from "./components/LeftSidePanel.vue";
import MainArea from "./components/MainArea.vue";
import { useADKChatStore } from "@/store";
import { adkService } from "@/api/adk.service";
const adkStore = useADKChatStore();
const { sessionList, sendLoading, currentSession } = storeToRefs(adkStore);

const emit = defineEmits(["getDetail"]);
defineOptions({
  name: "ADK"
});

onMounted(() => {
  console.log("⬇️⬇️⬇️⬇️⬇️⬇️ 挂载了ADK组件 ⬇️⬇️⬇️⬇️⬇️⬇️");
  adkStore.getSessionList();
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
