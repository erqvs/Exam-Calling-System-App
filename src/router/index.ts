// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import StudentRegistration from '../components/StudentRegistration.vue';
import TeacherNotification from '../components/TeacherNotification.vue';
import QueueStatus from '../components/QueueStatus.vue';

const routes = [
  { path: '/', component: Home, name: 'Home' }, // 设置首页为默认路由
  { path: '/registration', component: StudentRegistration, name: 'StudentRegistration' },
  { path: '/notification', component: TeacherNotification, name: 'TeacherNotification' },
  { path: '/status', component: QueueStatus, name: 'QueueStatus', }, // 为 QueueStatus 设置 name
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
