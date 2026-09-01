import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
}

export function Avatar({ src, name, size = 40, className }: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
    : '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? '프로필'}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-primary-light text-primary flex items-center justify-center font-semibold text-sm',
        className
      )}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}
