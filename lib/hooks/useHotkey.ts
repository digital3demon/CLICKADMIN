'use client'

import { useEffect } from 'react'

type ModifierKey = 'ctrl' | 'meta' | 'shift' | 'alt'

interface HotkeyOptions {
  key: string
  modifiers?: ModifierKey[]
  onTrigger: (e: KeyboardEvent) => void
  preventDefault?: boolean
  // Не срабатывает если фокус в input/textarea/select
  ignoreInInputs?: boolean
  enabled?: boolean
}

export function useHotkey({
  key,
  modifiers = [],
  onTrigger,
  preventDefault = true,
  ignoreInInputs = true,
  enabled = true,
}: HotkeyOptions) {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      if (ignoreInInputs) {
        const target = e.target as HTMLElement
        const tag = target.tagName.toLowerCase()
        if (
          tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          target.isContentEditable
        ) {
          return
        }
      }

      const keyMatch = e.key.toLowerCase() === key.toLowerCase()
      const ctrlMatch = modifiers.includes('ctrl') ? e.ctrlKey : !e.ctrlKey
      const metaMatch = modifiers.includes('meta') ? e.metaKey : !e.metaKey
      const shiftMatch = modifiers.includes('shift') ? e.shiftKey : !e.shiftKey
      const altMatch = modifiers.includes('alt') ? e.altKey : !e.altKey

      // Ctrl или Meta (для Mac)
      const cmdMatch =
        modifiers.includes('ctrl') || modifiers.includes('meta')
          ? e.ctrlKey || e.metaKey
          : !e.ctrlKey && !e.metaKey

      if (
        keyMatch &&
        (modifiers.includes('ctrl') || modifiers.includes('meta')
          ? cmdMatch
          : ctrlMatch && metaMatch) &&
        shiftMatch &&
        altMatch
      ) {
        if (preventDefault) e.preventDefault()
        onTrigger(e)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key, modifiers, onTrigger, preventDefault, ignoreInInputs, enabled])
}
