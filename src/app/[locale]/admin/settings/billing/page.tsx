'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { OrganizationPlan as PrismaPlan } from '@prisma/client'; // Assuming PrismaPlan enum matches PLANS keys
import { api } from '@/trpc/react';
import { FiArrowLeft } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import React from 'react';
import { PricingContent } from '@/components/pricing/pricing-content';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

export default function BillingPage() {
  const router = useRouter();
  const { t } = useClientTranslation('common');

  const utils = api.useUtils();
  const { mutate: updatePlan } = api.subscription.update.useMutation({
    onSuccess: () => {
      void utils.organization.invalidate();
    },
  });

  const handleUpdatePlan = (plan: PrismaPlan) => {
    updatePlan({ plan });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-12 md:px-6 lg:py-8">
        {/* Navigation */}
        <div className="mb-2 shrink-0">
          <Button
            variant="ghost"
            onClick={() => router.push(`/admin/settings`)}
            className="text-gray-600 hover:text-gray-900 h-8 px-2 -ml-2"
          >
            <FiArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="text-xs">{t('billing.backToSettings')}</span>
          </Button>
        </div>
        <PricingContent onUpdatePlan={handleUpdatePlan} />
      </div>
    </AdminLayout>
  );
}
