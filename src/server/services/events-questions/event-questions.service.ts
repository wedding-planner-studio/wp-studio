import { TRPCError } from '@trpc/server';
import { BaseService } from '../base-service';
import {
  EventQuestionsUpdateParams,
  EventQuestionsCreateParams,
} from './schema/event-questions-write.schema';
import { QuestionCategory, QuestionStatus } from '@prisma/client';
import { EventQuestionsListParams } from './schema/event-questions-read.schema';

export class EventQuestionsService extends BaseService {
  /**
   * List all active questions for an event
   * @param params - The parameters for the list
   * @returns The list of active questions
   */
  async list(params: EventQuestionsListParams) {
    const { eventId } = params;
    // Get the organization ID from the authenticated user
    const user = await this.db.user.findFirst({
      where: { id: this.auth.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not associated with an organization',
      });
    }

    // Verify the event belongs to the user's organization
    const event = await this.db.event.findFirst({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    // Get active questions
    const questions = await this.db.eventQuestion.findMany({
      where: {
        eventId,
        status: QuestionStatus.ACTIVE,
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });

    return questions;
  }
  /**
   * Create a new question
   * @param params - The parameters for the create
   * @returns The created question
   */
  async create(params: EventQuestionsCreateParams) {
    const { eventId, question, answer, category } = params;

    // Get the organization ID from the authenticated user
    const user = await this.db.user.findFirst({
      where: { id: this.auth.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not associated with an organization',
      });
    }

    // Verify the event belongs to the user's organization
    const event = await this.db.event.findFirst({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
    });

    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found or access denied',
      });
    }

    // Create the new question
    const newQuestion = await this.db.eventQuestion.create({
      data: {
        eventId,
        question,
        answer: answer ?? '',
        category: category ?? QuestionCategory.GENERAL,
        status: QuestionStatus.ACTIVE,
      },
    });

    // Invalidate the event cache
    await this.redis.del(`chatbot:eventId:${eventId}`);

    return newQuestion;
  }

  /**
   * Update a question
   * @param params - The parameters for the update
   * @returns The updated question
   */
  async update(params: EventQuestionsUpdateParams) {
    const { questionId, ...updateFields } = params;

    // Get the organization ID from the authenticated user
    const user = await this.db.user.findFirst({
      where: { id: this.auth.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not associated with an organization',
      });
    }

    // Find the question and verify ownership
    const existingQuestion = await this.db.eventQuestion.findFirst({
      where: {
        id: questionId,
      },
      include: {
        event: true,
      },
    });

    if (!existingQuestion || existingQuestion.event.organizationId !== user.organizationId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Question not found or access denied',
      });
    }

    // Update the answer
    const updatedQuestion = await this.db.eventQuestion.update({
      where: {
        id: questionId,
      },
      data: {
        ...updateFields,
      },
    });

    // Invalidate the event cache
    await this.redis.del(`chatbot:eventId:${existingQuestion.eventId}`);

    return updatedQuestion;
  }

  /**
   * Set a question as inactive
   * @param questionId - The ID of the question to set as inactive
   * @returns The updated question
   */
  async setInactive(questionId: string) {
    return this.update({
      questionId,
      status: QuestionStatus.INACTIVE,
    });
  }
}
