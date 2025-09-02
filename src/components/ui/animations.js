import { motion } from 'framer-motion';

export const fadeListContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const fadeListItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

export const sectionFade = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
};

export function MotionSection({ children, className }) {
  return (
    <motion.div className={className} variants={sectionFade} initial="hidden" animate="show" exit="exit">
      {children}
    </motion.div>
  );
}

export function MotionList({ children, className }) {
  return (
    <motion.div className={className} variants={fadeListContainer} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function MotionListItem({ children, className }) {
  return (
    <motion.div className={className} variants={fadeListItem}>
      {children}
    </motion.div>
  );
}

export function MotionButton({ children, disabled, ...props }) {
  const hover = disabled ? {} : { scale: 1.02, y: -1 };
  const tap = disabled ? {} : { scale: 0.98 };
  return (
    <motion.button whileHover={hover} whileTap={tap} disabled={disabled} {...props}>
      {children}
    </motion.button>
  );
}

export { motion };

