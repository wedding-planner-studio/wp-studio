'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface ComboboxOption {
  value: string;
  label: string;
  extra?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  emptyCTAComponent?: React.ReactNode;
  className?: string;
  popoverWidth?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  compact?: boolean;
  onSearch?: (value: string) => void;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select option',
  emptyText = 'No results found.',
  emptyCTAComponent,
  className,
  popoverWidth = true,
  searchPlaceholder = 'Search...',
  disabled = false,
  compact = false,
  onSearch,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [localSearch, setLocalSearch] = React.useState('');

  const selectedOption = React.useMemo(
    () => options.find(option => option.value === value),
    [options, value]
  );

  const handleInputChange = React.useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (onSearch) {
        onSearch(value);
      }
    },
    [onSearch]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between text-left font-normal h-9 border border-gray-300',
            'bg-white hover:bg-gray-50 focus:ring-2 focus:ring-purple-100 focus:border-purple-300',
            !value && 'text-gray-500',
            compact && 'p-0 h-auto text-black/70 border-0',
            className
          )}
          disabled={disabled}
        >
          {selectedOption ? (
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-gray-900">{selectedOption.label}</span>
              {selectedOption.extra && (
                <span className="text-xs text-gray-500">{selectedOption.extra}</span>
              )}
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('p-0', popoverWidth ? 'w-[--radix-popover-trigger-width]' : 'min-w-[200px]')}
        align="start"
        style={{ zIndex: 9999 }}
        onPointerDownOutside={e => {
          // Allow default behavior to close the popover
        }}
        onClick={e => {
          // Allow clicks inside the popover without stopping propagation unnecessarily
        }}
        onInteractOutside={e => {
          // Allow default behavior for closing
        }}
      >
        <Command
          onClick={e => {
            // Remove unnecessary propagation stop
          }}
          onMouseDown={e => {
            // Remove unnecessary propagation stop
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9 ml-2"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onValueChange={handleInputChange}
            value={localSearch}
          />
          <CommandEmpty
            className="flex flex-col items-start text-sm text-gray-500 bg-gray-50 items-center justify-center py-4"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            {emptyText}
            {emptyCTAComponent && <div className="mt-2">{emptyCTAComponent}</div>}
          </CommandEmpty>
          <CommandList
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="max-h-[200px] overflow-y-auto"
          >
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.extra || ''}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="cursor-pointer hover:bg-purple-100 focus:bg-purple-100 aria-selected:bg-purple-100 aria-selected:text-purple-900"
                  data-state={value === option.value ? 'selected' : ''}
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onMouseDown={e => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <div className="flex items-center w-full">
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 flex-shrink-0',
                        value === option.value ? 'opacity-100 text-purple-600' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-gray-900">{option.label}</span>
                      {option.extra && (
                        <span className="text-xs text-gray-500">{option.extra}</span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
