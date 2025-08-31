'use client';
import PublicLayout from '@/components/layouts/PublicLayout';
import { PricingContent } from '@/components/pricing/pricing-content';
import { noop } from '@/lib/utils';

export default function PricingPage() {
  return (
    <PublicLayout>
      <div className="p-10 max-w-7xl mx-auto mt-10">
        <PricingContent onUpdatePlan={noop} />
      </div>
    </PublicLayout>
  );
}
