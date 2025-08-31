import * as React from 'react';
import { LuX } from 'react-icons/lu';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface CloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Additional classes to be added to the button
   */
  className?: string;
}

export const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(
  function CloseButton({ className, children, ...props }, ref) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Close"
        ref={ref}
        className={cn('rounded-full', className)}
        {...props}
      >
        {children ?? <LuX />}
      </Button>
    );
  }
);
