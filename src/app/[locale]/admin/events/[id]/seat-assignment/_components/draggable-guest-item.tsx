import { useDraggable } from '@dnd-kit/core';
import { GuestWithAssignment } from './seat-avatar';
import { cn, getNotionizedCharacter } from '@/lib/utils';
import { TooltipTrigger } from '@/components/ui/tooltip';
import { Tooltip } from '@/components/ui/tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TooltipContent } from '@/components/ui/tooltip';
import { LucideAmpersand } from 'lucide-react';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';


export function DraggableGuestItem({
  guest,
  assignedLabel,
}: {
  guest: GuestWithAssignment;
  assignedLabel?: string | null;
}) {
  const { t } = useClientTranslation('common');
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest.id,
    data: { name: guest.name },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center px-3 py-1.5 space-x-3 hover:bg-gray-100 cursor-grab',
        isDragging ? 'opacity-50 shadow-md z-10 relative bg-gray-50' : '',
        guest.assignedElementId ? 'bg-gray-50 text-gray-500' : 'bg-white'
      )}
      aria-label={t('draggableGuest.dragGuest', { name: guest.name })}
    >
      {/* Avatar Section */}
      <div className="flex flex-shrink-0">
        <img
          src={getNotionizedCharacter(guest.name)}
          alt={`${guest.name} avatar`}
          className="w-6 h-6 rounded-full bg-gray-200 border border-white z-10"
          draggable="false"
        />
        {/* {guest.hasPlusOne && (
          <img
            src={getNotionizedCharacter(guest.plusOneName || `${guest.name}+1`)}
            alt={`${guest.plusOneName || 'Plus One'} avatar`}
            className="w-6 h-6 rounded-full bg-gray-300 border border-white -ml-2 z-0" // Overlap with negative margin
            draggable="false"
          />
        )} */}
      </div>

      <div className="flex items-center space-x-1 min-w-0 justify-between w-full">
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
                      aria-label={t('draggableGuest.hasPlusOne')}
                    />
                    <span className="">{guest.plusOneName}</span>
                  </div>
                </TooltipTrigger>
                {guest.plusOneName && (
                  <TooltipContent>
                    <p>{t('draggableGuest.plusOne', { name: guest.plusOneName })}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </span>
        <span className="text-xs text-gray-500 truncate" title={assignedLabel ?? t('draggableGuest.unassigned')}>
          {assignedLabel}
        </span>
      </div>
    </div>
  );
}
