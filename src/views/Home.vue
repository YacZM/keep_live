<script setup>
import { ref, computed, onMounted } from 'vue'

const API_BASE = '/api'

// 获取今日日期字符串
const getToday = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// 格式化日期为中文显示
const formatDateDisplay = (dateStr) => {
  const date = new Date(dateStr)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
}

// 状态
const checkinData = ref(null)
const logs = ref([])
const newLog = ref('')
const today = getToday()
const isAnimating = ref(false)
const showDeleteBtn = ref(null)
const goal = ref('')

// 计算属性
const isCheckedIn = computed(() => {
  return checkinData.value && checkinData.value.date === today
})

const streakDays = ref(0)

// 方法
const handleCheckin = async () => {
  if (isCheckedIn.value) return

  try {
    const res = await fetch(`${API_BASE}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today })
    })

    if (res.ok) {
      const data = await res.json()
      checkinData.value = data
      isAnimating.value = true

      // 获取连续打卡天数
      const streakRes = await fetch(`${API_BASE}/checkins/streak`)
      const streakData = await streakRes.json()
      streakDays.value = streakData.streak

      setTimeout(() => {
        isAnimating.value = false
      }, 600)
    }
  } catch (err) {
    console.error('打卡失败:', err)
  }
}

const submitLog = async () => {
  if (!newLog.value.trim() || !isCheckedIn.value) return

  try {
    const res = await fetch(`${API_BASE}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newLog.value.trim() })
    })

    if (res.ok) {
      const log = await res.json()
      logs.value.unshift(log)
      newLog.value = ''
    }
  } catch (err) {
    console.error('提交日志失败:', err)
  }
}

const deleteLog = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/logs/${id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      logs.value = logs.value.filter(log => log.id !== id)
      showDeleteBtn.value = null
    }
  } catch (err) {
    console.error('删除日志失败:', err)
  }
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 生命周期
onMounted(async () => {
  // 加载目标
  goal.value = localStorage.getItem('goal') || ''

  try {
    // 获取打卡记录
    const checkinRes = await fetch(`${API_BASE}/checkins`)
    const checkins = await checkinRes.json()

    // 检查今日是否已打卡
    const todayCheckin = checkins.find(c => c.date === today)
    if (todayCheckin) {
      checkinData.value = todayCheckin
    }

    // 获取连续打卡天数
    const streakRes = await fetch(`${API_BASE}/checkins/streak`)
    const streakData = await streakRes.json()
    streakDays.value = streakData.streak

    // 获取日志
    const logsRes = await fetch(`${API_BASE}/logs`)
    logs.value = await logsRes.json()
  } catch (err) {
    console.error('加载数据失败:', err)
  }
})
</script>

<template>
  <div class="app">
    <main class="main">
      <!-- 目标展示 -->
      <div v-if="goal" class="goal-banner">
        <span class="goal-label">目标</span>
        <p class="goal-text">{{ goal }}</p>
      </div>

      <!-- 打卡卡片 -->
      <section class="card checkin-card">
        <div class="checkin-content">
          <h2 class="checkin-title">今日打卡</h2>

          <button
            class="checkin-btn"
            :class="{ 'checked': isCheckedIn, 'animating': isAnimating }"
            @click="handleCheckin"
            :disabled="isCheckedIn"
          >
            <span v-if="!isCheckedIn" class="checkin-icon">✓</span>
            <svg v-else class="checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>

          <p class="checkin-status">
            <template v-if="isCheckedIn">
              <span class="success-text">已打卡</span>
              <span v-if="streakDays > 1" class="streak">连续 {{ streakDays }} 天</span>
            </template>
            <template v-else>
              <span class="pending-text">点击完成今日打卡</span>
            </template>
          </p>
        </div>
      </section>

      <!-- 树洞日志 -->
      <section class="card log-card">
        <h2 class="card-title">树洞日志</h2>

        <!-- 输入区域 -->
        <div class="log-input-area" :class="{ disabled: !isCheckedIn }">
          <textarea
            v-model="newLog"
            class="log-input"
            placeholder="记录一下今天的小想法..."
            :disabled="!isCheckedIn"
            rows="3"
          ></textarea>
          <button
            class="submit-btn"
            @click="submitLog"
            :disabled="!newLog.trim() || !isCheckedIn"
          >
            发送
          </button>
        </div>

        <p v-if="!isCheckedIn" class="tip">
          完成打卡后就可以记录想法啦
        </p>

        <!-- 日志列表 -->
        <div class="logs-list">
          <div
            v-for="log in logs"
            :key="log.id"
            class="log-item"
            @mouseenter="showDeleteBtn = log.id"
            @mouseleave="showDeleteBtn = null"
          >
            <p class="log-content">{{ log.content }}</p>
            <div class="log-meta">
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <button
                v-if="showDeleteBtn === log.id"
                class="delete-btn"
                @click="deleteLog(log.id)"
              >
                删除
              </button>
            </div>
          </div>

          <p v-if="logs.length === 0" class="empty-tip">
            还没有日志，记录你的第一个想法吧
          </p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  padding-bottom: 40px;
}

