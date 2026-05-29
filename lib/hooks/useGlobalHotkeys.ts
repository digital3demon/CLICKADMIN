'use client'

import { useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useNewOrderPanel } from '@/components/orders/new-order-panel-context'
import { useHotkey } from './useHotkey'

export function useGlobalHotkeys() {
  const pathname = usePathname()
  const { open: openNewOrder, canOpen, canCreate } = useNewOrderPanel()
  const isLogin = pathname === '/login' || pathname.startsWith('/login/')

  const onNewOrder = useCallback(() => {
    if (canOpen && canCreate) openNewOrder()
  }, [canOpen, canCreate, openNewOrder])

  // Ctrl/Cmd + N → новый заказ (панель, как кнопка в сайдбаре)
  useHotkey({
    key: 'n',
    modifiers: ['ctrl'],
    onTrigger: onNewOrder,
    ignoreInInputs: true,
    enabled: !isLogin && canCreate,
  })
}
