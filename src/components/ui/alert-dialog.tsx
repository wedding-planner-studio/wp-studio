'use client';

import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from './button';

function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root {...props} />;
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger {...props} />;
}

function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal {...props} />;
}

function AlertDialogClose({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel {...props} />;
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
}

interface AlertDialogContentProps
  extends React.ComponentProps<typeof AlertDialogPrimitive.Content> {
  className?: string;
  children?: React.ReactNode;
  hideCloseButton?: boolean;
}

function AlertDialogContent({
  className,
  children,
  hideCloseButton = false,
  ...props
}: AlertDialogContentProps) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed inset-0 z-[70] m-auto h-fit w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:max-w-md',
          className
        )}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <AlertDialogClose className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none">
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </AlertDialogClose>
        )}
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-2 text-center sm:text-left mb-4', className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6', className)}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn('text-gray-500 text-sm mt-2', className)}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & { children?: React.ReactNode }) {
  return (
    <AlertDialogPrimitive.Action asChild {...props}>
      <Button
        variant="default"
        className={cn(
          'bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 min-w-[80px]',
          className
        )}
      >
        {children}
      </Button>
    </AlertDialogPrimitive.Action>
  );
}

function AlertDialogCancel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> & { children?: React.ReactNode }) {
  return (
    <AlertDialogPrimitive.Cancel asChild {...props}>
      <Button
        variant="outline"
        className={cn('border-gray-300 hover:bg-gray-50 px-4 py-2 min-w-[80px]', className)}
      >
        {children || 'Cancel'}
      </Button>
    </AlertDialogPrimitive.Cancel>
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
