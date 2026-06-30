/* ============================================================
   PetAgent 模块管理器 v2 — 面板逻辑
   命名空间: App (入口), State (数据), API (通信), UI (渲染)
   ============================================================ */

// ── 工具函数 ──
function esc(s) {
    if (s == null) return ''
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

function el(tag, attrs, children) {
    const e = document.createElement(tag)
    if (attrs) Object.keys(attrs).forEach(k => {
        if (k === 'className') e.className = attrs[k]
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(e.style, attrs[k])
        else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), attrs[k])
        else if (k === 'innerHTML') e.innerHTML = attrs[k]
        else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k])
    })
    if (children) {
        const arr = Array.isArray(children) ? children : [children]
        arr.forEach(c => { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c) })
    }
    return e
}

// ── 状态管理 ──
const State = {
    modules: [], selected: new Set(), targetPath: '', targetValid: false, installing: false,
    _logLines: null, _progressPct: 0, _progressLabel: '',
    petagentInstalled: false, installedVersion: null, sourceVersion: null, canUpdate: false,

    scanPath() { return this.targetPath },
    setTarget(path, valid) { this.targetPath = path; this.targetValid = valid },
    toggleModule(id) {
        const mod = this.modules.find(m => m.id === id)
        if (mod) {
            if (this.selected.has(id)) { this.selected.delete(id); (mod.submodules||[]).forEach(c => this.selected.delete(c.id)) }
            else { this.selected.add(id); (mod.submodules||[]).forEach(c => this.selected.add(c.id)) }
        } else {
            if (this.selected.has(id)) this.selected.delete(id)
            else { this.selected.add(id); this.modules.forEach(m => { if (m.submodules && m.submodules.some(c => c.id === id)) this.selected.add(m.id) }) }
        }
    },
    setPreset(type) {
        this.selected = new Set()
        if (type === 'recommend') {
            this.modules.forEach(m => { if (!m.disabled && m.defaultChecked !== false) { this.selected.add(m.id); (m.submodules||[]).forEach(c => this.selected.add(c.id)) } })
        } else if (type === 'all') {
            this.modules.forEach(m => { if (!m.disabled) { this.selected.add(m.id); (m.submodules||[]).forEach(c => this.selected.add(c.id)) } })
        }
    },
    countSelected() {
        let n = 0
        this.modules.forEach(m => { if (this.selected.has(m.id)) n++; (m.submodules||[]).forEach(c => { if (this.selected.has(c.id)) n++ }) })
        return n
    },
    startProgress() { this.installing = true; this._logLines = []; this._progressPct = 0; this._progressLabel = '准备中…' },
    updateProgress(pct, label) { this._progressPct = pct; this._progressLabel = label },
    addLog(entry) { if (this._logLines) this._logLines.push(entry) },
    finishProgress(success) {
        this.installing = false
        this._progressPct = success ? 100 : this._progressPct
        this._progressLabel = success ? '完成' : '失败'
    },
    getLogs() { return this._logLines || [] },
    getProgress() { return { pct: this._progressPct, label: this._progressLabel, show: this.installing && this._progressPct != null } }
}

