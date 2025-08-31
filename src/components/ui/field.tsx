'use client';

import * as React from 'react';
import { Label } from './label';
import { cn } from '@/lib/utils';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  errorText?: React.ReactNode;
  optionalText?: React.ReactNode;
  required?: boolean;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(function Field(
  { label, children, helperText, errorText, optionalText, required, className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn('space-y-1.5', className)} {...props}>
      {label && (
        <div className="flex items-center gap-1">
          <Label>{label}</Label>
          {!required && optionalText && (
            <span className="text-sm text-muted-foreground">{optionalText}</span>
          )}
          {required && <span className="text-destructive">*</span>}
        </div>
      )}
      {children}
      {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}
      {errorText && <p className="text-sm font-medium text-destructive">{errorText}</p>}
    </div>
  );
});
