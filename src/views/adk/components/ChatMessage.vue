<script setup lang="ts">
import { onMounted, ref, nextTick, onUnmounted } from "vue";
import { sessionRes } from "./sessionRes";
import { md, mdNoBtn } from "../utils/markdown";
import { onCopyDom } from "../utils";

interface ObjectAny {
  [key: string]: any;
}
// interface FunctionCallItem {
//   functionCall: {
//     id: string;
//     name: string;
//     args: ObjectAny;
//   };
// }
// interface FunctionResponseItem {
//   functionResponse: {
//     id: string;
//     name: string;
//     response: ObjectAny;
//   };
// }
interface EventItem {
  content: {
    parts: any[];
    role: string;
  };
  partial?: boolean;
  invocationId: string;
  author: string;
  actions?: {
    stateDelta?: ObjectAny;
    artifactDelta?: ObjectAny;
    requestedAuthConfigs?: ObjectAny;
  };
  longRunningToolIds: any[];
  id: string;
  timestamp: number;
}
defineOptions({
  name: "ADK-ChatMessage"
});
// props
const props = defineProps<{
  sendLoading: boolean;
}>();
// refs
const messageRef = ref<any[]>([]);
const messageList = ref<EventItem[]>([...sessionRes.events]);

const scrollRef = ref<any>(null);
const innerRef = ref<HTMLElement | null>(null);
// 判断是否代码控制滚动
const isProgrammaticScroll = ref(true);
const autoScrollDownDisabled = ref(false);
const scrollDown = () => {
  if (autoScrollDownDisabled.value) return;
  isProgrammaticScroll.value = true;
  scrollRef.value?.setScrollTop(innerRef.value?.clientHeight);
};
const onScroll = ({ scrollTop }: { scrollTop: number }) => {
  if (isProgrammaticScroll.value) {
    // 延迟重置，避免事件同步问题
    autoScrollDownDisabled.value = false;
    setTimeout(() => {
      isProgrammaticScroll.value = false;
    }, 0);
  } else {
    if (!props.sendLoading) return;
    const wrapEl = scrollRef.value?.wrapRef;
    if (!wrapEl || !innerRef.value) return;
    const isAtBottom =
      wrapEl.scrollTop + wrapEl.clientHeight >= wrapEl.scrollHeight - 40; // 40px的容差
    autoScrollDownDisabled.value = !isAtBottom;
  }
};
async function scrollToBottom() {
  await nextTick();
  setTimeout(() => {
    scrollRef.value.wrapRef.scrollTo({
      top: scrollRef.value.wrapRef.scrollHeight,
      behavior: "smooth"
    });
  }, 500);
}
// onMounted(() => {
//   setTimeout(() => {
//     scrollToBottom();
//   }, 1000);
// });

onMounted(() => {
  // 抛出代码复制按钮点击事件到全局，方便html字符串添加点击事件
  (window as any).onCopyClick = (event: any) => {
    const dom = event.parentNode.parentNode.parentNode?.children[1];
    onCopyDom(dom);
  };
  // innerRef.value?.addEventListener("click", handleLinkClick);
});

onUnmounted(() => {
  // 清除事件监听器
  // innerRef.value?.removeEventListener("click", handleLinkClick);
  (window as any).onCopyClick = null;
});
</script>

