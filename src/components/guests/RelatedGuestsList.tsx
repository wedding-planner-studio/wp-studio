import React from 'react';
import { api } from '@/trpc/react';
import { cn } from '@/lib/utils';
import { GuestPriority, GuestStatus } from '@prisma/client'; // Assuming GuestStatus is also needed
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

interface RelatedGuestsListProps {
  groupId: string;
  selectedGuestId: string | null;
  onRelatedGuestClick: (e: React.MouseEvent, guestId: string) => void;
  getCategoryColor: (category?: string | null) => { color: string };
  getPriorityColor: (priority: GuestPriority) => string;
  getStatusColor: (status: GuestStatus) => string;
  showDetailCard: boolean;
}

const RelatedGuestsList: React.FC<RelatedGuestsListProps> = ({
  groupId,
  selectedGuestId,
  onRelatedGuestClick,
  getCategoryColor,
  getPriorityColor,
  getStatusColor,
  showDetailCard,
}) => {
  const { t } = useClientTranslation('common');
  const { data: relatedGuests, isLoading } = api.guests.getPartyDetails.useQuery(
    { groupId },
    { enabled: !!groupId }
  );

  if (isLoading) {
    return (
      <div className="pl-12 py-2 border-b border-gray-200 text-xs text-gray-500">
        {t('relatedGuests.loading')}
      </div>
    );
  }

  if (!relatedGuests || relatedGuests.length === 0) {
    return (
      <div className="pl-12 py-2 border-b border-gray-200 text-xs text-gray-500">
        {t('relatedGuests.noAdditionalGuests')}
      </div>
    );
  }

  const filteredRelatedGuests = relatedGuests.filter(g => !g.isPrimaryGuest);

  return (
    <>
      {filteredRelatedGuests.map((relatedGuest, index) => (
        <div
          key={relatedGuest.id}
          className={cn(
            'h-9 items-center hover:bg-gray-50/80 transition-colors cursor-pointer relative border-b border-gray-200',
            selectedGuestId === relatedGuest.id ? 'bg-purple-50/70' : 'bg-gray-50/30',
            'group'
          )}
          onClick={e => onRelatedGuestClick(e, relatedGuest.id)}
        >
          {/* Fixed visible columns */}
          <div
            className={cn(
              'absolute left-0 top-0 bottom-0 grid items-center py-2 z-10',
              'grid-cols-[180px,120px,100px,80px] gap-6', // These column widths might need to match page.tsx if they differ
              selectedGuestId === relatedGuest.id ? 'bg-purple-50/80' : 'bg-gray-50/30',
              'hover:bg-gray-50/70 transition-colors duration-150',
              'ml-4' // Indentation for related guest
            )}
          >
            <div className="flex items-center gap-2">
              <div className="relative flex items-center h-full">
                {/* Vertical connector line */}
                <div
                  className="absolute left-0 top-[-12px] bottom-0 w-[1.5px] bg-gradient-to-b from-purple-300 via-purple-300 to-transparent"
                  style={{
                    height: index === filteredRelatedGuests.length - 1 ? '18px' : '36px',
                  }}
                ></div>
                {/* Horizontal connector line */}
                <div className="w-4 h-[1.5px] bg-gradient-to-r from-purple-300 to-purple-400"></div>
                {/* Dot */}
                <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-[0_0_4px_rgba(168,85,247,0.4)] ring-1 ring-white/30 -ml-[3px] transition-all duration-200 group-hover:scale-110 group-hover:shadow-[0_0_6px_rgba(168,85,247,0.6)]"></div>
              </div>
              <p className="text-xs font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap pl-2 group-hover:text-purple-700 transition-colors duration-150">
                {relatedGuest.name ? relatedGuest.name : t('relatedGuests.guestFallback', { number: index + 1 })}
              </p>
            </div>
            <p className="text-xs text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">
              - {/* Phone for related guests, typically not shown or N/A */}
            </p>
            <p className="text-xs text-gray-600">-</p> {/* Num. of guests for related guests */}
            <p className="text-xs text-gray-600">
              {relatedGuest.category ? (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    color: getCategoryColor(relatedGuest.category).color,
                  }}
                >
                  {relatedGuest.category.charAt(0) + relatedGuest.category.slice(1).toLowerCase()}
                </span>
              ) : (
                '-'
              )}
            </p>
          </div>

          {/* Sliding columns - these appear/disappear with animation */}
          <div
            className={cn(
              'h-9 grid items-center transition-all duration-300 ease-in-out',
              showDetailCard
                ? 'grid-cols-[180px,120px,100px,80px,0,0,0,0] ml-[480px]' // Adjust ml if fixed column total width changes
                : 'grid-cols-[180px,120px,100px,80px,80px,120px,100px,120px] gap-6 px-4'
            )}
          >
            {/* Placeholder empty cells for fixed columns */}
            <div></div>
            <div></div>
            <div></div>
            <div></div>

            {/* Animated columns */}
            <div
              className={cn(
                'transition-all duration-300',
                !showDetailCard ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
              )}
            >
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                  getPriorityColor(relatedGuest.priority)
                )}
              >
                {relatedGuest.priority}
              </span>
            </div>
            <div
              className={cn(
                'transition-all duration-300',
                !showDetailCard ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
              )}
            >
              <p className="text-xs text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">
                {relatedGuest.table ?? '-'}
              </p>
            </div>
            <div
              className={cn(
                'transition-all duration-300',
                !showDetailCard ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
              )}
            >
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                  getStatusColor(relatedGuest.status)
                )}
              >
                {relatedGuest.status.charAt(0) + relatedGuest.status.slice(1).toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default RelatedGuestsList;

// Ensure GuestPriority and GuestStatus are correctly typed and imported.
// If GuestStatus is not part of @prisma/client, adjust the import accordingly.
// The grid-cols definition for fixed and sliding columns should match the ones in your main page component (GuestsPage.tsx)
// if the related guests are to align perfectly under the same headers when shown.
// For example, if page.tsx has 'grid-cols-[180px,120px,100px,80px] gap-6' for fixed columns,
// and related guests are indented (e.g., 'ml-4'), ensure the content within aligns.
// The 'ml-[480px]' for sliding columns when showDetailCard is true assumes the sum of fixed column widths + gaps.
// Verify this sum: 180+120+100+80 + (3*24px for gap-6) = 480 + 72 = 552px (if gap-6 is 1.5rem which is 24px).
// Or, if the 'gap-6' is only between the specified columns, it's 180+120+100+80 = 480. The 'ml-[480px]' seems to be based on this.
