import {
  EventRequiredGuestConfirmation,
  EventRequiredGuestConfirmationOption,
  PrismaClient,
} from '@prisma/client';
import { Redis } from '@upstash/redis';
import { GuestContext } from '../chatbot.service';

export type GuestContextHash = Map<
  string, // <-- Event ID
  {
    guest: GuestContext;
    event: {
      name: string;
      hosts: string;
      additionalConfirmations: (EventRequiredGuestConfirmation & {
        options: EventRequiredGuestConfirmationOption[];
      })[];
    };
  }
>;

export abstract class GuestTool<T extends Record<string, any>, R = string> {
  protected readonly toolCallCache: Redis;
  abstract isReadOnly?: boolean;
  abstract name: string;
  abstract description: string;
  abstract input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  abstract _execute(eventId: string, guestId: string, input: T): Promise<R>;

  abstract simulate(eventId: string, guestId: string, input: T): Promise<R>;

  constructor(
    protected readonly db: PrismaClient,
    protected readonly GuestContextHash: GuestContextHash,
    protected readonly isTestMode = false,
    protected readonly isLastTool = false
  ) {
    this.toolCallCache = Redis.fromEnv();
  }

  getGuestMetadata(eventId: string, input: T): { guestId: string; guestName: string } {
    if (!this.GuestContextHash.has(eventId)) {
      console.log(this.GuestContextHash);
      throw new Error(
        `Guest context not found for event ${eventId}. Be sure to use the correct Event ID, not the guest ID.`
      );
    }
    const guest = this.GuestContextHash.get(eventId)?.guest;
    if (!guest) {
      console.log(this.GuestContextHash);
      throw new Error(`Guest context not found for event ${eventId} for this guest`);
    }

    let { id: guestId, name: guestName } = guest;

    if ('guestId' in input) {
      // If tool is called with a different guest ID than the one in the context
      // We need to look up the guest within the guest's group
      if (guestId !== input.guestId) {
        const guestFromGroup = this.GuestContextHash.get(eventId)?.guest?.guestGroup?.guests.find(
          g => g.id === input.guestId
        );
        if (!guestFromGroup) {
          throw new Error(`Guest context not found for event ${eventId} for this guest`);
        }
        console.log(
          `[Chatbot] Using guest (${guestFromGroup.name}) ${guestFromGroup.id} (from group) instead of main guest ${guestId}`
        );
        guestId = guestFromGroup.id;
        guestName = guestFromGroup.name;
      }
    }
    return { guestId, guestName };
  }

  async execute(eventId: string, input: T): Promise<R> {
    const { guestId, guestName } = this.getGuestMetadata(eventId, input);

    if (!this.isReadOnly && this.isTestMode) {
      console.log(
        `[Chatbot Test Mode] Tool '${this.name}' Simulating for event ${eventId}. Guest: ${guestId}. Input: ${JSON.stringify(input, null, 2)}`
      );
      return this.simulate(eventId, guestId, input);
    }

    // Check cache if read-only
    let cachedResult: R | null = null;
    if (this.isReadOnly) {
      cachedResult = await this.getCachedResult(eventId, guestId);
      if (cachedResult) {
        console.log(`[Chatbot Cache] Tool '${this.name}' Cache Hit for event ${eventId}`);
        return cachedResult;
      }
    }

    const result = await this._execute(eventId, guestId, input);

    // Cache result on Read, delete on Write
    if (this.isReadOnly) {
      this.cacheResult(eventId, guestId, result);
    } else {
      // Delete cache if write
      await this.toolCallCache.del(this.getCacheKey(eventId));
    }
    return result;
  }

  async getCachedResult(eventId: string, guestId: string): Promise<R | null> {
    const cacheKey = this.getCacheKey(eventId);
    const eventCashedResult = await this.toolCallCache.get(cacheKey);
    console.log(
      `[Chatbot Cache] Event cached result: ${JSON.stringify(eventCashedResult, null, 2)}`
    );
    if (eventCashedResult) {
      return eventCashedResult[`${this.name}:${guestId}`];
    }
    return null;
  }

  toTool() {
    const tool = {
      name: this.name,
      description: this.description,
      input_schema: this.input_schema,
    };
    // This will ensure we're caching tool definition
    if (this.isLastTool) {
      Object.assign(tool, { cache_control: { type: 'ephemeral' } });
    }
    return tool;
  }

  getCacheKey(eventId: string): string {
    return `chatbot:eventId:${eventId}`;
  }

  /**
   * Cache the result of a tool call for a specific guest
   * @param eventId - The event ID
   * @param result - The result of the tool call
   * "Value" stored as { 'toolName:guestId': result } for every key
   */
  async cacheResult(eventId: string, guestId: string, result: R): Promise<void> {
    const cacheKey = this.getCacheKey(eventId);
    this.toolCallCache.set(
      cacheKey,
      {
        ...((await this.toolCallCache.get(cacheKey)) ?? {}),
        [`${this.name}:${guestId}`]: result,
      },
      {
        ex: 60 * 60 * 24, // 1 day
      }
    );
  }
}
