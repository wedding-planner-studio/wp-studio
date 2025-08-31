import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { db } from '@/server/db';
import { ChatSessionHandler } from '@/server/services/chatbot/chat-session-handler';

export const runtime = 'nodejs';
export const maxDuration = 180;
export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing to access raw body
  },
};

async function handler(request: Request) {
  try {
    const rawPayload = await request.json();
    const { sessionId, organizationId } = rawPayload;
    if (!sessionId || !organizationId) {
      throw new Error('Missing sessionId or organizationId');
    }
    const chatSessionHandler = new ChatSessionHandler({ db, organizationId });
    await chatSessionHandler.replyToSession(sessionId, organizationId);
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error processing message:', error);

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
