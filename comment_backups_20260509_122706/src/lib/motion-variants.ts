import { Variants } from "framer-motion";

export const fadeIn: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 0.3, ease: "easeIn" } },
};

export const revealUp: Variants = {
    initial: { opacity: 0, y: 40 },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1]
        }
    }
};

export const slideUp: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: 10, transition: { duration: 0.3, ease: "easeIn" } },
};

export const staggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.15,
        },
    },
};

export const staggerContainerFast: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.04,
            delayChildren: 0.1,
        },
    },
};

export const premiumHover: Variants = {
    initial: { y: 0, scale: 1, filter: "brightness(1)" },
    hover: {
        y: -12,
        scale: 1.03,
        filter: "brightness(1.15)",
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 25
        }
    },
    tap: {
        scale: 0.97,
        transition: { duration: 0.1 }
    },
};

export const cardHover: Variants = {
    initial: { y: 0, scale: 1 },
    hover: {
        y: -8,
        scale: 1.02,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    },
    tap: {
        scale: 0.98,
        transition: { duration: 0.1, ease: "easeIn" }
    },
};

export const buttonPress: Variants = {
    initial: { scale: 1 },
    tap: { scale: 0.95, transition: { duration: 0.1 } },
    hover: { scale: 1.04, transition: { type: "spring", stiffness: 500, damping: 15 } },
};

export const pageTransition: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" } },
};

export const scaleIn: Variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

// ═══ New Premium Variants ═══

export const heroReveal: Variants = {
    initial: { opacity: 0, y: 60, filter: "blur(10px)" },
    animate: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
            duration: 1,
            ease: [0.16, 1, 0.3, 1],
        }
    }
};

export const heroRevealRight: Variants = {
    initial: { opacity: 0, x: 60, filter: "blur(10px)" },
    animate: {
        opacity: 1,
        x: 0,
        filter: "blur(0px)",
        transition: {
            duration: 1,
            ease: [0.16, 1, 0.3, 1],
        }
    }
};

export const floatingOrb: Variants = {
    initial: { scale: 1, opacity: 0.3 },
    animate: {
        scale: [1, 1.15, 1],
        opacity: [0.3, 0.5, 0.3],
        transition: {
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }
};

export const sectionReveal: Variants = {
    initial: { opacity: 0, y: 50 },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            staggerChildren: 0.1,
            delayChildren: 0.2,
        }
    }
};

export const cardReveal: Variants = {
    initial: { opacity: 0, y: 30, scale: 0.97 },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1]
        }
    }
};

export const glowIn: Variants = {
    initial: { opacity: 0, scale: 0.8, filter: "blur(20px)" },
    animate: {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1]
        }
    }
};

export const slideInLeft: Variants = {
    initial: { opacity: 0, x: -30 },
    animate: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
};

export const popIn: Variants = {
    initial: { opacity: 0, scale: 0.5 },
    animate: {
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 20
        }
    }
};
