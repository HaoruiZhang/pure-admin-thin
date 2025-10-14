<script setup lang="ts">
defineOptions({
  name: "ADK-SessionTabs"
});
</script>

<template>
  <div class="session-tabs">
    <div class="session-tab-item">
      <div class="session-header dark:text-white!">新会话1</div>
      <div class="session-date dark:text-white!">2025/10/10 09:49:10</div>
    </div>
    <div class="session-tab-item">
      <div class="session-header dark:text-white!">新会话2</div>
      <div class="session-date dark:text-white!">2025/10/10 09:49:10</div>
    </div>
    <div class="session-tab-item">
      <div class="session-header dark:text-white!">新会话3</div>
      <div class="session-date dark:text-white!">2025/10/10 09:49:10</div>
    </div>
    <div class="session-tab-item">
      <div class="session-header dark:text-white!">新会话4</div>
      <div class="session-date dark:text-white!">2025/10/10 09:49:10</div>
    </div>
    <div class="session-tab-item">
      <div class="session-header dark:text-white!">新会话5</div>
      <div class="session-date dark:text-white!">2025/10/10 09:49:10</div>
    </div>
  </div>
</template>
<style scoped>
.session-tabs {
  /* display: flex;
  align-items: center;
  justify-content: center; */
  height: 100%;
  padding: 0 16px;

  > div {
    /* width: calc(100% - 22px); */
    width: 100%;
    padding: 11px;

    /* height: 48px; */
    margin: 4px 0;

    /* background-color: #dddddd; */
    border-radius: 8px;

    .session-header {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;

      /* color: #25282c; */
      font-family: "Google Sans Mono", monospace;
      font-size: 14px;
      font-style: normal;
      font-weight: 500;
      line-height: 20px;
      letter-spacing: 0.25px;
      white-space: nowrap;
    }

    .session-date {
      /* color: #9aa0a6; */
      font-size: 12px;
      font-style: normal;
      font-weight: 400;
      line-height: 16px;
      letter-spacing: 0.3px;
    }
  }

  .session-tab-item {
    box-shadow: rgb(199 199 199 / 50%) 0 2px 8px 0;

    &:hover {
      cursor: pointer;
      background-color: rgb(0 0 0 / 4%);
    }

    &:active {
      background-color: rgb(0 0 0 / 8%);
    }
  }
}
</style>
