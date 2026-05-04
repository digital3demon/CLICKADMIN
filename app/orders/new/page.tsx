"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNewOrderPanel } from "@/components/orders/new-order-panel-context";

/** Прямая ссылка /orders/new — открывает то же окно и возвращает на старт. */
export default function NewOrderPage() {
  const router = useRouter();
  const { open, canCreate, createAccessReady } = useNewOrderPanel();

  useEffect(() => {
    if (!createAccessReady) return;
    if (!canCreate) {
      router.replace("/orders");
      return;
    }
    open();
    router.replace("/");
  }, [open, router, canCreate, createAccessReady]);

  return null;
}
