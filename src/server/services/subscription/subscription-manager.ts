import { OrganizationPlan } from '@prisma/client';
import { BaseService } from '../base-service';

export class SubscriptionManager extends BaseService {
  /**
   * Update the organization's plan
   * @param plan - The new plan to update to
   * @returns
   */
  async update(plan: OrganizationPlan) {
    const { organizationId, plan: currentPlan } = await this.getOrgFromUserSession();
    if (currentPlan === plan) {
      return;
    }
    // TODO: Verify payment
    await this.db.organization.update({
      where: { id: organizationId },
      data: { plan },
    });
  }
}
