/* ============================================================
   ipc/uninstall.js — 卸载流程 IPC handler
   ============================================================ */

const path = require('path')
const { findPython, spawnPython } = require('../python')

function register(ipcMain, ctx) {
  ipcMain.handle('uninstall', async () => {
    if (!ctx.state.targetPath) {
      return { success: false, log: [{ level: 'error', msg: '请先选择目标目录' }] }
    }
    const python = findPython(ctx.app, ctx.ROOT)
    if (!python) {
      return { success: false, log: [{ level: 'error', msg: '未找到 Python，请安装 Python 3.12+ 并添加到 PATH' }] }
    }

    const script = path.join(ctx.SRC, 'uninstall.py')
    return new Promise(resolve => {
      const logLines = []
      let proc = null
      const timeoutId = setTimeout(() => {
        if (proc) proc.kill()
        resolve({ success: false, log: [{ level: 'error', msg: '卸载超时（5分钟）' }] })
      }, 300000)

      proc = spawnPython(
        python, script,
        ['--json', '--target', ctx.state.targetPath],
        ctx.SRC,
        (data) => logLines.push(data),
        (code, err) => {
          clearTimeout(timeoutId)
          if (err) {
            resolve({ success: false, log: [{ level: 'error', msg: `启动 Python 失败: ${err.message}` }] })
          } else {
            resolve({ success: code === 0, log: logLines })
          }
        }
      )
    })
  })
}

module.exports = { register }