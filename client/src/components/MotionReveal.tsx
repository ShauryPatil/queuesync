import React, { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function MotionReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reducedMotion = useReducedMotion();
  const supportsViewportObserver = typeof IntersectionObserver !== "undefined";
  return <motion.div className={className} initial={reducedMotion || !supportsViewportObserver ? false : { opacity: 0, y: 14 }} {...(supportsViewportObserver ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.16 } } : { animate: { opacity: 1, y: 0 } })} transition={reducedMotion ? { duration: 0 } : { duration: 0.42, delay, ease: [0.23, 1, 0.32, 1] }}>{children}</motion.div>;
}

export function MotionStagger({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  const supportsViewportObserver = typeof IntersectionObserver !== "undefined";
  return <motion.div className={className} initial={supportsViewportObserver ? "hidden" : false} {...(supportsViewportObserver ? { whileInView: "visible", viewport: { once: true, amount: 0.1 } } : { animate: "visible" })} variants={{ hidden: {}, visible: { transition: reducedMotion ? { duration: 0 } : { staggerChildren: 0.07, delayChildren: 0.04 } } }}>{children}</motion.div>;
}

export function MotionItem({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  return <motion.div className={className} variants={{ hidden: reducedMotion ? {} : { opacity: 0, y: 12, scale: 0.985 }, visible: { opacity: 1, y: 0, scale: 1, transition: reducedMotion ? { duration: 0 } : { duration: 0.34, ease: [0.23, 1, 0.32, 1] } } }}>{children}</motion.div>;
}
