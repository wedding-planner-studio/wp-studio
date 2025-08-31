import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    QSTASH_TOKEN: z.string(),
    CDN_URL: z.string().url(),
    ANTHROPIC_API_KEY: z.string(),
    OPENAI_API_KEY: z.string(),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string(),
    TWILIO_TOKEN_ENCRYPTION_KEY: z.string(),
    SLACK_CLIENT_ID: z.string(),
    SLACK_CLIENT_SECRET: z.string(),
    SLACK_BOT_TOKEN: z.string(),
    CLERK_WEBHOOK_SIGNING_SECRET: z.string(),
    SESSION_REPLY_ENABLED: z.boolean(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    NEXT_PUBLIC_CDN_URL: z.string().url(),
    NEXT_PUBLIC_URL: z.string().url(),
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    QSTASH_TOKEN: process.env.QSTASH_TOKEN,
    CDN_URL: process.env.CDN_URL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    NEXT_PUBLIC_NODE_ENV: process.env.NEXT_PUBLIC_NODE_ENV,
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    TWILIO_TOKEN_ENCRYPTION_KEY: process.env.TWILIO_TOKEN_ENCRYPTION_KEY,
    SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID,
    SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET,
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    CLERK_WEBHOOK_SIGNING_SECRET: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    SESSION_REPLY_ENABLED: process.env.SESSION_REPLY_ENABLED === 'true',
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
