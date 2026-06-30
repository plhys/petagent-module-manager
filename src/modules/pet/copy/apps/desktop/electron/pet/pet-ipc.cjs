/**
 * Hermes Pet — IPC handlers.
 * Handles drag, menu, sleep timer, and AI event forwarding from the renderer.
 */
const { ipcMain, app, Menu, screen } = require('electron')
const fs = require('fs')
const path = require('path')
const { getPetWindow, getBubbleWindow, createBubbleWindow } = require('./pet-windows.cjs')

const DEBUG_LOG_PATH = (() => {
  try {
    let home = process.env.HERMES_HOME
    if (!home && process.env.LOCALAPPDATA) home = path.join(process.env.LOCALAPPDATA, 'hermes')
    if (!home) home = path.join(app.getPath('home'), '.hermes')
    const logsDir = path.join(home, 'logs')
    fs.mkdirSync(logsDir, { recursive: true })
    return path.join(logsDir, 'pet-debug.log')
  } catch { return null }
})()

function petDebug(msg) {
  try {
    const ts = new Date().toISOString()
    const line = `[${ts}] [hermes-pet-ipc] ${msg}\n`
    if (DEBUG_LOG_PATH) fs.appendFileSync(DEBUG_LOG_PATH, line)
    console.log(line.trim())
  } catch {}
}

let _sleepTimer = null
let _isSleeping = false
let _bubbleAcc = ''

function resetSleepTimer(pw) {
  clearTimeout(_sleepTimer)
  _sleepTimer = null
  if (_isSleeping && pw && !pw.isDestroyed()) {
    _isSleeping = false
    pw.webContents.send('hermes-pet:anim-state', 'sleep-leave')
  }
}

function pickEmoji(text) {
  var t = (text || '').toLowerCase()
  if (/你好|嗨|hello|hi|hey/.test(t)) return '👋'
  if (/谢谢|感谢|thank|thanks/.test(t)) return '🙏'
  if (/代码|code|编程|function|class/.test(t)) return '💻'
  if (/文件|file|目录|folder|path/.test(t)) return '📁'
  if (/搜索|search|查找|find/.test(t)) return '🔍'
  if (/错误|error|bug|修复|fix/.test(t)) return '🔧'
  if (/安装|install|部署|deploy/.test(t)) return '🚀'
  if (/配置|config|设置|setting/.test(t)) return '⚙️'
  if (/图片|image|照片|photo|图/.test(t)) return '🖼'
  if (/完成|done|成功|success|ok/.test(t)) return '✅'
  if (/介绍|我是|我是谁|who am i/.test(t)) return '🤖'
  return '💬'
}

// Card type templates — keyword → { emoji, title, extract data from text }
var CARD_TEMPLATES = [
  { type: 'weather',   re: /天气|气温|温度|weather|forecast|℃|🌡/,    emoji: '☁', title: '天气' },
  { type: 'stock',     re: /股票|股价|K线|大盘|涨跌|行情|stock|ticker/, emoji: '📈', title: '行情' },
  { type: 'code',      re: /代码|编程|function|class|def |import /,   emoji: '💻', title: '代码' },
  { type: 'search',    re: /搜索|查找|找到|search|found/,              emoji: '🔍', title: '搜索' },
  { type: 'profile',   re: /介绍|我是|我是谁|关于我|who am i/,        emoji: '🤖', title: '简介' },
  { type: 'error',     re: /错误|error|失败|fail|报错|异常/,           emoji: '⚠', title: '错误' },
  { type: 'file',      re: /文件|目录|创建|删除|file|folder/,          emoji: '📁', title: '文件' },
  { type: 'chart',     re: /图表|数据|统计|chart|data/,                emoji: '📊', title: '数据' },
]

function detectCardType(text) {
  for (var i = 0; i < CARD_TEMPLATES.length; i++) {
    if (CARD_TEMPLATES[i].re.test(text)) return CARD_TEMPLATES[i]
  }
  return null
}

function extractFirstLine(text) {
  var m = (text.match(/^(.+?)[。！？\.!\?\n]/) || [])[1]
  return m || text.slice(0, 30)
}

function extractNum(text) {
  var m = text.match(/(\d+)/)
  return m ? m[1] : ''
}

