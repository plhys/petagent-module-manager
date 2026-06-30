/* ============================================================
   ipc/target.js — 目标目录扫描 / 浏览 / 验证 IPC handlers
   ============================================================ */

const path = require('path')
const fs = require('fs')
const { dialog } = require('electron')
const { scanHermesInstall } = require('../scanner')

function register(ipcMain, ctx) {
  ipcMain.handle('scan-target', () => {
    const found = scanHermesInstall(ctx.app)
    if (found.length > 0) {
      ctx.state.targetPath = found[0]
      return { found, selected: ctx.state.targetPath }
    }
    return { found: [], selected: '' }
  })

  ipcMain.handle('browse-target', async () => {
    const result = await dialog.showOpenDialog(ctx.mainWindow, {
      title: '选择 Hermes Agent 安装目录',
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      ctx.state.targetPath = result.filePaths[0]
      const valid = fs.existsSync(path.join(ctx.state.targetPath, 'pyproject.toml'))
      return { target: ctx.state.targetPath, valid }
    }
    return { target: ctx.state.targetPath || '', valid: false }
  })

  ipcMain.handle('get-target', () => {
    if (!ctx.state.targetPath) return { target: '未选择目录', valid: false }
    return { target: ctx.state.targetPath, valid: fs.existsSync(path.join(ctx.state.targetPath, 'pyproject.toml')) }
  })

  ipcMain.handle('validate-target', () => {
    if (!ctx.state.targetPath) return { valid: false, target: '' }
    return { valid: fs.existsSync(path.join(ctx.state.targetPath, 'pyproject.toml')), target: ctx.state.targetPath }
  })

  ipcMain.handle('validate-path', (_e, p) => {
    const resolved = path.resolve(String(p || ''))
    const valid = fs.existsSync(path.join(resolved, 'pyproject.toml'))
    if (valid) ctx.state.targetPath = resolved
    return { target: resolved, valid }
  })
}

module.exports = { register }