// ── 通信层 ──
const isElectron = !!(window.electronAPI)
const API = {
    async getModules() {
        if (isElectron) return window.electronAPI.getModules()
        return (await fetch('/api/modules')).json()
    },
    async getTarget() {
        if (isElectron) return window.electronAPI.getTarget()
        return (await fetch('/api/target')).json()
    },
    async doScan() {
        if (isElectron) { const r = await window.electronAPI.scanTarget(); return { found: r.found||[], selected: r.selected||'' } }
        return (await fetch('/api/scan')).json()
    },
    async setTarget(path) {
        if (isElectron) { const r = await window.electronAPI.validatePath(path); return { target: r.target, valid: r.valid } }
        return (await fetch('/api/browse', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path}) })).json()
    },
    async browseDialog() {
        if (isElectron) return window.electronAPI.browseTarget()
        return { target:'', valid:false }
    },
    install(modules) {
        if (isElectron) {
            return new Promise((resolve) => {
                const ids = [...modules]
                if (!ids.length) { resolve({success:false, log:[{level:'error',msg:'未选择模块'}]}); return }
                if (!confirm(`确认安装 ${ids.length} 个模块到:\n\n${State.targetPath}\n\n钩子注入模式，不修改原始文件。\n如有问题，运行卸载器即可恢复。`)) {
                    resolve({success:false, log:[]}); return
                }
                State.startProgress()
                const onLog = (data) => {
                    const m = data.msg.match(/^progress:(\d+)\/(\d+)/)
                    if (m) { State.updateProgress(Math.round((parseInt(m[1])/parseInt(m[2]))*100), `模块 ${m[1]}/${m[2]}`) }
                    else if (data.msg.startsWith('▸')) { State.updateProgress(State.getProgress().pct, data.msg.replace('▸ ','')) }
                    State.addLog(data)
                    UI.refresh()
                }
                const onDone = (data) => {
                    window.electronAPI.removeInstallListeners()
                    State.finishProgress(data.success)
                    UI.refresh()
                    resolve({success:data.success, log:State.getLogs()})
                }
                window.electronAPI.onInstallLog(onLog)
                window.electronAPI.onInstallDone(onDone)
                UI.refresh()
                window.electronAPI.installStart(ids)
            })
        }
        return (async () => {
            const r = await fetch('/api/install', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({modules:[...modules]}) })
            return r.json()
        })()
    },
    async uninstall() {
        if (isElectron) {
            if (!confirm(`确认从以下目录卸载 PetAgent？\n\n${State.targetPath}`)) return {success:false, log:[]}
            return window.electronAPI.uninstall()
        }
        return (await fetch('/api/uninstall', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({target:State.targetPath}) })).json()
    },
    async checkInstalled() {
        if (isElectron) return window.electronAPI.checkInstalled()
        return (await fetch('/api/check-installed')).json()
    }
}