function buildWeatherCard(text) {
  var temp = text.match(/(-?\d+)\s*[°℃度]/) || text.match(/[°℃度]\s*(-?\d+)/) || text.match(/(-?\d+)/)
  var tempVal = temp ? parseInt(temp[1]) : 0
  // Match compound weather descriptions first, then fall back to single characters
  var cond = text.match(/晴转多云|多云转晴|多云转阴|阴转雨|雷阵雨|暴风雨|小雨|中雨|大雨|暴雨|小雪|中雪|大雪|暴雪|多云|晴天|阴天|雨天|雪天|大风|微风|雾霾|沙尘暴|冰雹/)
            || text.match(/[晴阴雨雪雾霾风暴]{1,2}/)
            || ['']
  var loc = text.match(/(北京|上海|广州|深圳|杭州|成都|武汉|南京|天津|重庆|西安|苏州|长沙|郑州|青岛|大连|厦门|福州|合肥|济南|沈阳|昆明|贵阳|南宁|长春|哈尔滨|石家庄|太原|兰州|乌鲁木齐|拉萨|银川|西宁|海口|香港|澳门|台北|中山|东莞|佛山|珠海|惠州|汕头|湛江|江门|茂名|肇庆|梅州|清远|揭阳|潮州|河源|汕尾|云浮|韶关|阳江)/)
  if (!loc) loc = text.match(/([一-龥]{2,3})[市]/)
  var humidity = text.match(/湿度[：:]\s*(\d+%?)/) || text.match(/(\d+%)\s*[湿]/)
  var humVal = humidity ? parseInt(humidity[1]) : 0
  // Wind speed: try km/h format first ("15km/h"), then Chinese format ("3级" → ~15km/h per Beaufort)
  var windKmh = text.match(/(\d+)\s*km\/h/i) || text.match(/[风速]+\s*[:：]?\s*(\d+)/)
  var windVal = windKmh ? parseInt(windKmh[1]) : 0
  if (!windVal) {
    var windGrade = text.match(/(\d+)\s*级/)
    if (windGrade) {
      // Approximate Beaufort scale → km/h
      var g = parseInt(windGrade[1])
      var beaufortKmh = [0,5,12,20,29,39,50,62,75,89,103,118,134]
      windVal = beaufortKmh[Math.min(g, 12)] || g * 10
    }
  }
  var feelsLike = text.match(/体感[：:]\s*(-?\d+)/) || [null, tempVal + 3]
  var feelsVal = feelsLike ? parseInt(feelsLike[1]) : tempVal + 3

  var type = 'cloudy'
  if (/晴/.test(text)) type = 'sunny'
  else if (/雷/.test(text)) type = 'stormy'
  else if (/暴雨|大雨/.test(text)) type = 'heavyRain'
  else if (/雨|阵雨/.test(text)) type = 'lightRain'
  else if (/暴雪|大雪/.test(text)) type = 'blizzard'
  else if (/雪/.test(text)) type = 'snowy'
  else if (/雾|霾/.test(text)) type = 'foggy'
  else if (/台风|飓风/.test(text)) type = 'typhoon'
  else if (/风/.test(text)) type = 'windy'

  return JSON.stringify({
    type: 'weather',
    data: {
      city: loc ? loc[1] : '',
      temperature: tempVal,
      condition: cond[0] || '',
      weatherType: type,
      humidity: humVal,
      windSpeed: windVal ? windVal : 0,
      feelsLike: feelsVal
    }
  })
}

function buildStockCard(text) {
  var price = text.match(/(\d+\.?\d*)\s*[元点]/) || text.match(/(\d+\.?\d*)/)
  var change = text.match(/([涨跌])\s*(\d+\.?\d*%?)/) || text.match(/([+-]\d+\.?\d*%?)/)
  var ticker = text.match(/[A-Z]{2,6}/) || text.match(/[代码]\s*(\w+)/)
  var isUp = /涨|↑|📈/.test(text) || (change && change[0] && change[0].indexOf('+') === 0)
  return '<div class="pet-card pet-card--stock" data-type="card">' +
    '<div class="pet-stock-price">' + (price ? price[1] : '--') + '</div>' +
    '<div class="pet-stock-change ' + (isUp ? 'up' : 'down') + '">' + (change ? change[0] : '') + '</div>' +
    (ticker ? '<div class="pet-stock-ticker">' + ticker[0] + '</div>' : '') +
    '</div>'
}

