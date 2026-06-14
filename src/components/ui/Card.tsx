import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
}

export const Card = ({ children, className, hover, style }: CardProps) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden',
        hover && 'transition-all duration-300 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

Card.Header = ({ children, className }: CardHeaderProps) => (
  <div className={cn('px-6 py-4 border-b border-slate-100', className)}>
    {children}
  </div>
);

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

Card.Title = ({ children, className }: CardTitleProps) => (
  <h3 className={cn('text-lg font-semibold text-slate-800', className)}>
    {children}
  </h3>
);

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

Card.Body = ({ children, className }: CardBodyProps) => (
  <div className={cn('px-6 py-4', className)}>
    {children}
  </div>
);

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

Card.Footer = ({ children, className }: CardFooterProps) => (
  <div className={cn('px-6 py-4 border-t border-slate-100 bg-slate-50/50', className)}>
    {children}
  </div>
);
