import { cn, getNotionizedCharacter } from '@/lib/utils';
import { GuestWithAssignment } from './seat-avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { TooltipContent } from '@/components/ui/tooltip';
import { Tooltip } from '@/components/ui/tooltip';
import { TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LucideAmpersand } from 'lucide-react';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

export function SelectableGuestItem({
  guest,
  assignedLabel,
  isSelected,
  onSelectionChange,
}: {
  guest: GuestWithAssignment;
  assignedLabel?: string | null;
  isSelected: boolean;
  onSelectionChange: (guestId: string, isChecked: boolean) => void;
}) {
  const { t } = useClientTranslation('common');

  return (
    <div
      className={cn(
        'flex items-center px-3 py-1.5 space-x-3 hover:bg-gray-100 border',
        isSelected ? 'bg-blue-50' : '',
        guest.assignedElementId ? 'bg-gray-50 text-gray-500' : 'bg-white'
      )}
    >
      <Checkbox
        id={`guest-select-${guest.id}`}
        checked={isSelected}
        onCheckedChange={checked => onSelectionChange(guest.id, !!checked)}
        aria-label={t('selectableGuest.selectGuest', { name: guest.name })}
      />
      {/* Avatar Section - Mirror DraggableItem */}
      <div className="flex flex-shrink-0">
        <img
          src={getNotionizedCharacter(guest.name)}
          alt={t('selectableGuest.guestAvatar', { name: guest.name })}
          className="w-5 h-5 rounded-full bg-gray-200 border border-white z-10"
        />
        {guest.hasPlusOne && (
          <img
            src={getNotionizedCharacter(guest.plusOneName || `${guest.name}+1`)}
            alt={t('selectableGuest.plusOneAvatar', { name: guest.plusOneName || `${guest.name}+1` })}
            className="w-5 h-5 rounded-full bg-gray-300 border border-white -ml-2 z-0" // Overlap with negative margin
          />
        )}
      </div>

      <label
        htmlFor={`guest-select-${guest.id}`}
        className="flex items-center space-x-1.5 cursor-pointer min-w-0 justify-between w-full"
      >
        <span
          className="font-medium text-sm text-gray-800 truncate flex items-center gap-1"
          title={guest.name}
        >
          {guest.name}
          {guest.hasPlusOne && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <LucideAmpersand
                      className="w-4 h-4 text-purple-600 flex-shrink-0"
                      aria-label={t('selectableGuest.hasPlusOne')}
                    />
                    <span className="">{guest.plusOneName}</span>
                  </div>
                </TooltipTrigger>
                {guest.plusOneName && (
                  <TooltipContent>
                    <p>{t('selectableGuest.plusOne', { name: guest.plusOneName })}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </span>
        <span className="text-xs text-gray-500 truncate" title={assignedLabel ?? t('selectableGuest.unassigned')}>
          {assignedLabel}
        </span>
      </label>
    </div>
  );
}
