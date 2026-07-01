/**
 * PetAgent 注入引擎 — 浏览器端运行时
 *
 * 职责：
 *  1. 读取适配器（window.__petagent_anchors）获取 DOM 选择器映射
 *  2. 读取定制清单（window.__petagent_config）获取要执行的操作
 *  3. 将 CSS 规则注入为 <style> 标签
 *  4. 通过 MutationObserver 等待并修改 DOM 元素
 *  5. 跟踪所有注入点，支持精确卸载
 *
 * 此文件不包含任何 Hermes 版本相关的选择器——选择器在适配器中定义。
 * 此文件不包含任何业务定制内容——定制内容在 config 中定义。
 */

(function () {
  'use strict'

  if (window.__petagentEngineInstalled) return
  window.__petagentEngineInstalled = true

  var DEBUG = window.__PETAGENT_DEBUG === true
  var anchors = window.__petagent_anchors || {}
  var config = window.__petagent_config || { customizations: [] }
  var tracking = window.__petagent_tracking = { styles: [], observers: [], elements: [] }

  function log() {
    if (DEBUG) console.log('[petagent-engine]', Array.prototype.join.call(arguments, ' '))
  }

  // ── 工具函数 ──────────────────────────────────────────────────────────

  /** 根据锚点名称 + 可选的修饰符解析为 CSS 选择器 */
  function resolveSelector(anchorName, modifier) {
    var sel = anchors[anchorName]
    if (!sel) return null
    if (modifier) {
      // modifier 可以是 ".dark" 这种独立类，也可以是组合
      if (modifier.charAt(0) === '.' || modifier.charAt(0) === '[') {
        sel = sel + modifier
      } else {
        sel = sel + ' ' + modifier
      }
    }
    return sel
  }

  /** 检测当前是否为暗色模式 */
  function isDarkMode() {
    return document.documentElement.classList.contains('dark')
  }

  /** 创建并注入 <style> 标签，返回 style 元素用于追踪 */
  function injectStyle(cssText, styleId) {
    var el = document.createElement('style')
    el.setAttribute('data-petagent', styleId || '')
    el.textContent = cssText
    document.head.appendChild(el)
    tracking.styles.push(el)
    return el
  }

  // ── CSS 定制执行 ──────────────────────────────────────────────────────

  function applyCssRule(rule) {
    var isComplex = rule.stylesDark || rule.stylesLight
    var hasConditionalModifier = rule.modifier === '.dark' || rule.modifier === ':not(.dark)'

    if (isComplex) {
      // 亮色 + 暗色分别生成规则
      if (rule.stylesLight) {
        applyCssEntry(rule, rule.stylesLight, rule.modifier ? '' : '')
      }
      if (rule.stylesDark) {
        applyCssEntry(rule, rule.stylesDark, '.dark')
      }
      return
    }

    if (hasConditionalModifier) {
      applyCssEntry(rule, rule.styles, rule.modifier)
      return
    }

    applyCssEntry(rule, rule.styles, '')
  }

  function applyCssEntry(rule, styles, modifierOverride) {
    var modifier = modifierOverride || rule.modifier || ''
    var selector = resolveSelector(rule.anchor, modifier)
    if (!selector) {
      log('CSS anchor not found:', rule.anchor, modifier)
      return
    }

    var declarations = buildCssDeclarations(styles)
    if (!declarations) return

    var cssText = selector + ' {\n' + declarations + '\n}'
    var styleId = 'petagent-' + rule.id + (modifier ? '-' + modifier.replace(/[^a-z0-9-]/g, '') : '')
    injectStyle(cssText, styleId)
    log('CSS:', rule.id, '→', selector, '(' + Object.keys(styles).length + ' props)')
  }

  function buildCssDeclarations(styles) {
    var lines = []
    for (var prop in styles) {
      if (!styles.hasOwnProperty(prop)) continue
      var cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase()
      var val = styles[prop]
      // 支持 CSS 变量引用：__var(name) 或直接使用 var(--name)
      lines.push('  ' + cssProp + ': ' + val + ';')
    }
    return lines.join('\n')
  }

  // ── DOM 定制执行 ──────────────────────────────────────────────────────

  function applyDomRule(rule) {
    var selector = resolveSelector(rule.anchor, rule.modifier || '')
    if (!selector) {
      log('DOM anchor not found:', rule.anchor)
      return
    }

    if (rule.persistent !== false) {
      // 持久模式：用 MutationObserver 等待元素出现
      waitAndApply(selector, rule)
    } else {
      // 一次性模式：元素出现后执行一次
      waitAndApply(selector, rule, true)
    }
  }

  function waitAndApply(selector, rule, once) {
    var applied = false

    function tryApply() {
      var elements = document.querySelectorAll(selector)
      if (!elements.length) return false

      // 检查是否已应用过（通过 data-petagent 标记）
      var marker = 'data-petagent-' + rule.id
      var targets = []
      for (var i = 0; i < elements.length; i++) {
        if (!elements[i].hasAttribute(marker)) {
          targets.push(elements[i])
        }
      }
      if (!targets.length) return !!once // 已全部应用

      for (var j = 0; j < targets.length; j++) {
        executeDomAction(targets[j], rule, marker)
        tracking.elements.push({ el: targets[j], marker: marker })
      }
      applied = true
      log('DOM:', rule.id, '→', targets.length, 'element(s)')
      return once // 一次性模式完成
    }

    // 立即尝试
    if (tryApply() && once) return

    // 用 MutationObserver 等待
    var mo = new MutationObserver(function () {
      if (tryApply() && once) {
        mo.disconnect()
        var idx = tracking.observers.indexOf(mo)
        if (idx >= 0) tracking.observers.splice(idx, 1)
      }
    })
    mo.observe(document.documentElement, { childList: true, subtree: true })
    tracking.observers.push(mo)
  }

  function executeDomAction(el, rule, marker) {
    el.setAttribute(marker, '')

    switch (rule.action) {
      case 'set-html':
        // 简单直接：替换 innerHTML，不保留原始内容
        el.innerHTML = rule.html || ''
        break

      case 'replace-children':
        // 保存原始子元素（通过 CSS 隐藏而非删除，保留 React 事件绑定）
        wrapOriginals(el, rule)
        // 插入新内容
        var wrapper = document.createElement('div')
        wrapper.className = rule.wrapperClass || ('petagent-' + rule.id)
        wrapper.innerHTML = rule.html || ''
        el.appendChild(wrapper)
        break

      case 'prepend':
        el.insertAdjacentHTML('afterbegin', rule.html || '')
        break

      case 'append':
        el.insertAdjacentHTML('beforeend', rule.html || '')
        break

      case 'insert-before':
        el.insertAdjacentHTML('beforebegin', rule.html || '')
        break

      case 'insert-after':
        el.insertAdjacentHTML('afterend', rule.html || '')
        break

      default:
        log('Unknown DOM action:', rule.action)
    }
  }

  function wrapOriginals(el, rule) {
    // 将原始子元素包裹到一个 div 中，用 CSS 控制显示/隐藏
    var origClassName = rule.originalClass || ('petagent-original-' + rule.id)
    var existing = el.querySelector('.' + origClassName)
    if (existing) return // 已包裹

    var wrapper = document.createElement('div')
    wrapper.className = origClassName
    while (el.firstChild) {
      wrapper.appendChild(el.firstChild)
    }
    el.appendChild(wrapper)
  }

  // ── 主题切换监听 ──────────────────────────────────────────────────────

  function watchThemeChanges() {
    if (!config.watchTheme) return

    var mo = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i]
        if (m.type === 'attributes' &&
            (m.attributeName === 'data-hermes-theme' || m.attributeName === 'class')) {
          log('Theme changed, reapplying conditional rules')
          // 重新应用所有带 modifier 的 CSS 规则
          reapplyConditionalCssRules()
          break
        }
      }
    })
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-hermes-theme', 'class']
    })
    tracking.observers.push(mo)
  }

  function reapplyConditionalCssRules() {
    // 移除旧的 modifier 相关样式
    var toRemove = []
    for (var i = 0; i < tracking.styles.length; i++) {
      var el = tracking.styles[i]
      var id = el.getAttribute('data-petagent')
      if (id && (id.indexOf('-dark') >= 0 || id.indexOf('-not-dark') >= 0)) {
        toRemove.push(el)
      }
    }
    for (var j = 0; j < toRemove.length; j++) {
      toRemove[j].parentNode.removeChild(toRemove[j])
      var idx = tracking.styles.indexOf(toRemove[j])
      if (idx >= 0) tracking.styles.splice(idx, 1)
    }

    // 重新应用
    var customs = config.customizations || []
    for (var k = 0; k < customs.length; k++) {
      var c = customs[k]
      if (c.type === 'css' && (c.stylesDark || c.stylesLight || c.modifier === '.dark')) {
        applyCssRule(c)
      }
    }
  }

  // ── 清理函数（供卸载时调用） ──────────────────────────────────────────

  window.__petagentCleanup = function () {
    log('Cleaning up PetAgent engine...')

    // 移除注入的 <style> 标签
    for (var i = 0; i < tracking.styles.length; i++) {
      var styleEl = tracking.styles[i]
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl)
      }
    }
    tracking.styles = []

    // 断开 MutationObserver
    for (var j = 0; j < tracking.observers.length; j++) {
      tracking.observers[j].disconnect()
    }
    tracking.observers = []

    // 移除注入的 DOM 元素
    for (var k = 0; k < tracking.elements.length; k++) {
      var entry = tracking.elements[k]
      if (entry.el && entry.el.parentNode && entry.marker) {
        entry.el.removeAttribute(entry.marker)
        // 移除 petagent 注入的子元素
        var injected = entry.el.querySelectorAll('[class*="petagent-' + entry.marker.replace('data-petagent-', '') + '"]')
        for (var n = 0; n < injected.length; n++) {
          if (injected[n].parentNode) injected[n].parentNode.removeChild(injected[n])
        }
      }
    }
    tracking.elements = []
    log('Cleanup complete')
  }

  // ── 启动 ──────────────────────────────────────────────────────────────

  function boot() {
    log('Engine booting, anchors:', Object.keys(anchors).length, 'customizations:', (config.customizations || []).length)

    var customs = config.customizations || []

    for (var i = 0; i < customs.length; i++) {
      var c = customs[i]
      if (c.disabled) continue

      try {
        switch (c.type) {
          case 'css':
            applyCssRule(c)
            break
          case 'dom':
            applyDomRule(c)
            break
          default:
            log('Unknown customization type:', c.type)
        }
      } catch (e) {
        console.error('[petagent-engine] Error applying', c.id, ':', e.message)
      }
    }

    watchThemeChanges()
    log('Engine boot complete, injected', tracking.styles.length, 'styles, watching', tracking.observers.length, 'observers')
  }

  // DOMContentLoaded 后启动（如果已加载则立即启动）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
