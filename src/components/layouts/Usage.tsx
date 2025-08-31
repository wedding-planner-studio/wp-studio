'use client';

import { cn, getFirstAndLastDay, INFINITY_NUMBER, nFormatter, getNextPlan } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { CSSProperties, forwardRef, useMemo, useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { AnimatedSizeContainer } from '../ui/animated-size-container';
import { type LucideIcon } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { ManageSubscriptionButton } from '../ManageSubscriptionButton';
import { WhatsappIcon, buttonVariants } from '@/components/ui';
import { withPermission } from '@/components/hoc/withPermission';
import { api } from '@/trpc/react';
import { usePathname, useParams } from 'next/navigation';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

const UsageInner = () => {
  const pathname = usePathname();

  // Get organization data for plan and billing info
  const { t } = useClientTranslation('common');
  const { locale } = useParams();
  const {
    organization,
    billingCycleStart,
    plan,
    isLoadingOrganization,
    paymentFailedAt,
    purchasedMsgsRemaining,
  } = useOrganization();

  // Get comprehensive usage data using the new calculation method
  const { data: comprehensiveUsage, isLoading: comprehensiveUsageLoading } =
    api.usage.getComprehensiveUsage.useQuery(
      { organizationId: organization?.id ?? '' },
      { enabled: !!organization?.id }
    );

  const [billingEnd] = useMemo(() => {
    if (billingCycleStart) {
      const { lastDay } = getFirstAndLastDay(billingCycleStart);
      const end = lastDay.toLocaleDateString(locale as string, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return [end];
    }
    return [];
  }, [billingCycleStart, locale]);

  const [hovered, setHovered] = useState(false);

  const nextPlan = getNextPlan(plan);

  // Extract usage data from comprehensive usage
  const totalUsage = comprehensiveUsage?.limits?.whatsappMsgs?.usage;
  const totalAvailable = comprehensiveUsage?.limits?.whatsappMsgs?.limit;
  const eventsUsage = comprehensiveUsage?.limits?.activeEvents?.usage;
  const eventsLimit = comprehensiveUsage?.limits?.activeEvents?.limit;

  // Warn the user if they're >= 90% of any limit
  const warnings = useMemo(
    () =>
      [
        [totalUsage, totalAvailable],
        [eventsUsage, eventsLimit],
      ].map(
        ([usage, limit]) =>
          usage !== undefined && limit !== undefined && usage / Math.max(0, usage, limit) >= 0.9
      ),
    [totalUsage, totalAvailable, eventsUsage, eventsLimit]
  );

  const warning = warnings.some(w => w);

  const isLoading = isLoadingOrganization || comprehensiveUsageLoading;

  if (pathname?.includes('sudo')) return null;

  return isLoading || totalUsage !== undefined ? (
    <>
      <AnimatedSizeContainer height>
        <div className="border-t border-neutral-300/80 p-3">
          <Link
            className="group flex items-center gap-0.5 text-sm font-normal text-neutral-500 transition-colors hover:text-neutral-700"
            href={`/admin/settings/usage`}
          >
            {t('usage.title')}
            <ChevronRight className="size-3 text-neutral-400 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-neutral-500" />
          </Link>
          <div className="mt-4 flex flex-col gap-4">
            {/* Messages */}
            <UsageRow
              icon={WhatsappIcon}
              label={t('usage.messages')}
              usage={totalUsage}
              limit={totalAvailable}
              showNextPlan={hovered}
              nextPlanLimit={(nextPlan?.limits.whatsappMsgs ?? 0) + (purchasedMsgsRemaining ?? 0)}
              warning={!!warnings[0]}
            />
            {/* Events */}
            <UsageRow
              icon={PartyPopper}
              label={t('usage.events')}
              usage={eventsUsage}
              limit={eventsLimit ?? 0}
              showNextPlan={hovered}
              nextPlanLimit={nextPlan?.limits.activeEvents ?? 0}
              warning={!!warnings[1]}
            />
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-neutral-500/10" />
            ) : (
              <p className={cn('text-xs text-neutral-900/40', paymentFailedAt && 'text-red-600')}>
                {paymentFailedAt
                  ? t('usage.paymentFailed')
                  : t('usage.resetDate', { date: billingEnd })}
              </p>
            )}
          </div>
          {paymentFailedAt ? (
            <ManageSubscriptionButton
              text={t('usage.updatePayment')}
              className="mt-4 w-full"
              onMouseEnter={() => {
                setHovered(true);
              }}
              onMouseLeave={() => {
                setHovered(false);
              }}
            />
          ) : (warning || plan === 'LITE') && plan !== 'ELITE' ? (
            <>
              <Link
                href="/admin/settings/billing"
                className={cn(
                  buttonVariants(),
                  'mt-4 flex items-center justify-center rounded-md border px-4'
                )}
                onMouseEnter={() => {
                  setHovered(true);
                }}
                onMouseLeave={() => {
                  setHovered(false);
                }}
              >
                {t('usage.upgradeTo', { plan: nextPlan?.name })}
              </Link>
              <Link
                href="/admin/settings/campaign-messages"
                className="w-full text-center text-xs text-neutral-900/40 hover:underline"
              >
                {t('usage.purchaseMore')}
              </Link>
            </>
          ) : null}
        </div>
      </AnimatedSizeContainer>
    </>
  ) : null;
};

