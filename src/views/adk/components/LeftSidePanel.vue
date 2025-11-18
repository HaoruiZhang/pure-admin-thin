<script setup lang="ts">
import { ref } from "vue";
import type { TabsPaneContext } from "element-plus";
import SessionTabs from "./SessionTabs.vue";
// import SvgIcon from "./svg-icon.vue";
import AIPen from "@/assets/svg/ai_pen.svg?component";
import { storageLocal, isAllEmpty } from "@pureadmin/utils";
import { responsiveStorageNameSpace } from "@/config";

defineOptions({
  name: "ADK-LeftSidePanel"
});
const showLogo = ref(
  storageLocal().getItem<StorageConfigs>(
    `${responsiveStorageNameSpace()}configure`
  )?.showLogo ?? true
);
const activeName = ref("sessions");

const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event);
};
</script>

<template>
  <div class="left-side-panel">
    <div
      v-if="showLogo"
      style="display: flex; align-items: center; padding: 8px"
    >
      <!-- <SvgIcon icon="ai-pen" width="32px" height="32px" /> -->
      <!-- <span style="display: inline-block; vertical-align: middle"> -->
      <AIPen width="24px" height="24px" style="vertical-align: middle" />
      <!-- </span> -->
      <span style="margin-left: 8px; font-size: 20px; font-weight: 600">
        Stereo Agent
      </span>
    </div>
    <!-- <el-divider /> -->
    <el-tabs
      v-model="activeName"
      class="agent-app-tabs"
      :stretch="true"
      type="border-card"
      @tab-click="handleClick"
    >
      <!-- <el-tab-pane label="Events" name="events">Events</el-tab-pane> -->
      <!-- <el-tab-pane label="Artifacts" name="artifacts">Artifacts</el-tab-pane> -->
      <!-- <el-tab-pane label="资源库" name="resource">Artifa资源库cts</el-tab-pane> -->
      <el-tab-pane label="AI对话框" name="sessions">
        <SessionTabs />
      </el-tab-pane>
      <!-- <el-tab-pane label="Trace" name="trace">Trace</el-tab-pane> -->
    </el-tabs>
  </div>
</template>
<style scoped>
.left-side-panel {
  height: calc(100% - 16px);

  .agent-app-tabs {
    height: calc(100% - 32px);
    border-bottom: none;

    :deep(.el-tabs__item) {
      width: 200px;
    }

    .el-tabs__content {
      padding: 32px;

      /* color: #6b778c; */
      font-size: 32px;
      font-weight: 600;
    }
  }

  .el-divider {
    margin: 0 auto 24px;
  }
}
</style>
