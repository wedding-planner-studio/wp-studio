'use client';

import { formatCurrency } from '@/lib/utils/functions';
import { PLANS, Plan, PlanFeatures } from '@/lib/utils/constants/plans';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationPlan as PrismaPlan } from '@prisma/client'; // Assuming PrismaPlan enum matches PLANS keys
import { api } from '@/trpc/react';
import { WhatsappIcon } from '@/components/ui/icons/whatsapp-icon';
import {
  MessageSquare,
  Users,
  CalendarCheck,
  Info,
  Layout,
  Bot,
  Phone,
  PartyPopper,
  Link as LinkIcon,
} from 'lucide-react';
import React from 'react';
import Link from 'next/link';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';
import { Trans } from 'react-i18next';
import { BOOK_A_MEETING_URL } from '@/lib/constants';

const displayLimit = (limit: number | 'unlimited') => {
  return limit === 'unlimited' ? 'Unlimited' : limit;
};

// Icon mapping for features
const featureIcons = {
  generalEventInfo: Info,
  guests: Users,
  seatAssignment: Layout,
  detailedEventInfo: CalendarCheck,
  coupleAccount: Users,
  templateBuilder: MessageSquare,
  chatbotTesting: Bot,
};

// The featureDisplayMap will now use translation keys, actual text comes from translations
const featureDisplayMap: {
  key: keyof PlanFeatures;
  labelKey: string;
  subtitleKey?: string;
}[] = [
  {
    key: 'generalEventInfo',
    labelKey: 'pricing.features.generalEventInfo',
    subtitleKey: 'pricing.features.generalEventInfoDesc',
  },
  {
    key: 'guests',
    labelKey: 'pricing.features.guestsManagement',
  },
  {
    key: 'seatAssignment',
    labelKey: 'pricing.features.seatAssignment',
    subtitleKey: 'pricing.features.seatAssignmentDesc',
  },
  {
    key: 'detailedEventInfo',
    labelKey: 'pricing.features.detailedEventInfo',
    subtitleKey: 'pricing.features.detailedEventInfoDesc',
  },
  {
    key: 'coupleAccount',
    labelKey: 'pricing.features.coupleAccount',
    subtitleKey: 'pricing.features.coupleAccountDesc',
  },
  {
    key: 'templateBuilder',
    labelKey: 'pricing.features.templateBuilder',
    subtitleKey: 'pricing.features.templateBuilderDesc',
  },
  {
    key: 'chatbotTesting',
    labelKey: 'pricing.features.chatbotTesting',
    subtitleKey: 'pricing.features.chatbotTestingDesc',
  },
];

// Define the order for comparison (using Prisma enum values which are keys of PLANS)
const planOrder: PrismaPlan[] = [PrismaPlan.LITE, PrismaPlan.PRO, PrismaPlan.ELITE];

interface BillingPageProps {
  onUpdatePlan: (plan: PrismaPlan) => void;
}

