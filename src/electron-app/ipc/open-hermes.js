const { shell } = require('electron')
const path = require('path')

function register(ipcMain, ctx) {
  ipcMain.handle('open-hermes', async () => {
    if (!ctx.state.targetPath) {
      return { success: false, error: '未找到 Hermes 安装目录' }
    }
    const exePath = path.join(
      ctx.state.targetPath,
      'apps', 'desktop', 'release', 'win-unpacked', 'Hermes.exe'
    )
    try {
      await shell.openPath(exePath)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { register }