function formatBubbleHTML(text) {
  if (!text) return ''
  var emoji = pickEmoji(text)
  // Short reply: small accent + text
  if (text.length <= 30) {
    return '<div class="pet-short"><span class="pet-short-emoji">' + emoji + '</span><span class="pet-short-text">' + text + '</span></div>'
  }
  // Check for card templates
  var tmpl = detectCardType(text)
  if (tmpl) {
    if (tmpl.type === 'weather') return buildWeatherCard(text)
    if (tmpl.type === 'stock') return buildStockCard(text)
    return '<div class="pet-card pet-card--' + tmpl.type + '" data-type="card">' +
      '<div class="pet-card-label">' + tmpl.title + '</div>' +
      '<div class="pet-title">' + extractFirstLine(text) + '</div>' +
      '</div>'
  }
  // Generic card
  var first = extractFirstLine(text)
  if (first.length > 30) first = first.slice(0, 30) + '…'
  var rest = text.slice(first.length).replace(/^[。！？\.!\?\n\s]+/, '')
  if (rest.length > 60) rest = rest.slice(0, 60) + '…'
  return '<div class="pet-card" data-type="card">' +
    '<div class="pet-emoji">' + emoji + '</div>' +
    '<div class="pet-title">' + first + '</div>' +
    (rest ? '<div class="pet-summary">' + rest + '</div>' : '') +
    '</div>'
}

function startSleepTimer(pw) {
  clearTimeout(_sleepTimer)
  _sleepTimer = setTimeout(function() {
    if (pw && !pw.isDestroyed()) {
      _isSleeping = true
      pw.webContents.send('hermes-pet:anim-state', 'sleep-start')
    }
  }, 5 * 60 * 1000)
}

function updateBubblePosition() {
  var pw = getPetWindow(); var bw = getBubbleWindow()
  if (pw && bw && !bw.isDestroyed()) {
    var pos = pw.getPosition()
    var size = bw.getSize()
    var pwSize = pw.getSize()
    var primaryDisplay = require('electron').screen.getPrimaryDisplay()
    var workArea = primaryDisplay.workAreaSize
    var scaleFactor = primaryDisplay.scaleFactor || 1

    var bubbleX = pos[0] + Math.round((pwSize[0] - size[0]) / 2) + 50
    var bubbleY = pos[1] - size[1] + 82

    // Clamp to screen bounds with margin
    var margin = 8
    bubbleX = Math.max(margin, Math.min(bubbleX, workArea.width - size[0] - margin))
    bubbleY = Math.max(margin, Math.min(bubbleY, workArea.height - size[1] - margin))

    bw.setPosition(bubbleX, bubbleY)
  }
}

function ensureBubbleWindow() {
  var bw = getBubbleWindow()
  if (!bw || bw.isDestroyed()) {
    createBubbleWindow()
    bw = getBubbleWindow()
  }
  return bw
}

function handleGatewayEvent(data) {
  petDebug('handleGatewayEvent: ' + JSON.stringify(data).slice(0, 200))

  var pw = getPetWindow()
  var bw = getBubbleWindow()
  var event = data.event || data.type  // support both 'event' and 'type' fields

  if (!pw || pw.isDestroyed()) {
    petDebug('WARN: pet window not available, pw=' + (pw ? 'destroyed' : 'null'))
  }
  if (!bw || bw.isDestroyed()) {
    petDebug('bubble not available, recreating...')
    bw = ensureBubbleWindow()
  }

  if (pw && bw && !bw.isDestroyed()) {
    updateBubblePosition()
  }

  if (event === 'message.start') {
    petDebug('→ message.start: task-start anim')
    _bubbleAcc = ''
    resetSleepTimer(pw)
    if (pw && !pw.isDestroyed()) {
      pw.webContents.send('hermes-pet:anim-state', 'task-start')
      setTimeout(function() {
        try { if (pw && !pw.isDestroyed()) pw.webContents.send('hermes-pet:anim-state', 'task-loop') } catch(_) {}
      }, 800)
    }
    if (bw && !bw.isDestroyed()) {
      bw.webContents.send('hermes-pet:ai-run-start', { message: '...' })
      bw.show()
    }
  } else if (event === 'message.delta') {
    var chunk = (data.text || data.chunk || '')
    _bubbleAcc += chunk
    if (bw && !bw.isDestroyed()) {
      bw.webContents.send('hermes-pet:ai-chunk', chunk)
      bw.show()
    }
  } else if (event === 'tool.start' || event === 'tool.progress' || event === 'tool.generating') {
    petDebug('→ tool event: ' + event + ' name=' + (data.name || '?'))
    if (bw && !bw.isDestroyed()) {
      bw.webContents.send('hermes-pet:ai-tool', {
        name: data.name || 'tool',
        toolCallId: data.toolCallId || data.tool_id || ('t-' + Date.now()),
        phase: 'running',
        actionText: data.name || 'Tool',
      })
      bw.show()
    }
  } else if (event === 'tool.complete') {
    petDebug('→ tool.complete: ' + (data.name || '?'))
    if (bw && !bw.isDestroyed()) {
      bw.webContents.send('hermes-pet:ai-tool', {
        name: data.name || 'tool',
        toolCallId: data.toolCallId || data.tool_id || ('t-' + Date.now()),
        phase: 'done',
        actionText: data.name || 'Tool',
      })
    }
  } else if (event === 'message.complete') {
    petDebug('→ message.complete: task-leave anim')
    if (pw && !pw.isDestroyed()) {
      pw.webContents.send('hermes-pet:anim-state', 'task-leave')
    }
    if (bw && !bw.isDestroyed()) {
      bw.webContents.send('hermes-pet:ai-done', {
        content: formatBubbleHTML(_bubbleAcc || data.text || data.rendered || ''),
        aborted: false
      })
      // Bubble app controls its own auto-hide timing (7s/15s/60s) via setBubbleVisible.
      // Do NOT force-hide the window here.
    }
    startSleepTimer(pw)
  } else {
    petDebug('unknown event type: ' + event)
  }
}

