/**
 * Hermes Pet — Bootstrap module.
 * Called after createWindow() in app.whenReady().
 */
const { app: electronApp } = require('electron')
const fs = require('fs')
const path = require('path')
const { createPetWindow, createBubbleWindow, getPetWindow, getBubbleWindow } = require('./pet-windows.cjs')
const { setupPetIPC, startSleepTimer } = require('./pet-ipc.cjs')

const DEBUG_LOG_PATH = (() => {
  try {
    let home = process.env.HERMES_HOME
    if (!home && process.env.LOCALAPPDATA) home = path.join(process.env.LOCALAPPDATA, 'hermes')
    if (!home) home = path.join(electronApp.getPath('home'), '.hermes')
    const logsDir = path.join(home, 'logs')
    fs.mkdirSync(logsDir, { recursive: true })
    return path.join(logsDir, 'pet-debug.log')
  } catch { return null }
})()

function petDebug(msg) {
  try {
    const ts = new Date().toISOString()
    const line = `[${ts}] [hermes-pet] ${msg}\n`
    if (DEBUG_LOG_PATH) fs.appendFileSync(DEBUG_LOG_PATH, line)
    console.log(line.trim())
  } catch {}
}

function destroyAllPetWindows() {
  for (const w of [getPetWindow(), getBubbleWindow()]) {
    try { if (w && !w.isDestroyed()) w.destroy() } catch {}
  }
}

function initPet(mainWindow) {
  petDebug('initPet() called, mainWindow=' + (mainWindow ? 'present' : 'null'))

  try {
    petDebug('Creating pet window...')
    createPetWindow()
    petDebug('Pet window created, pw=' + (getPetWindow() ? 'present' : 'null'))

    petDebug('Creating bubble window...')
    createBubbleWindow()
    petDebug('Bubble window created, bw=' + (getBubbleWindow() ? 'present' : 'null'))

    petDebug('Setting up IPC...')
    setupPetIPC(mainWindow)
    petDebug('IPC setup done')

    petDebug('Starting sleep timer...')
    startSleepTimer(getPetWindow())

    mainWindow.on('closed', () => destroyAllPetWindows())
    electronApp.on('before-quit', destroyAllPetWindows)

    petDebug('Desktop pet initialized successfully')
  } catch (err) {
    petDebug('Failed to initialize: ' + (err ? (err.stack || err.message) : 'unknown error'))
    console.error('[hermes-pet] Failed to initialize:', err)
  }
}

module.exports = { initPet }
