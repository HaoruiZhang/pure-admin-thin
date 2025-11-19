<script setup lang="ts">
import { onMounted, ref, nextTick } from "vue";

import NewSession from "@/assets/svg/new_session.svg";
import { getSessionListByDays } from "../utils";
import { storeToRefs } from "pinia";
import { useADKChatStore } from "@/store/modules/adk.store";
const adkStore = useADKChatStore();
const { sessionList, currentSession, isUserNewMessage } = storeToRefs(adkStore);

defineOptions({
  name: "ADK-SessionTabs"
});
const emit = defineEmits(["getDetail"]);
const activeNames = ref<string[]>(["1"]);

const handleClickSession = async (item: any) => {
  // 选择新对话或者选中当前会话
  if (item.id === currentSession.value.id) {
    return;
  }
  console.log("▶️ 点击了Session列表的session: ", item);
  isUserNewMessage.value = false;
  await adkStore.setCurrentSession(item.id);
  await nextTick();
  adkStore.scrollToBottomSmooth();
};
const onNewSessionClick = () => {
  adkStore.createNewSession();
};

onMounted(async () => {
  // TODO: 使用事件通知：加载完毕列表后，默认取第一个
});
</script>

<template>
  <div class="session-tabs-container">
    <div class="new-session" @click.stop.prevent="onNewSessionClick">
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

        <el-scrollbar
          ref="sessionListRef"
          :class="['session-scrollbar', { 'show-stop': true }]"
          ><div
            v-if="
              getSessionListByDays(currentSession, sessionList, 0, 1).length > 0
            "
            class="date-splitter"
          >
            今天
          </div>
          <template
            v-for="session in getSessionListByDays(
              currentSession,
              sessionList,
              0,
              1
            )"
            :key="session.id"
          >
            <div
              :class="[
                'session-tab-item',
                {
                  'is-active-session': session.id === currentSession.id
                }
              ]"
              @click="handleClickSession(session)"
            >
              <div class="session-header dark:text-white!">
                <span>{{ session.state.title || "新对话" }}</span>
              </div>
            </div>
          </template>

          <div class="date-splitter">7天内</div>
          <template
            v-for="session in getSessionListByDays(
              currentSession,
              sessionList,
              1,
              7
            )"
            :key="session.id"
          >
            <div
              :class="[
                'session-tab-item',
                {
                  'is-active-session': session.id === currentSession.id
                }
              ]"
              @click="handleClickSession(session)"
            >
              <div class="session-header dark:text-white!">
                <span>{{ session.state.title || "新对话" }}</span>
              </div>
            </div>
          </template>
          <div class="date-splitter">30天内</div>
          <template
            v-for="session in getSessionListByDays(
              currentSession,
              sessionList,
              7,
              Infinity
            )"
            :key="session.id"
          >
            <div
              :class="[
                'session-tab-item',
                {
                  'is-active-session': session.id === currentSession.id
                }
              ]"
              @click="handleClickSession(session)"
            >
              <div class="session-header dark:text-white!">
                <span>{{ session.state.title || "新对话" }}</span>
              </div>
            </div>
          </template></el-scrollbar
        >
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
    background-color: #f8f5ff;
    border-radius: 8px;

    span {
      font-size: 14px;
      font-style: normal;
      font-weight: 500;
      line-height: 14px; /* 100% */
      color: #5f0085;
    }

    &:hover {
      cursor: pointer;
      filter: brightness(96%);
    }

    &:active {
      filter: brightness(92%);
    }
  }

  .session-container {
    /* overflow-y: auto; */
    height: calc(100% - 60px);
    margin-top: 16px;
    border: green;

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

      &.is-active-session {
        background: #f4f5f6;

        /* background-color: rgb(95 0 133 / 8%); */
        border-radius: 4px;

        span {
          /* font-family: "PingFang SC"; */
          font-size: 14px;
          font-style: normal;
          font-weight: 400;
          line-height: 22px; /* 157.143% */

          /* font-weight: 600; */

          /* color: #5f0085; */
          color: #45537a;
        }
      }
    }
  }
}
</style>
<style>
.el-tab-pane {
  height: 100%;
}

.session-container {
  height: calc(100% - 280px);
}

.el-collapse-item {
  height: 100%;
}

.el-collapse-item__wrap {
  height: calc(100% - 48px);
  overflow-y: auto;
  border: none;
}

.el-collapse-item__content {
  height: 100%;
  padding: 0;
}

.session-scrollbar {
  height: 100%;
}
</style>
