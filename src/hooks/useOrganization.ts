'use client';

import { api } from '@/trpc/react';
import { PLANS } from '@/lib/utils/constants';

export const useOrganization = () => {
  const { data: organization, isLoading: isLoadingOrganization } = api.organization.get.useQuery();
  const { data: usage, isLoading: isLoadingUsage } = api.organization.usage.useQuery(undefined, {
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const currentPlan = organization?.plan ? PLANS[organization.plan] : PLANS.LITE;

  // TODO;
  const billingCycleStart = 1;

  // Included Allowance by Plan
  const allowanceMsgsUsage = usage?.messages.consumedFromAllowanceThisMonth ?? 0;
  const allowanceMsgsLimit = currentPlan?.limits.whatsappMsgs ?? 0;

  // Purchased Credits
  const purchasedMsgsUsage = usage?.messages.consumedFromPurchasedThisMonth ?? 0;
  const purchasedMsgsRemaining = usage?.messages.purchasedCreditsRemaining ?? 0;

  // Total Usage
  const totalUsage = usage?.messages.consumedThisMonth ?? 0;
  const totalAvailable = allowanceMsgsLimit + purchasedMsgsRemaining + purchasedMsgsUsage;

  const paymentFailedAt = undefined; // new Date();

  return {
    organization: organization?.organization,
    plan: organization?.plan,
    isLoadingOrganization,
    isLoadingUsage,
    billingCycleStart,
    allowanceMsgsUsage,
    allowanceMsgsLimit,
    purchasedMsgsUsage,
    purchasedMsgsRemaining,
    totalUsage,
    totalAvailable,
    paymentFailedAt,
    events: usage?.events,
  };
};
