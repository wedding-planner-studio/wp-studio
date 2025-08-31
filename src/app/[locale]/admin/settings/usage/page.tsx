'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { FiArrowLeft, FiDollarSign } from 'react-icons/fi';
import { api } from '@/trpc/react';
import { Skeleton } from '@/components/ui/skeleton';
import { WhatsappIcon } from '@/components/ui/icons';
import { PartyPopper, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import NumberFlow from '@number-flow/react';
import { format } from 'date-fns';
import { OrganizationMessageCredits, MessageCreditType, MessageCreditPool } from '@prisma/client';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Type definition for comprehensive usage data structure
type ComprehensiveUsageData = {
  organizationId: string;
  limits: {
    [key: string]: {
      usage: number;
      limit: number;
      percentage: number;
      isOverLimit: boolean;
      definition: {
        name: string;
        displayName: string;
        description: string;
        defaultValue: number;
        unit: string;
        minValue?: number;
        maxValue?: number;
        relatedFeatures?: string[];
      };
    };
  };
};

// Type definition for processed data used in the component
type DisplayUsageData = {
  messages: {
    usage: number;
    limit: number | 'unlimited';
    percentage: number;
    isOverLimit: boolean;
  };
  events: {
    usage: number;
    limit: number | 'unlimited';
    percentage: number;
    isOverLimit: boolean;
  };
};

// Type for individual usage records from the list API
type UsageRecord = OrganizationMessageCredits;

// Type for the response of the list API
type UsageListResponse = {
  usage: UsageRecord[];
  totalCount: number;
};

const PAGE_SIZE = 10; // Define page size

export default function UsagePage() {
  const { t } = useClientTranslation('common');
  // --- State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [displayData, setDisplayData] = useState<DisplayUsageData | null>(null);

  // --- Data Fetching ---
  // Get current organization info to get the organizationId
  const { data: orgData } = api.organization.get.useQuery();

  // Fetch comprehensive usage data
  const {
    data: comprehensiveUsageData,
    isLoading: isLoadingSummary,
    error: summaryError,
  } = api.usage.getComprehensiveUsage.useQuery(
    { organizationId: orgData?.organization?.id ?? '' },
    { enabled: !!orgData?.organization?.id }
  );

  // Fetch detailed usage list with pagination params
  const {
    data: usageListData,
    isLoading: isLoadingList,
    error: listError,
  } = api.usage.getUsage.useQuery({
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
    orderDirection: 'desc',
  });

  // --- Effects ---
  useEffect(() => {
    const apiData = comprehensiveUsageData as ComprehensiveUsageData | undefined | null;

    if (apiData?.limits) {
      const whatsappMsgsData = apiData.limits['whatsappMsgs'];
      const activeEventsData = apiData.limits['activeEvents'];

      const processedData: DisplayUsageData = {
        messages: {
          usage: whatsappMsgsData?.usage ?? 0,
          limit:
            whatsappMsgsData?.limit === Infinity ? 'unlimited' : (whatsappMsgsData?.limit ?? 0),
          percentage: whatsappMsgsData?.percentage ?? 0,
          isOverLimit: whatsappMsgsData?.isOverLimit ?? false,
        },
        events: {
          usage: activeEventsData?.usage ?? 0,
          limit:
            activeEventsData?.limit === Infinity ? 'unlimited' : (activeEventsData?.limit ?? 0),
          percentage: activeEventsData?.percentage ?? 0,
          isOverLimit: activeEventsData?.isOverLimit ?? false,
        },
      };
      setDisplayData(processedData);
    }
  }, [comprehensiveUsageData]);

  // --- Helpers ---
  const calculateProgress = (percentage: number): number => {
    return Math.min(100, Math.max(0, percentage));
  };

  const formatLimit = (limit: number | 'unlimited'): string => {
    if (typeof limit === 'string') return limit;
    if (limit === Infinity) return '∞';
    return limit.toLocaleString();
  };

  const formatRecordType = (type: MessageCreditType): string => {
    switch (type) {
      case MessageCreditType.TOP_UP:
        return t('usage.types.creditsAdded');
      case MessageCreditType.CONSUMPTION:
        return t('usage.types.messageSent');
      default:
        return type;
    }
  };

  const formatConsumedFrom = (pool: MessageCreditPool | null | undefined): string => {
    if (!pool) return '-';
    switch (pool) {
      case MessageCreditPool.ALLOWANCE:
        return t('usage.pools.allowance');
      case MessageCreditPool.PURCHASED:
        return t('usage.pools.purchased');
      default:
        return pool;
    }
  };

  // Pagination calculations
  const totalCount = usageListData?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const usageList = usageListData?.usage ?? [];

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  // --- Render ---
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-12 md:px-6 lg:py-8">
        {/* Navigation & Header */}
        <div className="mb-2 shrink-0">
          <Link href="/admin/settings">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 h-8 px-2 -ml-2">
              <FiArrowLeft className="mr-1.5 h-4 w-4" />
              <span className="text-xs">{t('usage.backToSettings')}</span>
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">{t('usage.title')}</h1>
            <p className="text-gray-600">{t('usage.subtitle')}</p>
          </div>
        </div>

        {/* Summary Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Message Usage Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('usage.messageSummary.title')}</CardTitle>
              <CardDescription>{t('usage.messageSummary.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSummary ? (
                <>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                </>
              ) : summaryError ? (
                <p className="text-red-600">{t('usage.errors.messageSummary')}</p>
              ) : displayData ? (
                <>
                  {/* Message Usage Row */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <WhatsappIcon className="size-4 text-neutral-600" />
                        <span className="text-sm font-medium text-neutral-700">
                          {t('usage.messageSummary.monthlyAllowance')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-neutral-600">
                        <NumberFlow value={displayData.messages.usage} /> /{' '}
                        {formatLimit(displayData.messages.limit)}
                      </span>
                    </div>
                    {typeof displayData.messages.limit === 'number' &&
                      displayData.messages.limit !== Infinity && (
                        <Progress
                          value={calculateProgress(displayData.messages.percentage)}
                          className="h-1.5"
                        />
                      )}
                    <p className="text-xs text-gray-500 mt-1">
                      {displayData.messages.isOverLimit ? (
                        <span className="text-red-600">Over limit</span>
                      ) : (
                        <>
                          <NumberFlow
                            value={
                              typeof displayData.messages.limit === 'number'
                                ? Math.max(
                                    0,
                                    displayData.messages.limit - displayData.messages.usage
                                  )
                                : 0
                            }
                          />{' '}
                          remaining this cycle
                        </>
                      )}
                    </p>
                  </div>

                  {/* Purchase More Messages Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FiDollarSign className="size-4 text-neutral-600" />
                        <span className="text-sm font-medium text-neutral-700">
                          Need More Messages?
                        </span>
                      </div>
                      <Link href="/admin/settings/campaign-messages">
                        <Button variant="outline" size="sm" className="h-7">
                          Purchase More
                        </Button>
                      </Link>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Active Events Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{t('usage.activeEvents.title')}</CardTitle>
              <CardDescription className="text-sm">
                {t('usage.activeEvents.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingSummary ? (
                <Skeleton className="h-8 w-full" />
              ) : summaryError ? (
                <p className="text-red-600">{t('usage.errors.eventSummary')}</p>
              ) : displayData ? (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <PartyPopper className="size-3.5 text-neutral-600" />
                      <span className="text-sm font-medium text-neutral-700">
                        {t('usage.activeEvents.label')}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-neutral-600">
                      <NumberFlow value={displayData.events.usage} /> /{' '}
                      {formatLimit(displayData.events.limit)}
                    </span>
                  </div>
                  {typeof displayData.events.limit === 'number' &&
                    displayData.events.limit !== Infinity && (
                      <Progress
                        value={calculateProgress(displayData.events.percentage)}
                        className="h-1.5"
                      />
                    )}
                  <p className="text-xs text-gray-500 mt-1">
                    {displayData.events.isOverLimit ? (
                      <span className="text-red-600">Over limit</span>
                    ) : (
                      <>
                        <NumberFlow
                          value={
                            typeof displayData.events.limit === 'number'
                              ? Math.max(0, displayData.events.limit - displayData.events.usage)
                              : 0
                          }
                        />{' '}
                        remaining
                      </>
                    )}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Usage History Table Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('usage.history.title')}</CardTitle>
            <CardDescription>{t('usage.history.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('usage.history.table.date')}</TableHead>
                    <TableHead>{t('usage.history.table.type')}</TableHead>
                    <TableHead>{t('usage.history.table.source')}</TableHead>
                    <TableHead className="text-right">{t('usage.history.table.amount')}</TableHead>
                    <TableHead>{t('usage.history.table.messageSid')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingList ? (
                    Array.from({ length: PAGE_SIZE }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : listError ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-red-600 h-24">
                        {t('usage.errors.history')}
                      </TableCell>
                    </TableRow>
                  ) : usageList && usageList.length > 0 ? (
                    usageList.map((record: UsageRecord) => (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(record.createdAt), 'PP pp')}
                        </TableCell>
                        <TableCell>{formatRecordType(record.type)}</TableCell>
                        <TableCell>
                          {record.type === MessageCreditType.CONSUMPTION
                            ? formatConsumedFrom(record.consumedFromPool)
                            : '-'}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-medium whitespace-nowrap',
                            record.type === MessageCreditType.TOP_UP
                              ? 'text-green-600'
                              : 'text-red-600'
                          )}
                        >
                          {record.type === MessageCreditType.TOP_UP ? '+' : ''}
                          {record.credits}
                        </TableCell>
                        <TableCell
                          className="text-xs text-gray-500 font-mono truncate max-w-[150px]"
                          title={record.relatedMessageSid ?? 'N/A'}
                        >
                          {record.relatedMessageSid ?? 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 h-24">
                        {t('usage.errors.noHistory')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">
                  {t('usage.pagination.page', { current: currentPage, total: totalPages })}
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || isLoadingList}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('usage.pagination.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || isLoadingList}
                  >
                    {t('usage.pagination.next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
