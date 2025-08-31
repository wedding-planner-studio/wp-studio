'use client';
import { api } from '@/trpc/react';
import { toast } from 'react-hot-toast';
import { FiMapPin, FiPlus } from 'react-icons/fi';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { VenuePurpose } from '@prisma/client';
import { useState } from 'react';
import { useRoleBasedPermission } from '@/hooks/useRoleBasedPermission';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

interface VenueDetailsCardProps {
  eventId: string;
}

/**
 * Venue Details Card
 * @param eventId - The id of the event
 * @returns Venue Details Card
 */
export const VenueDetailsCard = ({ eventId }: VenueDetailsCardProps) => {
  const { t } = useClientTranslation('common');
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [currentVenue, setCurrentVenue] = useState<any>(null);
  const [venueFormData, setVenueFormData] = useState<{
    name: string;
    address: string;
    purpose: VenuePurpose;
  }>({
    name: '',
    address: '',
    purpose: VenuePurpose.MAIN,
  });
  // Fetch venues data
  const {
    data: venues,
    refetch: refetchVenues,
    error: venuesError,
  } = api.venues.getByEventId.useQuery(
    { eventId },
    {
      enabled: !!eventId,
    }
  );

  const { hasPermission: canCreateVenue } = useRoleBasedPermission('venues', 'create');
  const { hasPermission: canUpdateVenue } = useRoleBasedPermission('venues', 'update');

  const createVenueMutation = api.venues.create.useMutation({
    onSuccess: () => {
      toast.success(t('venues.detail.addSuccess'));
      void refetchVenues();
      resetVenueForm();
      setIsVenueModalOpen(false);
    },
    onError: error => {
      toast.error(error.message || t('venues.detail.addError'));
    },
  });

  const updateVenueMutation = api.venues.update.useMutation({
    onSuccess: () => {
      toast.success(t('venues.detail.updateSuccess'));
      void refetchVenues();
      resetVenueForm();
      setIsVenueModalOpen(false);
    },
    onError: error => {
      toast.error(error.message || t('venues.detail.updateError'));
    },
  });

  const deleteVenueMutation = api.venues.delete.useMutation({
    onSuccess: () => {
      toast.success(t('venues.detail.deleteSuccess'));
      void refetchVenues();
    },
    onError: error => {
      toast.error(error.message || t('venues.detail.deleteError'));
    },
  });

  // Reset venue form
  const resetVenueForm = () => {
    setVenueFormData({
      name: '',
      address: '',
      purpose: VenuePurpose.MAIN,
    });
    setCurrentVenue(null);
  };

  // Handle opening venue form for editing
  const handleEditVenue = (venue: any) => {
    setCurrentVenue(venue);
    setVenueFormData({
      name: venue.name,
      address: venue.address,
      purpose: venue.purpose,
    });
    setIsVenueModalOpen(true);
  };

  // Handle venue form submission
  const handleVenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentVenue) {
      // Update existing venue
      await updateVenueMutation.mutateAsync({
        id: currentVenue.id,
        ...venueFormData,
      });
    } else {
      // Create new venue
      await createVenueMutation.mutateAsync({
        eventId,
        ...venueFormData,
      });
    }
  };
  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm mb-4">
        <div className="flex items-center justify-between p-3 border-b border-gray-1000">
          <div className="flex items-center gap-2">
            <FiMapPin className="h-3.5 w-3.5 text-purple-600" />
            <h2 className="font-medium text-sm">{t('venues.detail.title')}</h2>
          </div>
          <div className="flex items-center gap-2">
            {venues && venues.length > 0 && (
              <div className="text-xs text-gray-500">
                {venues.length === 1
                  ? t('venues.detail.venueCount', { count: venues.length })
                  : t('venues.detail.venueCountPlural', { count: venues.length })}
              </div>
            )}
            {canCreateVenue && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  resetVenueForm();
                  setIsVenueModalOpen(true);
                }}
              >
                <FiPlus className="h-3 w-3 mr-1" />
                {t('venues.detail.addVenue')}
              </Button>
            )}
          </div>
        </div>
        <div className="p-3">
          {venues && venues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {venues.map(venue => (
                <div
                  key={venue.id}
                  className="cursor-pointer flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 border border-gray-100 hover:border-gray-200 transition-colors hover:bg-gray-100"
                  onClick={() => {
                    handleEditVenue(venue);
                  }}
                >
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <div
                      className={cn(
                        'w-1.5 h-6 rounded-sm',
                        venue.purpose === 'MAIN'
                          ? 'bg-purple-500'
                          : venue.purpose === 'RECEPTION'
                            ? 'bg-emerald-500'
                            : venue.purpose === 'COCKTAIL'
                              ? 'bg-amber-500'
                              : venue.purpose === 'AFTER_PARTY'
                                ? 'bg-rose-500'
                                : 'bg-blue-500'
                      )}
                    />
                    <div className="overflow-hidden">
                      <div className="font-medium text-sm text-gray-900 truncate">{venue.name}</div>
                      <div className="text-xs text-gray-500 truncate">{venue.address}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : venuesError ? (
            <div className="py-6 flex flex-col items-center justify-center bg-gray-50 rounded-md border border-dashed border-gray-200">
              <span className="text-sm text-gray-500">
                {venuesError.message || t('venues.detail.fetchError')}
              </span>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center bg-gray-50 rounded-md border border-dashed border-gray-200">
              <span className="text-sm text-gray-500">{t('venues.detail.noDetails')}</span>
              <Button
                variant="link"
                className="text-xs text-purple-600 mt-1"
                onClick={() => {
                  resetVenueForm();
                  setIsVenueModalOpen(true);
                }}
              >
                {t('venues.detail.addVenueDetails')}
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Venue Modal */}
      <Dialog
        open={isVenueModalOpen}
        onOpenChange={open => {
          setIsVenueModalOpen(open);
          if (!open) {
            // Defer form reset to ensure Dialog unmounts properly
            setTimeout(() => {
              resetVenueForm();
            }, 0);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            {canCreateVenue ? (
              <DialogTitle>{currentVenue ? t('venues.detail.editVenue') : t('venues.detail.addVenue')}</DialogTitle>
            ) : (
              <DialogTitle>{t('venues.detail.title')}</DialogTitle>
            )}
          </DialogHeader>

          <form onSubmit={handleVenueSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium">
                  {t('venues.detail.venueName')}
                </label>
                <Input
                  id="name"
                  value={venueFormData.name}
                  onChange={e => setVenueFormData({ ...venueFormData, name: e.target.value })}
                  placeholder={t('venues.detail.venueNamePlaceholder')}
                  required
                  disabled={!canUpdateVenue && !canCreateVenue}
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="address" className="text-sm font-medium">
                  {t('venues.detail.address')}
                </label>
                <Input
                  id="address"
                  value={venueFormData.address}
                  onChange={e => setVenueFormData({ ...venueFormData, address: e.target.value })}
                  placeholder={t('venues.detail.addressPlaceholder')}
                  disabled={!canUpdateVenue && !canCreateVenue}
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="purpose" className="text-sm font-medium">
                  {t('venues.detail.purpose')}
                </label>
                <Select
                  value={venueFormData.purpose}
                  onValueChange={(value: VenuePurpose) =>
                    setVenueFormData({ ...venueFormData, purpose: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('venues.detail.selectPurpose')} />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value={VenuePurpose.MAIN}>{t('events.venues.purpose.main')}</SelectItem>
                    <SelectItem value={VenuePurpose.RELIGIOUS}>{t('events.venues.purpose.religious')}</SelectItem>
                    <SelectItem value={VenuePurpose.RECEPTION}>{t('events.venues.purpose.reception')}</SelectItem>
                    <SelectItem value={VenuePurpose.COCKTAIL}>{t('events.venues.purpose.cocktail')}</SelectItem>
                    <SelectItem value={VenuePurpose.AFTER_PARTY}>{t('events.venues.purpose.after_party')}</SelectItem>
                    <SelectItem value={VenuePurpose.PHOTO_SESSION}>{t('events.venues.purpose.photo_session')}</SelectItem>
                    <SelectItem value={VenuePurpose.REHEARSAL_DINNER}>{t('events.venues.purpose.rehearsal_dinner')}</SelectItem>
                    <SelectItem value={VenuePurpose.OTHER}>{t('events.venues.purpose.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsVenueModalOpen(false)}>
                {t('events.detail.cancel')}
              </Button>
              {(canCreateVenue || canUpdateVenue) && (
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  {currentVenue ? t('events.detail.saveChanges') : t('venues.detail.addVenue')}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
