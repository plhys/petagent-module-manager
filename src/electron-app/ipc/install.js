/* ============================================================
   ipc/install.js — 安装流程 IPC handler
   ============================================================ */

const path = require('path')
const { findPython, spawnPython } = require('../python')

function register(ipcMain, ctx) {
  ipcMain.on('install-start', (event, modules) => {
    if (!ctx.state.targetPath) {
      event.sender.send('install-done', { success: false, log: [{ level: 'error', msg: '请先选择目标目录' }] })
      return
    }
    const python = findPython(ctx.app, ctx.ROOT)
    if (!python) {
      event.sender.send('install-done', { success: false, log: [{ level: 'error', msg: '未找到 Python，请安装 Python 3.12+ 并添加到 PATH' }] })
      return
    }

    const script = path.join(ctx.SRC, 'install.py')
    let proc = null
    const timeoutId = setTimeout(() => {
      if (proc) proc.kill()
      event.sender.send('install-done', { success: false, log: [{ level: 'error', msg: '安装超时（5分钟）' }] })
    }, 300000)

    proc = spawnPython(
      python, script,
      ['--json', '--target', ctx.state.targetPath, '-i', ...modules],
      ctx.SRC,
      (data) => event.sender.send('install-log', data),
      (code, err) => {
        clearTimeout(timeoutId)
        if (err) {
          event.sender.send('install-done', { success: false, log: [{ level: 'error', msg: `启动 Python 失败: ${err.message}` }] })
        } else {
          event.sender.send('install-done', { success: code === 0 })
        }
      }
    )
  })
}

module.exports = { register }