export const PricingContent = ({ onUpdatePlan }: BillingPageProps) => {
  const { t } = useClientTranslation('common');
  const allPlans = Object.values(PLANS); // Get all plans
  const subscriptionPlans = allPlans.filter(plan => plan.id !== 'single'); // Filter out the single event plan
  const singleEventPlan = allPlans.find(plan => plan.id === 'single'); // Find the single event plan
  const singleEventPlanKey = Object.keys(PLANS).find(
    key => PLANS[key as PrismaPlan].id === 'single'
  ) as PrismaPlan | undefined;

  return (
    <div>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 mb-1">
            <Trans
              i18nKey="pricing.header.title"
              components={{
                purple: <span className="text-purple-600 italic" />,
              }}
            />
          </h1>
          <p className="text-gray-600">{t('pricing.header.subtitle')}</p>
        </div>
        <a
          href="#single-event-plan"
          className="text-sm text-gray-600 hover:text-gray-900"
          onClick={e => {
            e.preventDefault();
            document.getElementById('single-event-plan')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          {t('pricing.header.singleEventLink')}
        </a>
      </div>
      <section className="mb-16">
        {/* Changed grid-cols-4 to grid-cols-3 for subscription plans */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {subscriptionPlans.map(plan => {
            // Find the PrismaPlan enum key corresponding to the plan id
            const planKey = Object.keys(PLANS).find(
              key => PLANS[key as PrismaPlan].id === plan.id
            ) as PrismaPlan | undefined;
            return planKey ? (
              <PlanCard
                key={plan.id}
                plan={plan}
                planKey={planKey} // Pass the key (LITE, PRO, etc.)
                isCurrentPlan={false} // TODO: Determine current plan dynamically
              />
            ) : null; // Should not happen if PLANS keys match PrismaPlan
          })}
        </div>
      </section>

      {/* Single Event Plan Section */}
      {singleEventPlan && singleEventPlanKey && (
        <section
          id="single-event-plan"
          className="mb-16 border-t border-gray-200 dark:border-gray-700 pt-8"
        >
          <h1 className="mb-8 text-2xl font-medium text-gray-900 dark:text-white">
            {t('pricing.singleEvent.title')}
          </h1>
          <div className="flex flex-col-reverse lg:flex-row gap-8">
            {/* Features Grid */}
            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {/* General Event Info */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <Info className="h-5 w-5" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('pricing.features.generalEventInfo')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                  {t('pricing.features.generalEventInfoDesc')}
                </p>
              </div>

              {/* Guests Management */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <Users className="h-5 w-5" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('pricing.features.guestsManagement')}
                  </span>
                </div>
              </div>

              {/* Seat Assignment */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <Layout className="h-5 w-5" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('pricing.features.seatAssignment')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                  {t('pricing.features.seatAssignmentDesc')}
                </p>
              </div>

              {/* Detailed Event Info */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <CalendarCheck className="h-5 w-5" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('pricing.features.detailedEventInfo')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                  {t('pricing.features.detailedEventInfoDesc')}
                </p>
              </div>

              {/* Dashboard Access */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <Users className="h-5 w-5" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('pricing.features.coupleAccount')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                  {t('pricing.features.coupleAccountDesc')}
                </p>
              </div>

              {/* Template Builder */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('pricing.features.templateBuilder')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                  {t('pricing.features.templateBuilderDesc')}
                </p>
              </div>

              {/* Chatbot Testing */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <Bot className="h-5 w-5" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('pricing.features.chatbotTesting')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                  {t('pricing.features.chatbotTestingDesc')}
                </p>
              </div>

              {/* Messages */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <WhatsappIcon className="h-5 w-5 fill-purple-600 dark:fill-purple-400" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('pricing.features.messages', { count: 200 })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                  {t('pricing.features.messagesDescription')}
                </p>
              </div>

              {/* RSVP Link */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <LinkIcon className="h-5 w-5" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('pricing.features.rsvpLink')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                  {t('pricing.features.rsvpLinkDesc')}
                </p>
              </div>

              {/* Custom AI Chatbot */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <Bot className="h-5 w-5" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('pricing.features.chatbotCustom')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                  {t('pricing.features.chatbotCustomDesc')}
                </p>
              </div>
            </div>

            {/* Price and CTA Section */}
            <div className="lg:w-1/3 flex flex-col justify-between lg:sticky lg:top-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('pricing.singleEvent.planName')}
                </h3>
                <div className="hidden items-baseline mb-2">
                  <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-purple-400">
                    {formatCurrency(singleEventPlan.price, singleEventPlan.currency).replace(
                      /MX\$/,
                      ''
                    )}
                  </span>
                  <div className="flex flex-col items-start ml-1">
                    <span className="text-sm text-gray-500">{t('pricing.singleEvent.taxes')}</span>
                    <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                      {t('pricing.singleEvent.perEvent')}
                    </span>
                  </div>
                </div>
                <p className="hidden text-xs text-gray-500 mb-4">
                  {t('pricing.singleEvent.currency')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('pricing.singleEvent.description')}
                </p>
              </div>
              <div className="mt-6">
                <Button
                  disabled
                  className="hidden w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => onUpdatePlan(singleEventPlanKey)}
                >
                  {t('pricing.button.getStarted')}
                </Button>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  {t('pricing.singleEvent.oneTime')}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

// --- Plan Card Component ---
interface PlanCardProps {
  plan: Plan;
  planKey: PrismaPlan; // Pass the enum key (LITE, PRO, ELITE, SINGLE)
  isCurrentPlan?: boolean;
}

// Helper function to check if a feature is new or upgraded
function isFeatureNew<K extends keyof PlanFeatures>(
  plan: Plan,
  prevPlan: Plan | null,
  featureKey: K
): boolean {
  return plan.features[featureKey] && (!prevPlan || !prevPlan.features[featureKey]);
}

function PlanCard({ plan, planKey, isCurrentPlan = false }: PlanCardProps) {
  const { t } = useClientTranslation('common');
  const currentPlanIndex = planOrder.indexOf(planKey); // Find index in LITE, PRO, ELITE order
  const previousPlanKey = currentPlanIndex > 0 ? planOrder[currentPlanIndex - 1] : null;
  const previousPlan = previousPlanKey ? PLANS[previousPlanKey] : null;

  const utils = api.useUtils();
  const { mutate: updatePlan } = api.subscription.update.useMutation({
    onSuccess: () => {
      void utils.organization.invalidate();
    },
  });

  // Determine if this plan is the base plan or not in the main sequence
  const isBaseOrSeparatePlan = !previousPlan || planKey === PrismaPlan.SINGLE;

  return (
    <Card
      className={`flex p-0 rounded-lg flex-col hover:border-purple-400 transition-all ${
        isCurrentPlan ? 'border-purple-600 ring-2 ring-purple-600' : ''
      }`}
    >
      <CardHeader className="p-6 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-t-lg border-b">
        <CardTitle className="text-2xl font-semibold leading-6 text-gray-900 dark:text-white text-center">
          {plan.name}
        </CardTitle>
        <div className="hidden mt-2">
          <div className="flex items-baseline">
            <span className="text-3xl font-bold tracking-tight dark:text-purple-400">
              {formatCurrency(plan.price, plan.currency).replace(/MX\$/, '')}
            </span>
            <div className="flex flex-col items-start ml-1">
              <span className="text-sm text-gray-500">{t('pricing.singleEvent.taxes')}</span>
              <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                /{plan.interval === 'month' ? 'mo' : t('pricing.singleEvent.perEvent')}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{t('pricing.singleEvent.currency')}</p>
        </div>
      </CardHeader>

      <CardContent className="flex-grow p-6 pt-4">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-4">
          {t('pricing.features.heading')}
        </h4>
        <ul role="list" className="space-y-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
          {isBaseOrSeparatePlan ? (
            <>
              {featureDisplayMap.map(
                feature =>
                  plan.features[feature.key] && (
                    <li key={feature.key} className="flex flex-col gap-1">
                      <div className="flex items-center gap-x-3">
                        <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                          {featureIcons[feature.key] && (
                            <div className="h-5 w-5">
                              {React.createElement(featureIcons[feature.key], {
                                className: 'h-5 w-5',
                              })}
                            </div>
                          )}
                        </span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {t(feature.labelKey)}
                        </span>
                      </div>
                      {feature.subtitleKey && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                          {t(feature.subtitleKey)}
                        </p>
                      )}
                    </li>
                  )
              )}
              <li className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <PartyPopper className="h-5 w-5" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {displayLimit(plan.limits.activeEvents)} Active Event
                    {plan.limits.activeEvents !== 1 ? 's' : ''}
                  </span>
                </div>
              </li>
              <li className="flex flex-col gap-1">
                <div className="flex items-center gap-x-3">
                  <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <WhatsappIcon className="h-5 w-5 fill-purple-600 dark:fill-purple-400" />
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('pricing.features.campaignMessages', { count: plan.limits.whatsappMsgs })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                  {t('pricing.features.messagesDescription')}
                </p>
              </li>
              {plan.chatbot.enabled && (
                <li className="flex flex-col gap-1">
                  <div className="flex items-center gap-x-3">
                    <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                      <Bot className="h-5 w-5" />
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      {t('pricing.features.chatbot', {
                        type:
                          plan.chatbot.type === 'basic'
                            ? t('pricing.features.typeBasic')
                            : t('pricing.features.typeCustom'),
                      })}
                      {plan.chatbot.unlimitedInfo &&
                        (!previousPlan || !previousPlan.chatbot.unlimitedInfo) && (
                          <Badge
                            variant="outline"
                            className="bg-purple-50 text-purple-700 border-purple-200"
                          >
                            {t('pricing.features.unlimited')}
                          </Badge>
                        )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                    {plan.chatbot.type === 'basic'
                      ? t('pricing.features.chatbotBasicDesc')
                      : t('pricing.features.chatbotCustomDesc')}
                  </p>
                </li>
              )}
              {plan.rsvp.link && (
                <li className="flex flex-col gap-1">
                  <div className="flex items-center gap-x-3">
                    <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                      <LinkIcon className="h-5 w-5" />
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {t('pricing.features.rsvpLink')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                    {t('pricing.features.rsvpLinkDesc')}
                  </p>
                </li>
              )}
              {plan.rsvp.chatbot && (
                <li className="flex flex-col gap-1">
                  <div className="flex items-center gap-x-3">
                    <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                      <Bot className="h-5 w-5" />
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {t('pricing.features.rsvpChatbot')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                    {t('pricing.features.rsvpChatbotDesc')}
                  </p>
                </li>
              )}
              {plan.customWhatsapp && (
                <li className="flex flex-col gap-1">
                  <div className="flex items-center gap-x-3">
                    <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                      <Phone className="h-5 w-5" />
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {t('pricing.features.customWhatsapp')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                    {t('pricing.features.customWhatsappDesc')}
                  </p>
                </li>
              )}
            </>
          ) : (
            <>
              <li className="font-medium text-purple-700 dark:text-purple-300 mb-2">
                {t('pricing.features.upgrade', { planName: previousPlan?.name })}
              </li>
              {featureDisplayMap.map(
                feature =>
                  isFeatureNew(plan, previousPlan, feature.key) && (
                    <li key={feature.key} className="flex flex-col gap-1">
                      <div className="flex items-center gap-x-3">
                        <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                          {featureIcons[feature.key] && (
                            <div className="h-5 w-5">
                              {React.createElement(featureIcons[feature.key], {
                                className: 'h-5 w-5',
                              })}
                            </div>
                          )}
                        </span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {t(feature.labelKey)}
                        </span>
                      </div>
                      {feature.subtitleKey && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                          {t(feature.subtitleKey)}
                        </p>
                      )}
                    </li>
                  )
              )}
              {plan.limits.activeEvents !== previousPlan?.limits.activeEvents && (
                <li className="flex flex-col gap-1">
                  <div className="flex items-center gap-x-3">
                    <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                      <PartyPopper className="h-5 w-5" />
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {typeof plan.limits.activeEvents === 'string' &&
                      plan.limits.activeEvents === 'unlimited'
                        ? t('pricing.features.unlimited')
                        : typeof plan.limits.activeEvents === 'number' &&
                            plan.limits.activeEvents === 1
                          ? t('pricing.features.activeEvents', { count: plan.limits.activeEvents })
                          : t('pricing.features.activeEventsPlural', {
                              count: plan.limits.activeEvents,
                            })}
                    </span>
                  </div>
                </li>
              )}
              {plan.limits.whatsappMsgs !== previousPlan?.limits.whatsappMsgs && (
                <li className="flex flex-col gap-1">
                  <div className="flex items-center gap-x-3">
                    <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                      <WhatsappIcon className="h-5 w-5 fill-purple-600 dark:fill-purple-400" />
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {t('pricing.features.campaignMessages', { count: plan.limits.whatsappMsgs })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                    {t('pricing.features.messagesDescription')}
                  </p>
                </li>
              )}
              {plan.chatbot.enabled &&
                (!previousPlan ||
                  !previousPlan.chatbot.enabled ||
                  plan.chatbot.type !== previousPlan.chatbot.type ||
                  plan.chatbot.unlimitedInfo !== previousPlan.chatbot.unlimitedInfo) && (
                  <li className="flex flex-col gap-1">
                    <div className="flex items-center gap-x-3">
                      <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                        <Bot className="h-5 w-5" />
                      </span>
                      <span className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {t('pricing.features.chatbot', {
                          type:
                            plan.chatbot.type === 'basic'
                              ? t('pricing.features.typeBasic')
                              : t('pricing.features.typeCustom'),
                        })}
                        {plan.chatbot.unlimitedInfo &&
                          (!previousPlan || !previousPlan.chatbot.unlimitedInfo) && (
                            <Badge
                              variant="outline"
                              className="bg-purple-50 text-purple-700 border-purple-200"
                            >
                              {t('pricing.features.unlimited')}
                            </Badge>
                          )}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                      {plan.chatbot.type === 'basic'
                        ? t('pricing.features.chatbotBasicDesc')
                        : t('pricing.features.chatbotCustomDesc')}
                    </p>
                  </li>
                )}
              {plan.rsvp.link && (!previousPlan || !previousPlan.rsvp.link) && (
                <li className="flex flex-col gap-1">
                  <div className="flex items-center gap-x-3">
                    <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                      <LinkIcon className="h-5 w-5" />
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {t('pricing.features.rsvpLink')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                    {t('pricing.features.rsvpLinkDesc')}
                  </p>
                </li>
              )}
              {plan.rsvp.chatbot && (!previousPlan || !previousPlan.rsvp.chatbot) && (
                <li className="flex flex-col gap-1">
                  <div className="flex items-center gap-x-3">
                    <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                      <Bot className="h-5 w-5" />
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {t('pricing.features.rsvpChatbot')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                    {t('pricing.features.rsvpChatbotDesc')}
                  </p>
                </li>
              )}
              {plan.customWhatsapp && (!previousPlan || !previousPlan.customWhatsapp) && (
                <li className="flex flex-col gap-1">
                  <div className="flex items-center gap-x-3">
                    <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                      <Phone className="h-5 w-5" />
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {t('pricing.features.customWhatsapp')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                    {t('pricing.features.customWhatsappDesc')}
                  </p>
                </li>
              )}
            </>
          )}
          {isBaseOrSeparatePlan && plan.chatbot.enabled && (
            <li className="flex flex-col gap-1">
              <div className="flex items-center gap-x-3">
                <span className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                  <Bot className="h-5 w-5" />
                </span>
                <span className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  {t('pricing.features.chatbot', {
                    type:
                      plan.chatbot.type === 'basic'
                        ? t('pricing.features.typeBasic')
                        : t('pricing.features.typeCustom'),
                  })}
                  {plan.chatbot.unlimitedInfo &&
                    (!previousPlan || !previousPlan.chatbot.unlimitedInfo) && (
                      <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-700 border-purple-200"
                      >
                        {t('pricing.features.unlimited')}
                      </Badge>
                    )}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                {plan.chatbot.type === 'basic'
                  ? t('pricing.features.chatbotBasicDesc')
                  : t('pricing.features.chatbotCustomDesc')}
              </p>
            </li>
          )}
        </ul>
      </CardContent>
      <CardFooter className="p-6 border-t border-gray-200 dark:border-gray-700 mt-auto">
        {isCurrentPlan ? (
          <Button disabled className="w-full bg-purple-600 hover:bg-purple-700">
            {t('pricing.button.currentPlan')}
          </Button>
        ) : (
          <Link
            href={BOOK_A_MEETING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {t('pricing.button.talkToUs')}
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

PlanCard.displayName = 'PlanCard'; // Add display name to satisfy ESLint rule
