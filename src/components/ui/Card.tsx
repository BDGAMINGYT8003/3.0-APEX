import React from 'react';
import { cn } from '../../lib/utils';
import { motion, HTMLMotionProps } from 'motion/react';

export const Card = React.forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111111] overflow-hidden',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn('px-6 py-4 border-b border-slate-100 dark:border-slate-800/50', className)}>
    {children}
  </div>
);

export const CardTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <h3 className={cn('text-lg font-semibold text-slate-900 dark:text-slate-100', className)}>
    {children}
  </h3>
);

export const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn('p-6', className)}>
    {children}
  </div>
);
