import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { timeOptions } from '../constants';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { parsePhoneNumberWithError, type CountryCode } from 'libphonenumber-js';

dayjs.extend(duration);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const noop = () => {
  return;
};

function fixLegacyMexicoPrefix(input: string): string {
  return input.startsWith('+521') ? '+52' + input.slice(4) : input;
}

// Strip all characters except + and digits
function sanitizePhoneNumber(input?: string | null): string {
  if (!input) return '';
  return input.replace(/[^\d+]/g, '');
}

export function normalizePhone(
  input: string,
  defaultCountry: CountryCode = 'MX',
  throwError = true
): string {
  if (!input) return '';
  const phoneNumber = parsePhoneNumber(input, defaultCountry);
  if (phoneNumber && phoneNumber.isValid()) {
    return phoneNumber.number; // E.164 format
  }

  if (throwError) {
    throw new Error('Invalid phone number');
  }
  return input;
}

export function parsePhoneNumber(input?: string | null, defaultCountry: CountryCode = 'MX') {
  if (!input) return null;
  const sanitized = sanitizePhoneNumber(input);
  const fixed = fixLegacyMexicoPrefix(sanitized);

  return parsePhoneNumberWithError(fixed, defaultCountry);
}

export const formatPhoneNumber = (phoneNumber: string) => {
  const parsed = parsePhoneNumber(phoneNumber);
  if (parsed) {
    return parsed.formatInternational();
  }
  return phoneNumber;
};

export const removeSpecialCharacters = (str: string) => {
  // First, normalize accented characters to their basic form
  const normalized = str
    .normalize('NFD')
    // Remove diacritical marks
    .replace(/[\u0300-\u036f]/g, '')
    // Replace any remaining non-alphanumeric chars with underscore
    .replace(/[^a-zA-Z0-9.]/g, '_')
    // Replace multiple consecutive underscores with a single one
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '');

  return normalized;
};

export const fromCamelCaseToReadable = (str: string) => {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, function (str) {
    return str.toUpperCase();
  });
};

export const fromJsTypeToReadable = (type: string) => {
  switch (type) {
    case 'string':
      return 'Text';
    case 'number':
      return 'Number';
    default:
      return type;
  }
};

export const shortenName = (name: string): string => {
  if (!name) return '';

  const parts = name.trim().split(' ').filter(Boolean);

  // No parts after filtering
  if (parts.length === 0) return name;

  // Only one part (first name only)
  if (parts.length === 1) return parts[0]!;

  // First name + initials for all other parts
  const firstName = parts[0]!;

  // Get initials for all middle and last names
  const otherPartsInitials = parts
    .slice(1)
    .map(part => part?.charAt(0) ?? '')
    .join(' ');

  return `${firstName} ${otherPartsInitials}`;
};

export const shortenCoupleName = (name1: string, name2: string) => {
  return `${shortenName(name1)} & ${shortenName(name2)}`;
};

export const getNotionizedCharacter = (name: string) => {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&backgroundRotation=360,40,50&gestureProbability=30&backgroundColor=c0aede,d1d4f9,ffd5dc`;
};

export const getRawBody = async (request: Request): Promise<string> => {
  // Copy request to enable re-reading the body
  const req = request.clone();
  const reader = req.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const bodyBuffer = Buffer.concat(chunks);
  return bodyBuffer.toString('utf-8');
};

// Function to generate end time options with durations based on start time
export const generateEndTimeOptions = (startTime: string, startDate?: string, endDate?: string) => {
  if (!startTime || !startDate) return timeOptions;

  const startDateTime = dayjs(`${startDate} ${startTime}`);

  // Find the index of the current time option
  const startIndex = timeOptions.findIndex(option => option.value === startTime);
  // Create a new array starting from the next time option and ending right before the current time
  const sortedTimeOptions =
    startIndex === -1
      ? timeOptions
      : [
          ...timeOptions.slice(startIndex + 1), // From next option to end
          ...timeOptions.slice(0, startIndex), // From start to current option (exclusive)
        ];

  // Create new time options with duration information
  return sortedTimeOptions.map(option => {
    // For each time option, create a datetime using the appropriate date
    let endDateTime = dayjs(`${startDate} ${option.value}`);

    // If end time is before start time on the same day, add a day
    if (endDateTime.isBefore(startDateTime)) {
      endDateTime = endDateTime.add(1, 'day');
    }

    // If endDate is provided and different from startDate, use it instead
    if (endDate && endDate !== startDate) {
      endDateTime = dayjs(`${endDate} ${option.value}`);

      // Calculate days difference
      const daysDiff = dayjs(endDate).diff(dayjs(startDate), 'day');
      if (daysDiff > 0 && endDateTime.isBefore(startDateTime)) {
        // If we're spanning multiple days and the end time is still before start time,
        // we need to add the remaining days to get the correct duration
        endDateTime = endDateTime.add(daysDiff, 'day');
      }
    }

    // Calculate duration in minutes
    const durationMinutes = endDateTime.diff(startDateTime, 'minute');

    // Format the duration text
    let durationText = '';
    if (durationMinutes < 60) {
      durationText = `${durationMinutes}min`;
    } else if (durationMinutes % 60 === 0) {
      const hours = durationMinutes / 60;
      if (hours < 24) {
        durationText = `${hours}h`;
      } else {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        durationText = remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
      }
    } else {
      const totalHours = Math.floor(durationMinutes / 60);
      if (totalHours < 24) {
        const mins = durationMinutes % 60;
        durationText = `${totalHours}h ${mins}min`;
      } else {
        const days = Math.floor(totalHours / 24);
        const remainingHours = totalHours % 24;
        const mins = durationMinutes % 60;
        durationText =
          mins > 0
            ? `${days}d ${remainingHours}h ${mins}min`
            : remainingHours > 0
              ? `${days}d ${remainingHours}h`
              : `${days}d`;
      }
    }

    return {
      ...option,
      label: `${option.label} (${durationText})`,
      durationMinutes,
    };
  });
};
