"use client";

import { useEffect, useState } from "react";
import { DOCTOR_CLINIC_LINK_DELTA } from "@/lib/client-link-sync-events";

/**
 * Счётчик «Клиник» в колонке контактов — обновляется при привязке/отвязке
 * в соседней секции без перезагрузки страницы.
 */
export function DoctorLinkedClinicsCount({
  doctorId,
  initial,
}: {
  doctorId: string;
  initial: number;
}) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    setCount(initial);
  }, [initial]);

  useEffect(() => {
    const onDelta = (e: Event) => {
      const d = (e as CustomEvent<{ doctorId: string; delta: number }>).detail;
      if (d?.doctorId !== doctorId) return;
      setCount((c) => Math.max(0, c + (d.delta ?? 0)));
    };
    window.addEventListener(DOCTOR_CLINIC_LINK_DELTA, onDelta);
    return () => window.removeEventListener(DOCTOR_CLINIC_LINK_DELTA, onDelta);
  }, [doctorId]);

  return <>{count}</>;
}
