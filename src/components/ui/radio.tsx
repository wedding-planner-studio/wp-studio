'use client';

import * as React from 'react';
import { RadioGroup as RadioGroupRoot, RadioGroupItem } from './radio-group';
import { Label } from './label';
import { cn } from '@/lib/utils';

export interface RadioProps extends React.ComponentPropsWithoutRef<typeof RadioGroupItem> {
  label?: React.ReactNode;
}

export const Radio = React.forwardRef<React.ElementRef<typeof RadioGroupItem>, RadioProps>(
  function Radio({ label, className, ...props }, ref) {
    return (
      <div className="flex items-center space-x-2">
        <RadioGroupItem ref={ref} className={className} {...props} />
        {label && <Label htmlFor={props.id}>{label}</Label>}
      </div>
    );
  }
);

export interface RadioGroupProps extends React.ComponentPropsWithoutRef<typeof RadioGroupRoot> {
  orientation?: 'horizontal' | 'vertical';
}

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupRoot>,
  RadioGroupProps
>(function RadioGroup({ className, orientation = 'vertical', ...props }, ref) {
  return (
    <RadioGroupRoot
      ref={ref}
      className={cn(
        'flex gap-2',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        className
      )}
      {...props}
    />
  );
});
