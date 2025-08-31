import { z } from 'zod';
import { createTRPCRouter, privateProcedure, enforcePermission } from '@/server/api/trpc';
import { LayoutElementType, TableShape, ElementCornerStyle, GuestStatus } from '@prisma/client';

const LayoutElementInputSchema = z.object({
  id: z.string().cuid().optional(), // Optional for creation
  type: z.nativeEnum(LayoutElementType),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional().default(0),
  label: z.string().optional().nullable(),
  opacity: z.number().optional().default(1),
  // Table-specific
  shape: z.nativeEnum(TableShape).optional().nullable(),
  numberOfSeats: z.number().int().optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(), // Add color validation (hex code)
  cornerStyle: z.nativeEnum(ElementCornerStyle).optional().nullable(), // Add cornerStyle validation
});

const LayoutInputSchema = z.object({
  eventId: z.string().cuid(),
  elements: z.array(LayoutElementInputSchema),
  backgroundUrl: z.string().optional().nullable(),
});

// Define schema for a single assignment
const AssignmentSchema = z.object({
  guestId: z.string(),
  layoutElementId: z.string(),
  seatIndex: z.number().nullable().optional(), // Assuming seatIndex might not always be present
});

// Define the input schema for the mutation
const AssignmentsInputSchema = z.object({
  eventId: z.string(),
  assignments: z.array(AssignmentSchema),
  unassignedGuestIds: z.array(z.string()).optional(), // Add optional array for unassigned IDs
});

