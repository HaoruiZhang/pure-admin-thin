<script setup lang="ts">
import { ElSplitter, ElSplitterPanel } from "element-plus";
import { onMounted, nextTick } from "vue";
import { storeToRefs } from "pinia";
import LeftSidePanel from "./components/LeftSidePanel.vue";
import MainArea from "./components/MainArea.vue";
import { useADKChatStore } from "@/store/modules/adk.store";
import { adkService } from "@/api/adk.service";
import { AccessiblePromise } from "@/views/adk/utils";
const adkStore = useADKChatStore();
const {
  sessionList,
  messageList,
  operatingFormEventId,
  currentSession,
  user_info,
  eventData,
  operatingFormIndex,
  userFormConfig,
  backendSessionList,
  needToFilterSessionList,
  loginInfo
} = storeToRefs(adkStore);

const emit = defineEmits(["getDetail"]);
defineOptions({
  name: "ADK"
});
function init() {
  const { userId, token, backendUrl } = parseUrlParams();
  userId && adkStore.setUserId(userId);
  token && adkStore.setToken(token);
  backendUrl && adkStore.setBackendUrl(backendUrl);
  adkStore.getSessionList();
  adkStore.getListReady.then(async () => {
    // filterSessionListFromBackend 已在 getSessionList 内部调用，无需重复
    await handleSessionAfterFilter();
  });
}
function bindEventHandlers() {
  // 增加监听message事件
  window.addEventListener("message", event => {
    console.log(
      "📢 【iframe收到了message事件】 【",
      event.data.key,
      "】",
      event.data
    );
    switch (event.data.key) {
      case "startRunTask":
        adkStore.startSessionPolling(6);
        break;
      case "startQueryFormRes":
        adkStore.startSessionPolling(7, 600);
        break;
      case "task-state":
        const state = event.data.state;
        if (["error", "noLogin"].includes(state)) {
          adkStore.stopSessionPolling();
        } else if (state === "success") {
          const eventId = event.data.eventId;
          for (let i = 0; i < messageList.value.length; i++) {
            const message = messageList.value[i];
            if (message.eventId === eventId && message.taskInfo) {
              console.log("==== 找到成功运行的message: ", message);
              message.taskInfo.state = "success";
              break;
            }
          }
        }
        break;

      case "submitFormConfig":
        console.log("==== 提交表单", event.data);
        // 更新对话
        adkService
          .modifyEvent(
            user_info.value.user_id,
            currentSession.value.id,
            operatingFormEventId.value,
            eventData.value
              .get(operatingFormEventId.value)
              .content.parts[0].text.replace(
                userFormConfig.value[0],
                event.data.data
              )
          )
          .then((res: any) => {
            if (res && res.success) {
              // 更新本地eventData
              messageList.value[
                operatingFormIndex.value - 1
              ].userFormConfig[0] = event.data.data;
              window.parent.postMessage(
                {
                  key: "modified-event-success",
                  type: "_modified-event-success",
                  sessionId: currentSession.value.id
                },
                "*"
              );
            }
          });
        break;
      case "updateSessionList":
        needToFilterSessionList.value = true;
        const remoteSessions = event.data.sessions;
        backendSessionList.value = remoteSessions;
        // 重置 getListReady，确保等待新的数据获取完成
        adkStore.getListReady = new AccessiblePromise<void>();
        adkStore.getSessionList();
        adkStore.getListReady.then(async () => {
          // filterSessionListFromBackend 已在 getSessionList 内部调用，无需重复
          await handleSessionAfterFilter();
        });
        break;
      case "loginRemoter":
        loginInfo.value.remoter = event.data.remoter;
        loginInfo.value.userName = event.data?.userName || "";
        break;
      case "logout":
        loginInfo.value.remoter = "";
        loginInfo.value.userName = "";
        break;
      default:
        break;
    }
  });
}
function parseUrlParams() {
  let searchParams = new URLSearchParams(window.location.search);
  if (
    !searchParams.has("userId") &&
    !searchParams.has("session") &&
    !searchParams.has("token")
  ) {
    const hash = window.location.hash || "";
    const hashQuery = hash.includes("?") ? hash.split("?")[1] : "";
    searchParams = new URLSearchParams(hashQuery);
  }
  console.log("searchParams", searchParams, searchParams.get("backendUrl"));
  return {
    userId: searchParams.get("userId"),
    sessionId: searchParams.get("session"),
    token: searchParams.get("token"),
    backendUrl: searchParams.get("backendUrl")
  };
}

// async function bootstrapSession() {
//   const { userId, sessionId } = parseUrlParams();
//   userId && adkStore.setUserId(userId);
//   const initSessionId =
//     sessionId &&
//     backendSessionList.value.find(session => session.session === sessionId)
//       ? sessionId
//       : await ensureSessionList();
//   await adkStore.setCurrentSession(initSessionId);
// }

async function handleSessionAfterFilter() {
  const { sessionId } = parseUrlParams();
  const filteredList = sessionList.value;

  // 筛选后列表为空，创建新 session
  if (!filteredList.length) {
    await adkStore.createNewSession();
    return;
  }

  // URL 中指定的 sessionId 在筛选后的列表中，直接渲染
  if (sessionId && filteredList.some(session => session.id === sessionId)) {
    await adkStore.setCurrentSession(sessionId);
    return;
  }

  // 否则切换为筛选后列表的第一个
  await adkStore.setCurrentSession(filteredList[0].id);
}

async function ensureSessionList() {
  if (!sessionList.value.length) {
    await adkStore.getSessionList();
    // await adkStore.getListReady;
    // adkStore.filterSessionListFromBackend();
  }
  return sessionList.value[0]?.id;
}

onMounted(async () => {
  console.log("⬇️⬇️⬇️⬇️⬇️⬇️ 挂载了ADK组件 ⬇️⬇️⬇️⬇️⬇️⬇️");
  init();
  bindEventHandlers();
  await nextTick();
  window.parent.postMessage(
    {
      key: "adkReady"
    },
    "*"
  );
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
      <el-splitter-panel :min="274" :max="500" :size="274">
        <LeftSidePanel />
      </el-splitter-panel>

      <el-splitter-panel :min="200">
        <MainArea />
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>
