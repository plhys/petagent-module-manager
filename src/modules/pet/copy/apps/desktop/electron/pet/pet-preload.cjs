/**
 * Hermes Pet — Preload script for pet & bubble windows.
 * Exposes `window.hermesPet` with all pet-related IPC methods.
 */
const { contextBridge, ipcRenderer } = require('electron')

const _listeners = new Map()

function onChannel(channel, callback) {
  if (_listeners.has(channel)) {
    ipcRenderer.removeListener(channel, _listeners.get(channel))
  }
  const wrapped = (_event, ...args) => callback(...args)
  _listeners.set(channel, wrapped)
  ipcRenderer.on(channel, wrapped)
}

contextBridge.exposeInMainWorld('hermesPet', {
  toggleChat: () => ipcRenderer.send('hermes-pet:toggle-chat'),
  toggleWindow: () => ipcRenderer.send('hermes-pet:toggle-window'),
  showContextMenu: () => ipcRenderer.send('hermes-pet:show-context-menu'),

  onAnimState: (callback) => {
    onChannel('hermes-pet:anim-state', (state) => callback(state))
  },
  animStateChanged: (state) => ipcRenderer.send('hermes-pet:anim-state-changed', state),

  onDirectionChange: (callback) => {
    onChannel('hermes-pet:direction-change', (direction) => callback(direction))
  },
  onThinking: (callback) => {
    onChannel('hermes-pet:thinking', (active) => callback(active))
  },

  startDrag: (screenX, screenY) => ipcRenderer.send('hermes-pet:start-drag', Math.round(screenX), Math.round(screenY)),
  dragMove: (screenX, screenY) => ipcRenderer.send('hermes-pet:drag-move', Math.round(screenX), Math.round(screenY)),
  stopDrag: () => ipcRenderer.send('hermes-pet:stop-drag'),

  setBubbleVisible: (visible) => ipcRenderer.send('hermes-pet:set-bubble-visible', !!visible),
  setBubbleHeight: (height) => ipcRenderer.send('hermes-pet:set-bubble-height', height),

  onAIRunStart: (callback) => {
    onChannel('hermes-pet:ai-run-start', (data) => callback(data))
  },
  onAIChunk: (callback) => {
    onChannel('hermes-pet:ai-chunk', (chunk) => callback(chunk))
  },
  onAITool: (callback) => {
    onChannel('hermes-pet:ai-tool', (data) => callback(data))
  },
  onAIDone: (callback) => {
    onChannel('hermes-pet:ai-done', (data) => callback(data))
  },
  onAIFinal: (callback) => {
    onChannel('hermes-pet:ai-final', (data) => callback(data))
  },
  onApiError: (callback) => {
    onChannel('hermes-pet:api-error', (data) => callback(data))
  },
})
