'use client';

import { Button, Input } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Globe2Icon, MapPinIcon } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { EventStatus, VenuePurpose } from '@prisma/client';
import { durationOptions, formatTimezone, timeOptions, timezones } from '@/lib/constants';
import { Combobox } from '@/components/ui/combobox';
import { useRouterStuff } from '@/hooks/useRouterStuff';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const baseEventSchema = z.object({
  name: z.string(),
  date: z.string(),
  endDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  venue: z
    .object({
      name: z.string().optional(),
      address: z.string().optional(),
      purpose: z.nativeEnum(VenuePurpose).default(VenuePurpose.MAIN),
    })
    .optional(),
  timezone: z.string().default('America/Mexico_City'),
  person1: z.string(),
  person2: z.string(),
  status: z.enum([EventStatus.ACTIVE, EventStatus.INACTIVE]).default(EventStatus.ACTIVE),
  description: z.string().optional(),
});

type EventFormData = z.infer<typeof baseEventSchema>;

// Change to export
export type { EventFormData };

type FormErrors = {
  [K in keyof EventFormData]?: string[];
};

// Validation schema with translations
const createEventSchemaWithValidation = (t: (key: string) => string) => {
  const messages = {
    stringRequired: t('events.form.validation.stringRequired'),
    stringTooLong: t('events.form.validation.stringTooLong'),
    dateRequired: t('events.form.validation.dateRequired'),
    endDateRequired: t('events.form.validation.endDateRequired'),
    startTimeRequired: t('events.form.validation.startTimeRequired'),
    endTimeRequired: t('events.form.validation.endTimeRequired'),
    timezoneRequired: t('events.form.validation.timezoneRequired'),
    invalidTimeFormat: t('events.form.validation.invalidTimeFormat'),
    timeFormat: t('events.form.validation.timeFormat'),
    timezoneTooLong: t('events.form.validation.timezoneTooLong'),
    invalidTimezone: t('events.form.validation.invalidTimezone'),
  };

  return baseEventSchema.extend({
    name: z.string().min(1, messages.stringRequired).max(100, messages.stringTooLong),
    date: z.string().min(1, messages.dateRequired),
    endDate: z.string().min(1, messages.endDateRequired),
    startTime: z
      .string()
      .min(1, messages.startTimeRequired) 
      .max(5, messages.invalidTimeFormat)
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, messages.timeFormat),
    endTime: z
      .string()
      .min(1, messages.endTimeRequired)
      .max(5, messages.invalidTimeFormat)
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, messages.timeFormat),
    timezone: z
      .string()
      .min(1, messages.timezoneRequired) 
      .max(50, messages.timezoneTooLong)
      .refine(tz => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch (e) {
          return false;
        }
      }, messages.invalidTimezone)
      .default('America/Mexico_City'),
    person1: z.string().min(1, messages.stringRequired).max(100, messages.stringTooLong),
    person2: z.string().min(1, messages.stringRequired).max(100, messages.stringTooLong),
  });
};

interface EventFormProps {
  initialData?: EventFormData;
  isViewMode?: boolean;
  onSubmit?: (formData: EventFormData) => void;
  isSubmitting?: boolean;
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
}

