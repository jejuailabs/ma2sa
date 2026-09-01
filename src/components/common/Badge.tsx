import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'primary', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-primary-light text-primary': variant === 'primary',
          'bg-secondary-light text-secondary': variant === 'secondary',
          'border border-[var(--color-border)] text-[var(--color-text-secondary)]': variant === 'outline',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
