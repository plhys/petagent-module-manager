/* ============================================================
   python.js — Python 查找与进程 spawn 封装
   ============================================================ */

const path = require('path')
const fs = require('fs')
const { spawn, execSync } = require('child_process')

function findPython(app, ROOT) {
  const portablePython = path.join(path.dirname(app.getPath('exe')), '..', '..', 'python', 'python.exe')
  if (fs.existsSync(portablePython)) return portablePython

  const altPortable = path.join(ROOT, '..', '..', 'python', 'python.exe')
  if (fs.existsSync(altPortable)) return altPortable

  for (const c of ['python', 'python3']) {
    try {
      execSync(`"${c}" --version`, { stdio: 'ignore' })
      return c
    } catch {}
  }
  return null
}

/** 启动 Python 脚本，返回 { process, kill } */
function spawnPython(python, script, args, cwd, onJsonLine, onClose) {
  const p = spawn(python, ['-u', script, ...args], {
    cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  })

  let resolved = false

  const onData = (d) => {
    d.toString().split('\n').filter(Boolean).forEach(line => {
      const trimmed = line.replace(/\r$/, '')
      try {
        onJsonLine(JSON.parse(trimmed))
      } catch {
        onJsonLine({ level: 'info', msg: trimmed })
      }
    })
  }

  p.stdout.on('data', onData)
  p.stderr.on('data', onData)

  p.on('close', code => {
    if (resolved) return
    resolved = true
    onClose(code)
  })

  p.on('error', err => {
    if (resolved) return
    resolved = true
    onClose(null, err)
  })

  return {
    kill: () => { if (!resolved) { resolved = true; try { p.kill() } catch {} } }
  }
}

module.exports = { findPython, spawnPython }