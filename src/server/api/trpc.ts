/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';

import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import { hasPermission, Section, Role, Action } from '@/lib/permissions';

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { userId } = await auth();

  return {
    db,
    auth: {
      userId,
    },
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

const isAuthed = t.middleware(async ({ ctx, next }) => {
  const { auth } = ctx;
  if (!auth?.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const user = await db.user.findUnique({
    where: {
      id: auth.userId,
    },
    select: {
      role: true,
    },
  });

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      // infers that auth is non-nullable to downstream resolvers
      auth: {
        userId: auth.userId,
        role: user.role,
      },
    },
  });
});

export const privateProcedure = t.procedure.use(isAuthed);

export const enforcePermission = (section: Section, action: Action) =>
  t.middleware(({ ctx, next }) => {
    // Assert the context type expected after isAuthed
    // This places the responsibility on the developer to use this middleware correctly
    const authWithRole = ctx.auth as { userId: string; role: Role };

    // Defensive check (isAuthed should prevent this state)
    if (!authWithRole?.userId || !authWithRole.role) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication with role required.' });
    }

    const role = authWithRole.role; // Type is now correctly inferred

    if (!hasPermission(role, section, action)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `We're sorry, but you don't have permission to perform this action.`,
      });
    }

    // Pass the correctly typed context down the chain
    return next({
      ctx: {
        ...ctx,
        auth: authWithRole, // Ensure downstream procedures see the role
      },
    });
  });
