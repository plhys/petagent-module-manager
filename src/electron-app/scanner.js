/* ============================================================
   scanner.js — Hermes Agent 安装目录扫描
   ============================================================ */

const path = require('path')
const fs = require('fs')
const os = require('os')

function scanHermesInstall(app) {
  const candidates = []

  candidates.push(process.cwd())

  const home = os.homedir()
  const localAppData = process.env.LOCALAPPDATA || ''

  candidates.push(path.join(home, '.hermes', 'hermes-agent'))
  candidates.push(path.join(home, 'hermes-agent'))
  if (localAppData) {
    candidates.push(path.join(localAppData, 'hermes'))
    candidates.push(path.join(localAppData, 'hermes', 'hermes-agent'))
  }

  let dir = app.isPackaged ? path.dirname(app.getPath('exe')) : path.resolve(__dirname, '..', '..', '..')
  for (let i = 0; i < 6; i++) {
    candidates.push(path.join(dir, 'hermes-agent'))
    candidates.push(dir)
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  candidates.push('D:\\hermes-agent')
  candidates.push('D:\\hermes')
  candidates.push('D:\\hermes-offline')

  const found = []
  for (const c of candidates) {
    try {
      const p = path.resolve(c)
      if (fs.existsSync(path.join(p, 'pyproject.toml'))) {
        if (!found.includes(p)) found.push(p)
      }
      const sub = path.join(p, 'hermes-agent')
      if (fs.existsSync(path.join(sub, 'pyproject.toml'))) {
        if (!found.includes(sub)) found.push(sub)
      }
    } catch {}
  }

  return found
}

module.exports = { scanHermesInstall }