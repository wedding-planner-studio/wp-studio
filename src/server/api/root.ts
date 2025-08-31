import { createCallerFactory, createTRPCRouter } from '@/server/api/trpc';
import { organizationRouter } from './routers/organization';
import { eventsRouter } from './routers/events';
import { eventQuestionsRouter } from './routers/eventQuestions';
import { venuesRouter } from './routers/venues';
import { whatsappRouter } from './routers/whatsapp';
import { bulkMessagesRouter } from './routers/bulkMessages';
import { mediaFilesRouter } from './routers/mediaFile';
import { userRouter } from './routers/userRouter';
import { layoutRouter } from './routers/layout';
import { guestsRouter } from './routers/guests';
import { guestRequestsRouter } from './routers/guestRequests';
import { subscriptionRouter } from './routers/subscription';
import { usageRouter } from './routers/usage';
import { featureFlagsRouter } from './routers/featureFlags';
import { featuresRouter } from './routers/features';
import { agentDebuggerRouter } from './routers/agentDebugger';
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  events: eventsRouter,
  eventQuestions: eventQuestionsRouter,
  venues: venuesRouter,
  whatsapp: whatsappRouter,
  bulkMessages: bulkMessagesRouter,
  user: userRouter,
  layout: layoutRouter,
  guests: guestsRouter,
  mediaFiles: mediaFilesRouter,
  guestRequests: guestRequestsRouter,
  subscription: subscriptionRouter,
  usage: usageRouter,
  featureFlags: featureFlagsRouter,
  // SUDO
  features: featuresRouter,
  agentDebugger: agentDebuggerRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
