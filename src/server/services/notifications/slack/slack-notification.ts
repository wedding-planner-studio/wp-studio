import { env } from '@/env';
import { Notification } from '../notification';
import axios from 'axios';

interface SlackAttachment {
  pretext?: string;
  text?: string;
  // Add more attachment properties as needed
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  // Add more block properties as needed
}

interface SlackMetadata {
  event_type: string;
  event_payload: Record<string, unknown>;
}

export interface SlackNotificationOptions {
  // Required fields
  channel: string;

  // At least one of these is required
  text?: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
  markdown_text?: string;

  // Optional fields
  icon_emoji?: string;
  icon_url?: string;
  username?: string;
  thread_ts?: string;
  reply_broadcast?: boolean;
  link_names?: boolean;
  mrkdwn?: boolean;
  parse?: 'none' | 'full';
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  metadata?: SlackMetadata;
  as_user?: boolean;
}

export class SlackNotification extends Notification {
  type = 'slack';
  options: SlackNotificationOptions;
  private readonly url = 'https://slack.com/api/chat.postMessage';

  constructor(options: SlackNotificationOptions) {
    super();
    this.validateOptions(options);
    this.options = options;
  }

  private validateOptions(options: SlackNotificationOptions): void {
    if (!options.channel) {
      throw new Error('Channel is required for Slack notifications');
    }

    // Check if at least one content option is provided
    const hasContent = Boolean(
      options.text || options.attachments?.length || options.blocks?.length || options.markdown_text
    );

    if (!hasContent) {
      throw new Error(
        'At least one of text, attachments, blocks, or markdown_text must be provided'
      );
    }

    // Validate markdown_text is not used with blocks or text
    if (options.markdown_text && (options.blocks || options.text)) {
      throw new Error('markdown_text should not be used with blocks or text');
    }
  }

  async _send(): Promise<void> {
    const payload = {
      ...this.options,
    };

    // Remove undefined values to keep the payload clean
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    try {
      const response = await axios.post(this.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
        },
      });

      if (response.status !== 200) {
        throw new Error(`Failed to send Slack notification: ${response.statusText}`);
      }

      if (!response.data.ok) {
        throw new Error(`Failed to send Slack notification: ${response.data.error}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          `Failed to send Slack notification: ${error.response.data.error || error.message}`
        );
      }
      throw error;
    }
  }
}
