'use client';

import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button, Input } from '@/components/ui';
import { api } from '@/trpc/react';
import { FiEdit2, FiCalendar, FiCheck, FiX, FiMessageSquare, FiCopy } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe2Icon, CheckCircle2Icon, AlarmClockIcon, LucideCopyPlus } from 'lucide-react';
import BulkUploadModal from '@/components/modals/bulk-upload-modal';
import { DashboardSkeleton } from './_components/DashboardSkeleton';
import { timeOptions, timezones } from '@/lib/constants';
import { VenueDetailsCard } from './_components/VenueDetailsCard';
import { GuestsRSVPDetailsCard } from './_components/GuestsRSVPDetailsCard';
import { Combobox } from '@/components/ui/combobox';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import { useRouterStuff } from '@/hooks/useRouterStuff';
import { useRoleBasedPermission } from '@/hooks/useRoleBasedPermission';
import Link from 'next/link';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localeData);

export default function EventDetailPage() {
  const { t } = useClientTranslation('common');
  const params = useParams();
  const { searchParams, router, queryParams } = useRouterStuff();
  const eventId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<any>({});
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);
  const [countdownLabel, setCountdownLabel] = useState<string>(t('events.detail.timeUntilEvent'));
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const locale = params.locale as string;

  // Fetch event data with refetch configurations
  const {
    data: event,
    isLoading,
    error,
  } = api.events.getById.useQuery(
    { id: eventId },
    {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      staleTime: 30000,
    }
  );

  const { hasPermission: canEditEvent } = useRoleBasedPermission('events', 'update');

  // Update event mutation
  const updateMutation = api.events.update.useMutation({
    onSuccess: () => {
      toast.success(t('eventDetail.updateSuccess'));
      setIsEditing(false);
      setEditedEvent(null);
    },
    onError: error => {
      toast.error(error.message || t('eventDetail.updateError'));
    },
  });

  // tRPC procedures
  const utils = api.useUtils();

  // Get the current data to display (either edited or original)
  const displayData = isEditing ? editedEvent : event;

  // Handle edit mode and editedEvent state
  useEffect(() => {
    const shouldEdit = searchParams?.get('edit') === 'true';

    if (shouldEdit && event) {
      // Only set editedEvent when entering edit mode
      const formattedEvent = {
        name: event.name,
        date: dayjs(event.date).format('YYYY-MM-DD'),
        endDate: event.endDate ? dayjs(event.endDate).format('YYYY-MM-DD') : null,
        startTime: event.startTime,
        endTime: event.endTime,
        person1: event.person1,
        person2: event.person2,
        timezone: event.timezone,
      };
      setEditedEvent(formattedEvent);
    } else if (!shouldEdit && editedEvent) {
      // Clear editedEvent when leaving edit mode
      setEditedEvent(null);
    }

    setIsEditing(shouldEdit);
  }, [event, searchParams]);

  // Optimize the countdown effect
  useEffect(() => {
    if (!displayData?.date || !displayData?.startTime) return;

    const calculateTimeRemaining = () => {
      const [hours = 0, minutes = 0] = (displayData.startTime || '00:00').split(':').map(Number);
      const eventDate = dayjs(displayData.date)
        .tz(displayData.timezone || 'America/Mexico_City')
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);
      const now = dayjs().tz(displayData.timezone || 'America/Mexico_City');

      if (eventDate.isBefore(now)) {
        setCountdown(null);
        setCountdownLabel(t('events.detail.eventStarted'));
        return;
      }

      const days = eventDate.diff(now, 'day');
      const remainingHours = eventDate.diff(now, 'hour') % 24;
      const remainingMinutes = eventDate.diff(now, 'minute') % 60;

      setCountdown({
        days,
        hours: remainingHours,
        minutes: remainingMinutes,
      });

      setCountdownLabel(
        days > 0
          ? t('events.detail.daysUntilEvent')
          : remainingHours > 0
            ? t('events.detail.hoursUntilEvent')
            : t('events.detail.minutesUntilEvent')
      );
    };

    calculateTimeRemaining();
    // Update every minute
    const intervalId = setInterval(calculateTimeRemaining, 60000);
    return () => clearInterval(intervalId);
  }, [displayData?.date, displayData?.startTime, displayData?.timezone, t]);

  // Handle URL params update in a single effect
  useEffect(() => {
    if (isEditing) {
      queryParams({ set: { edit: 'true' } });
    } else {
      queryParams({ del: 'edit' });
    }
  }, [isEditing]);

  // Handle navigation on error or missing data
  useEffect(() => {
    if (error || (!isLoading && !event)) {
      router.push('/admin/events');
    }
  }, [error, event, isLoading, router]);

  const { data: pendingRequests } = api.guestRequests.countPending.useQuery(
    { eventId },
    {
      refetchOnWindowFocus: true,
    }
  );

  // Set the locale for dayjs
  useEffect(() => {
    dayjs.locale(locale === 'es' ? 'es' : 'en');
  }, [locale]);

  if (isLoading) {
    return (
      <AdminLayout>
        <DashboardSkeleton />
      </AdminLayout>
    );
  }

  if (!event) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedEvent((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateEventDateTime = (eventData: any) => {
    const startDate = eventData.date || displayData.date;
    const endDate = eventData.endDate || displayData.endDate;
    const startTime = eventData.startTime || displayData.startTime;
    const endTime = eventData.endTime || displayData.endTime || startTime;

    if (startDate && endDate) {
      const startDateTime = dayjs(`${startDate} ${startTime}`);
      const endDateTime = dayjs(`${endDate} ${endTime}`);

      if (endDateTime.isBefore(startDateTime)) {
        toast.error(t('eventDetail.endDateBeforeStartDate'));
        return false;
      }

      if (startDateTime.isAfter(endDateTime)) {
        toast.error(t('eventDetail.startDateAfterEndDate'));
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    try {
      if (!validateEventDateTime(editedEvent)) return;

      await updateMutation.mutateAsync({
        id: eventId,
        data: { ...displayData, ...editedEvent },
      });
      void utils.events.invalidate();
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const handleCancel = () => {
    setEditedEvent({
      name: event.name,
      date: dayjs(event.date).format('YYYY-MM-DD'),
      startTime: event.startTime,
      endTime: event.endTime,
      person1: event.person1,
      person2: event.person2,
    });
    setIsEditing(false);
  };

  // Calculate duration between start and end time
  const calculateDuration = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start || !end) return '';

    const [startHour = 0, startMinute = 0] = start.split(':').map(Number);
    let [endHour = 0, endMinute = 0] = end.split(':').map(Number);

    // Adjust for next day if end time is earlier than start time
    if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
      endHour += 24;
    }

    const durationInMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    const hours = Math.floor(durationInMinutes / 60);
    return `${hours}h`;
  };

  // Format date with timezone consideration
  const formatEventDate = (date: string | Date, formatStr: string, timezone?: string) => {
    if (!date) return '';
    return dayjs(date)
      .utc() // First convert to UTC
      .tz(timezone || 'America/Mexico_City') // Then convert to target timezone
      .format(formatStr);
  };

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Event Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">{displayData.name}</h1>
            <div className="flex flex-col">
              <p className="text-base text-gray-700 mb-1">
                {displayData.person1} <span className="text-gray-400">{t('eventDetail.and')}</span> {displayData.person2}
              </p>
              <p className="text-sm text-gray-500">
                {displayData.date && displayData.startTime && (
                  <>
                    {t('eventDetail.dateTime', {
                      date: dayjs(displayData.date)
                        .utc()
                        .tz(displayData.timezone || 'America/Mexico_City')
                        .format('dddd, MMMM D, YYYY'),
                      time: displayData.startTime,
                    })}
                  </>
                )}
              </p>
            </div>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="text-gray-600 h-9 px-3 text-sm"
              >
                <FiX className="mr-1.5 h-3.5 w-3.5" />
                {t('eventDetail.cancel')}
              </Button>
              <Button onClick={handleSave}>
                <FiCheck className="mr-1.5 h-3.5 w-3.5" />
                {t('eventDetail.saveChanges')}
              </Button>
            </div>
          ) : canEditEvent ? (
            <div className="flex gap-2">
              <Button onClick={() => queryParams({ set: { edit: 'true' } })}>
                <FiEdit2 className="mr-1.5 h-4 w-4" />
                {t('eventDetail.editEvent')}
              </Button>
              <Link href={`/admin/events/new?creationType=duplicate&cloneFrom=${eventId}`} passHref>
                <Button variant="outline">
                  <LucideCopyPlus className="mr-1.5 h-4 w-4" />
                  {t('eventDetail.duplicate')}
                </Button>
              </Link>
            </div>
          ) : null}
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Event Title & People */}
            {isEditing ? (
              <div className="mb-6">
                <Input
                  name="name"
                  value={displayData.name ?? ''}
                  onChange={handleInputChange}
                  className="text-xl font-medium mb-3 border-0 bg-gray-50 px-3 py-2 rounded-lg w-full"
                  placeholder={t('events.form.namePlaceholder')}
                />
                <div className="flex gap-4 items-center">
                  <Input
                    name="person1"
                    value={displayData.person1 ?? ''}
                    onChange={handleInputChange}
                    className="text-base border-0 bg-gray-50 px-3 py-1.5 rounded-lg"
                    placeholder={t('events.form.person1Placeholder')}
                  />
                  <span className="text-gray-400">{t('eventDetail.and')}</span>
                  <Input
                    name="person2"
                    value={displayData.person2 ?? ''}
                    onChange={handleInputChange}
                    className="text-base border-0 bg-gray-50 px-3 py-1.5 rounded-lg"
                    placeholder={t('events.form.person2Placeholder')}
                  />
                </div>
              </div>
            ) : null}

            {/* Venue(s) Details Card */}
            <VenueDetailsCard eventId={eventId} />

            {/* RSVP Summary Card */}
            <GuestsRSVPDetailsCard eventId={eventId} />

            {/* Special Requests Card */}
            {Number(pendingRequests) > 0 && (
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm mt-4">
                <div className="flex items-center justify-between p-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <FiMessageSquare className="h-3.5 w-3.5 text-gray-600" />
                    <h2 className="font-medium text-sm text-gray-900">{t('eventDetail.specialRequests')}</h2>
                    {pendingRequests && pendingRequests > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        {pendingRequests}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/admin/events/${eventId}/guest-requests`)}
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    {t('eventDetail.viewAll')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Time and Location Cards */}
          <div className="space-y-4">
            {/* Time Details Card */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                <FiCalendar className="h-3.5 w-3.5 text-purple-600" />
                <h2 className="font-medium text-sm">{t('eventDetail.dateAndTime')}</h2>
              </div>
              <div className="p-4 space-y-3">
                {/* Countdown Section */}
                {!isEditing && countdown && (
                  <div className="bg-gradient-to-r from-purple-50 via-purple-100/80 to-purple-50/70 rounded-md px-3 py-2.5 mb-2 border border-purple-100/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlarmClockIcon className="h-3.5 w-3.5 text-purple-600" />
                      <span className="text-xs font-medium text-purple-800">{countdownLabel}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      {countdown.days > 0 && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-700">{countdown.days}</div>
                          <div className="text-xs text-purple-600">{t('eventDetail.days')}</div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-700">{countdown.hours}</div>
                        <div className="text-xs text-purple-600">{t('eventDetail.hours')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-700">
                          {countdown.minutes}
                        </div>
                        <div className="text-xs text-purple-600">{t('eventDetail.minutes')}</div>
                      </div>
                    </div>
                  </div>
                )}
                {!isEditing && !countdown && countdownLabel === t('eventDetail.eventStarted') && (
                  <div className="bg-gradient-to-r from-emerald-50 via-emerald-100/80 to-emerald-50/70 rounded-md px-3 py-2.5 mb-2 border border-emerald-100/50 shadow-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">
                        {t('eventDetail.eventStarted')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Start Date & Time */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                    <span className="text-xs font-medium text-gray-700">{t('eventDetail.start')}</span>
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        type="date"
                        name="date"
                        value={displayData.date ?? ''}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1 text-sm"
                      />
                      <Select
                        value={displayData.startTime}
                        onValueChange={value =>
                          setEditedEvent((prev: any) => ({ ...prev, startTime: value }))
                        }
                      >
                        <SelectTrigger className="w-full border border-gray-200 h-8 text-sm">
                          <SelectValue placeholder={t('eventDetail.selectTime')} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[280px] overflow-y-auto">
                          {timeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value} className="text-sm">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="bg-purple-50/60 rounded-md px-2.5 py-1.5">
                      <div className="text-gray-900 text-sm font-medium">
                        {formatEventDate(
                          displayData?.date || new Date(),
                          'MMMM D, YYYY',
                          displayData.timezone
                        )}
                      </div>
                      <div className="text-sm font-medium">{displayData?.startTime}</div>
                    </div>
                  )}
                </div>

                {/* End Date & Time */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full border border-purple-600"></div>
                    <span className="text-xs font-medium text-gray-700">{t('eventDetail.end')}</span>
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        type="date"
                        name="endDate"
                        value={displayData.endDate ?? ''}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1 text-sm"
                      />
                      <Select
                        value={displayData.endTime}
                        onValueChange={value =>
                          setEditedEvent((prev: any) => ({ ...prev, endTime: value }))
                        }
                      >
                        <SelectTrigger className="w-full border border-gray-200 h-8 text-sm">
                          <SelectValue placeholder={t('eventDetail.selectTime')} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[280px] overflow-y-auto">
                          {timeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value} className="text-sm">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="bg-purple-50/30 rounded-md px-2.5 py-1.5">
                      <div className="text-gray-900 text-sm font-medium">
                        {formatEventDate(
                          displayData?.endDate || displayData?.date || new Date(),
                          'MMMM D, YYYY',
                          displayData.timezone
                        )}
                      </div>
                      <div className="text-gray-700 text-sm font-medium">
                        {displayData?.endTime}
                        {displayData?.startTime && displayData?.endTime && ` `}
                        <span className="font-normal text-gray-500">
                          {displayData?.startTime &&
                            displayData?.endTime &&
                            t('eventDetail.duration', {
                              hours: calculateDuration(displayData.startTime, displayData.endTime),
                            })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timezone */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Globe2Icon className="h-3.5 w-3.5 text-gray-500" />
                    {isEditing ? (
                      <>
                        <div className="w-full">
                          <label className="block text-xs text-gray-500 mb-1 font-medium">
                            {t('eventDetail.eventTimezone')}
                          </label>
                          <Combobox
                            options={timezones.map(tz => ({
                              value: tz.value,
                              label: tz.label,
                              extra: tz.offset,
                            }))}
                            value={displayData.timezone || ''}
                            onValueChange={value =>
                              setEditedEvent((prev: any) => ({ ...prev, timezone: value }))
                            }
                            searchPlaceholder={t('eventDetail.searchTimezone')}
                            className="w-full shadow-sm"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-600 text-sm">
                        <span className="font-medium">
                          {displayData?.timezone &&
                          timezones.find(tz => tz.value === displayData.timezone) ? (
                            <>
                              {t('eventDetail.timezone', {
                                name: timezones.find(tz => tz.value === displayData.timezone)?.label,
                                offset: timezones.find(tz => tz.value === displayData.timezone)?.offset,
                              })}
                            </>
                          ) : (
                            t('eventDetail.defaultTimezone')
                          )}
                        </span>
                        {displayData?.timezone !== 'America/Mexico_City' && (
                          <div className="text-xs text-gray-400 mt-1">
                            {t('eventDetail.currentTime', {
                              time: dayjs()
                                .tz(displayData?.timezone || 'America/Mexico_City')
                                .format('HH:mm'),
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          eventId={eventId}
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          onSuccess={() => {
            void utils.events.invalidate();
            setIsBulkUploadOpen(false);
          }}
        />
      </div>
    </AdminLayout>
  );
}
