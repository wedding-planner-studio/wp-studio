import { normalizePhone } from '@/lib/utils/utils';
import { UnauthedService, UnauthedServiceOptions } from '../unauthed-service';
import { ChatSession, EventStatus, GuestStatus, MessageDirection } from '@prisma/client';
import { TwilioMessage } from '../twilio/twilio.schema';
import { ChatbotService } from './chatbot.service';
import { TwilioService } from '../twilio';
import { env } from '@/env';
import axios from 'axios';
import FormData from 'form-data';
import { QstashService } from '../qstash';
import { UPSTASH_CHATBOT_SESSION_REPLY_URL } from '@/lib/constants';
import { GuestContext } from './chatbot.service';
interface TestMessage {
  From: string;
  Body: string;
}

export class ChatSessionHandler extends UnauthedService {
  private sessionTimeoutHours = 24;
  private isTestSession = false;
  private readonly REPLY_BUFFER_SECONDS = 3;
  private readonly organizationId: string;

  public activeSession: ChatSession | null = null;

  constructor(
    options: UnauthedServiceOptions & { organizationId: string; isTestSession?: boolean }
  ) {
    super(options);
    this.isTestSession = options.isTestSession ?? false;
    this.organizationId = options.organizationId;
  }

  /**
   * Identify all guests based on their phone number and OrganizationId
   * Note that events should be active, otherwise the guest is not considered active
   * Returns a list of guests with their assignment and guest group
   */
  async identifyGuest(): Promise<GuestContext[]> {
    // TODO: Later, phoneNumber will not be optional
    if (!this.activeSession?.phoneNumber) {
      return [];
    }

    return this.db.guest.findMany({
      where: {
        phone: this.activeSession.phoneNumber,
        event: {
          organizationId: this.organizationId,
          status: EventStatus.ACTIVE,
        },
        status: {
          not: GuestStatus.INACTIVE,
        },
      },
      include: {
        guestConfirmationResponses: true,
        assignment: true,
        guestGroup: {
          include: {
            guests: {
              where: {
                isPrimaryGuest: false,
                status: {
                  not: GuestStatus.INACTIVE,
                },
              },
              include: {
                guestConfirmationResponses: true,
              },
            },
            _count: {
              select: {
                guests: {
                  where: {
                    isPrimaryGuest: false,
                    status: {
                      not: GuestStatus.INACTIVE,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Determine which session to use or create a new one
   */
  private async determineSession(phoneNumber: string): Promise<ChatSession> {
    const normalizedPhone = normalizePhone(phoneNumber, 'MX', !this.isTestSession);
    // Look for an active session (exclude test sessions for normal operation)
    const activeSession = await this.db.chatSession.findFirst({
      // The order in the "WHERE" clause is important, should match multi-column index for best performance!!
      where: {
        organizationId: this.organizationId,
        phoneNumber: normalizedPhone,
        isActive: true,
        isTestSession: this.isTestSession,
        lastMessageAt: {
          gte: new Date(Date.now() - this.sessionTimeoutHours * 60 * 60 * 1000),
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (activeSession) {
      // `nextReplyAt` determines when to ignore incoming "reply" notifications from Upstash Qstash
      await this.db.chatSession.update({
        where: { id: activeSession.id },
        data: {
          lastMessageAt: new Date(),
          nextReplyAt: new Date(Date.now() + this.REPLY_BUFFER_SECONDS * 1000),
        },
      });
      this.activeSession = activeSession;
    } else {
      // Create new session if needed
      const newSession = await this.db.chatSession.create({
        data: {
          organizationId: this.organizationId,
          phoneNumber: normalizedPhone,
          isActive: true,
          isTestSession: this.isTestSession,
          startedAt: new Date(),
          lastMessageAt: new Date(),
          nextReplyAt: new Date(Date.now() + this.REPLY_BUFFER_SECONDS * 1000),
        },
      });
      this.activeSession = newSession;
    }

    return this.activeSession;
  }

  /**
   * Reply to all messages in a session
   * @param sessionId - The ID of the session
   * @param organizationId - The ID of the organization
   * @returns The message content
   */
  async replyToSession(sessionId: string, organizationId: string): Promise<string> {
    const session = await this.db.chatSession.findUnique({
      where: { id: sessionId },
    });
    this.activeSession = session;
    if (!session) {
      throw new Error('Chat session not found');
    }

    // If nextReplyAt is in the future, do not reply
    if (session.nextReplyAt && session.nextReplyAt > new Date()) {
      return '';
    }

    const guests = await this.identifyGuest();
    const twilioService = new TwilioService({
      organizationId,
      db: this.db,
    });
    if (guests.length === 0) {
      const { message } = await this.handleUnknownGuest(session.phoneNumber!, '');
      await twilioService.sendWhatsAppMessage({
        to: session.phoneNumber!,
        body: message,
      });
      return message;
    }

    const chatbotService = new ChatbotService({
      db: this.db,
      guests,
      session,
      testMode: false, // Important: Session replies are never test mode
    });

    const { message } = await chatbotService.processLastMessage();
    if (message) {
      await twilioService.sendWhatsAppMessage({
        to: session.phoneNumber!,
        body: message,
      });
    }
    return message;
  }

  /**
   * Entry point for incoming Twilio webhook messages
   */
  async handleIncomingMessage(incomingMessage: TwilioMessage | TestMessage): Promise<{
    message: string;
    metadata: {
      toolCalls: { id: string; name: string; input: any; result: any }[];
      isChatbotDisabled?: boolean;
    };
  }> {
    // Extract phone number from Twilio webhook
    const phoneNumber = incomingMessage.From.replace('whatsapp:', '');
    const messageContent = incomingMessage.Body;

    let messageSid = '';
    let contentType = 'text';
    if ('SmsMessageSid' in incomingMessage) {
      messageSid = incomingMessage.SmsMessageSid;
    } else if ('MessageSid' in incomingMessage) {
      messageSid = incomingMessage.MessageSid as string;
    }
    if ('MediaContentType0' in incomingMessage) {
      contentType = incomingMessage.MediaContentType0 as string;
    }

    const session = await this.determineSession(phoneNumber);
    // Record incoming message
    await this.db.chatMessage.create({
      data: {
        sessionId: session.id,
        direction: MessageDirection.INBOUND,
        content: messageContent,
        twilioMessageSid: messageSid,
        contentType,
      },
    });

    //  Identify the guest
    const guests = await this.identifyGuest();
    if (guests.length === 0) {
      return this.handleUnknownGuest(phoneNumber, messageContent);
    }

    // For test sessions, process the message immediately
    if (this.isTestSession) {
      const chatbotService = new ChatbotService({
        db: this.db,
        guests,
        session,
        testMode: this.isTestSession,
      });

      const { message } = await chatbotService.processLastMessage();
      return { message, metadata: { toolCalls: [] } };
    }

    // For normal sessions, buffer the message using Upstash Qstash with idempotency
    const qstashService = new QstashService();
    await qstashService.scheduleMessage(
      UPSTASH_CHATBOT_SESSION_REPLY_URL,
      { sessionId: session.id, organizationId: this.organizationId },
      this.REPLY_BUFFER_SECONDS
    );
    return { message: messageContent, metadata: { toolCalls: [] } };
  }

  async handleIncomingAudio(twilioMessage: TwilioMessage & { MediaContentType0: string }): Promise<{
    message: string;
    metadata: {
      toolCalls: { id: string; name: string; input: any; result: any }[];
    };
  }> {
    const audioUrl = twilioMessage.MediaUrl0;
    if (!audioUrl) {
      throw new Error('No audio URL found');
    }
    const twilioService = new TwilioService({
      organizationId: this.organizationId,
      db: this.db,
    });
    const audioBuffer = await twilioService.downloadAudio(audioUrl);
    const transcription = await this.transcribeAudio(audioBuffer);

    return this.handleIncomingMessage({
      ...twilioMessage,
      Body: transcription,
    });
  }

  /**
   * Transcribe audio using OpenAI's Whisper API
   * @param audioBuffer
   * @returns
   */
  private transcribeAudio = async (audioBuffer: ArrayBuffer) => {
    const formData = new FormData();
    formData.append('file', Buffer.from(audioBuffer), {
      filename: 'audio.ogg',
      contentType: 'audio/ogg',
    });
    formData.append('model', 'whisper-1'); // OpenAI model name

    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
    });

    return response.data.text; // This is the transcription
  };

  /**
   * Handle messages from unknown phone numbers
   */
  private async handleUnknownGuest(
    phoneNumber: string,
    message: string
  ): Promise<{
    message: string;
    metadata: { toolCalls: { id: string; name: string; input: any; result: any }[] };
  }> {
    // Log the unknown guest attempt
    console.log(`Unknown guest attempt from: ${phoneNumber}, message: ${message}`);
    // TODO await this.generateResponseForUnknownGuest(message);
    const response = {
      content:
        'Lo siento, no reconozco este número de teléfono. Si eres un invitado, por favor asegúrate de usar el número que proporcionaste durante el registro.',
    };
    return { message: response.content, metadata: { toolCalls: [] } };
  }

  async closeSessionForUser(phoneNumber: string): Promise<void> {
    await this.db.chatSession.updateMany({
      where: {
        isTestSession: this.isTestSession,
        isActive: true,
        organizationId: this.organizationId,
        phoneNumber: {
          equals: normalizePhone(phoneNumber, 'MX', !this.isTestSession),
        },
      },
      data: { isActive: false },
    });
  }
}
