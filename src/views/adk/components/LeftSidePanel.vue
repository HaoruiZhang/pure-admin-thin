<script setup lang="ts">
import { ref } from "vue";
import type { TabsPaneContext } from "element-plus";
import SessionTabs from "./SessionTabs.vue";
defineOptions({
  name: "ADK-LeftSidePanel"
});

const activeName = ref("sessions");

const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event);
};
</script>

<template>
  <div class="left-side-panel">
    <el-tabs
      v-model="activeName"
      class="agent-app-tabs"
      :stretch="true"
      @tab-click="handleClick"
    >
      <el-tab-pane label="Events" name="events">Events</el-tab-pane>
      <el-tab-pane label="Artifacts" name="artifacts">Artifacts</el-tab-pane>
      <el-tab-pane label="Sessions" name="sessions">
        <SessionTabs />
      </el-tab-pane>
      <el-tab-pane label="Trace" name="trace">Trace</el-tab-pane>
    </el-tabs>
  </div>
</template>
<style scoped>
.left-side-panel {
  .agent-app-tabs {
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
}
</style>
