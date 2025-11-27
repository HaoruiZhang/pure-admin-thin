<script setup lang="ts">
import { ref } from "vue";
import Sidebar from "./components/Sidebar.vue";
import ChatArea from "./components/ChatArea.vue";

defineOptions({
  name: "Demo2Gemini3Pro"
});

const currentConversation = ref(null);

const handleSelectChat = (chat: any) => {
  console.log("Selected chat:", chat);
  currentConversation.value = chat;
};

const handleNewChat = () => {
  console.log("New chat");
  currentConversation.value = null;
};
</script>

<template>
  <div class="demo2-container">
    <Sidebar @select-chat="handleSelectChat" @new-chat="handleNewChat" />
    <ChatArea :current-chat="currentConversation" />
  </div>
</template>

<style scoped>
.demo2-container {
  display: flex;
  width: 100%;
  height: calc(
    100vh - 86px
  ); /* Adjust based on header/layout height, usually layout-content height */

  overflow: hidden;
  background-color: #fff;
}
</style>
