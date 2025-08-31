import { SLACK_CHANNEL_ID_CRONS } from '@/lib/constants';
import { db } from '@/server/db';
import { SlackNotification } from '@/server/services/notifications/slack/slack-notification';
import { cronExecutionTemplate } from '@/server/services/notifications/slack/templates/cron-execution';
import { verifySignatureAppRouter } from '@upstash/qstash/dist/nextjs';
import { NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing to access raw body
  },
};

async function handler(_request: Request) {
  const updated = await db.chatSession.updateMany({
    where: {
      isActive: true,
      lastMessageAt: {
        lt: new Date(Date.now() - 1000 * 60 * 60 * 24), //
      },
    },
    data: {
      isActive: false,
    },
  });

  await new SlackNotification(
    cronExecutionTemplate(
      updated.count > 0
        ? `Disabled ${updated.count} chat sessions :white_check_mark:`
        : 'No active chat sessions found',
      'disable_active_chat_sessions'
    )
  ).send();

  return NextResponse.json({
    success: true,
    updated,
  });
}

// Make sure both signing keys are available
export const POST = verifySignatureAppRouter(handler);
