const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getModules: () => ipcRenderer.invoke('get-modules'),
  scanTarget: () => ipcRenderer.invoke('scan-target'),
  browseTarget: () => ipcRenderer.invoke('browse-target'),
  getTarget: () => ipcRenderer.invoke('get-target'),
  validateTarget: () => ipcRenderer.invoke('validate-target'),
  validatePath: (p) => ipcRenderer.invoke('validate-path', p),
  installStart: (modules) => ipcRenderer.send('install-start', modules),
  onInstallLog: (cb) => ipcRenderer.on('install-log', (_e, data) => cb(data)),
  onInstallDone: (cb) => ipcRenderer.on('install-done', (_e, data) => cb(data)),
  removeInstallListeners: () => {
    ipcRenderer.removeAllListeners('install-log')
    ipcRenderer.removeAllListeners('install-done')
  },
  uninstall: () => ipcRenderer.invoke('uninstall'),
  checkInstalled: () => ipcRenderer.invoke('check-installed'),
})