"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // When the path or search params change, we consider the navigation finished
    setLoading(false);
  }, [pathname, searchParams]);

  // We need a way to trigger the loading state. 
  // In Next.js App Router, there's no global "beforeNavigate" event.
  // One way is to monkey-patch or use a global state + custom Link.
  // For a simpler "WOW" effect, we can just use the fact that AnimatePresence is already doing something.
  
  // Actually, I can use a global event listener on all clicks to <a> tags.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      
      if (
        link && 
        link.href && 
        link.href.startsWith(window.location.origin) && 
        link.target !== "_blank" &&
        link.getAttribute("href") !== pathname
      ) {
        setLoading(true);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="progress-bar"
          initial={{ width: "0%", opacity: 0 }}
          animate={{ width: ["0%", "30%", "60%", "90%"], opacity: 1 }}
          exit={{ width: "100%", opacity: 0 }}
          transition={{ 
            width: { duration: 1.2, times: [0, 0.2, 0.4, 1], ease: "easeOut" },
            opacity: { duration: 0.2 }
          }}
          className="fixed left-0 top-0 z-[100] h-[3px] origin-left bg-gradient-to-r from-[var(--accent)] to-[color-mix(in_srgb,var(--accent)_60%,white)] shadow-[0_2px_12px_rgba(var(--accent-rgb),0.3)]"
        />
      )}
    </AnimatePresence>
  );
}
