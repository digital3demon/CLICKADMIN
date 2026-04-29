"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNewOrderPanel } from "@/components/orders/new-order-panel-context";

/** Прямая ссылка /orders/new — открывает то же окно и возвращает на старт. */
export default function NewOrderPage() {
  const router = useRouter();
  const { open } = useNewOrderPanel();

  useEffect(() => {
    open();
    router.replace("/");
  }, [open, router]);

  return null;
}
