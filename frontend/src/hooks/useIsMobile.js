import { useEffect, useState } from "react";

const BREAKPOINT = 640;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < BREAKPOINT);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < BREAKPOINT);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isMobile;
}
