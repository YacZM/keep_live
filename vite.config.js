import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// 获取当前季度
const getQuarter = (date = new Date()) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const quarter = Math.floor(month / 3) + 1
  return `${year}_Q${quarter}`
}

// 获取季度文件夹路径
const getQuarterDir = () => {
  const dataDir = path.join(process.cwd(), 'server', 'data', getQuarter())
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}

// 读取数据（跨季度合并）
const readAllData = (type) => {
  const baseDataDir = path.join(process.cwd(), 'server', 'data')
  if (!fs.existsSync(baseDataDir)) {
    return []
  }

  const dirs = fs.readdirSync(baseDataDir).filter(d => d.startsWith('20'))
  let allData = []

  for (const dir of dirs) {
    const filePath = path.join(baseDataDir, dir, `${type}.json`)
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      allData = allData.concat(data)
    }
  }

  return allData
}

// 写入当前季度数据
const writeQuarterData = (type, data) => {
  const quarterDir = getQuarterDir()
  const filePath = path.join(quarterDir, `${type}.json`)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

// API 处理函数
const handleApi = (req, res, next) => {
  // 只处理 /api 开头的请求，其他请求交给 Vite
  if (!req.url.startsWith('/api')) {
    return next()
  }

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }

  const url = req.url.replace('/api', '')

  // 通用设置Content-Type
  const setJsonHeader = () => res.setHeader('Content-Type', 'application/json')

  // 打卡 API
  if (url === '/checkins' && req.method === 'GET') {
    const checkins = readAllData('checkins')
    setJsonHeader()
    return res.end(JSON.stringify(checkins))
  }

  if (url === '/checkin' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const { date } = JSON.parse(body)
        const checkins = readAllData('checkins')

        if (checkins.find(c => c.date === date)) {
          res.statusCode = 400
          setJsonHeader()
          return res.end(JSON.stringify({ error: '今日已打卡' }))
        }

        const newCheckin = { id: Date.now(), date, timestamp: Date.now() }
        const quarterDir = getQuarterDir()
        const checkinFile = path.join(quarterDir, 'checkins.json')

        let quarterCheckins = []
        if (fs.existsSync(checkinFile)) {
          quarterCheckins = JSON.parse(fs.readFileSync(checkinFile, 'utf-8'))
        }
        quarterCheckins.push(newCheckin)
        fs.writeFileSync(checkinFile, JSON.stringify(quarterCheckins, null, 2))

        setJsonHeader()
        res.end(JSON.stringify(newCheckin))
      } catch (e) {
        res.statusCode = 500
        setJsonHeader()
        res.end(JSON.stringify({ error: '服务器错误' }))
      }
    })
    return
  }

  if (url === '/checkins/streak' && req.method === 'GET') {
    const checkins = readAllData('checkins')
    if (checkins.length === 0) {
      setJsonHeader()
      return res.end(JSON.stringify({ streak: 0 }))
    }

    const sortedDates = checkins.map(c => c.date).sort()
    const latestDate = sortedDates[sortedDates.length - 1]

    let streak = 1
    let currentDate = new Date(latestDate)

    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const prevDate = new Date(sortedDates[i])
      const diffDays = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        streak++
        currentDate = prevDate
      } else {
        break
      }
    }

    setJsonHeader()
    return res.end(JSON.stringify({ streak, latestDate }))
  }

  // 日志 API
  if (url === '/logs' && req.method === 'GET') {
    const logs = readAllData('logs')
    logs.sort((a, b) => b.timestamp - a.timestamp)
    setJsonHeader()
    return res.end(JSON.stringify(logs))
  }

  if (url === '/logs' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const { content } = JSON.parse(body)
        if (!content || !content.trim()) {
          res.statusCode = 400
          setJsonHeader()
          return res.end(JSON.stringify({ error: '内容不能为空' }))
        }

        const newLog = { id: Date.now(), content: content.trim(), timestamp: Date.now() }
        const quarterDir = getQuarterDir()
        const logsFile = path.join(quarterDir, 'logs.json')

        let quarterLogs = []
        if (fs.existsSync(logsFile)) {
          quarterLogs = JSON.parse(fs.readFileSync(logsFile, 'utf-8'))
        }
        quarterLogs.push(newLog)
        fs.writeFileSync(logsFile, JSON.stringify(quarterLogs, null, 2))

        setJsonHeader()
        res.end(JSON.stringify(newLog))
      } catch (e) {
        res.statusCode = 500
        setJsonHeader()
        res.end(JSON.stringify({ error: '服务器错误' }))
      }
    })
    return
  }

  if (url.startsWith('/logs/') && req.method === 'DELETE') {
    const id = parseInt(url.split('/')[2])

    // 删除需要跨季度处理
    const baseDataDir = path.join(process.cwd(), 'server', 'data')
    if (!fs.existsSync(baseDataDir)) {
      setJsonHeader()
      return res.end(JSON.stringify({ success: true }))
    }

    const dirs = fs.readdirSync(baseDataDir).filter(d => d.startsWith('20'))
    for (const dir of dirs) {
      const logsFile = path.join(baseDataDir, dir, 'logs.json')
      if (fs.existsSync(logsFile)) {
        let logs = JSON.parse(fs.readFileSync(logsFile, 'utf-8'))
        const originalLength = logs.length
        logs = logs.filter(log => log.id !== id)
        if (logs.length !== originalLength) {
          fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2))
          break
        }
      }
    }

    setJsonHeader()
    return res.end(JSON.stringify({ success: true }))
  }
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'api-server',
      configureServer(server) {
        server.middlewares.use(handleApi)
      }
    }
  ],
  server: {
    port: 1202
  }
})
