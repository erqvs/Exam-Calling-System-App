<!-- src/components/Home.vue -->
<template>
    <div class="home-container">
      <h2>欢迎来到排队系统</h2>
      <p>请选择你要进入的页面:</p>
      <el-button type="primary" @click="navigateTo('/registration')">信息录入页面</el-button>
      <el-button type="primary" @click="navigateTo('/notification')">老师通知端页面</el-button>
      <el-button type="primary" @click="navigateTo('/status')">排队状态查看页面</el-button>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent } from 'vue';
  import { useRouter } from 'vue-router';
  
  export default defineComponent({
    name: 'Home',
    setup() {
      const router = useRouter();
  
      const navigateTo = (path: string) => {
        router.push(path);
      };
  
      return {
        navigateTo,
      };
    },
  });
  </script>
  
  <style scoped>
  .home-container {
    text-align: center;
    padding: 20px;
  }
  .el-button {
    margin: 10px;
  }
  </style>
  