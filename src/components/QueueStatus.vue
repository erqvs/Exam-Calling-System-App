<template>
    <div class="queue-container">
        <!-- 表格容器 -->
        <div class="table-container">
            <table class="status-table">
                <thead>
                    <!-- 标题部分 -->
                    <tr class="title-row">
                        <th colspan="4" class="title-cell">
                            <transition name="fade">
                                <div>
                                    <!-- 标题部分，固定为 "义乌工商职业技术学院" -->
                                    <h1 :class="{ 'marquee-text': isOverflowing('义乌工商职业技术学院', 5) }">义乌工商职业技术学院</h1>
                                </div>
                            </transition>
                        </th>
                    </tr>
                    <!-- 表格表头 -->
                    <tr class="header-row">
                        <td class="header-cell">
                            <span :class="{ 'marquee-text': isOverflowing('考场名称') }">考场名称</span>
                        </td>
                        <td class="header-cell">
                            <span :class="{ 'marquee-text': isOverflowing('当前考生') }">当前考生</span>
                        </td>
                        <td class="header-cell" colspan="2">
                            <!-- 使用2倍单元格宽度来判定“等待考生”表头文字 -->
                            <span :class="{ 'marquee-text': isOverflowing('等待考生', 2) }">等待考生</span>
                        </td>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="rowIndex in 5" :key="'row-' + rowIndex">
                        <!-- 考场名称列 -->
                        <td class="room-name">
                            <span
                                :class="{ 'marquee-text': isOverflowing(displayRooms[rowIndex - 1]?.room_info || '暂无考场') }">
                                {{ displayRooms[rowIndex - 1]?.room_info || '暂无考场' }}
                            </span>
                        </td>
                        <!-- 当前考生 -->
                        <td class="current-student">
                            <span
                                :class="{ 'marquee-text': isOverflowing(anonymizeCurrentStudent(displayRooms[rowIndex - 1]?.current_student) || '暂无') }">
                                {{ anonymizeCurrentStudent(displayRooms[rowIndex - 1]?.current_student) || '暂无' }}
                            </span>
                        </td>
                        <!-- 等待考生 -->
                        <td v-for="studentIndex in 2" :key="'student-' + studentIndex" class="waiting-student">
                            <span
                                :class="{ 'marquee-text': isOverflowing(getSortedWaitingStudents()[(rowIndex - 1) * 2 + studentIndex - 1] || ' ', 1) }">
                                {{ getSortedWaitingStudents()[(rowIndex - 1) * 2 + studentIndex - 1] || ' ' }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- 弹出框显示考生和考场信息 -->
        <!-- <div v-if="showDialog" class="call-dialog"> -->
            <!-- <div class="dialog-content"> -->
                <!-- 上部分：显示考生信息 -->
                <!-- <div class="student-info">{{ studentInfo }}</div> -->
                <!-- 中部分：显示向下箭头 -->
                <!-- <div class="arrow">↓</div> -->
                <!-- 下部分：显示考场名称 -->
                <!-- <div class="room-name">{{ roomName }}</div> -->
            <!-- </div> -->
        <!-- </div> -->

        <!-- 走马灯 -->
        <div class="marquee-container">
            <marquee class="marquee" scrollamount="10">
                考试信息：请考生按顺序入场，遵守考场纪律
            </marquee>
        </div>
    </div>
</template>



<script lang="ts">
import { defineComponent, ref, onMounted, nextTick, onBeforeUnmount } from 'vue';
import axios from 'axios';

export default defineComponent({
    name: 'QueueStatus',
    setup() {
        const rooms = ref<{ room_info: string; current_student: string | null }[]>([]);
        const currentGroupIndex = ref(0);
        const displayRooms = ref<{ room_info: string; current_student: string | null }[]>([]);
        const waitingStudents = ref<{ id: number; name: string; sign_in_time: string }[]>([]);
        const showDialog = ref(false); // 控制弹出框显示
        const studentInfo = ref(''); // 存储考生信息
        const roomName = ref(''); // 存储考场名称
        let intervalId: number;

        const fetchQueueStatus = async () => {
            try {
                // 同时获取考场信息和考生信息
                const [roomsResponse, studentsResponse] = await Promise.all([
                    axios.get('http://localhost:3001/api/exam_rooms'),
                    axios.get('http://localhost:3001/api/queue/status'),
                ]);

                rooms.value = roomsResponse.data; // 更新考场信息
                waitingStudents.value = studentsResponse.data.waitingStudents.map((student) => ({
                    ...student,
                    room: student.room,
                }));

                updateDisplayRooms(); // 更新显示的考场
            } catch (error) {
                console.error('获取队列状态失败:', error);
            }
        };

        const updateDisplayRooms = () => {
            const start = currentGroupIndex.value * 5;
            const end = start + 5;
            const group = rooms.value.slice(start, end);

            while (group.length < 5) {
                group.push({ room_info: '暂无考场', current_student: '暂无' });
            }

            displayRooms.value = group;
            currentGroupIndex.value = (currentGroupIndex.value + 1) % Math.ceil(rooms.value.length / 5);
        };

        const anonymizeName = (name: string): string => {
            if (!name) return '匿名';

            if (name.length === 2) {
                return name[0] + '*';
            } else if (name.length > 2) {
                return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
            }
            return name;
        };

        const anonymizeCurrentStudent = (student: string | null): string => {
            if (!student) return '暂无';

            const [id, name] = student.split('-').map(s => s.trim());
            if (!id || !name) return '暂无';

            return `${id} - ${anonymizeName(name)}`;
        };

        const getSortedWaitingStudents = () => {
            const sortedStudents = waitingStudents.value
                .filter(student => !student.seat_number)
                .sort((a, b) => new Date(a.sign_in_time).getTime() - new Date(b.sign_in_time).getTime())
                .map((student) => `${student.id} - ${anonymizeName(student.name)}`);

            return sortedStudents; // 返回排序后的考生列表
        };

        // 显示弹窗内容
        const showDialogWithContent = (student: string, room: string) => {
            studentInfo.value = student; // 设置考生信息
            roomName.value = room; // 设置考场名称
            showDialog.value = true; // 显示弹窗

            setTimeout(() => {
                showDialog.value = false; // 自动隐藏弹出框
            }, 10000); // 显示10秒后自动关闭
        };

        const isOverflowing = (text: string | null, multiplier: number = 1) => {
            if (!text) return false;
            const span = document.createElement('span');
            span.style.visibility = 'hidden';
            span.style.position = 'absolute';
            span.style.whiteSpace = 'nowrap';
            span.style.fontSize = 'calc((80vh / 6) * 0.7)';
            span.textContent = text;
            document.body.appendChild(span);
            const cellWidth = document.querySelector('.status-table td')?.clientWidth || 0;
            const isOverflowing = span.offsetWidth > cellWidth * multiplier;
            document.body.removeChild(span);
            return isOverflowing;
        };

        const updateMarquee = () => {
            nextTick(() => {
                document.querySelectorAll('.status-table span').forEach((span) => {
                    const text = span.textContent?.trim() || '';
                    const multiplier = span.closest('[colspan="3"]') ? 3 : 1;
                    if (isOverflowing(text, multiplier)) {
                        span.classList.add('marquee-text');
                    } else {
                        span.classList.remove('marquee-text');
                    }
                });

                const title = document.querySelector('.title-cell h1');
                if (title && isOverflowing(title.textContent?.trim() || '', 5)) {
                    title.classList.add('marquee-text');
                } else {
                    title?.classList.remove('marquee-text');
                }
            });
        };

        const connectWebSocket = () => {
            const socket = new WebSocket('ws://localhost:3001');
            socket.onmessage = (event) => {
                const message = event.data;
                if (message === 'update_queue' || message === 'update_rooms') {
                    fetchQueueStatus(); // 收到更新消息时，重新获取考场和考生信息
                } else if (message.startsWith('callout:')) {
                    const [_, student, room] = message.split(':');
                    showDialogWithContent(student, room); // 显示考生信息和考场名称
                    fetchQueueStatus();
                }
            };
            socket.onclose = () => {
                console.warn('WebSocket 连接已关闭，尝试重新连接...');
                setTimeout(connectWebSocket, 5000);
            };
            socket.onerror = (error) => {
                console.error('WebSocket 发生错误:', error);
            };
        };

        onMounted(() => {
            fetchQueueStatus();
            connectWebSocket();

            nextTick(() => {
                adjustCellSize();
                updateMarquee();
                window.addEventListener('resize', handleResize);
            });

            intervalId = window.setInterval(updateDisplayRooms, 4000);
        });

        onBeforeUnmount(() => {
            window.removeEventListener('resize', handleResize);
            clearInterval(intervalId);
        });

        const adjustCellSize = () => {
            const tableCells = document.querySelectorAll('.status-table td');
            tableCells.forEach((cell) => {
                const cellHeight = cell.clientHeight;
                cell.style.width = `${cellHeight * 3.4}px`;
            });
        };

        const handleResize = () => {
            adjustCellSize();
            updateMarquee();
        };

        return {
            displayRooms,
            waitingStudents,
            getSortedWaitingStudents,
            isOverflowing,
            updateMarquee,
            anonymizeCurrentStudent,
            showDialog,
            studentInfo,
            roomName,
            showDialogWithContent,
        };
    },
});
</script>



<style scoped>
.queue-container {
    width: 100%;
    height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 0;
    background-color: #f8f0e3;
    box-sizing: border-box;
}

.table-container {
    width: 100%;
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
}

.status-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    table-layout: fixed;
}