function setupPetIPC(mainWindow) {
  petDebug('setupPetIPC called')

  // Listen for AI events forwarded from the renderer
  ipcMain.on('hermes-pet:event', function(_event, data) {
    petDebug('IPC hermes-pet:event received')
    try { handleGatewayEvent(data) } catch(e) { petDebug('handleGatewayEvent error: ' + e.message) }
  })

  ipcMain.on('hermes-pet:toggle-chat', function() {
    petDebug('IPC toggle-chat')
    resetSleepTimer(getPetWindow())
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) mainWindow.focus()
      else { mainWindow.show(); mainWindow.focus() }
    }
  })

  ipcMain.on('hermes-pet:toggle-window', function() {
    petDebug('IPC toggle-window')
    resetSleepTimer(getPetWindow())
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) mainWindow.hide()
      else { mainWindow.show(); mainWindow.focus() }
    }
  })

  ipcMain.on('hermes-pet:show-context-menu', function() {
    var pw = getPetWindow()
    if (pw) {
      Menu.buildFromTemplate([
        { label: 'Hide Pet', click: function() { if (pw && !pw.isDestroyed()) pw.hide() } },
        { type: 'separator' },
        { label: 'Quit Hermes', click: function() { app.quit() } },
      ]).popup({ window: pw })
    }
  })

  var dragOffset = null
  ipcMain.on('hermes-pet:start-drag', function(_e, sx, sy) {
    var pw = getPetWindow()
    if (pw) { var pos = pw.getPosition(); dragOffset = { x: pos[0] - sx, y: pos[1] - sy } }
  })
  ipcMain.on('hermes-pet:drag-move', function(_e, sx, sy) {
    var pw = getPetWindow()
    if (pw && dragOffset) { pw.setPosition(dragOffset.x + sx, dragOffset.y + sy); updateBubblePosition() }
  })
  ipcMain.on('hermes-pet:stop-drag', function() { dragOffset = null })

  ipcMain.on('hermes-pet:set-bubble-visible', function(_e, visible) {
    var bw = getBubbleWindow()
    if (bw && !bw.isDestroyed()) { if (visible) bw.show(); else bw.hide() }
  })

  ipcMain.on('hermes-pet:set-bubble-height', function(_e, h) {
    var bw = getBubbleWindow()
    if (bw && !bw.isDestroyed() && typeof h === 'number' && h > 0) {
      // Add padding: bubble-root padding (4px bottom) + tail (7px outside) +
      // bubble padding (14px bottom) + breathing room = ~32px
      var newH = Math.ceil(h + 32)
      if (newH < 40) newH = 40
      // Cap height so the bubble never grows past the top of the screen.
      // The bubble window bottom is anchored near the pet; the top edge
      // must stay at y >= 0.  maxH = pet_y - 20 (20px margin from top).
      var pw = getPetWindow()
      var maxH = 600
      if (pw && !pw.isDestroyed()) {
        var petY = pw.getPosition()[1]
        if (petY > 20) maxH = Math.min(600, petY - 20)
      }
      if (newH > maxH) newH = maxH
      var size = bw.getSize()
      if (Math.abs(size[1] - newH) > 2) {
        // Grow upward: keep the bottom edge anchored so the tail
        // stays near the pet. Move Y up by the height delta.
        var delta = newH - size[1]
        var pos = bw.getPosition()
        bw.setBounds({ x: pos[0], y: pos[1] - delta, width: size[0], height: newH })
      }
    }
  })

  ipcMain.on('hermes-pet:anim-state-changed', function(_e, state) {
    updateBubblePosition()
  })
}

module.exports = { setupPetIPC, startSleepTimer, resetSleepTimer, handleGatewayEvent }