export const layoutRouter = createTRPCRouter({
  /**
   * Get Layout by Event ID
   * Fetches the layout structure including all elements for a specific event.
   */
  getLayoutByEventId: privateProcedure
    .use(enforcePermission('seatMap', 'read'))
    .input(z.object({ eventId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      // TODO: Add permission check? Should any logged-in user see any layout?
      // Perhaps check if user is associated with the event's organization or is an EVENT_MANAGER for this event.
      return ctx.db.layout.findUnique({
        where: { eventId: input.eventId },
        include: {
          elements: true, // Include all layout elements
          lastUpdatedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
    }),

  /**
   * Upsert Layout
   * Creates or updates the layout for a given event.
   * This replaces the entire set of layout elements for the event.
   */
  upsertLayout: privateProcedure
    .use(enforcePermission('seatMap', 'update'))
    .input(LayoutInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { eventId, elements, backgroundUrl } = input;

      // TODO: Add validation: Ensure the user has rights to modify this specific event's layout.

      // Use a transaction to ensure atomicity
      return ctx.db.$transaction(async tx => {
        // Find or create the layout container
        const layout = await tx.layout.upsert({
          where: { eventId },
          create: { eventId, backgroundUrl, lastUpdatedById: ctx.auth.userId },
          update: { eventId, backgroundUrl, lastUpdatedById: ctx.auth.userId },
          select: { id: true }, // Select only the id
        });

        // --- Start: Refined Element Upsert Logic ---

        // 1. Fetch Existing Element IDs
        const existingElements = await tx.layoutElement.findMany({
          where: { layoutId: layout.id },
          select: { id: true },
        });
        const existingElementIds = new Set(existingElements.map(el => el.id));

        // 2. Process Incoming Elements (Upsert Logic)
        const processedElementIds = new Set<string>();
        for (const element of elements) {
          // Prepare data, ensuring layoutId is set and id is handled correctly
          const elementData = {
            // Map all fields from input 'element' to Prisma model fields
            layoutId: layout.id,
            type: element.type,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            rotation: element.rotation,
            label: element.label,
            shape: element.shape,
            numberOfSeats: element.numberOfSeats,
            color: element.color,
            cornerStyle: element.cornerStyle,
            opacity: element.opacity,
          };

          if (element.id && existingElementIds.has(element.id)) {
            // --- UPDATE --- existing element
            await tx.layoutElement.update({
              where: { id: element.id },
              data: elementData,
            });
            processedElementIds.add(element.id); // Track updated ID
          } else {
            // --- CREATE --- new element (Prisma generates ID)
            const createdElement = await tx.layoutElement.create({
              data: elementData,
            });
            processedElementIds.add(createdElement.id); // Track created ID
          }
        }

        // 3. Identify Elements to Delete
        const elementIdsToDelete = [...existingElementIds].filter(
          id => !processedElementIds.has(id)
        );

        // 4. Handle Assignments for Deleted Elements (REMOVED - Handled by Prisma schema `onDelete: SetNull`)
        // if (elementIdsToDelete.length > 0) {
        //   await tx.guestAssignment.updateMany({
        //     where: { layoutElementId: { in: elementIdsToDelete } },
        //     data: { layoutElementId: null, seatIndex: null },
        //   });
        // }

        // 5. Delete Stale Elements (Prisma onDelete: SetNull will handle unassigning guests)
        if (elementIdsToDelete.length > 0) {
          await tx.layoutElement.deleteMany({
            where: { id: { in: elementIdsToDelete } },
          });
        }

        // --- End: Refined Element Upsert Logic ---

        // Refetch the updated layout with elements
        return tx.layout.findUniqueOrThrow({
          where: { id: layout.id },
          include: { elements: true },
        });
      });
    }),

  /**
   * Get Assignments by Event ID
   * Fetches all guest assignments for a specific event.
   */
  getAssignmentsByEventId: privateProcedure
    .use(enforcePermission('seatAssignment', 'read'))
    .input(z.object({ eventId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      // TODO: Add permission check similar to getLayoutByEventId

      // We need the layout elements to filter assignments by event
      const layout = await ctx.db.layout.findUnique({
        where: { eventId: input.eventId },
        select: { elements: { select: { id: true } } },
      });

      if (!layout) {
        return []; // No layout, so no assignments
      }

      const layoutElementIds = layout.elements.map(el => el.id);

      if (layoutElementIds.length === 0) {
        return []; // No elements in the layout
      }

      const assignments = await ctx.db.guestAssignment.findMany({
        where: {
          layoutElementId: { in: layoutElementIds },
        },
        include: {
          guest: { select: { id: true, name: true, status: true } }, // Include guest info
          layoutElement: { select: { id: true, label: true, type: true } }, // Include element info
        },
      });

      return assignments.filter(a => a.guest.status !== GuestStatus.INACTIVE);
    }),

  /**
   * Upsert Assignments
   * Creates or updates guest assignments for an event.
   * This replaces all existing assignments for the specified guests.
   */
  upsertAssignments: privateProcedure
    .use(enforcePermission('seatAssignment', 'update'))
    .input(AssignmentsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { eventId, assignments } = input;
      const unassignedGuestIds = input.unassignedGuestIds ?? []; // Get the new list, default to empty array

      // TODO: Add validation: Ensure the user has rights to modify assignments for this specific event.
      // TODO: Add validation: Ensure guestIds belong to the eventId
      // TODO: Add validation: Ensure layoutElementIds belong to the event's layout and are of type TABLE

      // Validate that the event exists (optional but good practice)
      const eventExists = await ctx.db.event.findUnique({
        where: { id: eventId },
        select: { id: true },
      });
      if (!eventExists) {
        throw new Error('Event not found');
      }

      const guestIds = assignments.map(a => a.guestId);

      return ctx.db.$transaction(async tx => {
        // Combine all guest IDs that need their assignments potentially cleared
        const guestIdsToClear = [...new Set([...guestIds, ...unassignedGuestIds])];

        // Delete existing assignments for all guests being modified (assigned or unassigned)
        if (guestIdsToClear.length > 0) {
          await tx.guestAssignment.deleteMany({
            where: {
              guestId: { in: guestIdsToClear }, // Use the combined list
              // Optionally add constraint: AND layoutElement.layout.eventId = eventId if needed
            },
          });
        }

        // Create the new assignments if any are provided
        if (assignments.length > 0) {
          await tx.guestAssignment.createMany({
            data: assignments.map(a => ({
              guestId: a.guestId,
              layoutElementId: a.layoutElementId,
              seatIndex: a.seatIndex,
            })),
          });
        }

        // Refetch all assignments for the event to return the current state
        const layout = await tx.layout.findUnique({
          where: { eventId: eventId },
          select: { elements: { select: { id: true } } },
        });
        const layoutElementIds = layout?.elements.map(el => el.id) ?? [];

        if (layoutElementIds.length === 0) {
          return [];
        }

        return tx.guestAssignment.findMany({
          where: { layoutElementId: { in: layoutElementIds } },
          include: {
            guest: { select: { id: true, name: true } },
            layoutElement: { select: { id: true, label: true, type: true } },
          },
        });
      });
    }),
});