<template>
  <div class="chat-message">
    <el-scrollbar
      ref="scrollRef"
      :class="['message-scrollbar', { 'show-stop': sendLoading }]"
      @scroll="onScroll"
      @mouseenter="autoScrollDownDisabled = true"
      @mouseleave="autoScrollDownDisabled = false"
    >
      <div ref="innerRef" class="message-list-inner">
        <template v-for="(item, index) in messageList" :key="index">
          <div
            v-if="
              !(
                item.content.parts[0].text &&
                item.content.parts[0].text.startsWith('<backend-reply-start>')
              )
            "
            :ref="
              el =>
                el ? (messageRef[item.id] = el) : delete messageRef[item.id]
            "
            :class="['message-box', { 'from-user': item.author === 'user' }]"
          >
            <div class="mat-col AI-mat">
              <el-button v-if="item.author !== 'user'">StAgent </el-button>
            </div>
            <div
              :class="[
                'content-box',
                'dark:text-white!',
                {
                  function:
                    item.content.parts[0].functionCall ||
                    item.content.parts[0].functionResponse
                }
              ]"
            >
              <div v-if="item.content.parts[0].functionCall">
                {{ item.content.parts[0].functionCall?.name }}
              </div>
              <div v-if="item.content.parts[0].functionResponse">
                {{ item.content.parts[0].functionResponse?.name }}
              </div>
              <!-- <span style="white-space: pre-wrap">{{
                item.content.parts[0].text
              }}</span> -->
              <div
                v-if="item.content.parts[0].text"
                v-html="md.render(item.content.parts[0].text)"
              />
            </div>
            <div class="mat-col user-mat">
              <el-button v-if="item.author === 'user'">User </el-button>
            </div>
          </div>
        </template>
        <div
          :ref="
            el =>
              el ? (messageRef['loading'] = el) : delete messageRef['loading']
          "
          class="message-box"
        >
          <div class="mat-col AI-mat">
            <el-button>StAgent </el-button>
          </div>
          <div class="content-box">
            <span style="white-space: pre-wrap">loading</span>
          </div>
          <div class="mat-col user-mat" />
        </div>

        <!-- <div :class="['message-box', { 'from-user': item.author === 'user' }]">
          <template
            v-if="
              item.content.parts[0].text &&
              !item.content.parts[0].text.startsWith('<backend-reply-start>')
            "
          >
            <div class="mat-col AI-mat">
              <el-button v-if="item.author !== 'user'">StAgent </el-button>
            </div>
            <div class="content-box">
              <div v-if="item.content.parts[0].functionCall">
                {{ item.content.parts[0].functionCall?.name }}
              </div>
              <div v-if="item.content.parts[0].functionResponse">
                {{ item.content.parts[0].functionResponse?.name }}
              </div>
              <span
                v-if="
                  item.content.parts[0].text &&
                  !item.content.parts[0].text.startsWith(
                    '<backend-reply-start>'
                  )
                "
                style="white-space: pre-wrap"
                >{{ item.content.parts[0].text }}</span
              >
            </div>
            <div class="mat-col user-mat">
              <el-button v-if="item.author === 'user'">User </el-button>
            </div>
          </template>
        </div> -->
      </div>
    </el-scrollbar>
  </div>
</template>
<style scoped>
.chat-message {
  width: 100%;
  height: 100%;

  /* margin-top: 16px; */
  border-radius: 8px;

  .message-list-inner {
    .message-box {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      padding: 16px 12px;
      margin: 4px 0;

      &.from-user {
        justify-content: flex-end;

        .content-box {
          width: unset;
          max-width: calc(100% - 176px);
        }
      }

      .mat-col {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 80px;
        min-height: 32px;

        button {
          width: 100%;
        }
      }

      .content-box {
        width: calc(100% - 176px);
        padding: 12px 16px;

        /* flex: 1; */

        /* width: 100%; */

        /* background-color: var(--el-bg-color-light); */
        font-family: Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;

        /* color: #25282c; */
        word-break: break-word;
        border-radius: 8px;
        box-shadow: rgb(199 199 199 / 50%) 0 2px 8px 0;

        &.function {
          width: unset;
          max-width: calc(100% - 176px);
        }
      }

      /* 代码块设置 */
      pre {
        /* margin-top: 24px; */
        position: relative;
        overflow-x: auto;
        word-break: break-all;
        word-wrap: normal;
        white-space: pre-wrap;

        /* margin: 0; */
        border-radius: 4px;
      }

      pre + pre {
        margin-top: 12px;
      }
    }
  }

  /* ol,
  ul,
  menu {
    padding: unset;
    margin: unset;
    list-style: unset;
  } */
}
</style>
<style scoped>
@keyframes dotting {
  25% {
    box-shadow: 4px 0 0 #333;
  }

  50% {
    box-shadow:
      4px 0 0 #333,
      14px 0 0 #333;
  }

  75% {
    box-shadow:
      4px 0 0 #333,
      14px 0 0 #333,
      24px 0 0 #333;
  }
}

@keyframes blinker {
  0% {
    visibility: visible;
  }

  50% {
    visibility: hidden;
  }

  100% {
    visibility: visible;
  }
}

:deep(*) {
  box-sizing: border-box;
}

:deep(#dot) {
  display: inline-block;
  width: 2px;
  height: 2px;
  border-radius: 2px;
  animation: dotting 2.4s infinite step-start;
}

/* 闪烁光标 */
:deep(.typing::after) {
  content: "_";
  animation: blinker 1s step-end infinite;
}

