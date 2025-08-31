import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { env } from '@/env';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export const BOOK_A_MEETING_URL = 'https://meetings.hubspot.com/jcasian';

export const SLACK_CHANNEL_ID_CRONS =
  env.NEXT_PUBLIC_NODE_ENV === 'production' ? 'C08QFC9SH6V' : 'C08Q6A3KDSP';
export const SLACK_CHANNEL_ID_WAITLIST =
  env.NEXT_PUBLIC_NODE_ENV === 'production' ? 'C08QGGE1WGN' : 'C08QGGE1WGN';

export const timezones = [
  // Common timezones grouped by region
  // Americas
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)', offset: '-08:00' },
  { value: 'America/Denver', label: 'Mountain Time (US)', offset: '-07:00' },
  { value: 'America/Chicago', label: 'Central Time (US)', offset: '-06:00' },
  { value: 'America/New_York', label: 'Eastern Time (US)', offset: '-05:00' },
  { value: 'America/Mexico_City', label: 'Mexico City', offset: '-06:00' },
  { value: 'America/Bogota', label: 'Colombia', offset: '-05:00' },
  { value: 'America/Sao_Paulo', label: 'Brazil', offset: '-03:00' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina', offset: '-03:00' },

  // Europe & Africa
  { value: 'Europe/London', label: 'London', offset: '+01:00' },
  { value: 'Europe/Paris', label: 'Central Europe', offset: '+01:00' },
  { value: 'Europe/Istanbul', label: 'Turkey', offset: '+03:00' },
  { value: 'Africa/Cairo', label: 'Egypt', offset: '+02:00' },
  { value: 'Africa/Johannesburg', label: 'South Africa', offset: '+02:00' },

  // Asia & Pacific
  { value: 'Asia/Dubai', label: 'Dubai', offset: '+04:00' },
  { value: 'Asia/Kolkata', label: 'India', offset: '+05:30' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: '+08:00' },
  { value: 'Asia/Shanghai', label: 'China', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'Japan', offset: '+09:00' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: '+10:00' },
  { value: 'Pacific/Auckland', label: 'New Zealand', offset: '+12:00' },
];

// Time options for select dropdowns (30-minute intervals)
export interface TimeOption {
  value: string;
  label: string;
  durationMinutes?: number;
}

