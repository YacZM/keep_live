<script setup>
import { ref, onMounted } from 'vue'

const API_BASE = '/api'

// 主题设置
const isDarkMode = ref(false)

// 数据统计
const stats = ref({
  totalCheckins: 0,
  totalLogs: 0,
  streak: 0
})

// 加载设置和数据
onMounted(async () => {
  // 加载主题
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
  }

  // 加载统计数据
  try {
    const [checkinRes, logsRes, streakRes] = await Promise.all([
      fetch(`${API_BASE}/checkins`),
      fetch(`${API_BASE}/logs`),
      fetch(`${API_BASE}/checkins/streak`)
    ])

    const checkins = await checkinRes.json()
    const logs = await logsRes.json()
    const streak = await streakRes.json()

    stats.value = {
      totalCheckins: checkins.length,
      totalLogs: logs.length,
      streak: streak.streak
    }
  } catch (err) {
    console.error('加载统计失败:', err)
  }
})

// 切换主题
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

// 清空日志确认
const showClearConfirm = ref(false)
const clearLogs = async () => {
  try {
    // 获取所有日志并逐个删除
    const logsRes = await fetch(`${API_BASE}/logs`)
    const logs = await logsRes.json()

    for (const log of logs) {
      await fetch(`${API_BASE}/logs/${log.id}`, { method: 'DELETE' })
    }

    stats.value.totalLogs = 0
    showClearConfirm.value = false
    alert('日志已清空')
  } catch (err) {
    console.error('清空失败:', err)
    alert('清空失败，请重试')
  }
}

// 导出数据
const exportData = async () => {
  try {
    const [checkinsRes, logsRes] = await Promise.all([
      fetch(`${API_BASE}/checkins`),
      fetch(`${API_BASE}/logs`)
    ])

    const checkins = await checkinsRes.json()
    const logs = await logsRes.json()

    const data = {
      exportTime: new Date().toISOString(),
      checkins,
      logs
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `keeplive-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('导出失败:', err)
    alert('导出失败，请重试')
  }
}
</script>

<template>
  <div class="settings">
    <main class="main">
      <!-- 统计卡片 -->
      <section class="card stats-card">
        <h2 class="card-title">数据统计</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ stats.totalCheckins }}</span>
            <span class="stat-label">总打卡次数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.totalLogs }}</span>
            <span class="stat-label">总日志数量</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.streak }}</span>
            <span class="stat-label">当前连续天数</span>
          </div>
        </div>
      </section>

      <!-- 外观设置 -->
      <section class="card">
        <h2 class="card-title">外观</h2>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">深色模式</span>
            <span class="setting-desc">切换深色/浅色主题</span>
          </div>
          <button
            class="toggle-btn"
            :class="{ active: isDarkMode }"
            @click="toggleTheme"
          >
            <span class="toggle-slider"></span>
          </button>
        </div>
      </section>

      <!-- 数据管理 -->
      <section class="card">
        <h2 class="card-title">数据管理</h2>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">导出数据</span>
            <span class="setting-desc">下载所有打卡和日志记录</span>
          </div>
          <button class="action-btn" @click="exportData">
            导出
          </button>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label danger">清空日志</span>
            <span class="setting-desc">删除所有日志记录（不可恢复）</span>
          </div>
          <button class="action-btn danger" @click="showClearConfirm = true">
            清空
          </button>
        </div>
      </section>

      <!-- 关于 -->
      <section class="card">
        <h2 class="card-title">关于</h2>
        <div class="about-info">
          <p class="app-name">KeepLive</p>
          <p class="app-desc">每日打卡与树洞</p>
          <p class="app-version">Version 1.0.0</p>
        </div>
      </section>
    </main>

    <!-- 确认弹窗 -->
    <div v-if="showClearConfirm" class="modal-overlay" @click="showClearConfirm = false">
      <div class="modal" @click.stop>
        <h3>确认清空</h3>
        <p>确定要清空所有日志吗？此操作不可恢复。</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showClearConfirm = false">取消</button>
          <button class="modal-btn confirm" @click="clearLogs">确认清空</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  min-height: 100vh;
  padding-bottom: 40px;
}

.main {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* 卡片 */
.card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow);
  margin-bottom: 24px;
}

.card-title {
  font-size: 18px;
  color: var(--text-primary);
  margin-bottom: 20px;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: var(--bg);
  border-radius: 12px;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 设置项 */
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-label {
  display: block;
  font-size: 15px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.setting-label.danger {
  color: #e53e3e;
}

.setting-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 开关按钮 */
.toggle-btn {
  width: 52px;
  height: 28px;
  border-radius: 14px;
  background: var(--border);
  border: none;
  cursor: pointer;
  position: relative;
  transition: var(--transition);
}

.toggle-btn.active {
  background: var(--primary);
}

.toggle-slider {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: var(--transition);
}

.toggle-btn.active .toggle-slider {
  left: 27px;
}

/* 操作按钮 */
.action-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg);
  color: var(--text-primary);
  cursor: pointer;
  transition: var(--transition);
}

.action-btn:hover {
  background: var(--border);
}

.action-btn.danger {
  color: #e53e3e;
}

.action-btn.danger:hover {
  background: #fee2e2;
}

/* 关于 */
.about-info {
  text-align: center;
  padding: 16px 0;
}

.app-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 4px;
}

.app-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.app-version {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 360px;
}

.modal h3 {
  font-size: 18px;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.modal p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: var(--transition);
}

.modal-btn.cancel {
  background: var(--bg);
  color: var(--text-primary);
}

.modal-btn.confirm {
  background: #e53e3e;
  color: white;
}

.modal-btn:hover {
  opacity: 0.9;
}

/* 响应式 */
@media (max-width: 640px) {
  .main {
    padding: 16px;
  }

  .card {
    padding: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-item {
    padding: 12px;
  }

  .stat-value {
    font-size: 24px;
  }
}
</style>