// ── UI 渲染层 ──
const UI = {
    _root: null,

    // 主入口：初始化整个界面
    init() {
        this._root = document.getElementById('app')
        this._render()
        this._bindEvents()
    },

    // 增量刷新：只更新会变化的部分
    refresh() {
        this._updateTargetSection()
        this._updateModuleList()
        this._updateProgress()
        this._updateLog()
        this._updateActionBar()
    },

    _render() {
        this._root.innerHTML = ''
        this._root.appendChild(this._buildTitlebar())
        this._root.appendChild(this._buildContent())
        this._root.appendChild(this._buildProgress())
        this._root.appendChild(this._buildLog())
        this._root.appendChild(this._buildActionBar())
    },

    // ── 标题栏 ──
    _buildTitlebar() {
        return el('div', { className: 'titlebar' }, [
            el('span', { className: 'icon' }, '⚡'),
            el('span', { className: 'brand' }, 'Hermes Agent'),
            el('span', { className: 'title' }, 'PetAgent 模块管理器 v2'),
            el('span', { className: 'spacer' }),
            el('button', { className: 'btn-close', id: 'btnClose', title: '关闭' })
        ])
    },

    // ── 内容区 ──
    _buildContent() {
        const content = el('div', { className: 'content', id: 'contentArea' })
        content.appendChild(this._buildTargetSection())
        content.appendChild(el('div', { className: 'subtitle' }, '勾选要安装的模块，点击底部「开始安装」'))
        this._buildModuleListInto(content)
        return content
    },

    _buildTargetSection() {
        const section = el('div', { className: 'target-section', id: 'targetSection' })
        const labelRow = el('div', { className: 'label-row' })
        labelRow.appendChild(el('span', null, '📂 安装目标目录'))
        labelRow.appendChild(el('span', { className: 'status-ok', id: 'targetStatusOk', style: { display: 'none' } }, '✓ 已找到 Hermes Agent 项目'))
        labelRow.appendChild(el('span', { className: 'status-err', id: 'targetStatusErr', style: { display: 'none' } }, '✗ 未找到 pyproject.toml'))
        section.appendChild(labelRow)

        const pathBox = el('div', { className: 'path-box', id: 'pathBox' })
        pathBox.appendChild(el('span', { className: 'status-icon', id: 'statusIcon' }, '✗'))
        pathBox.appendChild(el('input', { type:'text', className:'path-input', id:'pathInput', placeholder:'输入 Hermes Agent 项目目录路径...' }))
        pathBox.appendChild(el('span', { className: 'install-badge', id: 'installBadge', style: { display: 'none' } }, ''))
        section.appendChild(pathBox)

        const btnRow = el('div', { className: 'btn-row' })
        btnRow.appendChild(el('button', { className:'btn', id:'btnScan', style:{fontSize:'10px',padding:'3px 8px'} }, '🔍 自动扫描'))
        btnRow.appendChild(el('button', { className:'btn btn-accent', id:'btnBrowse', style:{fontSize:'10px',padding:'3px 8px'} }, isElectron ? '📁 浏览选择' : '✅ 确认目录'))
        section.appendChild(btnRow)
        return section
    },

    _updateTargetSection() {
        const valid = State.targetValid
        const path = State.targetPath
        const pathBox = document.getElementById('pathBox')
        if (pathBox) { pathBox.className = 'path-box ' + (valid ? 'valid' : 'invalid') }
        const statusIcon = document.getElementById('statusIcon')
        if (statusIcon) {
            statusIcon.textContent = valid ? '✓' : (path === '正在扫描…' || path === '正在验证…' ? '⏳' : '✗')
            statusIcon.className = 'status-icon ' + (valid ? 'valid' : 'invalid')
        }
        const input = document.getElementById('pathInput')
        if (input && document.activeElement !== input) input.value = path
        const ok = document.getElementById('targetStatusOk')
        const err = document.getElementById('targetStatusErr')
        if (ok) ok.style.display = valid ? '' : 'none'
        if (err) err.style.display = valid ? 'none' : ''
        const badge = document.getElementById('installBadge')
        if (badge) {
            if (valid && State.petagentInstalled) {
                badge.style.display = ''
                const ver = State.installedVersion || ''
                const srcVer = State.sourceVersion || ''
                if (State.canUpdate) {
                    badge.textContent = '可更新 ' + ver + ' → ' + srcVer
                    badge.className = 'install-badge update-available'
                } else {
                    badge.textContent = '已安装' + (ver ? ' v' + ver : '')
                    badge.className = 'install-badge installed'
                }
            } else if (valid) {
                badge.style.display = ''
                badge.textContent = '未安装'
                badge.className = 'install-badge not-installed'
            } else {
                badge.style.display = 'none'
            }
        }
    },

    // ── 模块列表 ──
    _buildModuleListInto(content) {
        const list = el('div', { id: 'moduleList' })
        State.modules.forEach((m, idx) => {
            list.appendChild(this._buildModuleRow(m))
            ;(m.submodules||[]).forEach(c => list.appendChild(this._buildSubmoduleRow(c)))
            if (idx < State.modules.length - 1) list.appendChild(el('div', { className: 'divider' }))
        })
        content.appendChild(list)
    },

    _buildModuleRow(m) {
        const checked = this._calcChecked(m)
        const row = el('div', { className: 'module-row' + (m.disabled ? ' is-disabled' : '') })
        const label = el('label', { className: 'module-check' })
        label.appendChild(el('input', { type:'checkbox', 'data-id':m.id, checked:checked.checked, disabled:m.disabled||false }))
        label.appendChild(el('span', { className: checked.indet ? 'box indeterminate' : 'box' }))
        row.appendChild(label)

        const info = el('div', { className: 'module-info' })
        const title = el('div', { className: 'title' })
        title.appendChild(el('span', null, m.name||m.id))
        if (m.disabled) title.appendChild(el('span', { className:'badge off' }, '暂不可用'))
        else if (m.defaultChecked !== false) title.appendChild(el('span', { className:'badge rec' }, '推荐'))
        info.appendChild(title)
        info.appendChild(el('div', { className: 'desc' }, m.description||''))
        row.appendChild(info)
        return row
    },

    _buildSubmoduleRow(c) {
        const row = el('div', { className: 'module-row is-child' })
        const label = el('label', { className: 'module-check' })
        label.appendChild(el('input', { type:'checkbox', 'data-id':c.id, checked:State.selected.has(c.id) }))
        label.appendChild(el('span', { className: 'box' }))
        row.appendChild(label)
        const info = el('div', { className: 'module-info' })
        info.appendChild(el('div', { className: 'title' }, c.name||c.id))
        row.appendChild(info)
        return row
    },

    _updateModuleList() {
        const list = document.getElementById('moduleList')
        if (!list) return
        list.querySelectorAll('.module-row').forEach(row => {
            const cb = row.querySelector('input[type="checkbox"]')
            if (!cb) return
            const id = cb.getAttribute('data-id')
            const mod = State.modules.find(m => m.id === id)
            if (mod) {
                const c = this._calcChecked(mod)
                cb.checked = c.checked
                const box = row.querySelector('.box')
                if (box) box.className = c.indet ? 'box indeterminate' : 'box'
            } else {
                cb.checked = State.selected.has(id)
            }
        })
    },

    _calcChecked(m) {
        const kids = m.submodules||[]
        if (!kids.length) return { checked: State.selected.has(m.id), indet: false }
        const all = kids.every(c => State.selected.has(c.id)), some = kids.some(c => State.selected.has(c.id))
        if (State.selected.has(m.id) && all) return { checked: true, indet: false }
        if ((State.selected.has(m.id) && !all) || (!State.selected.has(m.id) && some)) return { checked: false, indet: true }
        return { checked: false, indet: false }
    },

    // ── 进度条 ──
    _buildProgress() {
        const wrap = el('div', { className: 'progress-wrap', id: 'progressWrap' })
        const label = el('div', { className: 'progress-label', id: 'progressLabel' })
        label.appendChild(el('span', { id: 'progressText' }, ''))
        label.appendChild(el('span', { id: 'progressPct' }, '0%'))
        wrap.appendChild(label)
        const bg = el('div', { className: 'progress-bar-bg' })
        bg.appendChild(el('div', { className: 'progress-bar-fill', id: 'progressFill', style: { width: '0%' } }))
        wrap.appendChild(bg)
        return wrap
    },

    _updateProgress() {
        const p = State.getProgress()
        const wrap = document.getElementById('progressWrap')
        if (wrap) wrap.className = 'progress-wrap' + (p.show ? ' show' : '')
        const text = document.getElementById('progressText')
        if (text) text.textContent = p.label || '安装中…'
        const pct = document.getElementById('progressPct')
        if (pct) pct.textContent = Math.round(p.pct) + '%'
        const fill = document.getElementById('progressFill')
        if (fill) fill.style.width = p.pct + '%'
    },

    // ── 日志区 ──
    _buildLog() {
        return el('div', { className: 'log-area', id: 'logArea' })
    },

    _updateLog() {
        const area = document.getElementById('logArea')
        if (!area) return
        const logs = State.getLogs()
        if (!logs || !logs.length) { area.className = 'log-area'; area.innerHTML = ''; return }
        area.className = 'log-area show'
        area.innerHTML = ''
        logs.forEach(l => {
            const icon = l.level === 'ok' ? '✓' : l.level === 'error' ? '✗' : l.level === 'warn' ? '⚠' : ''
            area.appendChild(el('div', { className: 'log-line' }, [
                el('span', { className: 'lvl ' + esc(l.level) }, icon),
                el('span', null, esc(l.msg))
            ]))
        })
    },

    // ── 操作栏 ──
    _buildActionBar() {
        const bar = el('div', { className: 'action-bar', id: 'actionBar' })
        const left = el('div', { className: 'left' })
        left.appendChild(el('span', { className: 'label', id: 'btnRecommend' }, [el('span', null, '⭐'), ' 推荐']))
        left.appendChild(el('button', { className: 'btn', id: 'btnSelectAll' }, '全部'))
        left.appendChild(el('button', { className: 'btn btn-ghost', id: 'btnClearAll' }, '清空'))
        left.appendChild(el('span', { className: 'count-badge', id: 'countBadge' }, '已选 0 项'))
        bar.appendChild(left)

        const spacer = el('div', { className: 'spacer' })
        bar.appendChild(spacer)

        const right = el('div', { className: 'right' })
        right.appendChild(el('button', { className: 'btn btn-danger', id: 'btnUninstall', style: { display: 'none' } }, '🗑 卸载'))
        right.appendChild(el('button', { className: 'btn btn-update', id: 'btnUpdate', style: { display: 'none' } }, '🔄 更新'))
        right.appendChild(el('button', { className: 'btn btn-accent', id: 'btnInstall' }, '🔧 开始安装'))
        bar.appendChild(right)
        return bar
    },

    _updateActionBar() {
        const total = State.countSelected()
        const canInstall = !State.installing && State.targetValid && total > 0
        const canUninstall = !State.installing && State.targetValid

        const badge = document.getElementById('countBadge')
        if (badge) badge.textContent = '已选 ' + total + ' 项'

        const btnInstall = document.getElementById('btnInstall')
        if (btnInstall) {
            btnInstall.disabled = !canInstall
            btnInstall.innerHTML = State.installing ? '<span class="spinner"></span> 安装中…' : '🔧 开始安装' + (total > 0 ? ' (' + total + ')' : '')
            if (State.targetValid && State.petagentInstalled && !State.canUpdate) {
                btnInstall.style.display = 'none'
            } else if (State.targetValid && State.canUpdate) {
                btnInstall.style.display = 'none'
            } else {
                btnInstall.style.display = ''
            }
        }
        const btnUninstall = document.getElementById('btnUninstall')
        if (btnUninstall) {
            btnUninstall.disabled = !canUninstall
            btnUninstall.style.display = State.targetValid && State.petagentInstalled ? '' : 'none'
        }
        const btnUpdate = document.getElementById('btnUpdate')
        if (btnUpdate) {
            btnUpdate.disabled = !canUninstall
            btnUpdate.style.display = State.targetValid && State.canUpdate ? '' : 'none'
        }
    },

    // ── 事件绑定 ──
    _bindEvents() {
        // 模块复选框：用事件委托，避免每次重建 DOM 后重新绑定
        this._root.addEventListener('change', (e) => {
            if (e.target.matches('.module-check input[type="checkbox"]')) {
                State.toggleModule(e.target.getAttribute('data-id'))
                UI.refresh()
            }
        })

        this._root.addEventListener('click', (e) => {
            const id = e.target.id || (e.target.closest('button') ? e.target.closest('button').id : '') || (e.target.closest('.label') ? e.target.closest('.label').id : '')
            switch (id) {
                case 'btnClose': window.close(); break
                case 'btnScan': UI._doScan(); break
                case 'btnBrowse': UI._doBrowse(); break
                case 'btnRecommend': State.setPreset('recommend'); UI.refresh(); break
                case 'btnSelectAll': State.setPreset('all'); UI.refresh(); break
                case 'btnClearAll': State.selected = new Set(); UI.refresh(); break
                case 'btnInstall': UI._doInstall(); break
                case 'btnUninstall': UI._doUninstall(); break
                case 'btnUpdate': UI._doUpdate(); break
            }
        })

        this._root.addEventListener('keydown', (e) => {
            if (e.target.id === 'pathInput' && e.key === 'Enter') UI._doBrowse()
        })
    },

    async _doScan() {
        State.setTarget('正在扫描…', false); UI.refresh()
        try {
            const r = await API.doScan()
            if (r.found.length > 0) State.setTarget(r.selected, true)
            else State.setTarget('未自动找到，请手动输入或浏览选择', false)
        } catch (e) { State.setTarget('扫描失败', false) }
        await this._refreshInstalled()
        UI.refresh()
    },

    async _refreshInstalled() {
        if (!State.targetValid) { State.petagentInstalled = false; State.installedVersion = null; State.sourceVersion = null; State.canUpdate = false; return }
        try {
            const r = await API.checkInstalled()
            State.petagentInstalled = r.installed || false
            State.installedVersion = r.version || null
            State.sourceVersion = r.sourceVersion || null
            State.canUpdate = r.canUpdate || false
        } catch (e) { State.petagentInstalled = false; State.installedVersion = null; State.sourceVersion = null; State.canUpdate = false }
    },

    async _doBrowse() {
        if (isElectron) {
            State.setTarget('正在选择…', false); UI.refresh()
            try {
                const r = await API.browseDialog()
                State.setTarget(r.target || State.targetPath, r.valid)
            } catch (e) { State.setTarget('选择失败', false) }
            UI.refresh()
            return
        }
        const input = document.getElementById('pathInput')
        if (!input) return
        const path = input.value.trim()
        if (!path) { alert('请输入目录路径'); return }
        State.setTarget('正在验证…', false); UI.refresh()
        try {
            const r = await API.setTarget(path)
            State.setTarget(r.target, r.valid)
        } catch (e) { State.setTarget('验证失败', false) }
        await this._refreshInstalled()
        UI.refresh()
    },

    async _doInstall() {
        if (State.installing || !State.targetValid) return
        const ids = [...State.selected]
        if (!ids.length) { alert('请至少选择一个模块'); return }
        State.installing = true; UI.refresh()
        try {
            const result = await API.install(ids)
            State.installing = false
            if (result && !isElectron) {
                State._logLines = result.log || []
                UI.refresh()
                setTimeout(() => alert(result.success ? '✅ 安装完成！' : '⚠ 部分模块有问题，请查看日志'), 300)
            } else if (result && isElectron) {
                setTimeout(() => alert(result.success ? '✅ 安装完成！' : '⚠ 部分模块有问题，请查看日志'), 300)
            }
        } catch (e) {
            State.installing = false
            State._logLines = [{ level: 'error', msg: '安装失败: ' + e.message }]
            UI.refresh()
        }
    },

    async _doUninstall() {
        if (State.installing || !State.targetValid) return
        State.installing = true; UI.refresh()
        try {
            const result = await API.uninstall()
            State.installing = false
            State._logLines = result && result.log ? result.log : [{ level: 'info', msg: '卸载完成' }]
            await this._refreshInstalled()
            UI.refresh()
            setTimeout(() => alert(result.success ? '✅ 卸载完成！' : '⚠ 卸载出现问题，请查看日志'), 300)
        } catch (e) {
            State.installing = false
            State._logLines = [{ level: 'error', msg: '卸载失败: ' + e.message }]
            UI.refresh()
        }
    },

    async _doUpdate() {
        if (State.installing || !State.targetValid || !State.canUpdate) return
        if (!confirm(`将更新 PetAgent 从 v${State.installedVersion || '?'} 到 v${State.sourceVersion || '?'}\n\n这会先卸载旧版本再安装新版本。`)) return
        State.installing = true; UI.refresh()
        try {
            // 先卸载
            State._logLines = [{ level: 'info', msg: '正在卸载旧版本…' }]
            UI.refresh()
            const unResult = await API.uninstall()
            if (!unResult.success) {
                State.installing = false
                State._logLines = [...(unResult.log || []), { level: 'error', msg: '卸载失败，更新中止' }]
                UI.refresh()
                return
            }
            State._logLines = [...(unResult.log || []), { level: 'info', msg: '卸载完成，正在安装新版本…' }]
            UI.refresh()
            await this._refreshInstalled()
            // 再安装推荐模块
            State.setPreset('recommend')
            const ids = [...State.selected]
            if (!ids.length) {
                State.installing = false
                State._logLines.push({ level: 'warn', msg: '没有可安装的模块' })
                UI.refresh()
                return
            }
            const result = await API.install(ids)
            State.installing = false
            if (result && !isElectron) {
                State._logLines = result.log || []
            }
            await this._refreshInstalled()
            UI.refresh()
            setTimeout(() => alert(result.success ? '✅ 更新完成！' : '⚠ 更新出现问题，请查看日志'), 300)
        } catch (e) {
            State.installing = false
            State._logLines = [{ level: 'error', msg: '更新失败: ' + e.message }]
            UI.refresh()
        }
    }
}

// ── 启动 ──
async function init() {
    try { State.modules = await API.getModules() || [] } catch (e) { State.modules = [] }
    State.setPreset('recommend')
    try {
        const t = await API.getTarget()
        State.setTarget(t.target, t.valid)
    } catch (e) {}
    if (!State.targetPath) {
        try {
            const r = await API.doScan()
            if (r.found.length > 0) State.setTarget(r.selected, true)
            else State.setTarget('未自动找到，请手动输入或浏览选择', false)
        } catch (e) { State.setTarget('扫描失败', false) }
    }
    if (State.targetValid) {
        try {
            const r = await API.checkInstalled()
            State.petagentInstalled = r.installed || false
        } catch (e) { State.petagentInstalled = false }
    }
    UI.init()
}

init()