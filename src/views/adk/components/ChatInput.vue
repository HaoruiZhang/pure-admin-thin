<script setup lang="ts">
import { ref } from "vue";

defineOptions({
  name: "ADK-ChatInput"
});
const textarea = ref("");
</script>

<template>
  <div class="chat-input">
    <el-input
      v-model="textarea"
      style="width: 100%"
      resize="none"
      :rows="5"
      type="textarea"
      placeholder="Ask a question or make a request"
    />
  </div>
</template>
<style scoped>
.chat-input {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100% - 8px);

  /* padding: 16px; */

  /* background-color: #f5f5f5; */

  /* margin-top: 16px; */
  border-radius: 8px;

  /* border: solid 1px green; */

  /* margin-top: 4px; */
}
</style>