export default function EventForm({
  onSubmit,
  isSubmitting: propIsSubmitting,
  formData,
  setFormData,
}: EventFormProps) {
  const { t } = useClientTranslation('common');
  const { searchParams } = useRouterStuff();
  const titleInputRef = useRef<HTMLTextAreaElement>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(propIsSubmitting ?? false);
  const [selectedTimezone, setSelectedTimezone] = useState('America/Mexico_City');
  const isNewEvent = true;
  const [showDescription, setShowDescription] = useState(false);
  const [showVenue, setShowVenue] = useState(
    !!(
      formData.venue?.name ||
      formData.venue?.address ||
      formData.venueName ||
      formData.venueAddress
    )
  );

  const eventSchema = createEventSchemaWithValidation(t);
  
  // Handle default time calculation on date/time change
  useEffect(() => {
    if (isNewEvent && formData.startTime) {
      // When start time changes, update end time to be start time + 7 hours
      const startTimeParts = formData.startTime.split(':');
      if (startTimeParts.length === 2) {
        const startHour = parseInt(startTimeParts[0] as string, 10);
        const startMinute = parseInt(startTimeParts[1] as string, 10);

        if (!isNaN(startHour) && !isNaN(startMinute)) {
          const endHour = (startHour + 7) % 24;
          const endMinute = startMinute;

          const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

          setFormData(prev => ({
            ...prev,
            endTime,
          }));
        }
      }
    }
  }, [formData.startTime, isNewEvent]);

  const validateField = (name: keyof EventFormData, value: string) => {
    try {
      eventSchema.shape[name].parse(value);
      setErrors(prev => ({ ...prev, [name]: undefined }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({
          ...prev,
          [name]: error.errors.map(err => err.message),
        }));
      }
    }
  };

  const isFormValid = () => {
    try {
      eventSchema.parse(formData);
      console.log('formData valid', formData);
      return true;
    } catch (_error) {
      console.log('formData invalid', _error, formData);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedFormData = eventSchema.parse(formData);

      // If an onSubmit prop is provided, call it
      if (onSubmit) {
        onSubmit(validatedFormData);
      } else {
        // TODO: Handle submission internally if no onSubmit prop is provided
        // This might involve bringing back the mutations or deciding this form
        // MUST always be controlled by a parent via onSubmit.
        console.warn(t('events.form.validation.onSubmitNotProvided'));
        // Simulate submission end for internal state if needed
        setTimeout(() => setIsSubmitting(false), 1000);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            const field = err.path[0].toString() as keyof EventFormData;
            if (!newErrors[field]) {
              newErrors[field] = [];
            }
            newErrors[field]?.push(err.message);
          }
        });
        setErrors(newErrors);
        setIsSubmitting(false);
      } else {
        console.error(error);
        toast.error(t('events.form.validation.unexpectedError'));
        setIsSubmitting(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'date') {
      setFormData(prev => ({
        ...prev,
        date: value,
      }));
      validateField('date', value);
      return;
    }

    if (name === 'endDate') {
      // Ensure end date is not before start date
      if (dayjs(value).isBefore(formData.date)) {
        setFormData(prev => ({
          ...prev,
          endDate: formData.date,
        }));
        validateField('endDate', formData.date);
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    validateField(name as keyof EventFormData, value);
  };

  // Add a new handler for time select
  const handleTimeChange = (value: string, timeField: 'startTime' | 'endTime') => {
    if (timeField === 'startTime') {
      // When start time changes, update form data
      setFormData(prev => ({
        ...prev,
        startTime: value,
      }));

      // Adjust end time if needed to ensure it's after start time
      const currentEndTime = formData.endTime;
      const endTimeOption = timeOptions.find(option => option.value === currentEndTime);

      if (!endTimeOption) {
        // If current end time is invalid with new start time, set to start time + 30 minutes
        const firstValidOption = timeOptions.find(
          option => option.durationMinutes !== undefined && option.durationMinutes >= 30
        );
        if (firstValidOption) {
          setFormData(prev => ({
            ...prev,
            endTime: firstValidOption.value,
          }));
        }
      }
    } else if (timeField === 'endTime') {
      // Parse start and end times
      const [startHour = 0] = formData.startTime.split(':').map(Number);
      const [endHour = 0] = value.split(':').map(Number);

      // Keep the existing end date if it's already set and valid
      let endDate = formData.endDate;

      // If no end date is set or it's the same as start date, check if we need to adjust it
      if (!endDate || endDate === formData.date) {
        // Calculate if end time is in the next day
        const isNextDay = endHour < startHour;
        endDate = isNextDay
          ? dayjs(formData.date).add(1, 'day').format('YYYY-MM-DD')
          : formData.date;
      }

      setFormData(prev => ({
        ...prev,
        endTime: value,
        endDate: endDate,
      }));
    }

    validateField(timeField, value);
  };

  // Calculate initial duration based on start and end times when component loads
  useEffect(() => {
    if (isNewEvent && formData.startTime && formData.endTime) {
      // Calculate initial duration
      const startTimeParts = formData.startTime.split(':');
      const endTimeParts = formData.endTime.split(':');

      if (startTimeParts.length !== 2 || endTimeParts.length !== 2) return;

      const startHours = parseInt(startTimeParts[0] || '0', 10);
      const startMinutes = parseInt(startTimeParts[1] || '0', 10);
      const endHours = parseInt(endTimeParts[0] || '0', 10);
      const endMinutes = parseInt(endTimeParts[1] || '0', 10);

      if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) return;

      const totalStartMinutes = startHours * 60 + startMinutes;
      let totalEndMinutes = endHours * 60 + endMinutes;

      // Handle end time being on the next day
      if (totalEndMinutes < totalStartMinutes) {
        totalEndMinutes += 24 * 60;
      }

      const durationMinutes = totalEndMinutes - totalStartMinutes;

      // If duration is more than 24 hours, use standard time format
      if (durationMinutes > 24 * 60) {
        setFormData(prev => ({
          ...prev,
          duration: '420',
        }));
      } else {
        // Find closest duration option
        const closestDuration = durationOptions.reduce((prev, curr) => {
          if (!prev) return curr;

          return Math.abs(parseInt(curr.value) - durationMinutes) <
            Math.abs(parseInt(prev.value) - durationMinutes)
            ? curr
            : prev;
        }, durationOptions[0]);

        if (closestDuration) {
          setFormData(prev => ({
            ...prev,
            duration: closestDuration.value,
          }));
        }
      }
    }
  }, [isNewEvent, formData.startTime, formData.endTime]);

  // Focus title input on load when not in view mode
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  // Update timezone handling
  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
    setFormData(prev => ({
      ...prev,
      timezone: value,
    }));
    validateField('timezone', value);
  };

  // Handle hiding venue section
  const handleHideVenue = () => {
    setShowVenue(false);
    // Clear venue data
    setFormData(prev => ({
      ...prev,
      venueName: '',
      venueAddress: '',
    }));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-transparent rounded-xl p-8 space-y-6">
        {/* Event Name */}
        <div className="w-full">
          <textarea
            ref={titleInputRef}
            name="name"
            value={formData.name}
            onChange={e => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
            placeholder={t('events.form.namePlaceholder')}
            className={cn(
              'text-[36px] font-semibold border-0 w-full px-0 h-auto placeholder:text-purple-700/20 focus-visible:ring-0 bg-transparent leading-tight outline-none resize-none overflow-hidden',
              errors.name && 'border-destructive'
            )}
            rows={2}
          />
        </div>

        {/* People getting married */}
        <div className="flex gap-6 -mt-2">
          <div className="flex-1 relative group">
            <div className="absolute inset-x-0 -bottom-1.5 h-[1px] bg-black/5 group-hover:bg-black/10 transition-colors"></div>
            <Input
              name="person1"
              value={formData.person1}
              onChange={handleInputChange}
              placeholder={t('events.form.person1Placeholder')}
              className={cn(
                'border-0 bg-transparent focus-visible:ring-0 text-black/70 placeholder:text-black/20 text-[24px] px-0 h-auto',
                errors.person1 && 'border-destructive'
              )}
            />
            {errors.person1 && <p className="text-sm text-red-300 mt-1">{errors.person1[0]}</p>}
          </div>
          <div className="flex items-center">
            <span className="text-2xl text-black/20">&</span>
          </div>
          <div className="flex-1 relative group">
            <div className="absolute inset-x-0 -bottom-1.5 h-[1px] bg-black/5 group-hover:bg-black/10 transition-colors"></div>
            <Input
              name="person2"
              value={formData.person2}
              onChange={handleInputChange}
              placeholder={t('events.form.person2Placeholder')}
              className={cn(
                'border-0 bg-transparent focus-visible:ring-0 text-black/70 placeholder:text-black/20 text-[24px] px-0 h-auto',
                errors.person2 && 'border-destructive'
              )}
            />
            {errors.person2 && <p className="text-sm text-red-300 mt-1">{errors.person2[0]}</p>}
          </div>
        </div>

        {/* Date and Time Section */}
        <div className="bg-gradient-to-br to-purple-100/30 from-neutral-100/30 text-black/70 rounded-xl p-6">
          <div className="flex gap-2 items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-4 rounded-lg mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-black/70"></div>
                  <span className="text-base font-medium text-black/70">{t('events.form.startDate')}</span>
                </div>
                <div className="flex flex-1 rounded-lg border border-gray-200/50 overflow-hidden bg-white/20">
                  <div className="flex-1 flex items-center transition-colors hover:bg-gray-50/50">
                    <Input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="border-0 bg-transparent focus-visible:ring-0 text-center text-black/70 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 flex items-center border-l border-gray-200/50 transition-colors hover:bg-gray-50/50">
                    <Select
                      value={formData.startTime}
                      onValueChange={value => handleTimeChange(value, 'startTime')}
                    >
                      <SelectTrigger className="border-0 bg-transparent focus-visible:ring-0 text-center text-black/70 cursor-pointer">
                        <SelectValue placeholder={t('events.form.selectTime')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] z-[60]">
                        {timeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full border border-black/70 bg-transparent"></div>
                  <span className="text-base font-medium text-black/70">{t('events.form.endDate')}</span>
                </div>
                <div className="flex flex-1 rounded-lg border border-gray-200/50 overflow-hidden bg-white/20">
                  <div className="flex-1 flex items-center transition-colors hover:bg-gray-50/50">
                    <Input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="border-0 bg-transparent focus-visible:ring-0 text-center text-black/70 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 flex items-center border-l border-gray-200/50 transition-colors hover:bg-gray-50/50">
                    <Select
                      value={formData.endTime}
                      onValueChange={value => handleTimeChange(value, 'endTime')}
                    >
                      <SelectTrigger className="border-0 bg-transparent focus-visible:ring-0 text-center text-black/70 cursor-pointer">
                        <SelectValue placeholder={t('events.form.selectTime')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] z-[60]">
                        {timeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center self-center gap-2 text-sm text-black/70">
              <div className="flex items-center">
                <Globe2Icon className="w-5 h-5 text-black/70" />
              </div>
              <Combobox
                options={timezones.map(tz => ({
                  value: tz.value,
                  label: tz.label,
                  extra: tz.offset,
                }))}
                value={selectedTimezone}
                onValueChange={handleTimezoneChange}
                searchPlaceholder={t('events.form.searchTimezone')}
                placeholder={t('events.form.selectTimezone')}
                className="min-w-[200px] bg-white/20 hover:bg-gray-50/50 rounded-lg border-0 focus:ring-0"
                compact={true}
              />
            </div>
          </div>

          {(errors.date || errors.startTime || errors.endTime) && (
            <p className="text-sm text-red-300 mt-1">
              {errors.date?.[0] || errors.startTime?.[0] || errors.endTime?.[0]}
            </p>
          )}
        </div>

        {/* Venue Section */}
        <div className="text-black rounded-xl">
          {!showVenue ? (
            <button
              type="button"
              onClick={() => setShowVenue(true)}
              className="flex items-center gap-2 text-black/70 hover:text-black transition-colors px-3 py-1.5 rounded-full bg-purple-100/30 hover:bg-purple-100/50"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4V20M4 12H20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm">{t('events.form.addVenue')}</span>
              <MapPinIcon className="w-4 h-4" />
            </button>
          ) : (
            <div className="bg-gradient-to-br to-purple-100/50 from-neutral-100/50 text-black rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <MapPinIcon className="w-5 h-5" />
                  <span className="text-base font-medium">{t('events.form.venueInfo')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleHideVenue()}
                  className="text-black/50 hover:text-black"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="venueName" className="block text-sm font-medium mb-1">
                    {t('events.form.venueName')}
                  </label>
                  <Input
                    id="venueName"
                    name="venueName"
                    value={formData.venueName ?? ''}
                    onChange={handleInputChange}
                    placeholder={t('events.form.venueNamePlaceholder')}
                    className="rounded-lg bg-purple-100/10 border-0 placeholder:text-muted-foreground/50"
                  />
                </div>

                <div>
                  <label htmlFor="venueAddress" className="block text-sm font-medium mb-1">
                    {t('events.form.venueAddress')}
                  </label>
                  <Input
                    id="venueAddress"
                    name="venueAddress"
                    value={formData.venueAddress ?? ''}
                    onChange={handleInputChange}
                    placeholder={t('events.form.venueAddressPlaceholder')}
                    className="rounded-lg bg-purple-100/10 border-0 placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                {t('events.form.venueInfoNote')}
              </p>
            </div>
          )}
        </div>

        {/* Description Section */}
        {
          <div className=" text-black rounded-xl">
            {!showDescription ? (
              <button
                type="button"
                onClick={() => setShowDescription(true)}
                className="flex items-center gap-2 text-black/70 hover:text-black transition-colors px-3 py-1.5 rounded-full bg-purple-100/30 hover:bg-purple-100/50"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 4V20M4 12H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm">{t('events.form.addDescription')}</span>
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-medium">{t('events.form.description')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDescription(false)}
                    className="text-black/50 hover:text-black"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M18 6L6 18M6 6L18 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <textarea
                  name="description"
                  placeholder={t('events.form.descriptionPlaceholder')}
                  className={cn(
                    'w-full rounded-lg bg-purple-100/10 border-0 placeholder:text-muted-foreground/50 min-h-[100px] p-3 resize-none'
                  )}
                />
              </>
            )}
          </div>
        }

        {/* Action Buttons */}
        {onSubmit && searchParams.get('creationType') !== 'duplicate' && (
          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={propIsSubmitting || !isFormValid()}>
              {propIsSubmitting 
                ? t('events.form.saving') 
                : isNewEvent 
                  ? t('events.form.createEvent') 
                  : t('events.form.saveChanges')}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
