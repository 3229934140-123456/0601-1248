import { cn } from '@/utils/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'pending';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
};

export const Badge = ({ children, variant = 'default', className, pulse }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
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