.title-row {
    height: 10vh;
}

.header-row,
.status-table tbody tr {
    height: calc((80vh) / 6);
}

.title-cell {
    padding: 0;
    height: 100%;
    line-height: 1;
    vertical-align: middle;
}

.header-cell {
    width: 25%;
    font-size: 1.35em;
    font-weight: bold;
    vertical-align: middle;
    border: 4px solid #8b4513;
}

.status-table th,
.status-table td {
    border: 4px solid #8b4513;
    padding: 0;
    vertical-align: middle;
    font-size: calc((80vh / 6) * 0.65);
    line-height: 0.1;
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
}

.status-table td>span {
    display: inline-block;
    width: 100%;
    height: 90%;
    line-height: calc((80vh / 6) * 0.9);
    vertical-align: middle;
}

.title-input {
    display: flex;
    align-items: center;
    gap: 8px;
}

h1 {
    color: #8b4513;
    font-size: calc(8vh);
    margin: 0;
    text-align: center;
    line-height: 10vh;
}

.marquee-container {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 10vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f8f0e3;
    border-top: 4px solid #8b4513;
    box-sizing: border-box;
}

.marquee {
    color: #8b4513;
    font-weight: bold;
    width: 100%;
    text-align: center;
    font-size: calc(8vh);
    line-height: 10vh;
    overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}

