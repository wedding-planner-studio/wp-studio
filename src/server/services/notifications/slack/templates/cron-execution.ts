import { SLACK_CHANNEL_ID_CRONS } from '@/lib/constants';
import { SlackNotificationOptions } from '../slack-notification';

export const cronExecutionTemplate = (
  message: string,
  cron_name?: string
): SlackNotificationOptions => {
  return {
    channel: SLACK_CHANNEL_ID_CRONS,
    icon_emoji: ':robot_face:',
    attachments: [
      {
        pretext: cron_name ? `Cron execution: \`${cron_name}\`` : 'Cron execution',
        text: message,
      },
    ],
  };
};
