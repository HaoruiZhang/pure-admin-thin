<script setup lang="ts">
import { ElSplitter, ElSplitterPanel } from "element-plus";
import LeftSidePanel from "./components/LeftSidePanel.vue";
import MainArea from "./components/MainArea.vue";

defineOptions({
  name: "ADK"
});
</script>

<template>
  <div
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
