// import i18n from "@/locales";
// import { ElMessage } from "element-plus";
// import { showSuccessToast } from "vant";
import { storeToRefs } from "pinia";
import { useADKChatStore } from "@/store/modules/adk.store";
import { getParentEventId, getParentInvocationId } from ".";
// import { taskService } from "@/api/adk.service";

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

export const onRunDom = async (node: any) => {
  const content =
    typeof node === "string"
      ? node
      : (node?.innerText ?? node?.textContent ?? "");
  if (!content) return;
  const adkStore = useADKChatStore();
  const invocationId = getParentInvocationId(node);
  const { currentSession } = storeToRefs(adkStore);

  console.log("获取的代码内容\n", content, "\n invocationId: ", invocationId);
  // try {
  //   const res: any = await taskService.rerunTask({
  //     user_id: adkStore.user_info?.user_id,
  //     session_id: currentSession.value.id,
  //     invocation_id: invocationId
  //   });
  //   if (res.success) {
  //     ElMessage.success("任务已重新运行");
  //     adkStore.startSessionPolling(11);
  //   } else {
  //     ElMessage.error("任务重新运行失败");
  //   }
  // } catch (error) {
  //   console.error("任务重新运行失败", error);
  //   ElMessage.error("任务重新运行失败");
  //   return;
  // }

  window.parent.postMessage(
    {
      key: "rerunTask",
      type: "rerunTask",
      user_id: adkStore.user_info?.user_id,
      session_id: currentSession.value.id,
      invocation_id: invocationId
    },
    "*"
  );
};

export const onRunDom_raw = (node: any) => {
  const content =
    typeof node === "string"
      ? node
      : (node?.innerText ?? node?.textContent ?? "");
  if (!content) return;
  const adkStore = useADKChatStore();
  const { currentSession } = storeToRefs(adkStore);
  const eventId = getParentEventId(node);

  let subtype = "";
  if (typeof node !== "string" && node?.querySelector) {
    const codeNode = node.querySelector("code");
    if (codeNode) {
      const classes = Array.from(codeNode.classList);
      const langClass = classes.find((cls: any) => cls.startsWith("language-"));
      if (langClass) {
        subtype = `code/${(langClass as string).replace("language-", "").toLowerCase()}`;
      }
    }
  }

  console.log("获取的代码内容\n", content, "\neventId\n", eventId);
  window.parent.postMessage(
    {
      key: "rerunTask",
      type: "rerunTask",
      text: content,
      subtype: subtype || undefined,
      session:
        currentSession.value.id ?? window.sessionStorage.getItem("sessionId"),
      eventId: eventId
    },
    "*"
  );
};
