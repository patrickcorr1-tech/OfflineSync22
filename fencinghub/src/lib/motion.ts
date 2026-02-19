export const motionPresets = {
  page: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 },
  },
  drawer: {
    initial: { opacity: 0, x: 12, filter: "blur(4px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: 12, filter: "blur(4px)" },
    transition: { duration: 0.22 },
  },
  toast: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { duration: 0.18 },
  },
};
