<template>
    <div class="container" id="apc">
        <h2>老师通知端</h2>

        <!-- 新增考场按钮 -->
        <el-button type="primary" @click="showAddRoomDialog">新增考场</el-button>
        <!-- 删除考场按钮 -->
        <el-button type="danger" @click="openDeleteDialog">删除考场</el-button>
        <el-button type="success" @click="redoLastCall"
            :disabled="!lastStudentId || !lastStudentName || !lastRoom">重新叫号</el-button>

        <!-- 弹出框 - 输入考场名称 -->
        <el-dialog v-model="addRoomDialogVisible" title="新增考场">
            <el-input v-model="newRoomName" placeholder="请输入考场名称" />
            <p></p>
            <span slot="footer" class="dialog-footer">
                <el-button @click="addRoomDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="addExamRoom">确定</el-button>
            </span>
        </el-dialog>

        <!-- 弹出框 - 删除考场 -->
        <el-dialog v-model="deleteRoomDialogVisible" title="删除考场">
            <el-checkbox-group v-model="selectedRooms">
                <el-checkbox v-for="room in rooms" :key="room.room_info" :label="room.room_info">{{ room.room_info }}</el-checkbox>
            </el-checkbox-group>
            <p></p>
            <span slot="footer" class="dialog-footer">
                <el-button @click="deleteRoomDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="confirmDelete">确定</el-button>
            </span>
        </el-dialog>

        <!-- 动态生成的考场按钮 -->
        <div v-if="rooms.length > 0" class="room-container">
            <div v-for="(row, rowIndex) in roomRows" :key="rowIndex" class="button-row">
                <div v-for="room in row" :key="room.room_info" class="button-wrapper">
                    <!-- 考场名称按钮 -->
                    <el-button class="room-button" @click="handleRoomClick(room.room_info)"
                        :style="{ width: `${maxButtonWidth}px`, height: `${maxButtonHeight}px` }">
                        {{ `${room.room_info}（${room.current_student || '暂无考生'}）` }}
                    </el-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';