export const timeOptions: TimeOption[] = [
  { value: '00:00', label: '12:00 AM' },
  { value: '00:30', label: '12:30 AM' },
  { value: '01:00', label: '01:00 AM' },
  { value: '01:30', label: '01:30 AM' },
  { value: '02:00', label: '02:00 AM' },
  { value: '02:30', label: '02:30 AM' },
  { value: '03:00', label: '03:00 AM' },
  { value: '03:30', label: '03:30 AM' },
  { value: '04:00', label: '04:00 AM' },
  { value: '04:30', label: '04:30 AM' },
  { value: '05:00', label: '05:00 AM' },
  { value: '05:30', label: '05:30 AM' },
  { value: '06:00', label: '06:00 AM' },
  { value: '06:30', label: '06:30 AM' },
  { value: '07:00', label: '07:00 AM' },
  { value: '07:30', label: '07:30 AM' },
  { value: '08:00', label: '08:00 AM' },
  { value: '08:30', label: '08:30 AM' },
  { value: '09:00', label: '09:00 AM' },
  { value: '09:30', label: '09:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '01:00 PM' },
  { value: '13:30', label: '01:30 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '14:30', label: '02:30 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '15:30', label: '03:30 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '16:30', label: '04:30 PM' },
  { value: '17:00', label: '05:00 PM' },
  { value: '17:30', label: '05:30 PM' },
  { value: '18:00', label: '06:00 PM' },
  { value: '18:30', label: '06:30 PM' },
  { value: '19:00', label: '07:00 PM' },
  { value: '19:30', label: '07:30 PM' },
  { value: '20:00', label: '08:00 PM' },
  { value: '20:30', label: '08:30 PM' },
  { value: '21:00', label: '09:00 PM' },
  { value: '21:30', label: '09:30 PM' },
  { value: '22:00', label: '10:00 PM' },
  { value: '22:30', label: '10:30 PM' },
  { value: '23:00', label: '11:00 PM' },
  { value: '23:30', label: '11:30 PM' },
];

// Duration options for end time (relative to start time)
export const durationOptions = [
  { value: '30', label: '30m', hours: 0, minutes: 30 },
  { value: '60', label: '1h', hours: 1, minutes: 0 },
  { value: '90', label: '1h 30m', hours: 1, minutes: 30 },
  { value: '120', label: '2h', hours: 2, minutes: 0 },
  { value: '150', label: '2h 30m', hours: 2, minutes: 30 },
  { value: '180', label: '3h', hours: 3, minutes: 0 },
  { value: '210', label: '3h 30m', hours: 3, minutes: 30 },
  { value: '240', label: '4h', hours: 4, minutes: 0 },
  { value: '270', label: '4h 30m', hours: 4, minutes: 30 },
  { value: '300', label: '5h', hours: 5, minutes: 0 },
  { value: '330', label: '5h 30m', hours: 5, minutes: 30 },
  { value: '360', label: '6h', hours: 6, minutes: 0 },
  { value: '390', label: '6h 30m', hours: 6, minutes: 30 },
  { value: '420', label: '7h', hours: 7, minutes: 0 },
];

// Function to format timezone display
export const formatTimezone = (tz: string) => {
  const now = dayjs().tz(tz);
  const offset = now.format('Z'); // Format: +08:00
  const city = tz.split('/').pop()?.replace(/_/g, ' ');
  return { offset, city };
};

export const UPSTASH_BULK_MESSAGE_URL = `${env.NEXT_PUBLIC_URL}/api/upstash`;
export const UPSTASH_CHATBOT_SESSION_REPLY_URL = `${env.NEXT_PUBLIC_URL}/api/upstash/chatbot-reply`;
export const UPSTASH_BULK_GUEST_UPLOAD_URL = `${env.NEXT_PUBLIC_URL}/api/upstash/bulk-guest-upload`;
export const TWILIO_STATUS_WEBHOOK_URL = `${env.NEXT_PUBLIC_URL}/api/twilio/[organizationId]/status-webhook`;
export const TWILIO_INCOMING_MESSAGE_URL = `${env.NEXT_PUBLIC_URL}/api/twilio/[organizationId]/incoming-message`;

export const TWILIO_TEMPLATE_SUGGESTIONS = [
  {
    title: 'Invitación de Boda',
    content:
      '¡Hola {{1}}! Nos complace invitarte a la boda de {{2}}. La ceremonia comienza a las {{3}} en {{4}}. Por favor llega 15 minutos antes. Responde "sí" para confirmar tu asistencia.',
    sample: 'Familia García, Carlos & María, 17:00, Hotel Las Palmas',
  },
  {
    title: 'Recordatorio de RSVP con Variables',
    content:
      '¡Hola {{guest.name}}! Este es un recordatorio para confirmar tu asistencia a la boda de {{event.title}} el {{event.date}}. Por favor, háznoslo saber respondiendo a este mensaje.',
    sample: '',
  },
  {
    title: 'Información de Ubicación',
    content:
      '¡Hola {{guest.name}}! Aquí están las direcciones para la boda de {{event.title}}: {{event.location}}. La ceremonia comienza a las {{event.time}}. Si tienes alguna pregunta, ¡háznoslo saber!',
    sample: '',
  },
  {
    title: 'Recordatorio de Código de Vestimenta',
    content:
      '¡Hola {{guest.name}}! Solo un recordatorio de que el código de vestimenta para la boda de {{event.title}} es {{1}}. Nos vemos este {{event.date}} en {{event.location}}. ¡Esperamos verte pronto!',
    sample: 'formal/etiqueta',
  },
  {
    title: 'Confirmación de Mesa',
    content:
      '¡Hola {{guest.name}}! Te confirmamos que estarás en la {{guest.table}} para la boda de {{event.title}}. La recepción comienza a las {{1}} en {{event.location}}. ¡Esperamos verte pronto!',
    sample: '19:00',
  },
];
