type ToastType = 'success' | 'error' | 'warning' | 'info'

/** Автоскрытие тостов (мс). `duration: 0` — только вручную. */
export const TOAST_AUTO_HIDE_MS = {
  default: 7000,
  error: 10_000,
} as const

export interface Toast {
  id: string
  type: ToastType
  message: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

type ToastListener = (toasts: Toast[]) => void

let toasts: Toast[] = []
const listeners: Set<ToastListener> = new Set()

function notify() {
  listeners.forEach((l) => l([...toasts]))
}

function addToast(toast: Omit<Toast, 'id'>): string {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { ...toast, id }]
  notify()

  const duration =
    toast.duration ??
    (toast.type === 'error' ? TOAST_AUTO_HIDE_MS.error : TOAST_AUTO_HIDE_MS.default)
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }

  return id
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

function subscribe(listener: ToastListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const toastStore = { subscribe, addToast, removeToast }

export const toast = {
  success: (message: string, opts?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
    addToast({ type: 'success', message, ...opts }),
  error: (message: string, opts?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
    addToast({ type: 'error', message, ...opts }),
  warning: (message: string, opts?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
    addToast({ type: 'warning', message, ...opts }),
  info: (message: string, opts?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
    addToast({ type: 'info', message, ...opts }),
}
