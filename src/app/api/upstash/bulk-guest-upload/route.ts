import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { db } from '@/server/db';
import { GuestStatus, GuestLanguage, GuestPriority } from '@prisma/client';
import { normalizePhone } from '@/lib/utils';
import { Redis } from '@upstash/redis';
import cuid from 'cuid';

export const runtime = 'nodejs';

const redis = Redis.fromEnv();

interface BulkGuestUploadPayload {
  eventId: string;
  organizationId: string;
  batchId: string;
  batchIndex: number;
  totalBatches: number;
  guests: Array<{
    name: string;
    phone: string;
    category: string;
    priority: GuestPriority;
    numberOfGuests: number;
    additionalGuestNames?: string;
    status: GuestStatus;
    table?: string;
    dietaryRestrictions?: string;
    notes?: string;
    inviter: string;
    preferredLanguage?: GuestLanguage;
  }>;
}

async function handler(request: Request) {
  const rawPayload = await request.json();

  try {
    const payload: BulkGuestUploadPayload = {
      eventId: String(rawPayload.eventId),
      organizationId: String(rawPayload.organizationId),
      batchId: String(rawPayload.batchId),
      batchIndex: Number(rawPayload.batchIndex),
      totalBatches: Number(rawPayload.totalBatches),
      guests: rawPayload.guests || [],
    };

    // Verify the event belongs to the organization
    const event = await db.event.findFirst({
      where: {
        id: payload.eventId,
        organizationId: payload.organizationId,
      },
    });

    if (!event) {
      throw new Error(`Event not found or access denied: ${payload.eventId}`);
    }

    // Process guests in this batch
    let batchProcessedCount = 0;
    let batchFailedCount = 0;

    // Split guests into single and grouped
    const singleGuests: {
      name: string;
      phone: string;
      category: string;
      priority: GuestPriority;
      numberOfGuests: number;
      status: GuestStatus;
      table?: string;
      dietaryRestrictions?: string;
      notes?: string;
      inviter: string;
      preferredLanguage?: GuestLanguage;
    }[] = [];
    const groupedGuests: {
      name: string;
      phone: string;
      category: string;
      priority: GuestPriority;
      numberOfGuests: number;
      additionalGuestNames?: string;
      status: GuestStatus;
      table?: string;
      dietaryRestrictions?: string;
      notes?: string;
      inviter: string;
      preferredLanguage?: GuestLanguage;
    }[] = [];

    for (const guest of payload.guests) {
      if (guest.numberOfGuests <= 1) {
        singleGuests.push(guest);
      } else {
        groupedGuests.push(guest);
      }
    }

    try {
      // Process single guests with createMany for efficiency
      if (singleGuests.length > 0) {
        const result = await db.guest.createMany({
          data: singleGuests.map(guest => ({
            name: guest.name,
            phone: normalizePhone(guest.phone, 'MX', false),
            category: guest.category,
            priority: guest.priority,
            status: guest.status,
            table: guest.table,
            dietaryRestrictions: guest.dietaryRestrictions,
            notes: guest.notes,
            inviter: guest.inviter,
            preferredLanguage: guest.preferredLanguage ?? GuestLanguage.SPANISH,
            eventId: payload.eventId,
            isPrimaryGuest: true,
            hasMultipleGuests: false,
            hasPlusOne: false,
          })),
          skipDuplicates: true, // Skip duplicates instead of failing
        });
        batchProcessedCount += result.count;
      }

      // Process grouped guests individually (they need groups created)
      for (const guest of groupedGuests) {
        try {
          await db.$transaction(async tx => {
            // Create the main guest
            const groupLeadId = cuid();
            const groupId = cuid();

            // Create the guest group
            await tx.guestGroup.create({
              data: {
                id: groupId,
                eventId: payload.eventId,
              },
            });

            await tx.guest.create({
              data: {
                id: groupLeadId,
                name: guest.name,
                phone: normalizePhone(guest.phone, 'MX', false),
                category: guest.category,
                priority: guest.priority,
                status: guest.status,
                table: guest.table,
                dietaryRestrictions: guest.dietaryRestrictions,
                notes: guest.notes,
                inviter: guest.inviter,
                preferredLanguage: guest.preferredLanguage ?? GuestLanguage.SPANISH,
                eventId: payload.eventId,
                isPrimaryGuest: true,
                hasMultipleGuests: guest.numberOfGuests > 1,
                hasPlusOne: false,
                guestGroupId: groupId,
                leadingGuestGroup: {
                  connect: {
                    id: groupId,
                  },
                },
              },
            });

            // Create additional guests if needed
            if (guest.numberOfGuests > 1) {
              const names = guest.additionalGuestNames?.split(',').map(name => name.trim()) ?? [];
              const additionalGuests = new Array(guest.numberOfGuests - 1)
                .fill(null)
                .map((_, i) => ({
                  eventId: payload.eventId,
                  guestGroupId: groupId,
                  isPrimaryGuest: false,
                  hasMultipleGuests: false,
                  hasPlusOne: false,
                  name: names[i] ?? `Guest ${i + 1}`,
                  status: GuestStatus.PENDING,
                  inviter: guest.inviter,
                  preferredLanguage: guest.preferredLanguage ?? GuestLanguage.SPANISH,
                  priority: guest.priority,
                  category: guest.category,
                }));

              await tx.guest.createMany({
                data: additionalGuests,
              });
            }
          });

          batchProcessedCount += guest.numberOfGuests; // Count all people created, not just the entry
        } catch (error) {
          batchFailedCount += guest.numberOfGuests; // Count all people that failed, not just the entry
          console.error(
            `Failed to create guest ${guest.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    } catch (error) {
      // Calculate total people in this batch that failed
      const totalPeopleInBatch = payload.guests.reduce(
        (total, guest) => total + guest.numberOfGuests,
        0
      );
      batchFailedCount += totalPeopleInBatch - batchProcessedCount;
      console.error(
        `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Invalidate the event cache
    await redis.del(`chatbot:eventId:${payload.eventId}`);

    return NextResponse.json({
      success: true,
      batchId: payload.batchId,
      batchIndex: payload.batchIndex,
      processedInBatch: batchProcessedCount,
      failedInBatch: batchFailedCount,
      isComplete: true, // Always complete since we're not tracking status
    });
  } catch (error) {
    console.error('Error processing bulk guest upload batch:', error);

    return NextResponse.json(
      {
        error: 'Failed to process bulk guest upload batch',
        details: error instanceof Error ? error.message : 'Unknown error',
        batchId: rawPayload.batchId,
        batchIndex: rawPayload.batchIndex,
      },
      { status: 500 }
    );
  }
}

export const POST = verifySignatureAppRouter(handler);
