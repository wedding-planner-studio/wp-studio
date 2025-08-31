import { SLACK_CHANNEL_ID_WAITLIST } from '@/lib/constants';
import { SlackNotificationOptions } from '../slack-notification';

export const waitlistEntryTemplate = (
  contact: string,
  phone?: string
): SlackNotificationOptions => {
  return {
    channel: SLACK_CHANNEL_ID_WAITLIST,
    icon_emoji: ':envelope:',
    attachments: [
      {
        pretext: 'New waitlist entry',
        text: contact,
      },
      {
        text: `Phone: ${phone}`,
      },
    ],
  };
};
