import { NextResponse } from 'next/server';
import { MessageDeliveryStatus } from '@prisma/client';
import { UsageLogger } from '@/server/services/usage/usage-logger';
import { TwilioService } from '@/server/services/twilio';
import { db } from '@/server/db';
import { TWILIO_STATUS_WEBHOOK_URL } from '@/lib/constants';
import { getRawBody } from '@/lib/utils';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing to access raw body
  },
};

// Define the expected status update payload from Twilio
interface TwilioStatusUpdate {
  ChannelPrefix: string;
  ApiVersion: string;
  MessageStatus: 'sent' | 'delivered' | 'read' | 'failed';
  SmsSid: string;
  SmsStatus: string;
  ChannelInstallSid: string;
  To: string;
  From: string;
  MessageSid: string;
  AccountSid: string;
  ChannelToAddress: string;
  StructuredMessage?: string;
}

export async function POST(request: Request, { params }) {
  try {
    const { organizationId } = params; // <-- Get the dynamic value using destructuring

    // Read the raw body ONCE
    const rawBody = await getRawBody(request);

    const twilioService = new TwilioService({ organizationId, db });

    // Validate Twilio request signature using the raw body
    const isValidRequest = await twilioService.isValidTwilioRequest(
      request, // Pass the original request for headers
      TWILIO_STATUS_WEBHOOK_URL,
      rawBody // Pass the raw body string
    );

    if (!isValidRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the incoming form data from the raw body string
    // const formData = await request.formData(); // Don't read body again
    const formData = new URLSearchParams(rawBody);

    // Convert formData (URLSearchParams) to a properly typed object
    const data: TwilioStatusUpdate = {
      ChannelPrefix: formData.get('ChannelPrefix') as string,
      ApiVersion: formData.get('ApiVersion') as string,
      MessageStatus: formData.get('MessageStatus') as TwilioStatusUpdate['MessageStatus'],
      SmsSid: formData.get('SmsSid') as string,
      SmsStatus: formData.get('SmsStatus') as string,
      ChannelInstallSid: formData.get('ChannelInstallSid') as string,
      To: formData.get('To') as string,
      From: formData.get('From') as string,
      MessageSid: formData.get('MessageSid') as string,
      AccountSid: formData.get('AccountSid') as string,
      ChannelToAddress: formData.get('ChannelToAddress') as string,
    };

    // Update the message delivery status in the database
    const updateDto: {
      status?: MessageDeliveryStatus;
      deliveredAt?: Date;
      sentAt?: Date;
      readAt?: Date;
      errorMessage?: string;
    } = {};

    console.log('Twilio status webhook received:', data.MessageStatus);
    if (data.MessageStatus === 'delivered') {
      updateDto.status = MessageDeliveryStatus.DELIVERED;
      updateDto.deliveredAt = new Date();
      const usageLogger = new UsageLogger({
        db,
      });
      await usageLogger.recordMessageConsumption(data.MessageSid);
    } else if (data.MessageStatus === 'sent') {
      updateDto.status = MessageDeliveryStatus.SENT;
      updateDto.sentAt = new Date();
    } else if (data.MessageStatus === 'failed') {
      updateDto.status = MessageDeliveryStatus.FAILED;
      updateDto.errorMessage = `Failed to send message: ${data.SmsStatus}`;
    } else if (data.MessageStatus === 'read') {
      updateDto.status = MessageDeliveryStatus.READ;
      updateDto.readAt = new Date();
    } else if (data.MessageStatus === 'undelivered') {
      // Failed to enable retry logic for undelivered messages
      updateDto.status = MessageDeliveryStatus.FAILED;
      updateDto.errorMessage = `Failed to send message: ${data.SmsStatus}.`;
      // TODO: Lo probé y no funcionaba hacer el retry luego luego, mejor lo marcamos como error
      // const bulkMessagesService = new BulkMessagesService({
      //   db,
      //   auth: { userId: '', role: UserRole.ORG_MEMBER },
      // });
      // await bulkMessagesService.retryMessageDelivery(data.MessageSid, data.SmsSid);
    } else {
      // TODO: Revisar si es necesario manejar este caso, error para poder re-intentar el envío
      updateDto.errorMessage = `Unknown status: ${data.MessageStatus}`;
      console.log('Unknown status:', data);
    }

    // Using updateMany instead of update because update throws P2025 error when no records are found
    // This way we gracefully handle cases where the message delivery record doesn't exist yet
    await db.messageDelivery.updateMany({
      where: { messageSid: data.MessageSid },
      data: { ...updateDto },
    });

    // Twilio expects a 200 response
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
