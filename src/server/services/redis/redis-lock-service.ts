// src/server/services/redis-lock.service.ts
import { Redis } from '@upstash/redis';

export class RedisLockService {
  private redis: Redis;

  private prefix: string;

  constructor(prefix: string) {
    this.redis = Redis.fromEnv();
    this.prefix = prefix;
  }

  /**
   * Execute logic safely with a lock
   * Automatically releases lock after function completes or errors
   * @returns Result of `fn()` or null if lock not acquired
   */
  async withLock<T>(
    resourceKey: string,
    ttlSeconds: number,
    fn: () => Promise<T>
  ): Promise<T | null> {
    const acquired = await this.acquire(resourceKey, ttlSeconds);
    if (!acquired) return null;

    try {
      return await fn();
    } finally {
      await this.release(resourceKey);
    }
  }

  /**
   * Get the lock key for a given resource
   * @param resourceKey Unique key for the lock (e.g. "chatbuffer:sessionId")
   * @returns The lock key
   */
  private getLockKey(resourceKey: string): string {
    return `${this.prefix}:${resourceKey}`;
  }

  /**
   * Try to acquire a lock for a given resource
   * @param resourceKey Unique key for the lock (e.g. "chatbuffer:sessionId")
   * @param ttlSeconds How long to hold the lock (default 10s)
   * @returns boolean indicating success
   */
  async acquire(resourceKey: string, ttlSeconds = 10): Promise<boolean> {
    const lockKey = this.getLockKey(resourceKey);
    const result = await this.redis.set(lockKey, '1', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  }

  /**
   * Release the lock for a given resource
   */
  async release(resourceKey: string): Promise<void> {
    const lockKey = this.getLockKey(resourceKey);
    await this.redis.del(lockKey);
  }

  /**
   * Check if a lock is currently held
   */
  async isLocked(resourceKey: string): Promise<boolean> {
    const lockKey = this.getLockKey(resourceKey);
    const exists = await this.redis.exists(lockKey);
    return exists === 1;
  }
}
