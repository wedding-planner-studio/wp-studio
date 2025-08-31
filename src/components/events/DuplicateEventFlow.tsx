import { useEffect, useState, useRef } from 'react';
import { api } from '@/trpc/react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowUpCircle, Info, HelpCircle, Users } from 'lucide-react';
import EventForm, { EventFormData } from './EventForm';
import dayjs from 'dayjs';
import { Button, LoadingDots } from '../ui';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouterStuff } from '@/hooks/useRouterStuff';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'react-hot-toast';
import { noop } from '@/lib/utils';
import { EventStatus, VenuePurpose } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

export interface DuplicateOptions {
  guestList: boolean;
  questions: boolean;
  shareAccess: boolean;
}

const defaultOptions: DuplicateOptions = {
  guestList: true,
  questions: true,
  shareAccess: false,
};

const defaultFormData: EventFormData = {
  name: '',
  date: dayjs().add(1, 'year').format('YYYY-MM-DD'),
  endDate: dayjs().add(1, 'year').add(1, 'day').format('YYYY-MM-DD'),
  startTime: '19:00', // 7:00 PM
  endTime: '02:00', // 2:00 AM (next day)
  venue: undefined, // Don't set default venue object since name and address are required
  venueName: '', // New field for venue name
  venueAddress: '', // New field for venue address
  timezone: 'America/Mexico_City',
  person1: '',
  person2: '',
  status: EventStatus.ACTIVE,
};

