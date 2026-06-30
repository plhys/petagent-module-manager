/**
 * Hermes Pet — Window factory.
 * Creates the pet (transparent overlay) and bubble (speech bubble) windows.
 */
const { BrowserWindow, screen, app } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('node:url')

let petWindow = null
let bubbleWindow = null

const DEBUG = process.env.PETAGENT_DEBUG === '1'

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
    const line = `[${ts}] [hermes-pet-win] ${msg}\n`
    if (DEBUG_LOG_PATH) fs.appendFileSync(DEBUG_LOG_PATH, line)
    console.log(line.trim())
  } catch {}
}

const PET_PRELOAD_PATH = path.join(__dirname, 'pet-preload.cjs')

function resolvePetHtml(name) {
  if (process.env.HERMES_DESKTOP_DEV_SERVER) {
    const base = process.env.HERMES_DESKTOP_DEV_SERVER.replace(/\/+$/, '')
    return `${base}/src/${name}/index.html`
  }
  const appPath = app.getAppPath()
  const htmlPath = path.join(appPath, 'dist', `${name}.html`)
  const url = pathToFileURL(htmlPath).toString()
  petDebug(`resolvePetHtml(${name}): appPath=${appPath} htmlPath=${htmlPath} url=${url}`)
  return url
}

function createPetWindow() {
  if (petWindow && !petWindow.isDestroyed()) {
    petDebug('createPetWindow: already exists, skipping')
    return
  }

  petDebug('createPetWindow: creating...')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  petDebug(`screen workAreaSize: ${width}x${height}`)

  const winX = Math.round(width - 290)
  const winY = Math.round(height - 240)
  petDebug(`pet window position: (${winX}, ${winY}) size: 220x220`)

  try {
    petWindow = new BrowserWindow({
      width: 220,
      height: 220,
      x: winX,
      y: winY,
      frame: DEBUG,
      transparent: !DEBUG,
      backgroundColor: DEBUG ? '#ff0000' : '#01000000',
      alwaysOnTop: true,
      resizable: DEBUG,
      skipTaskbar: !DEBUG,
      hasShadow: false,
      type: 'normal',
      webPreferences: {
        preload: PET_PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        autoplayPolicy: 'no-user-gesture-required',
        devTools: true,
      },
    })
    petDebug('BrowserWindow created successfully')
  } catch (err) {
    petDebug('BrowserWindow creation failed: ' + (err ? err.stack || err.message : 'unknown'))
    return
  }

  const petUrl = resolvePetHtml('pet')
  petDebug('Loading pet from: ' + petUrl)
  petWindow.loadURL(petUrl)

  petWindow.webContents.on('did-finish-load', () => {
    petDebug('Pet window did-finish-load OK')
    // Windows transparent-window workaround: GPU-composited content (the webm
    // video) often stays invisible until the window is repainted. Nudge the
    // size by 1px and restore it to force a recomposite.
    if (!DEBUG) {
      try {
        const [w, h] = petWindow.getSize()
        petWindow.setSize(w + 1, h + 1)
        setTimeout(() => { try { petWindow.setSize(w, h) } catch (_) {} }, 50)
      } catch (_) {}
    }
  })
  // Capture renderer console messages for debugging
  petWindow.webContents.on('console-message', (_event, level, message) => {
    petDebug('renderer-console [L' + level + '] ' + message)
  })
  petWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    petDebug('Pet window did-fail-load: code=' + code + ' desc=' + desc + ' url=' + url)
    console.error('[hermes-pet] Pet window failed to load:', code, desc, url)
  })
  petWindow.webContents.on('crashed', () => {
    petDebug('Pet window renderer CRASHED')
  })
  petWindow.on('closed', () => {
    petDebug('Pet window closed')
    petWindow = null
  })

  if (DEBUG) {
    petWindow.webContents.openDevTools({ mode: 'detach' })
    petDebug('DEBUG mode: pet window is red, framed, devtools opened')
  }

  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  petWindow.setAlwaysOnTop(true, 'screen-saver')

  petDebug('createPetWindow: done, isVisible=' + petWindow.isVisible())
}

function createBubbleWindow() {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    petDebug('createBubbleWindow: already exists, skipping')
    return
  }

  petDebug('createBubbleWindow: creating...')

  try {
    bubbleWindow = new BrowserWindow({
      width: 250,
      height: 300,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      hasShadow: false,
      show: false,
      focusable: false,
      webPreferences: {
        preload: PET_PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })
    petDebug('Bubble BrowserWindow created')
  } catch (err) {
    petDebug('Bubble BrowserWindow creation failed: ' + (err ? err.stack || err.message : 'unknown'))
    return
  }

  const bubbleUrl = resolvePetHtml('pet-bubble')
  petDebug('Loading bubble from: ' + bubbleUrl)
  bubbleWindow.loadURL(bubbleUrl)

  bubbleWindow.webContents.on('did-finish-load', () => {
    petDebug('Bubble window did-finish-load OK')
  })
  // Capture renderer console messages for debugging
  bubbleWindow.webContents.on('console-message', (_event, level, message) => {
    petDebug('bubble-console [L' + level + '] ' + message)
  })
  bubbleWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    petDebug('Bubble window did-fail-load: code=' + code + ' desc=' + desc + ' url=' + url)
  })

  if (DEBUG) {
    bubbleWindow.webContents.openDevTools({ mode: 'detach' })
  }
  petDebug('createBubbleWindow: done')
}

function getPetWindow() { return petWindow }
function getBubbleWindow() { return bubbleWindow }

module.exports = {
  createPetWindow,
  createBubbleWindow,
  getPetWindow,
  getBubbleWindow,
}
