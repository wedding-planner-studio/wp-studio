import { Client } from '@upstash/qstash';
import { env } from '@/env';

interface BulkMessageRequest<T> {
  url: string;
  payload: T[];
  templateName: string;
  templateSid: string;
  delayBetweenMessages?: number;
  formatter: (payload: T) => Record<string, any>;
}

export class QstashService {
  private readonly client: Client;

  DEFAULT_DELAY_BETWEEN_MESSAGES = 1;

  constructor() {
    this.client = new Client({
      token: env.QSTASH_TOKEN!,
    });
  }

  async addToQueue<T>({
    url,
    payload,
    templateName,
    templateSid,
    delayBetweenMessages = this.DEFAULT_DELAY_BETWEEN_MESSAGES,
    formatter,
  }: BulkMessageRequest<T>) {
    return this.client.batchJSON(
      payload.map((delivery, index) => ({
        url,
        body: JSON.stringify({
          templateName,
          templateSid,
          ...(formatter ? formatter(delivery) : delivery),
        }),
        delay: `${BigInt(index * delayBetweenMessages)}s`,
      }))
    );
  }

  async scheduleMessage(
    url: string,
    payload: Record<string, any>,
    delaySeconds: number,
    deduplicationId?: string
  ) {
    return this.client.publishJSON({
      url,
      delay: `${BigInt(delaySeconds)}s`,
      body: payload,
      deduplicationId,
    });
  }
}
