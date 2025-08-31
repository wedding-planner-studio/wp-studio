'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  FiSearch,
  FiX,
  FiArrowLeft,
  FiCheck,
  FiRefreshCw,
  FiClock,
  FiChevronDown,
} from 'react-icons/fi';
import { api } from '@/trpc/react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { WhatsAppPreview } from '../new/_components/whatsapp-preview';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

export default function BulkMessageDetailPage() {
  const { t } = useClientTranslation();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const messageId = params.messageId as string;
  const locale = params.locale as string;
  const [selectedDeliveries, setSelectedDeliveries] = useState<Set<string>>(new Set());
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [showDetailCard, setShowDetailCard] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<
    'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [isStatusBannerOpen, setIsStatusBannerOpen] = useState(true);

  // Fetch bulk message details
  const utils = api.useUtils();
  const { data, isLoading } = api.bulkMessages.getById.useQuery({
    id: messageId,
  });

  // Add template query
  const { data: templateData } = api.whatsapp.getTemplateById.useQuery(
    { id: data?.templateSid ?? '' },
    { enabled: !!data?.templateSid }
  );

  // Add delivery query
  const { data: selectedDelivery } = api.bulkMessages.getDeliveryById.useQuery(
    { id: selectedDeliveryId ?? '' },
    { enabled: !!selectedDeliveryId }
  );

  // Add guest query
  const { data: guestData } = api.guests.getById.useQuery(
    { id: selectedDelivery?.guestId ?? '' },
    { enabled: !!selectedDelivery?.guestId }
  );

  // Add retry mutation
  const retryMutation = api.bulkMessages.retryDeliveries.useMutation({
    onSuccess: () => {
      toast.success('Messages queued for retry');
      setSelectedDeliveries(new Set());
      // Refresh the data
      utils.bulkMessages.getById.invalidate({ id: messageId });
    },
  });

  const handleApplyFilter = () => {
    setActiveSearch(searchInput.trim());
  };

  const handleClearFilter = () => {
    setSearchInput('');
    setActiveSearch('');
  };

  const handleStatusFilter = (status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | null) => {
    setActiveStatusFilter(status);
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'read':
        return 'text-emerald-600 bg-emerald-50';
      case 'pending':
        return 'text-amber-600 bg-amber-50';
      case 'queued':
      case 'sent':
        return 'text-blue-600 bg-blue-50';
      case 'failed':
        return 'text-rose-600 bg-rose-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Add this function to render status indicators
  const renderStatusIndicator = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return (
          <div className="flex items-center space-x-1">
            <span className="flex -space-x-1">
              <FiCheck className="h-3 w-3 text-gray-500 font-bold" />
              <FiCheck className="h-3 w-3 text-gray-500 font-bold -translate-x-1" />
            </span>
            <span>Delivered</span>
          </div>
        );
      case 'read':
        return (
          <div className="flex items-center space-x-1">
            <span className="flex -space-x-1">
              <FiCheck className="h-3 w-3 text-blue-500 font-bold" />
              <FiCheck className="h-3 w-3 text-blue-500 font-bold -translate-x-1" />
            </span>
            <span>Read</span>
          </div>
        );
      case 'sent':
      case 'queued':
        return (
          <div className="flex items-center space-x-1">
            <FiCheck className="h-3 w-3 text-gray-500" />
            <span>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
          </div>
        );
      default:
        return <span>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
    }
  };

  const getEquivalentStatus = (status: string): string[] => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'queued':
        return ['PENDING', 'QUEUED'];
      case 'delivered':
      case 'read':
        return ['DELIVERED', 'READ'];
      case 'failed':
        return ['FAILED'];
      case 'sent':
        return ['SENT'];
      default:
        return [status];
    }
  };

  // Filter deliveries based on search and status
  const filteredDeliveries = data?.deliveries.filter(delivery => {
    const matchesSearch =
      !activeSearch ||
      delivery.guest.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
      delivery.guest.phone?.toLowerCase().includes(activeSearch.toLowerCase());

    const matchesStatus =
      !activeStatusFilter || getEquivalentStatus(delivery.status).includes(activeStatusFilter);

    return matchesSearch && matchesStatus;
  });

  const paginatedDeliveries = filteredDeliveries?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = filteredDeliveries ? Math.ceil(filteredDeliveries.length / ITEMS_PER_PAGE) : 0;

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleSelectDelivery = (deliveryId: string) => {
    setSelectedDeliveries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deliveryId)) {
        newSet.delete(deliveryId);
      } else {
        newSet.add(deliveryId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!paginatedDeliveries) return;

    if (selectedDeliveries.size === paginatedDeliveries.length) {
      setSelectedDeliveries(new Set());
    } else {
      const newSelected = new Set(paginatedDeliveries.map(d => d.id));
      setSelectedDeliveries(newSelected);
    }
  };

  const handleRetrySelected = () => {
    const deliveryIds = Array.from(selectedDeliveries);
    retryMutation.mutate({ deliveryIds });
  };

  // Get count of retryable messages (failed or pending)
  const retryableCount = Array.from(selectedDeliveries).filter(id => {
    const delivery = paginatedDeliveries?.find(d => d.id === id);
    return delivery && ['FAILED', 'PENDING'].includes(delivery.status);
  }).length;

  // Handle row click to show detail card
  const handleRowClick = (deliveryId: string) => {
    const delivery = data?.deliveries.find(d => d.id === deliveryId);
    if (delivery) {
      // For mobile screens, use modal
      if (window.innerWidth < 1024) {
        // TODO: Implement mobile view if needed
        return;
      }

      // For desktop screens, use side panel
      if (selectedDeliveryId === deliveryId) {
        // Toggle off if clicking the same row
        setSelectedDeliveryId(null);
        setShowDetailCard(false);
      } else {
        setSelectedDeliveryId(deliveryId);
        setShowDetailCard(true);
      }
    }
  };

  // Close detail card
  const handleCloseDetailCard = () => {
    setShowDetailCard(false);
    setSelectedDeliveryId(null);
  };

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto px-6 py-8 min-h-[calc(100vh-10px)]">
        {/* Navigation */}
        <div className="mb-2">
          <Button
            variant="ghost"
            onClick={() => router.push(`/admin/events/${eventId}/bulk-messages`)}
            className="text-gray-600 hover:text-gray-900 h-8 px-2 -ml-2"
          >
            <FiArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="text-xs">{t('bulkMessages.detail.backToMessages')}</span>
          </Button>
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">{data?.name}</h1>
            <div className="flex flex-col">
              <p className="text-base text-gray-700 mb-1">{data?.event.name}</p>
              <p className="text-sm text-gray-500">
                {t('templateSelection.createdBy')} {data?.createdBy.firstName} {data?.createdBy.lastName} •{' '}
                {data?.event.date && format(new Date(data.event.date), 'EEEE, MMMM do yyyy')}
              </p>
            </div>
          </div>  
        </div>

        {/* Stats Section */}
        <div className="flex gap-3 mb-6">
          <div className="text-sm text-gray-500">{t('bulkMessages.detail.totalMessages', { count: data?.stats.total ?? 0 })}</div>
          <div className="text-gray-300">•</div>
          <button
            onClick={() => handleStatusFilter(activeStatusFilter === 'SENT' ? null : 'SENT')}
            className="text-sm text-gray-500"
          >
            {t('bulkMessages.detail.sent', { count: data?.stats.sent ?? 0 })}
          </button>
          <div className="text-gray-300">•</div>
          <button
            onClick={() => handleStatusFilter(activeStatusFilter === 'DELIVERED' ? null : 'DELIVERED')}
            className={cn(
              'text-sm',
              activeStatusFilter === 'DELIVERED'
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-emerald-600'
            )}
          >
            {t('bulkMessages.detail.delivered', { count: data?.stats.delivered ?? 0 })}
          </button>
          <div className="text-gray-300">•</div>
          <button
            onClick={() => handleStatusFilter(activeStatusFilter === 'PENDING' ? null : 'PENDING')}
            className={cn(
              'text-sm',
              activeStatusFilter === 'PENDING'
                ? 'text-amber-600'
                : 'text-gray-500 hover:text-amber-600'
            )}
          >
            {t('bulkMessages.detail.pending', { count: data?.stats.pending ?? 0 })}
          </button>
          <div className="text-gray-300">•</div>
          <button
            onClick={() => handleStatusFilter(activeStatusFilter === 'FAILED' ? null : 'FAILED')}
            className={cn(
              'text-sm',
              activeStatusFilter === 'FAILED'
                ? 'text-rose-600'
                : 'text-gray-500 hover:text-rose-600'
            )}
          >
            {t('bulkMessages.detail.failed', { count: data?.stats.failed ?? 0 })}
          </button>
        </div>

        {/* Search Section */}
        <div className="flex justify-between mb-6 items-center">
          <div className="relative">
            <Input
              placeholder={t('bulkMessages.detail.searchGuests')}
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

        {/* Deliveries Table with Detail Card */}
        <div className="flex">
          {/* Main table container - shrinks when detail card is shown on desktop */}
          <div
            className={cn(
              'bg-white rounded-lg transition-all duration-300 ease-in-out overflow-hidden overflow-x-auto',
              showDetailCard ? 'lg:w-[60%]' : 'w-full'
            )}
          >
            {/* Table Header */}
            <div className="grid grid-cols-[auto_minmax(200px,1.5fr)_minmax(150px,1fr)_minmax(100px,0.7fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(200px,1.5fr)] gap-4 px-6 py-2 border-b border-gray-200">
              <div className="flex items-center">
                <Checkbox
                  checked={paginatedDeliveries?.length === selectedDeliveries.size}
                  onCheckedChange={handleSelectAll}
                />
              </div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                {t('bulkMessages.detail.guestName')}
              </div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                {t('bulkMessages.detail.phone')}
              </div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                {t('bulkMessages.detail.status')}
              </div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                {t('bulkMessages.detail.deliveredAt')}
              </div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                {t('bulkMessages.detail.readAt')}
              </div>
              <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                {t('bulkMessages.detail.errorMessage')}
              </div>
            </div>

            {/* Table Body */}
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <Spinner className="w-8 h-8 text-purple-500" />
              </div>
            ) : !paginatedDeliveries || paginatedDeliveries.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs">{t('bulkMessages.detail.noDeliveries')}</div>
            ) : (
              paginatedDeliveries.map((delivery, index) => (
                <div
                  key={delivery.id}
                  className={cn(
                    'cursor-pointer grid grid-cols-[auto_minmax(200px,1.5fr)_minmax(150px,1fr)_minmax(100px,0.7fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(200px,1.5fr)] gap-4 px-6 py-2.5 items-center hover:bg-gray-50/50',
                    index < paginatedDeliveries.length - 1 && 'border-b border-gray-200',
                    selectedDeliveryId === delivery.id && 'bg-purple-50/50'
                  )}
                  onClick={() => handleRowClick(delivery.id)}
                >
                  <div className="flex items-center">
                    <Checkbox
                      onClick={e => e.stopPropagation()}
                      onChange={e => e.stopPropagation()}
                      checked={selectedDeliveries.has(delivery.id)}
                      onCheckedChange={() => handleSelectDelivery(delivery.id)}
                    />
                  </div>
                  <div className="text-xs text-gray-900">{delivery.guest.name}</div>
                  <div className="text-xs text-gray-600">{delivery.guest.phone}</div>
                  <div>
                    <Badge
                      variant="secondary"
                      className={cn('text-[11px] font-medium', getStatusColor(delivery.status))}
                    >
                      {renderStatusIndicator(delivery.status)}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    {delivery.deliveredAt
                      ? format(new Date(delivery.deliveredAt), 'MMM d, h:mm a')
                      : '—'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {delivery.readAt ? format(new Date(delivery.readAt), 'MMM d, h:mm a') : '—'}
                  </div>
                  <div
                    className={cn(
                      'text-xs',
                      delivery.errorMessage ? 'text-rose-500' : 'text-gray-500'
                    )}
                  >
                    {delivery.errorMessage ?? 'No errors'}
                  </div>
                </div>
              ))
            )}

            {/* Pagination */}
            {filteredDeliveries && filteredDeliveries.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center items-center py-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    {t('bulkMessages.detail.previous')}
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
                    {t('bulkMessages.detail.next')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Detail Card - Only shown on desktop */}
          <div
            className={cn(
              'hidden lg:block ml-4 bg-white rounded-lg border border-gray-200 h-fit transition-all duration-300 ease-in-out sticky top-4',
              showDetailCard
                ? 'w-[40%] opacity-100 translate-x-0'
                : 'w-0 opacity-0 translate-x-10 hidden'
            )}
          >
            {selectedDeliveryId && selectedDelivery && templateData && (
              <div className="flex flex-col">
                {/* WhatsApp Header */}
                <div className="bg-[#1E2321] px-4 py-3 flex items-center justify-between rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-medium">
                      {guestData?.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{guestData?.name}</p>
                      <p className="text-[#8FA0A5] text-xs">{guestData?.phone}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseDetailCard}
                    className="text-gray-300 hover:text-white"
                  >
                    <FiX className="h-4 w-4" />
                  </Button>
                </div>
                {/* Message Info */}
                <div className="bg-[#E7DFD4] flex-1 p-4 pb-20 rounded-b-md">
                  {/* Status Banner */}
                  <div className="bg-white/90 backdrop-blur-sm mb-4 rounded-md shadow-sm overflow-hidden">
                    <button
                      onClick={() => setIsStatusBannerOpen(!isStatusBannerOpen)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[11px] font-medium',
                            getStatusColor(selectedDelivery.status)
                          )}
                        >
                          {renderStatusIndicator(selectedDelivery.status)}
                        </Badge>
                        <span className="text-[13px] text-gray-600">{t('bulkMessages.detail.messageInfo')}</span>
                      </div>
                      <FiChevronDown
                        className={cn(
                          'h-4 w-4 text-gray-600 transition-transform duration-200',
                          isStatusBannerOpen ? 'transform rotate-180' : ''
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        'transition-all duration-200 ease-in-out',
                        isStatusBannerOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                      )}
                    >
                      <div className="px-4 py-2 space-y-1 text-[13px] border-t border-gray-100">
                        {selectedDelivery.queuedAt && (
                          <div className="flex items-center text-gray-600 text-xs justify-between">
                            <span className="flex -space-x-1 mr-2 items-center">
                              <FiClock className="h-3 w-3 text-gray-500 mr-2" />
                              {t('bulkMessages.detail.queued')}{' '}
                            </span>
                            <span>
                              {format(new Date(selectedDelivery.queuedAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        )}
                        {selectedDelivery.sentAt && (
                          <div className="flex items-center text-gray-600 text-xs justify-between">
                            <span className="flex -space-x-1 mr-2 items-center">
                              <FiCheck className="h-3 w-3 text-gray-500 mr-2" />
                              {t('bulkMessages.detail.sent')}{' '}
                            </span>
                            <span>
                              {format(new Date(selectedDelivery.sentAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        )}
                        {selectedDelivery.deliveredAt && (
                          <div className="flex items-center text-gray-600 text-xs justify-between">
                            <span className="flex -space-x-1 mr-2 items-center">
                              <FiCheck className="h-3 w-3 text-gray-500" />
                              <FiCheck className="h-3 w-3 text-gray-500 -translate-x-1" />
                              {t('bulkMessages.detail.delivered')}{' '}
                            </span>
                            <span>
                              {format(new Date(selectedDelivery.deliveredAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        )}
                        {selectedDelivery.readAt && (
                          <div className="flex items-center text-gray-600 text-xs justify-between">
                            <span className="flex -space-x-1 mr-2 items-center">
                              <FiCheck className="h-3 w-3 text-blue-500" />
                              <FiCheck className="h-3 w-3 text-blue-500 -translate-x-1" />
                              {t('bulkMessages.detail.read')}
                            </span>
                            <span>
                              {format(new Date(selectedDelivery.readAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        )}
                        {selectedDelivery.errorMessage && (
                          <div className="flex items-center text-rose-600 bg-rose-50 rounded-md px-3 py-2 mt-2">
                            <FiX className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="text-[12px]">{selectedDelivery.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Preview */}
                  <div className="bg-[#E7DFD4]">
                    <WhatsAppPreview
                      className="overflow-y-auto"
                      attachments={[]}
                      templateVariables={selectedDelivery?.variables as Record<string, string>}
                      selectedTemplate={{
                        sid: templateData.sid,
                        name: templateData.name,
                        description: templateData.description,
                        variables: templateData.variables,
                        language: templateData.language,
                        approvalStatus: templateData.status,
                        category: templateData.category,
                        media: templateData.media,
                      }}
                      dataToDisplay={guestData}
                      displayAs={
                        selectedDelivery.status === 'QUEUED'
                          ? 'sent'
                          : selectedDelivery.status === 'DELIVERED'
                            ? 'delivered'
                            : 'read'
                      }
                      readAt={selectedDelivery.readAt}
                      deliveredAt={selectedDelivery.deliveredAt}
                      sentAt={
                        selectedDelivery.status === 'DELIVERED'
                          ? selectedDelivery.deliveredAt
                          : selectedDelivery.queuedAt
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Toolbar */}
        {selectedDeliveries.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {t('bulkMessages.detail.messagesSelected', { 
                count: selectedDeliveries.size,
                plural: selectedDeliveries.size > 1 ? 's' : ''
              })}
            </span>
            {retryableCount > 0 && (
              <Button
                size="sm"
                onClick={handleRetrySelected}
                disabled={retryMutation.isPending}
                className="flex items-center gap-2"
              >
                <FiRefreshCw className={cn('h-4 w-4', retryMutation.isPending && 'animate-spin')} />
                {t('bulkMessages.detail.retryMessages', {
                  count: retryableCount,
                  plural: retryableCount > 1 ? 's' : ''
                })}
              </Button>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
