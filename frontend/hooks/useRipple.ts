import { useCallback } from 'react'

export function useRipple() {
  const addRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget
    const dot = document.createElement('span')
    dot.className = 'ripple-dot'
    const rect = btn.getBoundingClientRect()
    dot.style.left = `${e.clientX - rect.left}px`
    dot.style.top  = `${e.clientY - rect.top}px`
    btn.appendChild(dot)
    dot.addEventListener('animationend', () => dot.remove())
  }, [])

  return addRipple
}