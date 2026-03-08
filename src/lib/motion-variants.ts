import { Variants } from "framer-motion";

export const fadeIn: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
};

export const slideUp: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: 10, transition: { duration: 0.2, ease: "easeIn" } },
};

export const staggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

export const cardHover: Variants = {
    initial: { y: 0, scale: 1 },
    hover: {
        y: -8,
        scale: 1.01,
        transition: { duration: 0.3, ease: "easeOut" }
    },
    tap: {
        scale: 0.98,
        transition: { duration: 0.1, ease: "easeIn" }
    },
};

export const buttonPress: Variants = {
    initial: { scale: 1 },
    tap: { scale: 0.95, transition: { duration: 0.1 } },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
};

export const pageTransition: Variants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } },
};
