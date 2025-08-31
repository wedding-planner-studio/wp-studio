'use client';
import { FiArrowLeft } from 'react-icons/fi';
import { Button } from '../ui/button';
import Link from 'next/link';
import EventForm, { EventFormData } from './EventForm';
import { EventStatus, VenuePurpose } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useState } from 'react';
import { api } from '@/trpc/react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';
// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const defaultFormData: EventFormData = {
  name: '',
  date: dayjs().add(1, 'year').format('YYYY-MM-DD'),
  endDate: dayjs().add(1, 'year').add(1, 'day').format('YYYY-MM-DD'),
  startTime: '19:00', // 7:00 PM
  endTime: '02:00', // 2:00 AM (next day)
  venue: {
    name: '',
    address: '',
    purpose: VenuePurpose.MAIN,
  },
  timezone: 'America/Mexico_City',
  person1: '',
  person2: '',
  status: EventStatus.ACTIVE,
};

export default function NewEventFlow() {
  const { t } = useClientTranslation('common');
  const [eventFormData, setEventFormData] = useState<EventFormData>(defaultFormData);
  const router = useRouter();
  const { mutateAsync: createEvent, isPending } = api.events.create.useMutation({
    onSuccess: event => {
      toast.success(t('events.createSuccess'));
      router.push(`/admin/events/${event.id}`);
    },
    onError: error => {
      toast.error(error.message || t('events.createError'));
    },
  });

  const handleSubmit = async () => {
    await createEvent({
      name: eventFormData.name,
      date: eventFormData.date,
      startTime: eventFormData.startTime,
      endTime: eventFormData.endTime,
      timezone: eventFormData.timezone,
      person1: eventFormData.person1,
      person2: eventFormData.person2,
      status: eventFormData.status,
      venue: {
        name: eventFormData.venueName ?? '',
        address: eventFormData.venueAddress ?? '',
        purpose: VenuePurpose.MAIN,
      },
      description: eventFormData.description,
    });
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
      <EventForm
        initialData={defaultFormData}
        formData={eventFormData}
        setFormData={setEventFormData}
        isSubmitting={isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
