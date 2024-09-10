<template>
  <div id="app" :class="{ 'no-padding': isQueueStatusPage }">
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useRoute } from 'vue-router';

export default defineComponent({
  name: 'App',
  setup() {
    const route = useRoute();

    // 计算属性来判断当前是否在 QueueStatus 页面
    const isQueueStatusPage = computed(() => route.name === 'QueueStatus');

    return { isQueueStatusPage };
  },
});
</script>

<style>
/* 重置全局样式 */
body {
  margin: 0;
  padding: 0;
}

/* 应用的根容器样式 */
/* #app {
  font-family: Arial, sans-serif;
  text-align: center;
  padding: 20px; /* 默认的 padding 
} */

/* 只在 QueueStatus 页面时应用此样式，移除 padding */
.no-padding {
  padding: 0 !important;
}
</style>
