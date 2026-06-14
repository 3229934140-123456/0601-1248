import { cn } from '@/utils/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'pending';

type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  pulse?: boolean;
  size?: BadgeSize;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export const Badge = ({ children, variant = 'default', className, pulse, size = 'sm' }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        sizeClasses[size],
        variantClasses[variant],
        pulse && 'animate-pulse',
        className
      )}
    >
      {variant === 'pending' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      )}
      {variant === 'success' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      )}
      {variant === 'danger' && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      )}
      {children}
    </span>
  );
};