export default defineComponent({
    name: 'TeacherNotification',
    setup() {
        const addRoomDialogVisible = ref(false);
        const deleteRoomDialogVisible = ref(false);
        const newRoomName = ref('');
        const rooms = ref<string[]>([]);
        const selectedRooms = ref<string[]>([]);
        const selectedStudent = ref<{ id: number; name: string } | null>(null);
        const selectedRoom = ref<string>('');
        const notificationSocket = new WebSocket('ws://172.22.228.69:3001');

        // 用于重新叫号的存储变量
        const lastStudentId = ref<string | null>(null);
        const lastStudentName = ref<string | null>(null);
        const lastRoom = ref<string | null>(null);

        const roomRows = computed(() => {
            if (rooms.value.length === 0) return [];
            const rows = [];
            for (let i = 0; i < rooms.value.length; i += 10) {
                rows.push(rooms.value.slice(i, i + 10));
            }
            return rows;
        });

        const buttonWidths = ref<number[]>([]);
        const buttonHeights = ref<number[]>([]);

        const maxButtonWidth = computed(() => Math.max(...buttonWidths.value, 100));
        const maxButtonHeight = computed(() => Math.max(...buttonHeights.value, 40));

        const showAddRoomDialog = () => {
            addRoomDialogVisible.value = true;
        };

        const openDeleteDialog = () => {
            deleteRoomDialogVisible.value = true;
        };

        const connectWebSocket = () => {
            notificationSocket.onopen = () => {
                console.log('老师通知端 WebSocket 连接成功');
            };

            notificationSocket.onerror = (error) => {
                console.error('WebSocket 错误:', error);
            };

            notificationSocket.onclose = () => {
                console.warn('WebSocket 连接关闭，尝试重新连接...');
                setTimeout(connectWebSocket, 5000); // 5秒后重试连接
            };
        };

        const addExamRoom = async () => {
            if (!newRoomName.value.trim()) {
                ElMessage({
                    type: 'warning',
                    message: '请输入有效的考场名称。',
                });
                return;
            }
            try {
                await axios.post('http://172.22.228.69:3001/api/exam_rooms/add', { roomInfo: newRoomName.value });
                ElMessage({
                    type: 'success',
                    message: '考场已添加',
                });
                addRoomDialogVisible.value = false;
                newRoomName.value = '';
                fetchRooms();
            } catch (error) {
                console.error('添加考场失败:', error);
                ElMessage({
                    type: 'error',
                    message: error.response?.data?.error || '添加考场失败，请重试。',
                });
            }
        };

        const fetchRooms = async () => {
            try {
                const response = await axios.get('http://172.22.228.69:3001/api/exam_rooms');
                rooms.value = response.data;
                setButtonSizes();
            } catch (error) {
                console.error('获取考场列表失败:', error);
            }
        };

        const setButtonSizes = () => {
            buttonWidths.value = rooms.value.map(room => room.length * 16 + 20);
            buttonHeights.value = rooms.value.map(() => 40);
        };

        const confirmDelete = () => {
            if (selectedRooms.value.length === 0) {
                ElMessage({
                    type: 'warning',
                    message: '请至少选择一个考场进行删除。',
                });
                return;
            }

            ElMessageBox.confirm(
                `请确认是否删除 ${selectedRooms.value.join('，')} 考场？`,
                '删除确认',
                {
                    confirmButtonText: '确认',
                    cancelButtonText: '取消',
                    type: 'warning',
                }
            ).then(() => {
                deleteSelectedRooms();
            }).catch(() => {
                ElMessage({
                    type: 'info',
                    message: '操作已取消。',
                });
            });
        };

        const deleteSelectedRooms = async () => {
            try {
                await axios.post('http://172.22.228.69:3001/api/exam_rooms/delete', { rooms: selectedRooms.value });
                ElMessage({
                    type: 'success',
                    message: '考场已删除',
                });
                deleteRoomDialogVisible.value = false;
                selectedRooms.value = []; // 清空选择的考场名称
                fetchRooms();
            } catch (error) {
                console.error('删除考场失败:', error);
                ElMessage({
                    type: 'error',
                    message: '删除考场失败，请重试。',
                });
            }
        };

        const fetchNextStudent = async () => {
            try {
                const response = await axios.get('http://172.22.228.69:3001/api/queue/next');
                selectedStudent.value = response.data.student;
            } catch (error) {
                console.error('获取下一个考生失败:', error);
                ElMessage({
                    type: 'error',
                    message: '获取下一个考生失败，请重试。',
                });
            }
        };

        const handleRoomClick = (room: string) => {
            selectedRoom.value = room;
            fetchNextStudent().then(() => {
                if (selectedStudent.value) {
                    const studentId = selectedStudent.value.id < 10 ? `0${selectedStudent.value.id}` : `${selectedStudent.value.id}`;
                    const studentName = selectedStudent.value.name;

                    // 保存最后一次叫号的信息
                    lastStudentId.value = studentId;
                    lastStudentName.value = studentName;
                    lastRoom.value = room;

                    ElMessageBox.confirm(
                        `请确认是否让 ${studentId} 号 ${studentName} 到 ${selectedRoom.value} 考试？`,
                        '确认考试',
                        {
                            confirmButtonText: '确定',
                            cancelButtonText: '取消',
                            type: 'warning',
                        }
                    ).then(() => {
                        notifyNextStudent(room, studentId, studentName);
                    }).catch(() => {
                        ElMessage({
                            type: 'info',
                            message: '操作已取消。',
                        });
                    });
                } else {
                    ElMessage({
                        type: 'info',
                        message: '当前没有需要考试的考生。',
                    });
                }
            });
        };

        const sendBroadcastMessage = (type: string, content: string) => {
            if (notificationSocket.readyState === WebSocket.OPEN) {
                notificationSocket.send(JSON.stringify({ type, content }));
            } else {
                 console.warn('WebSocket 未连接，无法发送消息');
            }
        };

        const notifyNextStudent = async (room: string, studentId: string, studentName: string) => {
            try {
                await axios.post('http://172.22.228.69:3001/api/queue/notify', { seatNumber: room });
                speakExamNotice(studentId, studentName, room);

                // 获取下一个考生信息并检查是否继续语音提示
                fetchNextStudent().then(() => {
                    if (selectedStudent.value) {
                        const nextStudentId = selectedStudent.value.id < 10 ? `0${selectedStudent.value.id}` : `${selectedStudent.value.id}`;
                        const nextStudentName = selectedStudent.value.name;
                        speakWaitNotice(nextStudentId, nextStudentName);
                    }
                });
            } catch (error) {
                console.error('通知学生失败:', error);
                ElMessage({
                    type: 'error',
                    message: '通知学生失败，请重试。',
                });
            }
        };

        // 重新叫号的逻辑
        const redoLastCall = () => {
            if (lastStudentId.value && lastStudentName.value && lastRoom.value) {
                speakExamNotice(lastStudentId.value, lastStudentName.value, lastRoom.value);
            } else {
                ElMessage({
                    type: 'info',
                    message: '没有可重新叫号的学生信息。',
                });
            }
        };

        const speakExamNotice = (studentId: string, studentName: string, room: string) => {
            const text = `请${studentId}号${studentName}到${room}考场考试`;
            sendBroadcastMessage('examNotice', text); // 发送消息
        };

        const speakWaitNotice = (studentId: string, studentName: string) => {
            const text = `${studentId}号${studentName}请准备`;
            sendBroadcastMessage('waitNotice', text); // 发送消息
        };

        onMounted(() => {
            fetchRooms(); // 初始加载获取考场信息
            connectWebSocket(); // 连接 WebSocket 服务器
        });

        return {
            addRoomDialogVisible,
            deleteRoomDialogVisible,
            newRoomName,
            rooms,
            selectedRooms,
            selectedStudent,
            selectedRoom,
            roomRows,
            maxButtonWidth,
            maxButtonHeight,
            showAddRoomDialog,
            openDeleteDialog,
            addExamRoom,
            confirmDelete,
            handleRoomClick,
            redoLastCall, // 导出重新叫号的方法
            lastStudentId,
            lastStudentName,
            lastRoom
        };
    }
});
</script>

<style scoped>
.container {
    text-align: center;
    padding: 20px;
}

.room-container {
    margin-top: 20px;
}

.button-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 10px;
    gap: 5px;
}

.button-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.room-button {
    width: 300px;
    margin-right: 5px;
}

#apc {
    font-family: Arial, sans-serif;
    text-align: center;
    padding: 60px;
    /* 默认的 padding */
}
</style>