.answer-text {
  pre {
    position: relative;
    margin: 0;
    overflow-x: auto;
    word-break: break-all;
    word-wrap: normal;
    white-space: pre-wrap;
    border-radius: 4px;
  }

  pre + pre {
    margin-top: 12px;
  }
}

/* .chat-preview {
  padding: 24px 0;
  flex: 1;
  display: flex;
  flex-direction: column;
} */

.header {
  padding: 0 30px 24px;

  .title {
    font-size: 16px;
    font-weight: bold;
  }

  .sub-title {
    margin-left: 8px;
    font-size: 12px;
    color: #939cab;
  }
}

:deep(.code-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 16px;
  color: #414855;
  background: #ebedf0;
  border-radius: 4px 4px 0 0;

  .code-copy {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #939cab;
    cursor: pointer;
    user-select: none;

    &:hover {
      color: var(--el-color-primary);

      &::before {
        background: var(--el-color-primary);
      }
    }

    &::before {
      display: block;
      width: 16px;
      height: 16px;
      margin-right: 4px;
      content: "";
      background: #939cab;
    }
  }
}

/* :deep(.hljs) {
  background: #f3f5f7;
  border-radius: 0 0 4px 4px;
} */

.message:not(:last-child) {
  margin-bottom: 16px;
}

/* .recommend {
  width: 100%;
}

.recommend,
.question {
  .message-box {
    padding: 16px;
  }
}
.answer {
  .message-box {
    position: relative;
    width: 100%;
    padding: 16px 0;
    margin-top: 22px;
    .bot-name {
      position: absolute;
      line-height: 22px;
      top: -26px;
      color: #939cab;
      white-space: nowrap;
    }
  }
}

.recommend,
.question,
.answer {
  display: flex;

  .message-box {
    border-radius: 4px;
    line-height: 1.5;
    margin-left: 8px;

    .answer-text {
      padding: 0 16px;

      :deep(& > *:first-child) {
        margin-top: 0;
      }

      :deep(& > *:last-child) {
        margin-bottom: 0;
      }

      :deep(p) {
        margin: 8px 0;
      }

      :deep(pre) {
        position: relative;
        word-wrap: normal;
        word-break: break-all;
        white-space: pre-wrap;
        overflow-x: auto;
        margin-top: 0;
        border-radius: 4px;
      }

      :deep(&.complete) {
        .typing::after {
          display: none;
        }
      }

      :deep(ol > li) {
        padding-left: 8px;
      }

      :deep(ol),
      :deep(ul) {
        padding-inline-start: 16px;
        & > li::marker {
          color: #bec4cd;
        }
      }
    }

    .answer-footer {
      padding: 8px 16px 0;
    }

    &.max-width {
      min-width: calc(100% - 48px);
    }
  }
}

.question {
  margin-bottom: 16px;
  .message-box {
    background: var(--el-color-primary-p2);
    border: 1px solid #ebedf0;
    position: relative;
    .question-copy {
      position: absolute;
      right: 16px;
      bottom: 20px;
    }

    .filters {
      color: #939cab;
    }
  }
}
.answer,
.recommend {
  .message-box {
    background: rgba(243, 245, 247, 0.3);
    border: 1px solid #ebedf0;

    .answer-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      color: #939cab;

      .action-bar {
        line-height: 16px;
      }

      .answer-pagination {
        display: flex;
        &.hidden {
          z-index: -1;
          opacity: 0;
        }
      }
    }
  }
}

.recommend {
  .message-box {
    width: calc(100% - 48px);
    .title {
      font-weight: bold;
      font-size: 20px;
    }

    .recommend-question {
      color: #939cab;
      font-weight: bold;
      display: flex;
      align-items: center;
      height: 20px;
      margin: 8px 0 4px;
      .svg-icon {
        margin-right: 4px;
        color: #939cab;
        cursor: auto;
      }
    }

    .sub-title {
      color: #939cab;
      margin: 8px 0 0;
    }
    .question-container {
      display: grid;
      justify-content: space-between;
      grid-template-columns: repeat(auto-fill, calc(50% - 4px));
      .question-item {
         background-repeat: no-repeat;
        background-position: center;
        background-size: cover;
        height: 78px;
        border-radius: 2px;
        margin-top: 8px;
        display: flex;
        align-items: center;
        cursor: not-allowed;

        &-text {
          height: 44px;
          line-height: 22px;
          overflow: hidden;
          margin: 0 17px;
        }
      }
    }
  }
}

.message-box .svg-icon {
  cursor: pointer;
  color: #939cab;
  &.active,
  &:hover {
    color: var(--el-color-primary);
  }
  &:not(:last-child) {
    margin-right: 16px;
  }
  &:last-child {
    margin-right: 0;
  }
  &.rotateX180 {
    transform: rotateX(180deg);
    -webkit-transform: rotateX(180deg);
  }
}

.avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #ebedf0 0%, #bec4cd 100%);
  border-radius: 50%;
  font-size: 20px;
  font-weight: bold;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
} */

