import { cn } from '@/lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-4 border-gray-200 border-t-purple-500',
        className
      )}
      {...props}
    />
  );
}
