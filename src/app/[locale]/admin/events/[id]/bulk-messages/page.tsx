'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { FiSearch, FiPlus, FiX, FiArrowLeft } from 'react-icons/fi';
import { api } from '@/trpc/react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useRoleBasedPermission } from '@/hooks/useRoleBasedPermission';
import { RefreshCcw } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localeData);

export default function BulkMessagesPage() {
  const { t } = useClientTranslation();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const locale = params.locale as string;
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<
    'CREATED' | 'SENDING' | 'COMPLETED' | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const { hasPermission: canSendBulkMessages } = useRoleBasedPermission('bulkMessages', 'create');

  // Set the locale for dayjs
  useEffect(() => {
    dayjs.locale(locale === 'es' ? 'es' : 'en');
  }, [locale]);

  // Fetch bulk messages data with search and status filter
  const { data, isLoading } = api.bulkMessages.getAll.useQuery({
    eventId,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: activeSearch,
    status: activeStatusFilter ?? undefined,
  });

  // Fetch delivery stats by bulk message IDs
  const {
    data: deliveryStats,
    refetch: refetchDeliveryStats,
    isFetching: isRefetchingDeliveryStats,
    isFetched: isFetchedDeliveryStats,
  } = api.bulkMessages.getDeliveryStatsByIds.useQuery({
    ids: data?.messages.map(message => message.id) ?? [],
  });

  // Fetch event details
  const { data: eventData } = api.events.getById.useQuery({ id: eventId });

  const handleApplyFilter = () => {
    setActiveSearch(searchInput.trim());
  };

  const handleClearFilter = () => {
    setSearchInput('');
    setActiveSearch('');
  };

  const handleStatusFilter = (status: 'CREATED' | 'SENDING' | 'COMPLETED' | null) => {
    setActiveStatusFilter(status);
  };

  const handleView = (bulkMessageId: string) => {
    router.push(`/admin/events/${eventId}/bulk-messages/${bulkMessageId}`);
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-emerald-600 bg-emerald-50';
      case 'sending':
        return 'text-amber-600 bg-amber-50';
      case 'created':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const totalPages = data ? Math.ceil(data.meta.total / ITEMS_PER_PAGE) : 0;

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto px-6 py-8 min-h-[calc(100vh-10px)]">
        {/* Navigation */}
        <div className="mb-2">
          <Button
            variant="ghost"
            onClick={() => router.push(`/admin/events/${eventId}`)}
            className="text-gray-600 hover:text-gray-900 h-8 px-2 -ml-2"
          >
            <FiArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="text-xs">{t('events.backToEvents')}</span>
          </Button>
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">{eventData?.name}</h1>
            <div className="flex flex-col">
              <p className="text-base text-gray-700 mb-1">
                {eventData?.person1} <span className="text-gray-400">&</span> {eventData?.person2}
              </p>
              <p className="text-sm text-gray-500">
                {eventData?.date && eventData?.startTime && (
                  <>
                    {t('eventDetail.dateTime', {
                      date: dayjs(eventData.date)
                        .utc()
                        .tz(eventData.timezone || 'America/Mexico_City')
                        .format('dddd, MMMM D, YYYY'),
                      time: eventData.startTime,
                    })}
                  </>
                )}
              </p>
            </div>
          </div>
          {canSendBulkMessages && (
            <div className="flex gap-3">
              <Button onClick={() => router.push(`/admin/events/${eventId}/bulk-messages/new`)}>
                <FiPlus className="mr-1.5 h-4 w-4" />
                {t('bulkMessages.newMessage')}
              </Button>
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="flex gap-3 mb-6">
          <div className="text-sm text-gray-500">{t('bulkMessages.total', { count: data?.stats.total ?? 0 })}</div>
          <div className="text-gray-300">•</div>
          <button
            onClick={() =>
              handleStatusFilter(activeStatusFilter === 'COMPLETED' ? null : 'COMPLETED')
            }
            className={cn(
              'text-sm',
              activeStatusFilter === 'COMPLETED'
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-emerald-600'
            )}
          >
            {t('bulkMessages.completed', { count: data?.stats.completed ?? 0 })}
          </button>
          <div className="text-gray-300">•</div>
          <button
            onClick={() => handleStatusFilter(activeStatusFilter === 'SENDING' ? null : 'SENDING')}
            className={cn(
              'text-sm',
              activeStatusFilter === 'SENDING'
                ? 'text-amber-600'
                : 'text-gray-500 hover:text-amber-600'
            )}
          >
            {t('bulkMessages.sending', { count: data?.stats.sending ?? 0 })}
          </button>
          <div className="text-gray-300">•</div>
          <button
            onClick={() => handleStatusFilter(activeStatusFilter === 'CREATED' ? null : 'CREATED')}
            className={cn(
              'text-sm',
              activeStatusFilter === 'CREATED'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-blue-600'
            )}
          >
            {t('bulkMessages.created', { count: data?.stats.created ?? 0 })}
          </button>
        </div>

        {/* Search Section */}
        <div className="flex justify-between mb-6 items-center">
          <div className="relative">
            <Input
              placeholder={t('bulkMessages.searchPlaceholder')}
              className="w-[300px] pl-9 py-1.5 text-sm"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleApplyFilter();
                }
              }}
            />
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            {searchInput && (
              <button
                onClick={handleClearFilter}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Messages Table */}
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,80px,1fr] gap-6 px-6 py-2 border-b border-gray-200">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              {t('bulkMessages.table.name')}
            </div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              {t('bulkMessages.table.template')}
            </div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              {t('bulkMessages.table.recipients')}
            </div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              {t('bulkMessages.table.createdBy')}
            </div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              {t('bulkMessages.table.createdAt')}
            </div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              {t('bulkMessages.table.status')}
            </div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              {t('bulkMessages.table.deliveryStats')}
            </div>
          </div>

          {/* Table Body */}
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Spinner className="w-8 h-8 text-purple-500" />
            </div>
          ) : !data?.messages || data.messages.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-xs">{t('bulkMessages.noMessages')}</div>
          ) : (
            data.messages.map((message, index) => {
              const stats = deliveryStats?.get(message.id);
              const deliveredCount = stats?.delivered ?? 0;
              const pendingCount = stats?.pending ?? 0;
              const failedCount = stats?.failed ?? 0;
              const sentCount = stats?.sent ?? 0;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'grid grid-cols-[2fr,1fr,1fr,1fr,1fr,80px,1fr] gap-6 px-6 items-center hover:bg-gray-50/50 h-10 cursor-pointer group',
                    index < data.messages.length - 1 && 'border-b border-gray-200'
                  )}
                  onClick={() => handleView(message.id)}
                >
                  <div className="text-xs text-gray-900">{message.name}</div>
                  <div className="text-xs text-gray-600 font-mono text-purple-500 bg-purple-50 rounded-md px-1.5">
                    {message.templateName}
                  </div>
                  <div className="text-xs text-gray-900">{message._count?.deliveries}</div>
                  <div className="text-xs text-gray-600">
                    {message.createdBy.firstName} {message.createdBy.lastName}
                  </div>
                  <div className="text-xs text-gray-600">
                    {format(new Date(message.createdAt), 'MMM d, yyyy')}
                  </div>
                  <div>
                    <Badge
                      variant="secondary"
                      className={cn('text-[11px] font-medium', getStatusColor(message.status))}
                    >
                      {message.status.charAt(0) + message.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 flex items-center justify-between">
                    <TooltipProvider delayDuration={100}>
                      <div className="flex items-center space-x-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-neutral-400 font-medium">{pendingCount}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('bulkMessages.stats.pending')}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-gray-500 text-xs opacity-50 ">|</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-blue-600 font-medium">{sentCount}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('bulkMessages.stats.sent')}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-gray-500 text-xs opacity-50">|</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-emerald-600 font-medium">{deliveredCount}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('bulkMessages.stats.delivered')}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-gray-500 text-xs opacity-50">|</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-red-600 font-medium">{failedCount}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('bulkMessages.stats.failed')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        refetchDeliveryStats();
                      }}
                      className="text-gray-500 text-xs opacity-50 hidden group-hover:block"
                    >
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <RefreshCcw
                              className={cn(
                                'h-3 w-5',
                                isRefetchingDeliveryStats &&
                                  isFetchedDeliveryStats &&
                                  'animate-spin'
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('bulkMessages.stats.refresh')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination */}
          {data && data.meta.total > ITEMS_PER_PAGE && (
            <div className="flex justify-center items-center py-4 border-t border-gray-200">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {t('bulkMessages.pagination.previous')}
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    size="sm"
                    variant={currentPage === page ? 'default' : 'ghost'}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t('bulkMessages.pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
