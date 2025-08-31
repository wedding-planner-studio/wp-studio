import { TWILIO_INCOMING_MESSAGE_URL } from '@/lib/constants';
import { NextResponse } from 'next/server';
import { TwilioMessage } from '@/server/services/twilio/twilio.schema';
import { db } from '@/server/db';
import { TwilioService } from '@/server/services/twilio';
import { ChatSessionHandler } from '@/server/services/chatbot/chat-session-handler';
import { getRawBody } from '@/lib/utils';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing to access raw body
  },
};

export async function POST(request: Request, { params }) {
  try {
    const { organizationId } = await params; // <-- Get the dynamic value using destructuring

    // Read the raw body ONCE
    const rawBody = await getRawBody(request);

    const twilioService = new TwilioService({ organizationId, db });

    // Validate Twilio request signature using the raw body
    const isValidRequest = await twilioService.isValidTwilioRequest(
      request, // Pass the original request for headers
      TWILIO_INCOMING_MESSAGE_URL,
      rawBody // Pass the raw body string
    );
    if (!isValidRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the incoming form data from the raw body string
    // const formData = await request.formData(); // Don't read body again
    const formData = new URLSearchParams(rawBody);

    // Convert formData (URLSearchParams) to a plain object
    const data = Object.fromEntries(formData.entries()) as {} as TwilioMessage;

    const hasText = !!data.Body?.trim();
    const hasMedia = data.NumMedia && parseInt(data.NumMedia) > 0;
    if (!data.From || (!hasText && !hasMedia)) {
      console.warn('Missing From or content (text or media) in Twilio message');
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Initialize the chatbot service
    const chatSessionHandler = new ChatSessionHandler({ db, organizationId });

    // Handle audio messages
    if (data.MediaContentType0?.startsWith('audio/')) {
      await chatSessionHandler.handleIncomingAudio(
        data as TwilioMessage & { MediaContentType0: string }
      );
    } else {
      // Process the message and get a response
      await chatSessionHandler.handleIncomingMessage(data);
    }

    // Do not Send the response back to the user via Twilio, messages are queued for reply
    // if (chatbotResponse) {
    //   try {
    //     // Use Twilio API to send response rather than TwiML

    //     await twilioService.sendWhatsAppMessage({
    //       to: data.From, // The user's WhatsApp number
    //       from: data.To, // The Twilio WhatsApp number
    //       body: chatbotResponse,
    //     });
    //   } catch (sendError) {
    //     console.error('Error sending response via Twilio:', sendError);
    //   }
    // }

    // Return empty TwiML response (required by Twilio)
    // We're already sending the response via the API call above
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error processing incoming message:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