/* 主内容 */
.main {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* 目标展示 */
.goal-banner {
  background: linear-gradient(135deg, var(--primary) 0%, #6B8FC5 100%);
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 24px;
  color: white;
}

.goal-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.9;
}

.goal-text {
  font-size: 18px;
  font-weight: 500;
  margin-top: 8px;
  line-height: 1.4;
}

/* 卡片通用样式 */
.card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow);
  margin-bottom: 24px;
  transition: var(--transition);
}

.card:hover {
  box-shadow: var(--shadow-hover);
}

/* 打卡卡片 */
.checkin-card {
  text-align: center;
}

.checkin-title {
  font-size: 20px;
  margin-bottom: 24px;
  color: var(--text-primary);
}

.checkin-btn {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid var(--secondary);
  background: var(--bg);
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.checkin-btn:hover:not(:disabled) {
  border-color: var(--primary);
  transform: scale(1.05);
}

.checkin-btn.checked {
  background: var(--success);
  border-color: var(--success);
}

.checkin-btn.animating {
  animation: pulse 0.6s ease;
}

.checkin-icon {
  font-size: 48px;
  color: var(--primary);
}

.checkmark {
  width: 60px;
  height: 60px;
  color: white;
  animation: checkmark 0.5s ease forwards;
}

.checkin-status {
  font-size: 14px;
}

.success-text {
  color: var(--success);
  font-weight: 500;
}

.pending-text {
  color: var(--text-secondary);
}

.streak {
  margin-left: 12px;
  color: var(--accent);
  font-weight: 500;
}

/* 树洞日志卡片 */
.card-title {
  font-size: 20px;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.log-input-area {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.log-input-area.disabled {
  opacity: 0.6;
}

.log-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: var(--transition);
  background: var(--bg);
}

.log-input:focus {
  outline: none;
  border-color: var(--primary);
}

.log-input:disabled {
  cursor: not-allowed;
  background: #f5f5f5;
}

.submit-btn {
  padding: 12px 24px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.submit-btn:hover:not(:disabled) {
  background: #3d5d8a;
}

.submit-btn:disabled {
  background: var(--border);
  cursor: not-allowed;
}

.tip {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 20px;
  padding: 8px;
  background: var(--bg);
  border-radius: 8px;
}

/* 日志列表 */
.logs-list {
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

.log-item {
  padding: 16px;
  background: var(--bg);
  border-radius: 12px;
  margin-bottom: 12px;
  transition: var(--transition);
}

.log-item:hover {
  background: #f5ebe0;
}

.log-content {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.log-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.delete-btn {
  padding: 4px 12px;
  background: transparent;
  border: 1px solid #e53e3e;
  color: #e53e3e;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition);
}

.delete-btn:hover {
  background: #e53e3e;
  color: white;
}

.empty-tip {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 24px;
}

/* 响应式 */
@media (max-width: 640px) {
  .main {
    padding: 16px;
  }

  .card {
    padding: 20px;
  }

  .checkin-btn {
    width: 100px;
    height: 100px;
  }

  .checkin-icon {
    font-size: 40px;
  }

  .checkmark {
    width: 50px;
    height: 50px;
  }

  .log-input-area {
    flex-direction: column;
  }

  .submit-btn {
    width: 100%;
  }
}
</style>
