import { cn } from '@/lib/utils';

export default function MaxWidthWrapper({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'mx-auto h-[99vh] w-full max-w-screen-xl px-2.5 md:px-4 lg:px-8 xl:px-16',
        className
      )}
    >
      {children}
    </div>
  );
}
