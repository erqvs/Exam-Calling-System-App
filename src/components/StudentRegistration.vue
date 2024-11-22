<template>
    <div class="student-registration" id="apc">
        <h2>
            人工录入学生信息
            <span style="margin-left: 20px; font-size: 16px; color: #555;">
                上一位考生编号为：<span style="color: red;">{{ lastStudentId !== null ? lastStudentId : '无' }}</span> &nbsp;&nbsp;&nbsp;
                <el-button type="danger" @click="clearQueueData">清除所有数据</el-button>
            </span>
        </h2>

        <!-- 表单 -->
        <el-form @submit.prevent="submitStudentInfo">
            <el-form-item label="姓&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;名" :error="nameError">
                <el-input v-model="studentInfo.name" placeholder="请输入姓名" @input="validateName" />
            </el-form-item>
            <el-form-item label="身份证号" :error="idCardError">
                <el-input v-model="studentInfo.idCardNumber" placeholder="请输入身份证号（可选）" @input="validateIdCard"
                    maxlength="18" />
            </el-form-item>
            <el-button type="primary" @click="submitStudentInfo">提交</el-button>
        </el-form>
    </div>
</template>


<script lang="ts">
import { defineComponent, reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import axios from 'axios';
import { ElNotification, ElMessageBox, ElMessage } from 'element-plus';

export default defineComponent({
    name: 'StudentRegistration',
    setup() {
        const studentInfo = reactive({
            idCardNumber: '',
            name: '',
        });

        const idCardError = ref<string | null>(null);
        const nameError = ref<string | null>(null);
        const lastStudentId = ref<number | null>(null); // 用于存储上一位考生编号
        let socket: WebSocket; // 声明 WebSocket 变量

        // 清除 queue_info 数据并重置 AUTO_INCREMENT
        const clearQueueData = () => {
            ElMessageBox.confirm(
                '此操作将清除所有学生数据，且操作无法撤销，是否继续？',
                '警告',
                {
                    confirmButtonText: '确认',
                    cancelButtonText: '取消',
                    type: 'warning',
                }
            ).then(async () => {
                try {
                    const response = await axios.post('http://172.22.228.69:3001/api/queue/clear');
                    ElNotification({
                        type: 'success',
                        message: response.data.message,
                    });
                    lastStudentId.value = null; // 清除成功后重置最后一个考生 ID
                } catch (error) {
                    console.error('清除数据失败:', error);
                    ElNotification({
                        type: 'error',
                        message: '清除数据失败，请重试。',
                    });
                }
            }).catch(() => {
                ElNotification({
                    type: 'info',
                    message: '操作已取消。',
                });
            });
        };


        // 获取最后一个考生的 ID
        const fetchLastStudentId = async () => {
            try {
                const response = await axios.get('http://172.22.228.69:3001/api/queue/list');
                const students = response.data;
                if (students.length > 0) {
                    lastStudentId.value = students[students.length - 1].id; // 获取最后一个考生的 ID
                } else {
                    lastStudentId.value = 0; // 如果没有考生，则设为 null
                }
            } catch (error) {
                console.error('获取最后一个考生ID失败:', error);
                lastStudentId.value = 0;
            }
        };

        // 验证身份证号，只允许18位数字，最后一位可以是英文字符
        const validateIdCard = () => {
            if (studentInfo.idCardNumber) { // 如果身份证号不为空，才进行验证
                const idCardRegex = /^[0-9]{17}[0-9Xx]?$/;  // 17位数字，最后一位可以是数字或字母X
                if (!idCardRegex.test(studentInfo.idCardNumber)) {
                    idCardError.value = '身份证号应为18位数字，最后一位可以是字母X';
                } else {
                    idCardError.value = null;
                }
            } else {
                idCardError.value = null; // 如果为空则不报错
            }
        };

        // 验证姓名，只允许中文和英文
        const validateName = () => {
            const nameRegex = /^[\u4e00-\u9fa5a-zA-Z]+$/;  // 只允许中文和英文字符
            if (!nameRegex.test(studentInfo.name)) {
                nameError.value = '姓名只能包含中文和英文字符';
            } else {
                nameError.value = null;
            }
        };


        // 提交学生信息
        const submitStudentInfo = () => {
            // 验证输入有效性
            validateIdCard();
            validateName();

            if (idCardError.value || nameError.value) {
                ElNotification({
                    title: '错误！',
                    message: '请修正错误后再提交',
                    type: 'error',
                    duration: 5000,
                });
                return;
            }

            axios.post('http://172.22.228.69:3001/api/queue/add', studentInfo)
                .then(response => {
                    const currentStudentId = lastStudentId.value + 1;
                    ElMessageBox.confirm(
                        `<div style="font-size: 100px;    line-height: normal;   color: red;">${currentStudentId}</div>`,
                        '考生编号',
                        {
                            confirmButtonText: '确定',
                            cancelButtonText: '取消',
                            dangerouslyUseHTMLString: true,
                            center: true,

                        }
                    );

                    // // 发送 WebSocket 消息通知其他客户端
                    // if (socket && socket.readyState === WebSocket.OPEN) {
                    //     socket.send('new student added');
                    // }

                    // 清空输入字段
                    studentInfo.idCardNumber = '';
                    studentInfo.name = '';
                    fetchLastStudentId(); // 更新最后一个考生的 ID
                })
                .catch(error => {
                    console.error('添加学生信息失败:', error);
                    ElNotification({
                        title: '致命错误！',
                        message: '添加学生信息失败，请重试。',
                        type: 'error',
                        duration: 5000,
                    });
                });
        };

        // 连接 WebSocket 服务器
        const connectWebSocket = () => {
            socket = new WebSocket('ws://172.22.228.69:3001'); // 使用 WebSocket 服务器的地址

            // 处理 WebSocket 连接关闭
            socket.onclose = () => {
                ElNotification({
                    type: 'warning',
                    message: 'WebSocket 连接已关闭，尝试重新连接。',
                });
                setTimeout(connectWebSocket, 5000); // 5秒后重试连接
            };

            // 处理 WebSocket 错误
            socket.onerror = (error) => {
                console.error('WebSocket 发生错误:', error);
                ElNotification({
                    type: 'error',
                    message: 'WebSocket 发生错误，请检查网络连接。',
                });
            };
        };

        onMounted(() => {
            connectWebSocket(); // 组件挂载时连接 WebSocket 服务器
            fetchLastStudentId(); // 获取最后一个考生的 ID
        });

        onBeforeUnmount(() => {
            if (socket) {
                socket.close(); // 组件卸载前关闭 WebSocket 连接
            }
        });

        return {
            studentInfo,
            idCardError,
            nameError,
            lastStudentId,
            clearQueueData,
            validateIdCard,
            validateName,
            submitStudentInfo,
        };
    }
});
</script>
<style scoped>
/* 添加 scoped 属性确保样式只应用于当前组件 */
.el-message-box__content {
    /* 设置自定义高度，例如 200px */
    height: 1000px !important;
}

#apc {
    font-family: Arial, sans-serif;
    text-align: center;
    padding: 60px;
    /* 默认的 padding */
}
</style>