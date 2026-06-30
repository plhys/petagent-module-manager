import React, { useState, useEffect, useCallback, useRef } from 'react'
import { t } from './i18n'
import type { AnimState } from './types'

const ANIM_MAP: Record<string, { src: string; loop: boolean; next?: AnimState; waitOnExit?: boolean }> = {
  begin:         { src: './pet-assets/begin.webm',         loop: false, next: 'static' },
  static:        { src: './pet-assets/static.webm',        loop: true },
  listening:     { src: './pet-assets/static.webm',        loop: true },
  'task-start':  { src: './pet-assets/task-start.webm',    loop: false, next: 'task-loop', waitOnExit: true },
  'task-loop':   { src: './pet-assets/task-loop.webm',     loop: true,  waitOnExit: true },
  'task-leave':  { src: './pet-assets/task-leave.webm',    loop: false, next: 'static' },
  'sleep-start': { src: './pet-assets/sleep-start.webm',   loop: false, next: 'sleep-loop' },
  'sleep-loop':  { src: './pet-assets/sleep-loop.webm',    loop: true },
  'sleep-leave': { src: './pet-assets/sleep-leave.webm',   loop: false, next: 'static' },
}
const WAIT_EXEMPT = new Set(['static', 'task-start'])

export default function App() {
  const [animState, setAnimState] = useState<AnimState>('begin')
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const [isThinking, setIsThinking] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const lastClickTimeRef = useRef(0)
  const clickCountRef = useRef(0)

  useEffect(() => {
    const api = (window as any).hermesPet
    if (!api) return
    api.onAnimState?.((s: AnimState) => { setAnimState(s); if (s !== 'listening') setIsThinking(false) })
    api.onDirectionChange?.((d: string) => { if (d === 'left' || d === 'right') setDirection(d) })
    api.onThinking?.((a: boolean) => setIsThinking(a))
  }, [])

  const clickTimerRef = useRef<number | null>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragStartRef.current = { x: e.screenX, y: e.screenY };
    (window as any).hermesPet?.startDrag?.(e.screenX, e.screenY)
    const onMove = (ev: MouseEvent) => { if (dragStartRef.current) (window as any).hermesPet?.dragMove?.(ev.screenX, ev.screenY) }
    const onUp = () => {
      (window as any).hermesPet?.stopDrag?.()
      dragStartRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const onClick = useCallback(() => {
    const now = Date.now()
    const lastClick = lastClickTimeRef.current
    lastClickTimeRef.current = now

    if (lastClick && now - lastClick < 400) {
      // Double-click detected
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
      ;(window as any).hermesPet?.toggleWindow?.()
      lastClickTimeRef.current = 0
    } else {
      // Single click: delay to wait for potential double-click
      clickTimerRef.current = window.setTimeout(() => {
        clickTimerRef.current = null
        ;(window as any).hermesPet?.toggleChat?.()
      }, 400)
    }
  }, [])

  return (
    <>
      <style>{`
        body { background: transparent !important; }
        .pet-container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; cursor: grab; user-select: none; -webkit-app-region: no-drag; }
        .pet-container:active { cursor: grabbing; }
        .pet-body { position: relative; width: 100%; height: 100%; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15)); transition: transform 0.2s ease; }
        .pet-video { width: 100%; height: 100%; object-fit: contain; }
        .pet-thinking { position: absolute; top: 16%; left: 50%; transform: translateX(-50%) scale(0.65); transform-origin: center bottom; z-index: 2; overflow: hidden; background: rgba(10,10,10,0.94); border-radius: 100px; padding: 4px 16px; font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.6); white-space: nowrap; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 6px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); height: 34px; min-width: 120px; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
        .pet-thinking-text { position: relative; z-index: 1; }
        .pet-thinking-shimmer { position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 100%); background-size: 200% 100%; animation: petShimmer 1.8s ease-in-out infinite; }
        @keyframes petShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
      `}</style>
      <div className="pet-container" onMouseDown={onMouseDown} onClick={onClick} onContextMenu={e => { e.preventDefault(); (window as any).hermesPet?.showContextMenu?.() }}>
        {isThinking && <div className="pet-thinking"><span className="pet-thinking-text">{t('common.thinking')}</span><div className="pet-thinking-shimmer" /></div>}
        <div className="pet-body" style={{ transform: `scaleX(${direction === 'left' ? -1 : 1})` }}><PetVideo animState={animState} /></div>
      </div>
    </>
  )
}

function PetVideo({ animState }: { animState: AnimState }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const currentRef = useRef<string>('')
  const pendingRef = useRef<AnimState | null>(null)

  const playAnim = useCallback((state: AnimState) => {
    const cfg = ANIM_MAP[state]
    if (!cfg) return
    currentRef.current = state
    pendingRef.current = null
    const v = videoRef.current
    if (v) { v.src = cfg.src; v.load(); const p = () => v.play().catch(() => {}); v.readyState >= 2 ? p() : v.addEventListener('canplay', p, { once: true }) }
    ;(window as any).hermesPet?.animStateChanged?.(state)
  }, [])

  useEffect(() => {
    if (!animState) return
    const prevCfg = ANIM_MAP[currentRef.current]
    if (currentRef.current === animState) { pendingRef.current = null; return }
    if (prevCfg?.waitOnExit && !WAIT_EXEMPT.has(animState)) { pendingRef.current = animState; return }
    playAnim(animState)
  }, [animState, playAnim])

  const onEnded = useCallback(() => {
    if (pendingRef.current) { playAnim(pendingRef.current); return }
    const cfg = ANIM_MAP[currentRef.current]
    if (cfg?.loop) { const v = videoRef.current; if (v) { v.currentTime = 0; v.play().catch(() => {}) } }
    else if (cfg?.next) playAnim(cfg.next)
  }, [playAnim])

  return <video ref={videoRef} className="pet-video" muted playsInline onEnded={onEnded} />
}
