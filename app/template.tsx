"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

const easeSnappy = [0.2, 0.85, 0.25, 1] as const;

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      /* Без opacity:0 при mount: иначе при сбое гидрации framer-motion контент остаётся невидимым. */
      initial={{ opacity: 1, scale: 0.992 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: easeSnappy }}
      className="min-h-full origin-top-left"
    >
      {children}
    </motion.div>
  );
}