.message-scrollbar {
  flex: 1;
  margin-bottom: 8px;

  /* .message-list-inner {
    padding: 0 70px;
  } */
}

/* .re-answer {
  margin: 16px auto 0;

  .svg-icon {
    margin-right: 4px;
  }
}

.bot-popper-content {
  display: flex;
  padding: 11px 5px;
  .bot-img,
  .bot-avatar {
    height: 40px;
    width: 40px;
    border-radius: 4px;
    margin-right: 16px;
  }

  .bot-avatar {
    background: linear-gradient(135deg, #ebedf0 0%, #bec4cd 100%);
    border-radius: 50%;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bot-des {
    line-height: 1;
    .name {
      font-size: 16px;
      margin-bottom: 10px;
      font-weight: 500;
    }
    .msg {
      color: #414855;
      font-size: 14px;
      font-weight: 400;
    }
  }
}

.bot-bubble-container {
  height: 32px;
  margin: 8px 70px 0;
  width: fit-content;
  position: relative;
  .bot-bubble {
    height: 24px;
    line-height: 24px;
    margin-bottom: 80px;
    font-size: 12px;
    width: fit-content;
    border-radius: 120px;
    border: none;
    padding: 0 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--el-color-primary);
    background: #effaf9;
    display: flex;
    align-items: center;

    img,
    .bot-avatar-small {
      height: 12px;
      width: 12px;
      border-radius: 1px;
      margin-right: 4px;
    }

    .bot-avatar-small {
      background: linear-gradient(135deg, #ebedf0 0%, #bec4cd 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      .svg-icon {
        margin-left: 0;
        &:hover {
          color: #fff;
        }
      }
    }
    &::before {
      position: absolute;
      left: 50%;
      top: 24px;
      transform: translateX(-50%);
      content: "";
      border-width: 5px 5px 0;
      border-style: solid;
      border-color: #effaf9 transparent transparent; /* 粉 透明 透明
      transition: var(--el-transition-all);
    }
  }
}

.reference {
  margin-top: 20px;
  min-width: 200px;
  .header {
    color: #939cab;
    display: flex;
    justify-content: space-between;
    padding: 0 16px 4px;
    .rotate-90 {
      transform: rotate(-90deg);
    }
    .title .el-button.is-link {
      font-size: 16px;
      color: #939cab;
      opacity: 1;
      &:hover {
        color: var(--el-color-primary);
      }
      .svg-icon {
        margin-right: 4px;
      }
    }
  }

  &-item {
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    &:not(:last-child) {
      border-bottom: 1px solid #ebedf0;
    }

    &:last-child {
      margin-bottom: -16px;
    }
    .svg-icon {
      opacity: 0;
    }
    .index {
      color: #bec4cd;
      margin-right: 14px;
    }

    &:hover {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-10);
      .svg-icon {
        opacity: 1;
      }
    }
    a {
      color: #232332;
      text-decoration: none;
      &:hover {
        color: var(--el-color-primary);
      }
    }
  }
}

.input-panel {
  margin: 0 70px;
  min-height: 98px;
  height: fit-content;
  border: 1px solid #ebedf0;
  border-radius: 4px;
  position: relative;
  transition: var(--el-transition-all);

  :deep(.el-textarea) {
    margin-bottom: 40px;
    --el-input-placeholder-color: #bec4cd;
  }

  .svg-icon {
    margin-right: 4px;
  }

  &.focus {
    border-color: var(--el-color-primary);
  }

  :deep(.el-textarea__inner) {
    box-shadow: none;
    padding: 16px 16px 0;
  }
  &-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin: 16px;
    background: transparent;

    .action-bar {
      display: flex;
      &-item {
        display: flex;
        align-items: center;
        color: var(--el-text-color-disabled);
        cursor: not-allowed;
        span {
          @media (max-width: 780px) {
            display: none;
          }
        }
      }
    }
  }
} */
</style>
