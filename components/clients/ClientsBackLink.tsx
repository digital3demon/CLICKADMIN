"use client";

import Link from "next/link";
import { resolveClientsBackHref } from "@/lib/clients-list-return";
import { useEffect, useState } from "react";

type Props = {
  returnToFromQuery?: string;
  fallback?: string;
  className?: string;
  children: React.ReactNode;
};

export function ClientsBackLink({
  returnToFromQuery,
  fallback = "/clients",
  className,
  children,
}: Props) {
  const [href, setHref] = useState(() =>
    resolveClientsBackHref(returnToFromQuery, fallback),
  );

  useEffect(() => {
    setHref(resolveClientsBackHref(returnToFromQuery, fallback));
  }, [returnToFromQuery, fallback]);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