.fade-enter,
.fade-leave-to {
    opacity: 0;
}

body {
    margin: 0;
    padding: 0;
    font-family: 'SimHei', 'KaiTi', serif;
    background-color: #f8f0e3;
}

.current-student {
    color: #d2691e;
    font-weight: bold;
}

.waiting-student {
    color: #555;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.empty-cell {
    background-color: #f8f0e3;
}

.marquee-text {
    display: inline-block;
    white-space: nowrap;
    animation: marquee 10s linear infinite;
}

.call-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #fff;
    border: 4px solid #8b4513;
    border-radius: 20px;
    text-align: center;
    padding: 20px;
    width: 80vw;
    height: 80vh;
    max-width: 80vw;
    max-height: 80vh;
    margin: auto;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden; /* 隐藏溢出内容 */
}

.dialog-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between; /* 上下均匀分布 */
    width: 100%;
    height: 100%;
    transition: height 0.5s ease;
}

.dialog-content > div {
    width: 100%;
    white-space: nowrap; /* 防止换行 */
    overflow: hidden; /* 隐藏超出部分 */
    text-overflow: ellipsis; /* 显示省略号表示溢出 */
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 6em; /* 字体大小为弹窗的一部分 */
}

.student-info {
    height: 32%; /* 上部分高度 */
}

.arrow {
    height: 32%; /* 中部分高度 */
    font-size: 5em; /* 设置箭头大小 */
    color: #d2691e; /* 箭头颜色 */
}

.room-name {
    height: 32%; /* 下部分高度 */
}



/* 走马灯效果 */
@keyframes marquee {
    0% {
        transform: translateX(100%);
    }

    100% {
        transform: translateX(-100%);
    }
}
</style>
