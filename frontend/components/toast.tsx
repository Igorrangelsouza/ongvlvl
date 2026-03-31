'use client'
import { useEffect, useState } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
  exiting: boolean  // NOVO: controla animação de saída
}

type ToastConfig = {
  bg: string
  border: string
  color: string
  progressColor: string  // NOVO
}

const TOAST_STYLES: Record<ToastType, ToastConfig> = {
  success: { bg: '#F0FDF4', border: '#86EFAC', color: '#166534', progressColor: '#22C55E' },
  error:   { bg: '#FFF1F2', border: '#FCA5A5', color: '#991B1B', progressColor: '#EF4444' },
  warning: { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', progressColor: '#F59E0B' },
  info:    { bg: '#EFF6FF', border: '#93C5FD', color: '#1E40AF', progressColor: '#3B82F6' },
}

// NOVO: ícone SVG com checkmark animado para success, texto simples para os outros
function ToastIcon({ type, borderColor }: { type: ToastType; borderColor: string }) {
  const iconMap = { error: '✕', warning: '⚠', info: 'ℹ' }

  if (type === 'success') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
        <circle cx="14" cy="14" r="14" fill={borderColor} />
        <path
          d="M8 14.5l4 4 8-8"
          fill="none"
          stroke="#166534"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 40,
            strokeDashoffset: 40,
            animation: 'checkDraw 0.4s 0.2s ease forwards',
          }}
        />
      </svg>
    )
  }

  return (
    <div style={{
      width: '28px', height: '28px', borderRadius: '9999px',
      backgroundColor: borderColor, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', flexShrink: 0,
    }}>
      {iconMap[type]}
    </div>
  )
}

let toastFn: (message: string, type?: ToastType) => void = () => {}
export const toast = (message: string, type: ToastType = 'success') => toastFn(message, type)

const DURATION = 3500

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    toastFn = (message, type = 'success') => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, message, type, exiting: false }])

      // NOVO: marca como "saindo" 350ms antes de remover (tempo da animação de saída)
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
      }, DURATION - 350)

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, DURATION)
    }
  }, [])

  // NOVO: fechar manualmente com animação de saída
  function dismiss(id: number) {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 350)
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const s = TOAST_STYLES[t.type]
        return (
          <div
            key={t.id}
            style={{
              position: 'relative', overflow: 'hidden',  // NOVO: necessário para a barra de progresso
              display: 'flex', alignItems: 'center', gap: '12px',
              backgroundColor: s.bg, border: `1px solid ${s.border}`,
              borderRadius: '12px', padding: '14px 18px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
              fontFamily: 'Manrope, sans-serif', fontSize: '14px',
              fontWeight: 600, color: s.color, pointerEvents: 'auto',
              // NOVO: alterna entre animação de entrada e saída
              animation: t.exiting
                ? 'toastOut 0.35s cubic-bezier(0.4,0,1,1) forwards'
                : 'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              minWidth: '280px', maxWidth: '380px',
            }}
          >
            <ToastIcon type={t.type} borderColor={s.border} />

            <span style={{ flex: 1 }}>{t.message}</span>

            {/* NOVO: botão de fechar */}
            <button
              onClick={() => dismiss(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: s.color, opacity: 0.45, fontSize: '14px',
                padding: '2px 4px', marginLeft: '4px', lineHeight: 1,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.45')}
            >✕</button>

            {/* NOVO: barra de progresso na base */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0,
              height: '3px', borderRadius: '0 0 0 12px',
              backgroundColor: s.progressColor,
              animation: `toastProgress ${DURATION}ms linear forwards`,
            }} />
          </div>
        )
      })}
    </div>
  )
}