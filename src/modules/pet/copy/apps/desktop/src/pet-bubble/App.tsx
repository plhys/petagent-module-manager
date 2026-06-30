import React, { useState, useEffect, useRef } from 'react'
import WeatherCard from './WeatherCard'

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function sanitizeHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  const scripts = div.querySelectorAll('script')
  scripts.forEach(s => s.remove())
  const events = ['onclick', 'onerror', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur']
  const allElements = div.querySelectorAll('*')
  allElements.forEach(el => {
    events.forEach(evt => el.removeAttribute(evt))
  })
  return div.innerHTML
}

interface ToolChip {
  id: string
  name: string
  phase: string
  actionText: string
  result?: string
}

export default function App() {
  const [text, setText] = useState('')
  const [chips, setChips] = useState<ToolChip[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [renderKey, setRenderKey] = useState(0)
  const [cardData, setCardData] = useState<any>(null)

  const textRef = useRef('')
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visible = text || chips.length > 0 || isThinking || errorMsg || cardData

  useEffect(() => {
    const api = (window as any).hermesPet
    if (!api) return

    api.onAIRunStart?.((_data: any) => {
      clearTimeout(hideTimerRef.current!)
      clearTimeout(thinkingTimerRef.current!)
      textRef.current = ''
      setText('')
      setChips([])
      setIsThinking(false)
      thinkingTimerRef.current = setTimeout(() => setIsThinking(true), 3000)
      setCardData(null); clearTimeout(cardTimerRef.current!)
      setRenderKey(k => k + 1)
    })

    api.onAIChunk?.((chunk: string) => {
      clearTimeout(thinkingTimerRef.current!)
      setIsThinking(false)
      textRef.current += chunk
      setText(textRef.current)
    })

    api.onAITool?.((tool: any) => {
      setIsThinking(false)
      const id = tool.toolCallId || `t-${Date.now()}`
      setChips(prev => {
        const existing = prev.find(c => c.id === id)
        if (existing) {
          return prev.map(c => c.id === id ? {
            ...c,
            phase: tool.phase || c.phase,
            actionText: tool.actionText !== undefined ? tool.actionText : c.actionText,
            result: tool.result || c.result,
          } : c)
        }
        return [...prev, {
          id,
          name: tool.name,
          phase: tool.phase || 'start',
          actionText: tool.actionText !== undefined ? tool.actionText : tool.name,
        }]
      })
    })

    api.onAIDone?.((result: any) => {
      clearTimeout(thinkingTimerRef.current!)
      setIsThinking(false)
      clearTimeout(hideTimerRef.current!)
      if (result?.aborted) {
        textRef.current = ''
        setText('')
        setChips([])
        setCardData(null)
      } else {
        if (result?.content) {
          // Try JSON weather card data
          try {
            var parsed = JSON.parse(result.content)
            if (parsed.type === 'weather') {
              var d = parsed.data
              setCardData({
                city: d.city || '',
                temperature: d.temperature || 0,
                condition: d.condition || '',
                type: d.weatherType || d.type || 'sunny',
                humidity: d.humidity || 0,
                windSpeed: d.windSpeed || 0,
                feelsLike: d.feelsLike || 0,
              })
              setText('')
              clearTimeout(cardTimerRef.current!)
              cardTimerRef.current = setTimeout(() => setCardData(null), 60000)
              return
            }
          } catch(_) {}
          textRef.current = result.content
          setText(result.content)
        }
        var len = (result?.content || '').length
        var delay = len <= 10 ? 7000 : 15000
        hideTimerRef.current = setTimeout(() => {
          setText('')
          setChips([])
        }, delay)
      }
    })

    api.onAIFinal?.((result: any) => {
      setIsThinking(false)
      if (result?.content) {
        textRef.current = result.content
        setText(result.content)
      }
    })

    api.onApiError?.((err: any) => {
      const msg = err?.message || 'Something went wrong'
      setErrorMsg(msg)
      clearTimeout(errorTimerRef.current!)
      errorTimerRef.current = setTimeout(() => setErrorMsg(''), 5000)
    })

    api.setBubbleVisible?.(!!visible)
  }, [])

  useEffect(() => {
    (window as any).hermesPet?.setBubbleVisible?.(!!visible)
  }, [visible])

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: transparent !important; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif; }
        .bubble-root {
          position: fixed; inset: 0; display: flex; align-items: flex-end;
          padding: 0 0 4px 8px; pointer-events: none;
        }
        .bubble {
          display: inline-block; max-width: 220px; min-height: 28px; overflow: hidden;
          background: linear-gradient(160deg, #2a2a2a 0%, #1e1e1e 40%, #181818 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 12px 12px 20px 12px;
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          box-shadow: none;
          pointer-events: none; position: relative;
          animation: bubbleIn 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bubble-tail {
          position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid #1e1e1e;
          background: none;
        }

        /* === Tool chips === */
        .bubble-tools { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 6px; flex-shrink: 0; }
        .bubble-chip {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 9px; font-weight: 500; padding: 2px 7px;
          border-radius: 10px; white-space: nowrap; border: 1px solid transparent;
          letter-spacing: 0.2px;
        }
        .bubble-chip-dot { width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0; }
        .bubble-chip.done { background: rgba(74,222,128,0.1); color: rgba(74,222,128,0.85); border-color: rgba(74,222,128,0.15); }
        .bubble-chip.done .bubble-chip-dot { background: rgba(74,222,128,0.7); }
        .bubble-chip.running { background: rgba(96,165,250,0.08); color: rgba(96,165,250,0.85); border-color: rgba(96,165,250,0.12); animation: chipPulse 1.4s ease-in-out infinite; }
        .bubble-chip.running .bubble-chip-dot { background: rgba(96,165,250,0.7); animation: dotPulse 1.2s ease-in-out infinite; }
        @keyframes chipPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* === Thinking dots === */
        .bubble-dots { display: flex; gap: 4px; padding: 4px 2px; }
        .bubble-dots span { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.3); animation: dotPulse 1.2s ease-in-out infinite; }
        .bubble-dots span:nth-child(2) { animation-delay: 0.2s; }
        .bubble-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotPulse { 0%,80%,100% { opacity: 0.2; transform: scale(0.75); } 40% { opacity: 1; transform: scale(1); } }

        /* === Text content === */
        .bubble-text { font-size: 11.5px; line-height: 1.5; color: rgba(255,255,255,0.92); word-break: break-word; font-family: inherit; }
        .bubble-text p { margin: 0 0 4px; }
        .bubble-text p:last-child { margin: 0; }
        .bubble-text strong { color: #fff; font-weight: 600; }
        .bubble-text code { background: rgba(255,255,255,0.1); padding: 1px 5px; border-radius: 4px; font-size: 10px; font-family: 'SF Mono', Menlo, monospace; color: rgba(255,255,255,0.8); }
        .bubble-text a { color: #60a5fa; text-decoration: none; }

        /* === Short reply (<=30 chars): compact row, small accent + text === */
        .pet-short {
          display: flex; align-items: center; gap: 8px;
        }
        .pet-short-emoji {
          font-size: 14px; line-height: 1; flex-shrink: 0;
          width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.08); border-radius: 8px;
        }
        .pet-short-text {
          font-size: 12.5px; font-weight: 500; color: rgba(255,255,255,0.95); line-height: 1.35;
        }

        /* === Content cards: left accent bar, no big emoji === */
        .pet-card {
          display: flex; flex-direction: column; gap: 4px;
          padding-left: 10px;
          border-left: 2px solid rgba(255,255,255,0.2);
        }
        .pet-card-label {
          font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;
          color: rgba(255,255,255,0.5); margin-bottom: 1px;
        }
        .pet-title {
          font-size: 12.5px; font-weight: 500; color: rgba(255,255,255,0.95); line-height: 1.4;
        }
        .pet-summary {
          font-size: 10.5px; color: rgba(255,255,255,0.7); line-height: 1.45;
        }
        .pet-emoji { display: none; }

        /* === Card type accent colors === */
        .pet-card--code { border-left-color: rgba(74,222,128,0.5); }
        .pet-card--search { border-left-color: rgba(167,139,250,0.5); }
        .pet-card--profile { border-left-color: rgba(251,191,36,0.5); }
        .pet-card--error { border-left-color: rgba(239,68,68,0.5); }
        .pet-card--file { border-left-color: rgba(52,211,153,0.5); }
        .pet-card--chart { border-left-color: rgba(251,146,60,0.5); }
        .pet-card--stock { border-left-color: rgba(248,113,113,0.5); padding-left: 0; border-left: none; }

        /* === Stock card === */
        .pet-stock-price { font-size: 24px; font-weight: 700; color: rgba(255,255,255,0.9); line-height: 1; letter-spacing: -0.5px; }
        .pet-stock-change { font-size: 12px; font-weight: 600; margin-top: 3px; }
        .pet-stock-change.up { color: rgba(74,222,128,0.85); }
        .pet-stock-change.down { color: rgba(248,113,113,0.85); }
        .pet-stock-ticker { font-size: 9.5px; color: rgba(255,255,255,0.35); margin-top: 4px; letter-spacing: 0.3px; }

        /* === Error bubble === */
        .bubble--error { border-color: rgba(239,68,68,0.25); }
        .bubble-error-text { font-size: 11px; color: rgba(248,113,113,0.9); font-weight: 500; }

        /* === Card mode (weather etc.) === */
        .bubble--card { background: transparent; border: none; border-radius: 0; padding: 0; max-width: none; max-height: none; overflow: visible; backdrop-filter: none; -webkit-backdrop-filter: none; box-shadow: none; pointer-events: auto; }
      `}</style>
      <div className="bubble-root">
        {errorMsg && (
          <div className="bubble bubble--error">
            <span className="bubble-error-text">{errorMsg}</span>
            <div className="bubble-tail" />
          </div>
        )}
        {!errorMsg && visible && cardData ? (
          <WeatherCard data={cardData} onDismiss={() => { setCardData(null); clearTimeout(cardTimerRef.current!) }} />
        ) : !errorMsg && visible && (
          <div className="bubble" key={renderKey}>
            {chips.length > 0 && !text.includes('data-type="card"') && (
              <div className="bubble-tools">
                {chips.slice(-12).map(chip => {
                  const isDone = chip.phase === 'done' || chip.phase === 'end' || !!chip.result
                  return (
                    <span key={chip.id} className={`bubble-chip ${isDone ? 'done' : 'running'}`}>
                      <span className="bubble-chip-dot" />
                      {chip.actionText}
                    </span>
                  )
                })}
              </div>
            )}
            {isThinking && !text ? (
              <div className="bubble-dots">
                <span /><span /><span />
              </div>
            ) : text ? (
              <div className="bubble-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
            ) : null}
            <div className="bubble-tail" />
          </div>
        )}
      </div>
    </>
  )
}