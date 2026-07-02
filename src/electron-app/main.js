/* ============================================================
   main.js — PetAgent 模块管理器 Electron 入口
   ============================================================ */

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// ── 路径解析 ──
function getRootDir() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'backend')
  return path.join(__dirname, '..')
}

const ROOT = getRootDir()
const SRC = ROOT

// ── 共享上下文（传递给各 IPC 模块） ──
const ctx = {
  SRC,
  ROOT,
  app,
  mainWindow: null,
  state: { targetPath: '' }
}

// ── 创建窗口 ──
function createWindow() {
  ctx.mainWindow = new BrowserWindow({
    width: 720, height: 620,
    frame: false, transparent: true, resizable: false,
    backgroundColor: '#00000000', show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    }
  })

  const panelPath = app.isPackaged
    ? path.join(process.resourcesPath, 'panel.html')
    : path.join(SRC, 'panel.html')

  ctx.mainWindow.loadFile(panelPath)
  ctx.mainWindow.once('ready-to-show', () => ctx.mainWindow.show())
}

// ── 注册 IPC 模块 ──
require('./ipc/modules').register(ipcMain, ctx)
require('./ipc/target').register(ipcMain, ctx)
require('./ipc/install').register(ipcMain, ctx)
require('./ipc/uninstall').register(ipcMain, ctx)
require('./ipc/status').register(ipcMain, ctx)
require('./ipc/open-hermes').register(ipcMain, ctx)

// ── 启动 ──
app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())