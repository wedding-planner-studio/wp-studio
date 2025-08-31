import { MessageCreditType, MessageCreditPool } from '@prisma/client';
import { UnauthedService } from '../unauthed-service';
import { PLANS, Plan } from '@/lib/utils/constants/plans';

export class UsageLogger extends UnauthedService {
  // Removed redundant declaration: protected db!: PrismaClient;
  // Assuming 'this.db' is inherited from UnauthedService.
  // Use type assertion '(this.db as PrismaClient)' when needed if the base class type is not specific.

  /**
   * Records the consumption of a message credit, ensuring atomicity and idempotency using upsert.
   * Determines whether to debit from monthly allowance or purchased credits.
   * Operates without user authentication context.
   * @param messageSid The Twilio SID of the message triggering consumption.
   * @returns Object indicating success status, pool consumed from, or error.
   */
  async recordMessageConsumption(messageSid: string): Promise<{
    success: boolean;
    consumedFrom?: MessageCreditPool | null; // Pool determined during this run
    error?: string;
  }> {
    // 1. Find delivery record and organizationId (remains the same)
    const deliveryRecord = await this.db.messageDelivery.findUnique({
      where: { messageSid },
      select: {
        id: true,
        bulkMessage: {
          select: {
            event: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });
    if (!deliveryRecord?.bulkMessage?.event?.organizationId) {
      console.warn(
        `Could not find organization for MessageSid: ${messageSid}. Cannot record consumption.`
      );
      return { success: false, error: 'Organization not found for MessageSid' };
    }
    const organizationId = deliveryRecord.bulkMessage.event.organizationId;

    // 2. Perform calculations and upsert within a transaction
    try {
      // Define these outside the transaction scope but calculate inside
      let consumedFrom: MessageCreditPool | null = null;
      const cost = 1;

      // Use type assertion if the inherited 'this.db' is not strictly typed as PrismaClient
      await this.prismaClient.$transaction(async tx => {
        // --- 2a. Get Plan & Limit ---
        const plan = await this.getPlanForOrganization(organizationId);
        if (!plan) {
          console.error(
            `Could not determine plan for Org: ${organizationId}, MsgSid: ${messageSid}.`
          );
          throw new Error(`Plan not found for organization ${organizationId}`);
        }
        const monthlyLimit =
          typeof plan.limits.whatsappMsgs === 'string' && plan.limits.whatsappMsgs === 'unlimited'
            ? Infinity
            : typeof plan.limits.whatsappMsgs === 'number'
              ? plan.limits.whatsappMsgs
              : 0;

        // --- 2b. Calculate Current Credit State ---
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Allowance calc
        const consumedAllowanceAgg = await tx.organizationMessageCredits.aggregate({
          where: {
            organizationId,
            type: MessageCreditType.CONSUMPTION,
            consumedFromPool: MessageCreditPool.ALLOWANCE,
            createdAt: { gte: startOfMonth },
          },
          _sum: { credits: true },
        });
        const consumedAllowanceThisMonth = -(consumedAllowanceAgg._sum.credits ?? 0);
        const allowanceRemaining = Math.max(0, monthlyLimit - consumedAllowanceThisMonth);

        // Purchased calc
        const purchasedAgg = await tx.organizationMessageCredits.aggregate({
          where: { organizationId, type: MessageCreditType.TOP_UP },
          _sum: { credits: true },
        });
        const consumedPurchasedAgg = await tx.organizationMessageCredits.aggregate({
          where: {
            organizationId,
            type: MessageCreditType.CONSUMPTION,
            consumedFromPool: MessageCreditPool.PURCHASED,
          },
          _sum: { credits: true },
        });
        const totalPurchased = purchasedAgg._sum.credits ?? 0;
        const totalConsumedFromPurchased = -(consumedPurchasedAgg._sum.credits ?? 0);
        const purchasedRemaining = Math.max(0, totalPurchased - totalConsumedFromPurchased);

        // --- 2c. Decision Logic ---
        // Determine the pool *before* the upsert
        if (allowanceRemaining >= cost) {
          consumedFrom = MessageCreditPool.ALLOWANCE;
        } else if (purchasedRemaining >= cost) {
          consumedFrom = MessageCreditPool.PURCHASED;
        } else {
          // Insufficient credits - but wont throw error to rollback transaction
          consumedFrom = MessageCreditPool.PURCHASED;
          console.error(
            `Insufficient credits for Org: ${organizationId}, MsgSid: ${messageSid}. Allowance Left: ${allowanceRemaining}, Purchased Left: ${purchasedRemaining}`
          );
        }

        // --- 2d. Write Consumption Record using Upsert ---
        // This relies on the @@unique([organizationId, relatedMessageSid]) constraint
        await tx.organizationMessageCredits.upsert({
          where: {
            // Use the compound unique constraint identifier syntax
            organizationId_relatedMessageSid: {
              organizationId: organizationId,
              relatedMessageSid: messageSid,
            },
          },
          create: {
            organizationId: organizationId,
            credits: -cost,
            type: MessageCreditType.CONSUMPTION,
            consumedFromPool: consumedFrom, // Use the determined pool
            relatedMessageSid: messageSid,
          },
          update: {
            // If record exists (e.g., webhook retry), do nothing to avoid re-charge.
            // You could optionally update a timestamp like 'updatedAt' here if desired.
          },
        });

        // Transaction succeeds if credits were sufficient and upsert completed.
        // 'consumedFrom' holds the pool determined in *this* execution attempt.
      }); // End transaction block

      return { success: true, consumedFrom: consumedFrom };
    } catch (error: any) {
      // Catch errors from transaction (insufficient credits, DB connection issues, plan lookup failure etc.)
      console.error(
        `Transaction failed during consumption upsert for MsgSid ${messageSid}, Org ${organizationId}:`,
        error
      );
      return {
        success: false,
        error: error.message || 'Failed to record consumption via upsert transaction',
      };
    }
  }

  /**
   * Retrieves the current plan for an organization.
   * @param organizationId - The ID of the organization.
   * @returns The plan object or null if not found.
   */
  private async getPlanForOrganization(organizationId: string): Promise<Plan | null> {
    // Ensure the Organization model has a 'plan' field of type OrganizationPlan enum
    const org = await this.db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, plan: true }, // Select the plan field
    });

    // Check if organization and its plan field exist
    if (!org?.plan) {
      console.error(`Organization or plan field not found for Org ID: ${organizationId}`);
      return null;
    }

    // Assuming org.plan is of type OrganizationPlan enum matching keys in PLANS
    const planKey = org.plan as keyof typeof PLANS; // Use type assertion carefully
    const plan = PLANS[planKey];

    if (!plan) {
      console.error(
        `Plan definition not found in PLANS constant for key: ${planKey} (Org ID: ${organizationId})`
      );
      return null;
    }

    return plan;
  }
}
