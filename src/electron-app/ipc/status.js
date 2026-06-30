/* ============================================================
   ipc/status.js — 安装状态检测 IPC handler
   检查目标目录是否已安装 PetAgent 模块，以及版本号
   ============================================================ */

const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')

function register(ipcMain, ctx) {
  ipcMain.handle('check-installed', () => {
    if (!ctx.state.targetPath) return { installed: false, modules: {}, version: null }

    const target = ctx.state.targetPath
    const hooksYaml = path.join(ctx.SRC, 'hooks.yaml')
    const manifestYaml = path.join(ctx.SRC, 'manifest.yaml')

    let hooksMap = {}
    let sourceVersion = null
    try { hooksMap = yaml.load(fs.readFileSync(hooksYaml, 'utf8')) || {} } catch (_) {}
    try {
      const mf = yaml.load(fs.readFileSync(manifestYaml, 'utf8'))
      sourceVersion = (mf && mf.version) ? String(mf.version) : null
    } catch (_) {}

    // 检查 .petagent-version 文件
    let installedVersion = null
    const versionFile = path.join(target, '.petagent-version')
    try {
      installedVersion = fs.readFileSync(versionFile, 'utf8').trim()
    } catch (_) {}

    // 检查每个钩子对应的目标文件是否包含 PetAgent 标记
    const modulesStatus = {}
    let hasAny = false
    for (const [hookName, targetRel] of Object.entries(hooksMap)) {
      const targetFile = path.join(target, targetRel)
      try {
        if (fs.existsSync(targetFile)) {
          const content = fs.readFileSync(targetFile, 'utf8')
          const found = content.includes('PetAgent:')
          modulesStatus[hookName] = found
          if (found) hasAny = true
        } else {
          modulesStatus[hookName] = false
        }
      } catch (_) {
        modulesStatus[hookName] = false
      }
    }

    // 也检查模块 copy 文件是否存在（额外确认）
    let copyFilesExist = false
    try {
      const modulesDir = path.join(ctx.SRC, 'modules')
      if (fs.existsSync(modulesDir)) {
        // 快速抽样：检查 pet 模块的关键文件
        const checks = [
          'apps/desktop/electron/pet/pet-init.cjs',
          'apps/desktop/dist-built/pet.html',
        ]
        for (const rel of checks) {
          if (fs.existsSync(path.join(target, rel))) {
            copyFilesExist = true
            break
          }
        }
      }
    } catch (_) {}

    const installed = hasAny || copyFilesExist

    return {
      installed,
      modules: modulesStatus,
      version: installedVersion || null,
      sourceVersion,
      canUpdate: installed && sourceVersion && installedVersion !== sourceVersion
    }
  })
}

module.exports = { register }
