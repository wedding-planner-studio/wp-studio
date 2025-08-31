import { PLANS, Plan } from '@/lib/utils/constants';
import { OrganizationPlan } from '@prisma/client';
type PlanId = keyof typeof PLANS;

export const getNextPlan = (currentPlanId?: OrganizationPlan): Plan | null => {
  if (!currentPlanId) {
    return null;
  }

  const planOrder: PlanId[] = ['LITE', 'PRO', 'ELITE'];
  // Handle single event plan separately as it's not in the upgrade path
  if (currentPlanId === 'SINGLE') {
    return PLANS.LITE; // Suggest moving to lite as the entry subscription
  }

  const currentIndex = planOrder.indexOf(currentPlanId as PlanId);

  // If plan not found or is already the highest tier
  if (currentIndex === -1 || currentIndex === planOrder.length - 1) {
    return null;
  }

  // Return the next plan in the sequence
  const nextPlanId = planOrder[currentIndex + 1];
  return PLANS[nextPlanId!];
};