export default function DuplicateEventFlow() {
  const { t } = useClientTranslation('common');
  const { searchParams } = useRouterStuff();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [options, setOptions] = useState<DuplicateOptions>(defaultOptions);
  const [eventFormData, setEventFormData] = useState<EventFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const router = useRouter();

  // Refs for scrolling
  const sourceEventCardRef = useRef<HTMLDivElement>(null);
  const newEventDetailsRef = useRef<HTMLHeadingElement>(null);

  const utils = api.useUtils();

  const { data: events, isLoading: isLoadingEvents } = api.events.getAll.useQuery({
    page: 1,
    limit: 50,
  });

  const { data: stats, isLoading: isLoadingStats } = api.events.quickStats.useQuery(
    { id: selectedEventId! },
    {
      enabled: !!selectedEventId,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const { data: sourceEvent } = api.events.getById.useQuery(
    { id: selectedEventId! },
    { enabled: !!selectedEventId }
  );

  const { mutate: createFromDuplicate, isPending } = api.events.createFromDuplicate.useMutation({
    onSuccess: newEvent => {
      toast.success(t('events.duplicate.success'));
      router.push(`/admin/events/${newEvent.id}`);
      void utils.events.invalidate();
    },
  });

  // Fetch Event Managers list only when Popover is open
  const {
    data: managers,
    isLoading: isLoadingManagers,
    error: managersError,
  } = api.organization.listEventManagers.useQuery(
    { eventId: selectedEventId! },
    {
      enabled: popoverOpen && !!selectedEventId,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (searchParams.get('creationType') === 'duplicate' && searchParams.get('cloneFrom')) {
      if (events?.events.find(event => event.id === searchParams.get('cloneFrom'))) {
        setSelectedEventId(searchParams.get('cloneFrom')!);
      }
    }
  }, [searchParams, events]);

  const comboboxOptions: ComboboxOption[] =
    events?.events.map(event => ({
      value: event.id,
      label: event.name,
      extra: `${event.person1} & ${event.person2}`,
    })) || [];

  const handleEventSelected = (eventId: string, options: DuplicateOptions) => {
    setSelectedEventId(eventId);
    setOptions(options);
  };

  useEffect(() => {
    if (selectedEventId) {
      handleEventSelected(selectedEventId, options);
    }
  }, [selectedEventId, options, handleEventSelected]);

  useEffect(() => {
    if (sourceEvent) {
      const initialData: EventFormData = {
        ...defaultFormData,
        name: `Copy of ${sourceEvent.name}`,
        date: sourceEvent.date ? dayjs(sourceEvent.date).format('YYYY-MM-DD') : '',
        endDate: sourceEvent.endDate
          ? dayjs(sourceEvent.endDate).format('YYYY-MM-DD')
          : dayjs(sourceEvent.date).endOf('day').format('YYYY-MM-DD'),
        startTime: sourceEvent.startTime ? sourceEvent.startTime : '',
        endTime: sourceEvent.endTime ? sourceEvent.endTime : '',
        timezone: sourceEvent.timezone ?? 'America/Mexico_City',
        person1: sourceEvent.person1,
        person2: sourceEvent.person2,
        status: sourceEvent.status,
        description: sourceEvent.description ?? '',
      };
      setEventFormData(initialData);
    } else {
      setEventFormData(defaultFormData);
    }
  }, [sourceEvent]);

  // Scroll down when event details load for the first time after selection
  useEffect(() => {
    if (eventFormData && newEventDetailsRef.current) {
      // Check if we just selected an event (previously empty eventFormData)
      // This prevents scrolling on subsequent data updates if any
      if (eventFormData && !sourceEventCardRef.current?.dataset.scrolledOnce) {
        newEventDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Mark that we've scrolled once for this selection
        if (sourceEventCardRef.current) {
          sourceEventCardRef.current.dataset.scrolledOnce = 'true';
        }
      }
    }
  }, [eventFormData]); // Depend only on eventFormData changing

  // Reset scroll flag when selection changes
  useEffect(() => {
    if (sourceEventCardRef.current) {
      delete sourceEventCardRef.current.dataset.scrolledOnce;
    }
    // Also clear form data when selection is cleared
    if (!selectedEventId) {
      setEventFormData(defaultFormData);
    }
  }, [selectedEventId]);

  const handleFormSubmit = async () => {
    setIsSubmitting(true);
    await createFromDuplicate({
      cloneFromId: selectedEventId!,
      eventInput: {
        ...eventFormData,
        venue: {
          name: eventFormData.venueName ?? '',
          address: eventFormData.venueAddress ?? '',
          purpose: VenuePurpose.MAIN,
        },
      },
      options,
    });
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Navigation */}
      <div className="mb-2">
        <Link href="/admin/events">
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900 h-8 px-2 -ml-2">
            <FiArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="text-xs">{t('events.backToEvents')}</span>
          </Button>
        </Link>
      </div>
      {/* 1. Event Selection Card */}
      <div ref={sourceEventCardRef} className="pb-6">
        <Card className="overflow-hidden bg-transparent shadow-none border-none">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {t('events.duplicate.selectSource')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0 pb-0">
            <Label className="text-sm font-medium text-gray-700">
              {t('events.duplicate.selectSourceDescription')}
            </Label>
            <div>
              {isLoadingEvents && !events ? (
                <Skeleton className="h-10 w-full rounded-lg bg-gray-200" />
              ) : (
                <Combobox
                  options={comboboxOptions}
                  value={selectedEventId}
                  onValueChange={setSelectedEventId}
                  placeholder={t('events.duplicate.selectEvent')}
                  searchPlaceholder={t('events.duplicate.searchEvents')}
                  className="bg-white/50 border-gray-300"
                />
              )}
            </div>
            {events?.meta && (
              <div className="text-xs text-gray-500">
                {t('events.duplicate.showingEvents', {
                  count: events.events.length,
                  total: events.meta.total,
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sections displayed only when an event is selected */}
      {selectedEventId && (
        <>
          {/* 2. New Event Details Form */}
          {eventFormData ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 ref={newEventDetailsRef} className="text-xl font-semibold text-gray-800 pt-2">
                  {t('events.duplicate.newEventDetails')}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    sourceEventCardRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                  }
                  title={t('events.duplicate.scrollToSelect')}
                >
                  <ArrowUpCircle className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                </Button>
              </div>
              <EventForm
                initialData={defaultFormData}
                formData={eventFormData}
                setFormData={setEventFormData}
                onSubmit={noop}
                isSubmitting={isSubmitting}
              />
            </div>
          ) : (
            <div className="space-y-6 pt-6">
              <Skeleton className="h-8 w-1/3 bg-gray-200" />
              <Skeleton className="h-64 w-full bg-gray-200 rounded-lg" />
            </div>
          )}

          {/* 3. Duplication Options Card */}
          <div className="space-y-6 pb-6">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
              {t('events.duplicate.options')}
            </h2>
            <Card className="bg-gradient-to-br to-purple-100/30 from-neutral-100/30 overflow-hidden shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600 mb-6">
                  {t('events.duplicate.selectToCopy', {
                    eventName: sourceEvent?.name || t('events.duplicate.selectedEvent'),
                  })}
                </p>
                <div className="space-y-5">
                  {/* Guest List Option */}
                  <div className="flex items-start justify-between py-2">
                    <div className="flex-1 mr-4">
                      <Label className="font-medium text-gray-800 flex items-center">
                        {t('events.duplicate.keepGuestList')}
                        {selectedEventId && (
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            {isLoadingStats ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              t('events.duplicate.guestCount', { count: stats?.totalGuests ?? 0 })
                            )}
                          </span>
                        )}
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 ml-1.5 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-center">
                              <p className="text-xs">{t('events.duplicate.guestListTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        {options.guestList
                          ? t('events.duplicate.guestListCopy')
                          : t('events.duplicate.guestListEmpty')}
                      </p>
                    </div>
                    <Switch
                      checked={options.guestList}
                      onCheckedChange={checked =>
                        setOptions(prev => ({ ...prev, guestList: checked }))
                      }
                      className="mt-1"
                    />
                  </div>

                  {/* Questions Option */}
                  <div className="flex items-start justify-between py-2">
                    <div className="flex-1 mr-4">
                      <Label className="font-medium text-gray-800 flex items-center">
                        {t('events.duplicate.copyQuestions')}
                        {selectedEventId && (
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            {isLoadingStats ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              t('events.duplicate.questionCount', { count: stats?.totalQuestions ?? 0 })
                            )}
                          </span>
                        )}
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        {options.questions
                          ? t('events.duplicate.questionsCopy')
                          : t('events.duplicate.questionsEmpty')}
                      </p>

                      {/* Smart Suggestion with Animation & Restyling */}
                      <AnimatePresence initial={false}>
                        {options.guestList && !options.questions && (
                          <motion.div
                            key="smart-suggestion-questions"
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: '0.5rem' }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                            className="flex items-start space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-md"
                          >
                            <Info className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-700">
                              <span className="font-semibold">{t('events.duplicate.smartSuggestion')}:</span>{' '}
                              {t('events.duplicate.questionsSuggestion')}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <Switch
                      checked={options.questions}
                      onCheckedChange={checked =>
                        setOptions(prev => ({ ...prev, questions: checked }))
                      }
                      className="mt-1"
                    />
                  </div>

                  {/* Share Manager Access Option */}
                  <div className="flex items-start justify-between py-2">
                    <div className="flex-1 mr-4">
                      <Label className="font-medium text-gray-800 flex items-center">
                        {t('events.duplicate.shareManagerAccess')}
                        {selectedEventId && (
                          <span className="ml-1 mr-1 text-xs font-normal text-gray-500">
                            {isLoadingStats ? (
                              <Loader2 className="h-3 w-3 animate-spin inline" />
                            ) : (
                              t('events.duplicate.managerCount', { count: stats?.totalManagers ?? 0 })
                            )}
                          </span>
                        )}
                        {(stats?.totalManagers ?? 0) > 0 && (
                          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Users className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
                            </PopoverTrigger>
                            <PopoverContent className="w-72 z-50" side="top" align="start">
                              <div className="space-y-2">
                                <h4 className="font-medium leading-none text-sm">
                                  {t('events.duplicate.eventManagers')}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {t('events.duplicate.managersAccessNote')}
                                </p>
                                <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                                  {isLoadingManagers && (
                                    <p className="text-xs text-center text-gray-500">
                                      {t('events.duplicate.loading')}
                                    </p>
                                  )}
                                  {managersError && (
                                    <p className="text-xs text-center text-red-500">
                                      {t('events.duplicate.errorLoading')}
                                    </p>
                                  )}
                                  {!isLoadingManagers &&
                                    !managersError &&
                                    managers?.length === 0 && (
                                      <p className="text-xs text-center text-gray-500">
                                        {t('events.duplicate.noManagers')}
                                      </p>
                                    )}
                                  {!isLoadingManagers &&
                                    !managersError &&
                                    managers &&
                                    managers.length > 0 &&
                                    managers.map(manager => (
                                      <div
                                        key={manager.id}
                                        className="text-xs p-1.5 bg-gray-50 rounded text-gray-700"
                                      >
                                        {manager.firstName || manager.lastName
                                          ? `${manager.firstName || ''} ${manager.lastName || ''}`.trim()
                                          : manager.email}
                                        ({manager.email})
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        {options.shareAccess
                          ? t('events.duplicate.shareAccessEnabled')
                          : t('events.duplicate.shareAccessDisabled')}
                      </p>
                    </div>
                    <Switch
                      checked={options.shareAccess}
                      onCheckedChange={checked =>
                        setOptions(prev => ({ ...prev, shareAccess: checked }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button
              type="submit"
              disabled={isSubmitting || isPending}
              className="w-full"
              onClick={handleFormSubmit}
            >
              {isSubmitting || isPending ? (
                <LoadingDots color="white" />
              ) : (
                t('events.duplicate.createEvent')
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
