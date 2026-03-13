<script setup>
import { ref, computed, onMounted } from 'vue'

const API_BASE = '/api'

// 获取日期字符串
const getDateStr = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 格式化日期
const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
}

// 生成最近N天的日期数组
const getRecentDays = (days) => {
  const result = []
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = getDateStr(date)
    result.push({
      date: dateStr,
      display: formatDate(dateStr),
      isToday: i === 0
    })
  }
  return result
}

const recentDays = ref([])
const allCheckins = ref([])
const allLogs = ref([])
const selectedDays = ref(7)

// 加载数据
onMounted(async () => {
  recentDays.value = getRecentDays(selectedDays.value)

  try {
    // 获取所有打卡记录
    const checkinRes = await fetch(`${API_BASE}/checkins`)
    allCheckins.value = await checkinRes.json()

    // 获取所有日志
    const logsRes = await fetch(`${API_BASE}/logs`)
    allLogs.value = await logsRes.json()
  } catch (err) {
    console.error('加载数据失败:', err)
  }
})

// 按日期分组的数据
const groupedData = computed(() => {
  const groups = {}

  // 初始化最近N天的日期
  const today = new Date()
  for (let i = 0; i < selectedDays.value; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = getDateStr(date)
    groups[dateStr] = { date: dateStr, checkin: null, logs: [] }
  }

  // 填充打卡数据
  for (const checkin of allCheckins.value) {
    if (groups[checkin.date]) {
      groups[checkin.date].checkin = checkin
    }
  }

  // 填充日志数据
  for (const log of allLogs.value) {
    const logDate = new Date(log.timestamp)
    const dateStr = getDateStr(logDate)
    if (groups[dateStr]) {
      groups[dateStr].logs.push(log)
    }
  }

  // 转换为数组并按日期排序
  return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date))
})

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const changeRange = (days) => {
  selectedDays.value = days
  recentDays.value = getRecentDays(days)
}
</script>

<template>
  <div class="records">
    <main class="main">
      <!-- 时间范围选择 -->
      <div class="range-selector">
        <button
          v-for="days in [7, 14, 30]"
          :key="days"
          class="range-btn"
          :class="{ active: selectedDays === days }"
          @click="changeRange(days)"
        >
          最近{{ days }}天
        </button>
      </div>

      <!-- 记录列表 -->
      <div class="records-list">
        <div
          v-for="day in groupedData"
          :key="day.date"
          class="day-card"
          :class="{ today: day.isToday }"
        >
          <div class="day-header">
            <span class="day-date">{{ formatDate(day.date) }}</span>
            <span v-if="day.checkin" class="checkin-badge">已打卡</span>
            <span v-else class="no-checkin">未打卡</span>
          </div>

          <div v-if="day.logs.length > 0" class="day-logs">
            <div v-for="log in day.logs" :key="log.id" class="log-item">
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="log-content">{{ log.content }}</span>
            </div>
          </div>

          <p v-else class="empty-tip">
            暂无记录
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.records {
  min-height: 100vh;
  padding-bottom: 40px;
}

.main {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* 时间范围选择 */
.range-selector {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  justify-content: center;
}

.range-btn {
  padding: 8px 20px;
  border: 2px solid var(--border);
  background: var(--card-bg);
  border-radius: 20px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
}

.range-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.range-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

/* 记录卡片 */
.records-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.day-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow);
}

.day-card.today {
  border: 2px solid var(--primary);
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.day-date {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.checkin-badge {
  padding: 4px 12px;
  background: var(--success);
  color: white;
  border-radius: 12px;
  font-size: 12px;
}

.no-checkin {
  padding: 4px 12px;
  background: var(--border);
  color: var(--text-secondary);
  border-radius: 12px;
  font-size: 12px;
}

/* 日志列表 */
.day-logs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--bg);
  border-radius: 10px;
}

.log-time {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 45px;
}

.log-content {
  font-size: 14px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-tip {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 16px;
}

/* 响应式 */
@media (max-width: 640px) {
  .main {
    padding: 16px;
  }

  .range-selector {
    flex-wrap: wrap;
  }

  .day-card {
    padding: 16px;
  }
}
</style>