type UsageRowProps = {
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  label: string;
  usage?: number;
  limit?: number;
  showNextPlan: boolean;
  nextPlanLimit?: number;
  warning: boolean;
};

const UsageRow = forwardRef<HTMLDivElement, UsageRowProps>(
  (
    { icon: Icon, label, usage, limit, showNextPlan, nextPlanLimit, warning }: UsageRowProps,
    ref
  ) => {
    const loading = usage === undefined || limit === undefined;
    const unlimited = limit !== undefined && limit >= INFINITY_NUMBER;

    return (
      <div ref={ref}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="size-3.5 text-neutral-600" />
            <span className="text-xs font-medium text-neutral-700">{label}</span>
          </div>
          {!loading ? (
            <div className="flex items-center">
              <span className="text-xs font-medium text-neutral-600">
                <NumberFlow value={usage === -0 ? 0 : usage} format={undefined} /> of{' '}
                <motion.span
                  className={cn(
                    'relative transition-colors duration-150',
                    showNextPlan && nextPlanLimit ? 'text-neutral-400' : 'text-neutral-600'
                  )}
                >
                  {label === 'Sales' ? '$' : ''}
                  {formatNumber(label === 'Sales' ? limit / 100 : limit)}
                  {showNextPlan && nextPlanLimit && (
                    <motion.span
                      className="absolute bottom-[45%] left-0 h-[1px] bg-neutral-400"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{
                        duration: 0.25,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </motion.span>
              </span>
              <AnimatePresence>
                {showNextPlan && nextPlanLimit && (
                  <motion.div
                    className="flex items-center"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{
                      duration: 0.25,
                      ease: [0.4, 0, 0.2, 1], // Custom cubic-bezier for smooth movement
                    }}
                  >
                    <motion.span className="ml-1 whitespace-nowrap text-xs font-medium text-purple-600">
                      {label === 'Sales' ? '$' : ''}
                      {formatNumber(label === 'Sales' ? nextPlanLimit / 100 : nextPlanLimit)}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-500/10" />
          )}
        </div>
        {!unlimited && (
          <div className="mt-1.5">
            <div
              className={cn(
                'h-0.5 w-full overflow-hidden rounded-full bg-neutral-900/10 transition-colors',
                loading && 'bg-neutral-900/5'
              )}
            >
              {!loading && (
                <div
                  className="animate-slide-right-fade size-full"
                  style={{ '--offset': '-100%' } as CSSProperties}
                >
                  <div
                    className={cn(
                      'size-full rounded-full bg-gradient-to-r from-transparent to-purple-600',
                      warning && 'to-rose-500'
                    )}
                    style={{
                      transform: `translateX(-${100 - Math.max(Math.floor((usage / Math.max(0, usage, limit)) * 100), usage === 0 ? 0 : 1)}%)`,
                      transition: 'transform 0.25s ease-in-out',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

UsageRow.displayName = 'UsageRow';

const formatNumber = (value: number) =>
  value >= INFINITY_NUMBER
    ? '∞'
    : nFormatter(value, {
        full: value !== undefined && value < 999,
        digits: 1,
      });

export const Usage = withPermission(UsageInner, {
  resource: 'orgMsgUsage',
  action: 'read',
});
