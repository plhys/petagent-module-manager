/**
 * PetAgent renderer bridge — injected into the main Hermes Desktop renderer.
 *
 * The upstream frontend code does not natively forward gateway events to the
 * pet overlay. This module patches the renderer's main-world transports
 * (WebSocket, fetch streaming, EventSource) so pet-relevant events are
 * automatically mirrored to the pet via window.hermesDesktop.sendPetEvent().
 */

const INJECTED_SCRIPT = `
(function installPetRendererBridge() {
  if (window.__hermesPetBridgeInstalled) return
  window.__hermesPetBridgeInstalled = true

  var PET_EVENTS = new Set([
    'message.start', 'message.delta', 'message.complete',
    'tool.start', 'tool.progress', 'tool.generating', 'tool.complete'
  ])

  var DEBUG = typeof process !== 'undefined' && process.env && process.env.PETAGENT_DEBUG === '1'
  var msgCount = 0
  var fwdCount = 0
  function log() {
    if (DEBUG) console.log('[pet-bridge]', Array.prototype.join.call(arguments, ' '))
  }

  function _sendPetEvent(data) {
    if (window.hermesDesktop && typeof window.hermesDesktop.sendPetEvent === 'function') {
      window.hermesDesktop.sendPetEvent(data); return true;
    }
    if (window.hermesPetBridge && typeof window.hermesPetBridge.sendPetEvent === 'function') {
      window.hermesPetBridge.sendPetEvent(data); return true;
    }
    return false;
  }

  // ── Expose debug helpers on window ─────────────────────────────────
  window.__petBridgeStatus = function() {
    var api = window.hermesDesktop
    return {
      installed: true,
      msgCount: msgCount,
      fwdCount: fwdCount,
      hasHermesDesktop: !!(window.hermesDesktop && typeof window.hermesDesktop.sendPetEvent === 'function') || !!(window.hermesPetBridge && typeof window.hermesPetBridge.sendPetEvent === 'function'),
      webSocketPatched: !!(window.WebSocket && window.WebSocket.__hermesPetPatched),
      fetchPatched: !!(window.fetch && window.fetch.__hermesPetPatched),
      eventSourcePatched: !!(window.EventSource && window.EventSource.__hermesPetPatched)
    }
  }
  window.__petBridgeTest = function() {
    log('TEST: sending fake event via _sendPetEvent')
    if (_sendPetEvent({ event: 'message.start', message: 'bridge-test' })) {
      return 'sent'
    }
    return 'sendPetEvent not available'
  }

  // Extract and forward pet-relevant events from a gateway message.
  // Hermes gateway uses JSON-RPC:
  //   {"method":"event","params":{"type":"message.delta","payload":{"text":"hi"},"session_id":"..."}}
  // The content fields (text, name, toolCallId, etc.) may live inside params.payload.
  // We flatten payload into the top level so the IPC handler and bubble UI can read them.
  function forwardToPet(data) {
    try {
      if (!data || typeof data !== 'object') return

      // 1) JSON-RPC format: {"method":"event","params":{"type":"message.start",...}}
      if (data.method === 'event' && data.params && typeof data.params === 'object') {
        var eventType = data.params.type
        if (eventType && PET_EVENTS.has(eventType)) {
          // Merge top-level params with payload (payload fields win)
          var flat = Object.assign({}, data.params)
          if (data.params.payload && typeof data.params.payload === 'object') {
            Object.assign(flat, data.params.payload)
          }
          flat.event = eventType  // pet IPC handler expects 'event' field
          delete flat.payload      // clean up nested payload
          if (_sendPetEvent(flat)) {
            fwdCount++
            log('forwarded RPC #' + fwdCount, eventType, JSON.stringify(flat).slice(0, 120))
          }
        }
        return
      }

      // 2) Direct {"event":"message.start",...} format
      if (data.event && PET_EVENTS.has(data.event)) {
        if (_sendPetEvent(data)) {
          fwdCount++
          log('forwarded direct #' + fwdCount, data.event, JSON.stringify(data).slice(0, 120))
        }
        return
      }

      // 3) Direct {"type":"message.start",...} format
      if (data.type && PET_EVENTS.has(data.type)) {
        var payload2 = Object.assign({}, data)
        payload2.event = data.type
        if (_sendPetEvent(payload2)) {
          fwdCount++
          log('forwarded type-based #' + fwdCount, data.type, JSON.stringify(payload2).slice(0, 120))
        }
        return
      }
    } catch (e) { log('forwardToPet error', e.message) }
  }

  // ── Parsing helpers (for NDJSON/SSE streams) ───────────────────────

  function parseSSE(text) {
    var events = []
    var blocks = text.split(/\\n\\n+/)
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i]
      var lines = block.split('\\n')
      var eventName = null
      var dataLines = []
      for (var j = 0; j < lines.length; j++) {
        var line = lines[j]
        var idx = line.indexOf(':')
        if (idx <= 0) continue
        var key = line.slice(0, idx).trim()
        var value = line.slice(idx + 1).trim()
        if (key === 'event') eventName = value
        else if (key === 'data') dataLines.push(value)
      }
      if (!eventName && dataLines.length === 0) continue
      var raw = dataLines.join('\\n')
      if (!raw) continue
      try {
        var parsed = JSON.parse(raw)
        if (parsed.event === undefined && eventName) parsed.event = eventName
        events.push(parsed)
      } catch (_) {
        if (eventName) events.push({ event: eventName, raw: raw })
      }
    }
    return events
  }

  function parseNDJSON(text) {
    var events = []
    var lines = text.split('\\n')
    for (var i = 0; i < lines.length; i++) {
      var trimmed = lines[i].trim()
      if (!trimmed) continue
      try {
        var parsed = JSON.parse(trimmed)
        if (parsed && (parsed.event || parsed.type)) events.push(parsed)
      } catch (_) {}
    }
    return events
  }

  function parseEvents(text) {
    if (text.indexOf('\\n\\n') >= 0) return parseSSE(text)
    return parseNDJSON(text)
  }

  // ── WebSocket patch ────────────────────────────────────────────────

  function patchWebSocket() {
    if (!window.WebSocket || window.WebSocket.__hermesPetPatched) {
      if (window.WebSocket && window.WebSocket.__hermesPetPatched) log('WebSocket already patched')
      else log('WebSocket not available')
      return
    }
    var Original = window.WebSocket

    function PatchedWebSocket(url, protocols) {
      log('WS created:', (url || '').slice(0, 100))
      var ws = protocols === undefined ? new Original(url) : new Original(url, protocols)
      ws.addEventListener('message', function(ev) {
        msgCount++
        try {
          var data = JSON.parse(ev.data)

          // RPC format: {"method":"event","params":{...}}
          if (data.method === 'event' && data.params) {
            log('WS msg #' + msgCount, 'RPC event params.type=' + data.params.type)
            forwardToPet(data)
          }
          // Direct format: {"event":"...",...}
          else if (data.event) {
            log('WS msg #' + msgCount, 'direct event=' + data.event)
            forwardToPet(data)
          }
          // Fallback: try parsing as NDJSON/SSE for bulk messages
          else if (typeof ev.data === 'string') {
            var events = parseEvents(ev.data)
            if (events.length > 0) {
              log('WS msg #' + msgCount, 'parsed', events.length, 'events from text')
              events.forEach(forwardToPet)
            }
          }
        } catch (_) {
          // non-JSON message, ignore
        }
      })
      return ws
    }

    PatchedWebSocket.prototype = Original.prototype
    PatchedWebSocket.__hermesPetPatched = true
    try {
      PatchedWebSocket.CONNECTING = Original.CONNECTING
      PatchedWebSocket.OPEN = Original.OPEN
      PatchedWebSocket.CLOSING = Original.CLOSING
      PatchedWebSocket.CLOSED = Original.CLOSED
      Object.setPrototypeOf(PatchedWebSocket, Original)
    } catch (_) {}
    window.WebSocket = PatchedWebSocket
    log('WebSocket patched successfully')
  }

  // ── Fetch streaming patch ──────────────────────────────────────────

  function patchFetch() {
    if (!window.fetch || window.fetch.__hermesPetPatched) {
      log(window.fetch ? 'fetch already patched' : 'fetch not available')
      return
    }
    var OriginalFetch = window.fetch

    window.fetch = async function() {
      var args = arguments
      var response = await OriginalFetch.apply(this, args)
      try {
        var url = response.url || ''
        var contentType = (response.headers.get('content-type') || '').toLowerCase()
        var looksLikeStream = contentType.indexOf('stream') >= 0
          || contentType.indexOf('event-stream') >= 0
          || contentType.indexOf('json') >= 0
          || contentType === ''
        var looksLikeGateway = /gateway|api|v1|chat|stream/i.test(url)

        if (looksLikeStream && response.body && looksLikeGateway) {
          log('intercepting fetch stream', url.slice(0, 80))
          var streams = response.body.tee()
          var streamForApp = streams[0]
          var streamForPet = streams[1]
          var reader = streamForPet.getReader()
          var decoder = new TextDecoder()
          var buffer = ''

          ;(async function read() {
            try {
              while (true) {
                var result = await reader.read()
                if (result.done) break
                var chunk = decoder.decode(result.value, { stream: true })
                buffer += chunk

                var processed = 0
                while (true) {
                  var hasDouble = buffer.indexOf('\\n\\n') >= 0
                  var sepIndex = hasDouble ? buffer.indexOf('\\n\\n') : buffer.indexOf('\\n')
                  if (sepIndex < 0) break
                  var block = buffer.slice(0, sepIndex)
                  buffer = buffer.slice(sepIndex + (hasDouble ? 2 : 1))
                  if (!block.trim()) continue
                  var events = parseEvents(block)
                  events.forEach(forwardToPet)
                  msgCount++
                  processed++
                  if (processed > 1000) break
                }
              }
              if (buffer.trim()) {
                parseEvents(buffer).forEach(forwardToPet)
              }
            } catch (e) {
              log('stream read error', e.message)
            }
          })()

          return new Response(streamForApp, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          })
        }
      } catch (e) {
        log('fetch patch error', e.message)
      }
      return response
    }

    window.fetch.__hermesPetPatched = true
    log('fetch patched')
  }

  // ── EventSource patch (SSE) ────────────────────────────────────────

  function patchEventSource() {
    if (!window.EventSource || window.EventSource.__hermesPetPatched) {
      log(window.EventSource ? 'EventSource already patched' : 'EventSource not available')
      return
    }
    var Original = window.EventSource

    function PatchedEventSource(url, options) {
      log('EventSource created:', (url || '').slice(0, 80))
      var es = new Original(url, options)
      var listener = function(ev) {
        msgCount++
        try {
          var data = JSON.parse(ev.data)
          if (data && data.event) {
            log('ES msg #' + msgCount, 'event=' + data.event)
            forwardToPet(data)
          }
        } catch (_) {}
      }
      es.addEventListener('message', listener)
      return es
    }

    PatchedEventSource.prototype = Original.prototype
    PatchedEventSource.__hermesPetPatched = true
    try {
      Object.setPrototypeOf(PatchedEventSource, Original)
    } catch (_) {}
    window.EventSource = PatchedEventSource
    log('EventSource patched')
  }

  // ── Init ───────────────────────────────────────────────────────────

  log('Bridge initializing, document.readyState=' + document.readyState)
  log('hermesDesktop sendPetEvent:', !!(window.hermesDesktop && typeof window.hermesDesktop.sendPetEvent === 'function'))
  log('hermesPetBridge sendPetEvent:', !!(window.hermesPetBridge && typeof window.hermesPetBridge.sendPetEvent === 'function'))

  patchWebSocket()
  patchFetch()
  patchEventSource()

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      log('DOMContentLoaded — re-patching transports')
      patchWebSocket()
      patchFetch()
      patchEventSource()
    })
  }

  log('Bridge installed. Status:', JSON.stringify(window.__petBridgeStatus()))
})()
`

function injectPetRendererBridge() {
  try {
    const { webFrame } = require('electron')
    webFrame.executeJavaScript(INJECTED_SCRIPT).then(
      () => { /* injected OK */ },
      (err) => { console.error('[pet-bridge] executeJavaScript failed:', err) }
    )
  } catch (err) {
    console.error('[pet-bridge] inject failed:', err)
  }
}

module.exports = { injectPetRendererBridge, INJECTED_SCRIPT }
