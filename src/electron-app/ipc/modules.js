/* ============================================================
   ipc/modules.js — 模块清单 IPC handler
   ============================================================ */

const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')

function register(ipcMain, ctx) {
  ipcMain.handle('get-modules', () => {
    try {
      const mf = yaml.load(fs.readFileSync(path.join(ctx.SRC, 'manifest.yaml'), 'utf8'))
      return mf.modules || []
    } catch (e) { return [] }
  })
}

module.exports = { register }