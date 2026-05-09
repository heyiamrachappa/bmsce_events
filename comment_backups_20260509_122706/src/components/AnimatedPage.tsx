import { motion } from "framer-motion";
import { pageTransition } from "@/lib/motion-variants";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ReactNode } from "react";

interface AnimatedPageProps {
    children: ReactNode;
    className?: string;
}

export default function AnimatedPage({ children, className }: AnimatedPageProps) {
    const shouldReduceMotion = useReducedMotion();

    const variants = shouldReduceMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : pageTransition;

    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={className}
        >
            {children}
        </motion.div>
    );
}
