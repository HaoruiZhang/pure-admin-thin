<script setup lang="ts">
import { ref } from "vue";
import NewSession from "@/assets/svg/new_session.svg";

defineOptions({
  name: "ADK-SessionTabs"
});

const activeNames = ref<string[]>(["1"]);
</script>

<template>
  <div class="session-tabs-container">
    <div class="new-session">
      <NewSession width="24px" height="24px" style="vertical-align: middle" />
      <span>新建对话</span>
    </div>

    <el-collapse
      v-model="activeNames"
      expand-icon-position="right"
      class="session-container"
    >
      <el-collapse-item name="1">
        <template #title="{ isActive }">
          <div :class="['title-wrapper', { 'is-active': isActive }]">对话</div>
        </template>
        <div class="date-splitter">今天</div>

        <div class="session-tab-item">
          <div class="session-header dark:text-white!">
            <span>新对话</span>
          </div>
        </div>
        <div class="session-tab-item">
          <div class="session-header dark:text-white!">
            <span>我想做SAW聚类分析</span>
          </div>
        </div>
        <div class="date-splitter">7天内</div>
        <div class="session-tab-item">
          <div class="session-header dark:text-white!">
            <span>XXXXXXXXXXXX</span>
          </div>
        </div>
        <div class="session-tab-item">
          <div class="session-header dark:text-white!">
            <span>XXXXXXXXXXXXXXXXXXXXX</span>
          </div>
        </div>
        <div class="date-splitter">30天内</div>
        <div class="session-tab-item">
          <div class="session-header dark:text-white!">
            <span>XXXXXXXXXXXXX</span>
          </div>
        </div>
        <div class="session-tab-item">
          <div class="session-header dark:text-white!">
            <span>XXXXXXXXXXXXXXXXXXXXX</span>
          </div>
        </div>
        <div class="session-tab-item">
          <div class="session-header dark:text-white!">
            <span>XXXXXXXXXXX</span>
          </div>
        </div>
        <div class="session-tab-item">
          <div class="session-header dark:text-white!">
            <span>XXXXXXXXXXXXXXXXXXXXX</span>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>
<style scoped>
.session-tabs-container {
  /* display: flex;
  align-items: center;
  justify-content: center; */
  height: 100%;

  /* padding: 0 16px; */

  .new-session {
    display: flex;
    gap: 6px;
    align-items: center;
    align-self: stretch;
    height: 44px;
    padding: 0 12px;
    background: #f8f5ff;
    border-radius: 8px;

    span {
      font-size: 14px;
      font-style: normal;
      font-weight: 500;
      line-height: 14px; /* 100% */
      color: #5f0085;
    }
  }

  .session-container {
    /* overflow-y: auto; */
    height: calc(100% - 60px);
    margin-top: 16px;

    .title-wrapper {
      font-size: 14px;
      font-style: normal;
      font-weight: 600;
      line-height: 14px; /* 100% */
      color: #45537a;
    }

    .date-splitter {
      margin: 24px auto 16px;
      font-size: 12px;
      font-style: normal;
      font-weight: 500;
      line-height: 12px; /* 100% */
      color: #8c92a3;
    }

    .session-tab-item {
      display: flex;
      gap: 10px;
      align-items: center;
      align-self: stretch;
      justify-content: flex-start;
      height: 32px;
      padding: 0 8px;

      span {
        font-size: 14px;
        font-style: normal;
        font-weight: 400;
        line-height: 22px; /* 157.143% */
        color: #45537a;
      }

      &:hover {
        cursor: pointer;
        background-color: rgb(0 0 0 / 4%);
      }

      &:active {
        background-color: rgb(0 0 0 / 8%);
      }
    }
  }
}
</style>
