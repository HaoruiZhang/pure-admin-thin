// import i18n from "@/locales";
// import { ElMessage } from "element-plus";
// import { showSuccessToast } from "vant";
import { storeToRefs } from "pinia";
import { useADKChatStore } from "@/store/modules/adk.store";
import { getParentEventId } from ".";
export const onCopy = (text: string, tooltip?: string) => {
  const oInput = document.createElement("input");
  oInput.value = text;
  document.body.appendChild(oInput);
  oInput.select(); // 选择对象
  document.execCommand("Copy"); // 执行浏览器复制命令
  oInput.className = "oInput";
  oInput.style.display = "none";
  console.log("tooltip", tooltip);
  // if (window.isMobile) {
  //   showSuccessToast(tooltip || i18n.global.t("copilot.copySuccess"));
  // } else {
  //   ElMessage.success(tooltip || i18n.global.t("copilot.copySuccess"));
  // }
};

// 实现选中dom节点复制
export const onCopyDom = (node: any) => {
  window.getSelection()!.removeAllRanges(); // 清除选中的文本
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection() as Selection;
  selection.addRange(range); // 添加选中的内容
  document.execCommand("copy"); // 执行复制
  window.getSelection()!.removeAllRanges(); // 清除复制选中的文本
  // if (window.isMobile) {
  //   showSuccessToast(i18n.global.t("copilot.copySuccess"));
  // } else {
  //   ElMessage.success(i18n.global.t("copilot.copySuccess"));
  // }
};

export const onRunDom = (node: any) => {
  const content =
    typeof node === "string"
      ? node
      : (node?.innerText ?? node?.textContent ?? "");
  if (!content) return;
  const adkStore = useADKChatStore();
  const { currentSession } = storeToRefs(adkStore);
  const eventId = getParentEventId(node);
  console.log("获取的代码内容\n", content, "\neventId\n", eventId);
  window.parent.postMessage(
    {
      key: "workflowContent",
      type: "workflowContent",
      text: content,
      session:
        currentSession.value.id ?? window.sessionStorage.getItem("sessionId"),
      eventId: eventId
    },
    "*"
  );
};
