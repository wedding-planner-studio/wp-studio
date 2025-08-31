'use client';
import { Button } from '@/components/ui';
import { api } from '@/trpc/react';
import Link from 'next/link';
import { MessageSquareMore } from 'lucide-react';
import { FiUserPlus, FiUsers } from 'react-icons/fi';
import { useRoleBasedPermission } from '@/hooks/useRoleBasedPermission';
import { AdditionalConfirmations } from './AdditionalConfirmations';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

interface GuestsRSVPDetailsCardProps {
  eventId: string;
}

/**
 * Guests RSVP Details Card
 * @param eventId - The id of the event
 * @returns Guests RSVP Details Card
 */
export const GuestsRSVPDetailsCard = ({ eventId }: GuestsRSVPDetailsCardProps) => {
  const { t } = useClientTranslation('common');
  const { hasPermission: canSendBulkMessages } = useRoleBasedPermission('bulkMessages', 'create');

  // TODO: Create and use guests "stats" prcedure instead of getAll
  const { data: guestsData } = api.guests.getAll.useQuery({
    eventId,
    page: 1,
    limit: 50,
  });

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm mb-4">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <FiUsers className="h-3.5 w-3.5 text-purple-600" />
          <h2 className="font-medium text-sm">{t('guests.rsvp.title')}</h2>
        </div>
        <div className="flex items-center gap-2">
          {canSendBulkMessages && (
            <Link href={`/admin/events/${eventId}/bulk-messages/new`}>
              <Button variant="outline" size="sm" className="h-7 text-xs ">
                <MessageSquareMore className="h-3 w-3 mr-1" />
                {t('guests.rsvp.newMessage')}
              </Button>
            </Link>
          )}
          <Link href={`/admin/events/${eventId}/guests`}>
            <Button variant="outline" size="sm" className="h-7 text-xs ">
              <FiUserPlus className="h-3 w-3 mr-1" />
              {t('guests.rsvp.manageGuests')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-4">
        {guestsData?.stats ? (
          <>
            {/* RSVP Statistics */}
            <div className="flex justify-between mb-6">
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">
                    {guestsData.stats.total ?? 0}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">{t('guests.rsvp.total')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-emerald-600">
                    {guestsData.stats.confirmed ?? 0}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">{t('guests.rsvp.confirmed')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-rose-600">
                    {guestsData.stats.declined ?? 0}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">{t('guests.rsvp.declined')}</div>
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-amber-600">
                  {guestsData.stats.pending ?? 0}
                </div>
                <div className="text-xs text-gray-500 font-medium text-center">{t('guests.rsvp.pending')}</div>
              </div>
            </div>

            {/* RSVP Response Rate */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <div className="text-xs font-medium text-gray-700">{t('guests.rsvp.responseRate')}</div>
                <div className="text-xs font-medium text-purple-700">
                  {guestsData.stats.total
                    ? Math.round(
                        ((guestsData.stats.total - guestsData.stats.pending) /
                          guestsData.stats.total) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-purple-500 h-1.5 rounded-full"
                  style={{
                    width: `${
                      guestsData.meta?.total
                        ? Math.round(
                            ((guestsData.stats.total - guestsData.stats.pending) /
                              guestsData.stats.total) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Required Guest Confirmations */}
            <AdditionalConfirmations eventId={eventId} />
          </>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center">
            <span className="text-sm text-gray-500">{t('guests.rsvp.noGuests')}</span>
            <Link href={`/admin/events/${eventId}/guests`}>
              <Button variant="link" className="text-xs text-purple-600 mt-1">
                {t('guests.rsvp.startAdding')}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
