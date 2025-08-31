import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { MessageDeliveryStatus } from '@prisma/client';
import { TwilioService } from '@/server/services/twilio';
import { db } from '@/server/db';

interface BulkMessagePayload {
  templateName: string;
  templateSid: string;
  guestId: string;
  phone: string;
  variables: Record<string, string>;
  deliveryId: string;
}

async function handler(request: Request) {
  const rawPayload = JSON.parse(await request.json());
  try {
    // Ensure all required fields are present and of correct type
    const payload: BulkMessagePayload = {
      templateName: String(rawPayload.templateName),
      templateSid: String(rawPayload.templateSid),
      guestId: String(rawPayload.guestId),
      phone: String(rawPayload.phone),
      variables: rawPayload.variables || {},
      deliveryId: String(rawPayload.deliveryId),
    };

    // Fetch guest data to process variables
    const guest = await db.guest.findUnique({
      where: { id: payload.guestId },
      include: {
        event: {
          select: {
            organizationId: true,
          },
        },
      },
    });
    if (!guest || !guest.event?.organizationId) {
      throw new Error(`Invalid guest configuration. ID ${payload.guestId}`);
    }

    // Process variables, replacing guest placeholders with actual values
    const processedVariables: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload.variables)) {
      if (value.startsWith('{{guest.')) {
        const field = value.replace('{{guest.', '').replace('}}', '');
        const guestValue = guest[field as keyof typeof guest];
        processedVariables[key] = guestValue?.toString() ?? '';
      } else {
        processedVariables[key] = value;
      }
    }

    const twilioService = new TwilioService({
      organizationId: guest.event.organizationId,
      db,
    });
    const result = await twilioService.sendWhatsAppTemplate({
      to: payload.phone,
      templateSid: payload.templateSid,
      variables: processedVariables,
    });

    // Update delivery with success
    await db.messageDelivery.update({
      where: { id: payload.deliveryId },
      data: {
        status: MessageDeliveryStatus.SENT,
        sentAt: new Date(),
        messageSid: result.messageId,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error processing message:', error);

    // Update delivery with error if we have the deliveryId
    if (rawPayload.deliveryId) {
      await db.messageDelivery.update({
        where: { id: rawPayload.deliveryId },
        data: {
          status: MessageDeliveryStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Failed to send message',
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Make sure both signing keys are available
export const POST = verifySignatureAppRouter(handler);
