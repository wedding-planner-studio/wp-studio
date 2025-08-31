export abstract class Notification {
  abstract type: string;
  abstract _send(): Promise<void>;
  protected scheduledAt?: string;
  protected retries?: number;
  /**
   * Send the notification
   * Eventually we can add retry/scheduled logic here
   */
  async send(): Promise<void> {
    try {
      await this._send();
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // To be used as Notification.scheduled('...').send()
  scheduled(time: string) {
    this.scheduledAt = time;
    return this;
  }

  // To be used as Notification.withRetries(3).send()
  withRetries(retries: number) {
    this.retries = retries;
    return this;
  }
}
