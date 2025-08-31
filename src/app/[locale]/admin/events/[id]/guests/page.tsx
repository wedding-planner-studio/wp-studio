'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'react-hot-toast';
import { GuestPriority, GuestStatus } from '@prisma/client';
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DropdownMenuLabel,
} from '@/components/ui';
import {
  Search,
  Plus,
  X,
  Check,
  Clock,
  Upload,
  ChevronDown,
  ArrowLeft,
  MessageSquare,
  LucideMenu,
  Download,
  AlertCircleIcon,
  ChevronRight,
} from 'lucide-react';
import { ImFileExcel } from 'react-icons/im';
import { BsFiletypeCsv } from 'react-icons/bs';
import { cn, parsePhoneNumber } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import BulkUploadModal from '@/components/modals/bulk-upload-modal';
import GuestModal from '@/components/modals/guest-modal';
import GuestForm from '@/components/guests/GuestForm';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import * as XLSX from 'xlsx';
import { useRoleBasedPermission } from '@/hooks/useRoleBasedPermission';
import RelatedGuestsList from '@/components/guests/RelatedGuestsList';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

dayjs.extend(utc);
dayjs.extend(timezone);

function TableRowSkeleton() {
  return (
    <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,1fr,80px] gap-4 px-4 py-2.5 items-center border-b border-gray-200">
      <div className="flex items-center gap-2">
        <div className="h-4 bg-gray-200/75 rounded-md w-32 animate-pulse" />
      </div>
      <div className="h-4 bg-gray-200/75 rounded-md w-28 animate-pulse" />
      <div className="h-4 bg-gray-200/75 rounded-md w-16 animate-pulse" />
      <div className="h-4 bg-gray-200/75 rounded-md w-6 animate-pulse" />
      <div className="h-4 bg-gray-200/75 rounded-md w-8 animate-pulse" />
      <div className="h-4 bg-gray-200/75 rounded-md w-24 animate-pulse" />
      <div>
        <div className="h-5 bg-gray-200/75 rounded-full w-20 animate-pulse" />
      </div>
      <div className="flex justify-end">
        <div className="h-6 w-6 bg-gray-200/75 rounded-md animate-pulse" />
      </div>
    </div>
  );
}

export default function GuestsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { t } = useClientTranslation('common');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [activeRsvpFilter, setActiveRsvpFilter] = useState<
    'CONFIRMED' | 'PENDING' | 'DECLINED' | null
  >(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const ITEMS_PER_PAGE_OPTIONS = [20, 50, 100, 'all'];

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);

  // Hover detail card state
  const [showDetailCard, setShowDetailCard] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  // Permissions
  const { hasPermission: hasPermissionToCreateGuest } = useRoleBasedPermission('guests', 'create');

  const utils = api.useUtils();

  // Fetch all guests with their related guests
  const { data, isLoading, refetch } = api.guests.getAll.useQuery(
    {
      eventId,
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearch,
      rsvpStatus: activeRsvpFilter ?? undefined,
      includeInactive,
    },
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  );

  // Fetch custom categories
  const { data: customCategories } = api.events.getCustomGuestCategories.useQuery(
    {
      eventId,
    },
    {
      enabled: !!eventId,
    }
  );

  // Reset page when filters or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeRsvpFilter, includeInactive, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (value: string) => {
    if (value === 'all') {
      setItemsPerPage(Math.min(data?.stats.total ?? 10000, 5000));
    } else {
      setItemsPerPage(Number(value));
    }
  };

  // Fetch event details
  const { data: eventData } = api.events.getById.useQuery({ id: eventId });

  // Delete guest mutation
  const deleteMutation = api.guests.delete.useMutation({
    onSuccess: () => {
      toast.success(t('guests.notifications.guestDeleted'));
      void utils.guests.getPartyDetails.invalidate();
      void utils.guests.getById.invalidate();
      void refetch();
    },
    onError: error => {
      toast.error(error.message || t('guests.notifications.deleteError'));
    },
  });

  // Update guest status mutation
  const updateMutation = api.guests.update.useMutation({
    onSuccess: () => {
      void refetch();
    },
    onError: e => {
      toast.error(e.message || t('guests.notifications.updateError'));
    },
  });

  // Create guest mutation
  const createGuest = api.guests.create.useMutation({
    onSuccess: () => {
      void refetch();
    },
    onError: () => {
      toast.error(t('guests.notifications.createError'));
    },
  });

  // Additional query to fetch a single guest by ID when needed
  const [guestToFetch, setGuestToFetch] = useState<string | null>(null);
  const { data: singleGuestData, isLoading: isSingleGuestLoading } = api.guests.getById.useQuery(
    { id: guestToFetch ?? '' },
    {
      enabled: !!guestToFetch,
      refetchOnWindowFocus: false,
    }
  );

  // Handle the result of singleGuestData loading
  useEffect(() => {
    if (guestToFetch && singleGuestData) {
      setSelectedGuest(singleGuestData);
      setShowDetailCard(true);
      setGuestToFetch(null);
    }
  }, [singleGuestData, guestToFetch]);

  const handleClearFilter = () => {
    setSearchInput('');
  };

  const handleRsvpFilter = (status: 'CONFIRMED' | 'PENDING' | 'DECLINED' | null) => {
    setActiveRsvpFilter(status);
  };

  const handleRsvpStatusChange = async (guestId: string, newStatus: GuestStatus) => {
    try {
      // Find the guest in the current data
      const currentGuests = data?.guests || [];
      const targetGuest = currentGuests.find(g => g.id === guestId);
      if (!targetGuest) return;

      const currentStatus = targetGuest.status;
      const updatedGuests = currentGuests.map(guest =>
        guest.id === guestId ? { ...guest, status: newStatus } : guest
      );

      // Calculate updated stats
      const statsUpdate = {
        confirmed:
          (data?.stats.confirmed || 0) +
          (newStatus === GuestStatus.CONFIRMED ? 1 : 0) -
          (currentStatus === GuestStatus.CONFIRMED ? 1 : 0),
        pending:
          (data?.stats.pending || 0) +
          (newStatus === GuestStatus.PENDING ? 1 : 0) -
          (currentStatus === GuestStatus.PENDING ? 1 : 0),
        declined:
          (data?.stats.declined || 0) +
          (newStatus === GuestStatus.DECLINED ? 1 : 0) -
          (currentStatus === GuestStatus.DECLINED ? 1 : 0),
        total: data?.stats.total || 0,
      };

      // Update the cache optimistically
      utils.guests.getAll.setData(
        {
          eventId,
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch,
          rsvpStatus: activeRsvpFilter ?? undefined,
          includeInactive,
        },
        oldData => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            guests: updatedGuests,
            stats: statsUpdate,
            meta: oldData.meta,
          };
        }
      );

      // Make the actual API call
      await updateMutation.mutateAsync({
        id: guestId,
        status: newStatus,
      });
      void utils.guests.invalidate();
    } catch (error) {
      console.error('Failed to update status:', error);
      // Revert optimistic update on error by refetching
      void refetch();
      toast.error(t('guests.notifications.statusUpdateError'));
    }
  };

  const handlePriorityChange = async (guestId: string, newPriority: GuestPriority) => {
    try {
      // Find the guest in the current data
      const currentGuests = data?.guests || [];
      const targetGuest = currentGuests.find(g => g.id === guestId);
      if (!targetGuest) return;

      const updatedGuests = currentGuests.map(guest =>
        guest.id === guestId ? { ...guest, priority: newPriority } : guest
      );

      // Update the cache optimistically with all query parameters
      utils.guests.getAll.setData(
        {
          eventId,
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch,
          rsvpStatus: activeRsvpFilter ?? undefined,
          includeInactive,
        },
        oldData => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            guests: updatedGuests,
          };
        }
      );

      // Make the actual API call
      await updateMutation.mutateAsync({
        id: guestId,
        priority: newPriority,
      });
      void utils.guests.invalidate();
    } catch (error) {
      console.error('Failed to update priority:', error);
      // Revert optimistic update on error by refetching
      void refetch();
      toast.error(t('guests.notifications.priorityUpdateError'));
    }
  };

  const handleCategoryChange = async (guestId: string, newCategory: string) => {
    try {
      // Find the guest in the current data
      const currentGuests = data?.guests || [];
      const targetGuest = currentGuests.find(g => g.id === guestId);
      if (!targetGuest) return;

      const updatedGuests = currentGuests.map(guest =>
        guest.id === guestId ? { ...guest, category: newCategory } : guest
      );

      // Update the cache optimistically with all query parameters
      utils.guests.getAll.setData(
        {
          eventId,
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch,
          rsvpStatus: activeRsvpFilter ?? undefined,
          includeInactive,
        },
        oldData => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            guests: updatedGuests,
          };
        }
      );

      // Make the actual API call
      await updateMutation.mutateAsync({
        id: guestId,
        category: newCategory,
      });
      void utils.guests.invalidate();
    } catch (error) {
      console.error('Failed to update category:', error);
      // Revert optimistic update on error by refetching
      void refetch();
      toast.error(t('guests.notifications.categoryUpdateError'));
    }
  };

  const handleOpenModal = () => {
    setSelectedGuest(null);
    setIsModalOpen(true);
    setShowDetailCard(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleUpdateGuest = async (data: any) => {
    console.log('updating guest', data);
    try {
      await updateMutation.mutateAsync({
        ...data,
        eventId,
      });
      void utils.guests.getById.invalidate({ id: data.id });
      void utils.guests.getPartyDetails.invalidate();
      void utils.guests.getAll.invalidate();
      handleCloseDetailCard();
      handleCloseModal();
      void refetch();
      toast.success(t('guests.notifications.guestUpdated'));
    } catch (error: any) {
      // Don't close modal or show toast, just throw the error to be handled by the form
      throw error;
    }
  };

  const handleSaveGuest = async (data: any) => {
    try {
      if (data.id) {
        return handleUpdateGuest(data);
      }
      await createGuest.mutateAsync({
        ...data,
        eventId,
      });
      handleCloseModal();
      handleCloseDetailCard();
      void refetch();
      toast.success(t('guests.notifications.guestAdded'));
    } catch (error: any) {
      // Don't close modal or show toast, just throw the error to be handled by the form
      throw error;
    }
  };

  const handleDelete = (guestId: string) => {
    if (window.confirm(t('guests.confirmations.deleteGuest'))) {
      void deleteMutation.mutate({ id: guestId });
      void utils.guests.invalidate();
      handleCloseModal();
      handleCloseDetailCard();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'text-emerald-600 bg-emerald-50';
      case 'pending':
        return 'text-amber-600 bg-amber-50';
      case 'declined':
        return 'text-rose-600 bg-rose-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryColor = (category?: string | null): { color: string } => {
    if (!category) return { color: '' };
    const categoryData = customCategories?.find(
      c => c.name.toLowerCase() === category.toLowerCase()
    );
    if (categoryData?.color) {
      return {
        color: categoryData.color,
      };
    }
    // Default colors based on common categories
    switch (category.toLowerCase()) {
      case 'family':
        return { color: '#4299e1' };
      case 'friend':
        return { color: '#9f7aea' };
      case 'work':
        return { color: '#ed8936' };
      default:
        // Generate a consistent color based on the category string
        const hash = category.split('').reduce((acc, char) => {
          return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        const hue = Math.abs(hash) % 360;
        return {
          color: `hsl(${hue},70%,35%)`,
        };
    }
  };

  const getPriorityColor = (priority: GuestPriority) => {
    switch (priority) {
      case GuestPriority.P1:
        return 'text-amber-600 bg-amber-50 hover:bg-amber-100';
      case GuestPriority.P2:
        return 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100';
      default:
        return 'text-gray-600 bg-gray-50 hover:bg-gray-100';
    }
  };

  // Handle row click to show detail card
  const handleRowClick = (guestId: string) => {
    const guest = data?.guests.find(g => g.id === guestId);
    if (guest) {
      // For mobile screens, use modal
      if (window.innerWidth < 1024) {
        setSelectedGuest(guest);
        setIsModalOpen(true);
        return;
      }

      // For desktop screens, use side panel
      if (selectedGuestId === guestId) {
        // Toggle off if clicking the same row
        setSelectedGuestId(null);
        setShowDetailCard(false);
      } else {
        setSelectedGuestId(guestId);
        setSelectedGuest(guest);
        setShowDetailCard(true);
      }
    }
  };

  // Close detail card
  const handleCloseDetailCard = () => {
    setShowDetailCard(false);
    setSelectedGuestId(null);
  };

  const handleDownload = async (format: 'csv' | 'excel' | 'excel-extended' | 'csv-extended') => {
    try {
      // Show loading toast
      const loadingToastId = toast.loading(t('guests.notifications.downloadPreparing'));
      let includeAdditionalGuests = false;
      if (format === 'excel-extended' || format === 'csv-extended') {
        includeAdditionalGuests = true;
      }
      // Fetch all guests for this event
      const allGuestsResponse = await utils.guests.getAll.fetch({
        eventId,
        limit: 1000, // Set a high limit to get all guests
        page: 1,
        includeInactive,
        // Keep other filters but remove pagination
        rsvpStatus: activeRsvpFilter ?? undefined,
        search: debouncedSearch,
        includeAdditionalGuests,
      });

      if (!allGuestsResponse?.guests || allGuestsResponse.guests.length === 0) {
        toast.dismiss(loadingToastId);
        toast.error(t('guests.notifications.noGuestsDownload'));
        return;
      }

      const eventName = eventData?.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'event';

      // Get required confirmations for this event
      const requiredConfirmations = eventData?.requiredGuestConfirmation || [];

      // Helper function to get confirmation response for a guest
      const getConfirmationResponse = (guest: any, confirmationId: string) => {
        const response = guest.guestConfirmationResponses?.find(
          (resp: any) => resp.eventRequiredGuestConfirmationId === confirmationId
        );

        if (!response) {
          return '';
        }

        // If there's a selected option, use its label
        if (response.selectedOption?.label) {
          return response.selectedOption.label;
        }

        // If there's a custom response, use that
        if (response.customResponse) {
          return response.customResponse;
        }

        return '';
      };

      // TODO: Consider plus ones

      // Prepare data for export with all guests
      const exportData = allGuestsResponse.guests.map(guest => {
        // Base guest data
        const baseData = {
          Name: guest.name,
          Phone: guest.phone,
          'Preferred Language': guest.preferredLanguage || '',
          Category: guest.category,
          Priority: guest.priority,
          Inviter: guest.inviter || '',
          'Number of invitations':
            guest.isPrimaryGuest && guest.guestGroup?._count.guests
              ? guest.guestGroup?._count.guests
              : '1',
          ...(includeAdditionalGuests
            ? {
                'Invited with': (!guest.isPrimaryGuest && guest.guestGroup?.leadGuest?.name) ?? '',
              }
            : {}),
          // 'Has Plus One': guest.hasPlusOne ? 'Yes' : 'No',
          // 'Plus One Name': guest.plusOneName || '',
          Table: guest.table || '',
          'Dietary Restrictions': guest.dietaryRestrictions || '',
          Status: guest.status,
          Notes: guest.notes || '',
        };

        // Add confirmation responses as dynamic columns
        const confirmationData: Record<string, string> = {};
        requiredConfirmations.forEach(confirmation => {
          const columnName = confirmation.label;
          confirmationData[columnName] = getConfirmationResponse(guest, confirmation.id);
        });

        return {
          ...baseData,
          ...confirmationData,
        };
      });

      toast.dismiss(loadingToastId);

      if (format === 'excel') {
        // Convert JSON to worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Create workbook and append the worksheet
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Guests');

        // Trigger download in browser
        XLSX.writeFile(workbook, `${eventName}_guests_${dayjs().format('YYYYMMDD')}.xlsx`);
        toast.success(t('guests.notifications.downloadSuccess', { count: exportData.length }));
      } else {
        // For CSV, use XLSX utils to generate and download
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);

        // Create a blob and download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${eventName}_guests_${dayjs().format('YYYYMMDD')}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(t('guests.notifications.csvDownloadSuccess', { count: exportData.length }));
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('guests.notifications.downloadError'));
    }
  };

  // Keep track of expanded guest groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Toggle guest group expansion
  const toggleGuestGroupExpand = (e: React.MouseEvent, guestId: string, groupId: string) => {
    e.stopPropagation();
    if (expandedGroups[groupId]) {
      setSelectedGuestId(null);
      setShowDetailCard(false);
    }
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // When a related guest row is clicked, show its detail card
  const handleRelatedGuestClick = (e: React.MouseEvent, guestId: string) => {
    e.stopPropagation(); // Prevent bubbling to parent rows

    // First check if the guest is already in our main guest list
    const guestInList = data?.guests.find(g => g.id === guestId);

    if (guestInList) {
      // If guest is in the main list, use standard handler
      handleRowClick(guestId);
    } else {
      // If guest is not in main list, fetch it separately
      setSelectedGuestId(guestId);
      setGuestToFetch(guestId);
    }
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
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="text-xs">Back to event</span>
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
                {eventData?.date &&
                  dayjs(eventData.date)
                    .utc()
                    .tz(eventData.timezone || 'America/Mexico_City')
                    .format('dddd, MMMM D, YYYY')}
                {' • '}
                {eventData?.startTime}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {/* Desktop buttons - hidden on mobile */}
            <div className="hidden lg:flex gap-3">
              {hasPermissionToCreateGuest && (
                <Button
                  variant="outline"
                  onClick={() => setIsBulkUploadOpen(true)}
                  className="px-4 rounded-lg"
                >
                  <Upload className="mr-1.5 h-4 w-4" />
                  {t('guests.actions.importGuests')}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push(`/admin/events/${eventId}/bulk-messages`)}
                className="px-4 rounded-lg"
              >
                <MessageSquare className="mr-1.5 h-4 w-4" />
                {t('guests.actions.bulkMessages')}
              </Button>
              {hasPermissionToCreateGuest && (
                <Button onClick={handleOpenModal}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t('guests.actions.addGuest')}
                </Button>
              )}
            </div>

            {/* Mobile dropdown menu */}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <LucideMenu className="mr-1.5 h-4 w-4" />
                    {t('guests.actions.actions')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => setIsBulkUploadOpen(true)}
                    className="cursor-pointer"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    <span>{t('guests.actions.importGuests')}</span>
                  </DropdownMenuItem>
                  <DropdownMenu
                    open={openDropdownId === 'download-options-mobile'}
                    onOpenChange={open => {
                      setOpenDropdownId(open ? 'download-options-mobile' : null);
                    }}
                  >
                    <DropdownMenuTrigger className="w-full">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={e => e.preventDefault()}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        <span>{t('guests.actions.downloadGuests')}</span>
                        <ChevronDown className="ml-auto h-4 w-4" />
                      </DropdownMenuItem>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="mr-1 ml-12 min-w-[160px]">
                      <DropdownMenuItem
                        onClick={() => handleDownload('excel')}
                        className="cursor-pointer"
                      >
                        <ImFileExcel className="mr-2 h-4 w-4" />
                        <span>{t('guests.actions.excelFormat')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownload('csv')}
                        className="cursor-pointer"
                      >
                        <BsFiletypeCsv className="mr-2 h-4 w-4" />
                        <span>{t('guests.actions.csvFormat')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenuItem
                    onClick={() => router.push(`/admin/events/${eventId}/bulk-messages`)}
                    className="cursor-pointer"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>{t('guests.actions.bulkMessages')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenModal} className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    <span>{t('guests.actions.addGuest')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="flex gap-3 mb-6">
          <div className="text-sm text-gray-500">{t('guests.stats.totalGuests', { count: data?.stats.total ?? 0 })}</div>
          <div className="text-gray-300">•</div>
          <button
            onClick={() => handleRsvpFilter(activeRsvpFilter === 'CONFIRMED' ? null : 'CONFIRMED')}
            className={cn(
              'text-sm',
              activeRsvpFilter === 'CONFIRMED'
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-emerald-600'
            )}
          >
            {t('guests.stats.confirmed', { count: data?.stats.confirmed ?? 0 })}
          </button>
          <div className="text-gray-300">•</div>
          <button
            onClick={() => handleRsvpFilter(activeRsvpFilter === 'PENDING' ? null : 'PENDING')}
            className={cn(
              'text-sm',
              activeRsvpFilter === 'PENDING'
                ? 'text-amber-600'
                : 'text-gray-500 hover:text-amber-600'
            )}
          >
            {t('guests.stats.pending', { count: data?.stats.pending ?? 0 })}
          </button>
          <div className="text-gray-300">•</div>
          <button
            onClick={() => handleRsvpFilter(activeRsvpFilter === 'DECLINED' ? null : 'DECLINED')}
            className={cn(
              'text-sm',
              activeRsvpFilter === 'DECLINED'
                ? 'text-rose-600'
                : 'text-gray-500 hover:text-rose-600'
            )}
          >
            {t('guests.stats.declined', { count: data?.stats.declined ?? 0 })}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex justify-between mb-6 items-center">
          <div className="flex items-center gap-6 w-full items-center justify-between">
            <div className="relative flex items-center gap-2">
              <Input
                ref={searchInputRef}
                placeholder={t('guests.filters.searchPlaceholder')}
                className="w-[350px] pl-9 py-1.5 text-sm"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              {searchInput && (
                <button
                  onClick={handleClearFilter}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Switch
                  checked={includeInactive}
                  onCheckedChange={checked => setIncludeInactive(checked)}
                  className="data-[state=checked]:bg-gray-600"
                />
                {t('guests.filters.showDeleted')}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 hidden lg:flex">
              <DropdownMenu
                open={openDropdownId === 'download-options'}
                onOpenChange={open => {
                  setOpenDropdownId(open ? 'download-options' : null);
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-1.5 h-4 w-4" />
                    {t('guests.actions.downloadGuests')}
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{t('guests.actions.guestList')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => handleDownload('excel')}
                      className="cursor-pointer"
                    >
                      <ImFileExcel className="mr-2 h-4 w-4" />
                      <span>{t('guests.actions.excelFormat')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDownload('csv')}
                      className="cursor-pointer"
                    >
                      <BsFiletypeCsv className="mr-2 h-4 w-4" />
                      <span>{t('guests.actions.csvFormat')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="flex flex-col items-start gap-2">
                    {t('guests.actions.extendedGuestList')}
                    <span className="text-xs text-gray-500">{t('guests.actions.includesPlusOnes')}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => handleDownload('excel-extended')}
                      className="cursor-pointer"
                    >
                      <ImFileExcel className="mr-2 h-4 w-4" />
                      <span>{t('guests.actions.excelFormat')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDownload('csv-extended')}
                      className="cursor-pointer"
                    >
                      <BsFiletypeCsv className="mr-2 h-4 w-4" />
                      <span>{t('guests.actions.csvFormat')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Guests Table with Detail Card */}
        <div className="flex">
          {/* Main table container - shrinks when detail card is shown on desktop */}
          <div
            className={cn(
              'bg-white rounded-lg transition-all duration-300 ease-in-out overflow-hidden overflow-x-auto',
              showDetailCard ? 'lg:w-[60%]' : 'w-full'
            )}
          >
            {/* Set different min-widths for different screen sizes */}
            <div className="">
              {/* Table Header */}
              <div
                className={cn(
                  'border-b border-gray-200 transition-all duration-300 ease-in-out h-8 relative',
                  showDetailCard ? 'pr-4' : 'px-4'
                )}
              >
                {/* Fixed visible columns - these don't move */}
                <div
                  className={cn(
                    'absolute left-0 top-0 bottom-0 grid items-center py-2 pl-4 bg-white',
                    'grid-cols-[180px,120px,100px,80px] gap-6 z-10'
                  )}
                >
                  <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider flex items-center">
                    {t('guests.table.guest')}
                  </div>
                  <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider flex items-center">
                    {t('guests.table.phone')}
                  </div>
                  <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider flex items-center">
                    {t('guests.table.numOfGuests')}
                  </div>
                  <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider flex items-center">
                    {t('guests.table.category')}
                  </div>
                </div>

                {/* Sliding columns - these appear/disappear with animation */}
                <div
                  className={cn(
                    'grid transition-all duration-300 ease-in-out py-2',
                    showDetailCard
                      ? 'grid-cols-[180px,120px,100px,80px,0,0,0,0] ml-[480px]'
                      : 'grid-cols-[180px,120px,100px,80px,80px,120px,100px,120px] gap-6'
                  )}
                >
                  {/* Placeholder empty cells for fixed columns */}
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>

                  {/* Animated columns */}
                  <div
                    className={cn(
                      'text-[11px] font-medium text-gray-500 uppercase tracking-wider transition-all duration-300 flex items-center',
                      !showDetailCard ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                    )}
                  >
                    {t('guests.table.priority')}
                  </div>
                  <div
                    className={cn(
                      'text-[11px] font-medium text-gray-500 uppercase tracking-wider transition-all duration-300 flex items-center',
                      !showDetailCard ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                    )}
                  >
                    {t('guests.table.assignedTable')}
                  </div>
                  <div
                    className={cn(
                      'text-[11px] font-medium text-gray-500 uppercase tracking-wider transition-all duration-300 flex items-center',
                      !showDetailCard ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                    )}
                  >
                    {t('guests.table.rsvpStatus')}
                  </div>
                </div>
              </div>
              {/* Table Body */}
              {isLoading ? (
                <>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <TableRowSkeleton key={index} />
                  ))}
                </>
              ) : !data?.guests || data.guests.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-xs">{t('guests.table.noGuestsFound')}</div>
              ) : (
                <>
                  {data.guests.map((guest, index) => (
                    <React.Fragment key={guest.id}>
                      {/* Main guest row */}
                      <div
                        className={cn(
                          'h-10 items-center hover:bg-gray-50/50 transition-colors cursor-pointer relative',
                          index < data.guests.length - 1 &&
                            !expandedGroups[guest.guestGroup?.id ?? ''] &&
                            'border-b border-gray-200',
                          selectedGuestId === guest.id && 'bg-purple-50/50'
                        )}
                        onClick={() => handleRowClick(guest.id)}
                      >
                        {/* Fixed visible columns */}
                        <div
                          className={cn(
                            'absolute left-0 top-0 bottom-0 grid items-center py-2.5 pl-4 z-10',
                            'grid-cols-[180px,120px,100px,80px] gap-6',
                            selectedGuestId === guest.id ? 'bg-purple-50/50' : 'bg-white',
                            'hover:bg-gray-50/50',
                            !guest.isPrimaryGuest && 'opacity-50',
                            'group'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {guest.isPrimaryGuest && guest.hasMultipleGuests && (
                              <button
                                className={cn(
                                  'text-gray-500 hover:text-purple-600 focus:outline-none transition-colors group',
                                  expandedGroups[guest.guestGroup?.id ?? ''] && 'text-purple-600'
                                )}
                                onClick={e =>
                                  toggleGuestGroupExpand(e, guest.id, guest.guestGroup?.id || '')
                                }
                              >
                                <ChevronRight
                                  className={cn(
                                    'h-4 w-4 transition-transform duration-200',
                                    expandedGroups[guest.guestGroup?.id ?? ''] &&
                                      'transform rotate-90 text-purple-600'
                                  )}
                                />
                                <div
                                  className={cn(
                                    'absolute w-[1.5px] h-full bg-gradient-to-b from-purple-300 to-transparent left-[16px] top-[28px] opacity-0 transition-opacity duration-150',
                                    expandedGroups[guest.guestGroup?.id ?? ''] && 'opacity-100'
                                  )}
                                ></div>
                              </button>
                            )}
                            <p className="text-xs text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">
                              {guest.name}
                              {!guest.isPrimaryGuest && guest.guestGroup && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-purple-100 text-purple-800">
                                  {t('guests.table.invitedBy', { name: guest.guestGroup.leadGuest?.name })}
                                </span>
                              )}
                            </p>
                          </div>
                          {guest.isPrimaryGuest ? (
                            <p className="text-xs text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap flex items-center">
                              {guest.phone}
                              <span className="text-xs text-gray-400">
                                {parsePhoneNumber(guest.phone)?.isValid() ? (
                                  ''
                                ) : (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertCircleIcon className="w-3 h-3 text-red-500 ml-1" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{t('guests.table.invalidPhone')}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </span>
                            </p>
                          ) : (
                            '-'
                          )}
                          <div className="text-xs text-gray-600 relative">
                            <div className="flex items-center">
                              {guest.hasMultipleGuests
                                ? (guest.guestGroup?._count?.guests ?? '-')
                                : '1'}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                <button
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium'
                                  )}
                                  style={{
                                    color: getCategoryColor(guest.category).color,
                                  }}
                                >
                                  {guest.category
                                    ? guest.category.charAt(0) +
                                      guest.category.slice(1).toLowerCase()
                                    : ''}
                                  <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-32">
                                {customCategories?.map(category => (
                                  <DropdownMenuItem
                                    key={category.id}
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleCategoryChange(guest.id, category.name);
                                    }}
                                    className={cn(
                                      'text-xs cursor-pointer transition-colors',
                                      'focus:bg-transparent focus:text-current'
                                    )}
                                    style={{
                                      color: getCategoryColor(category.name).color,
                                    }}
                                  >
                                    {category.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </p>
                        </div>

                        {/* Sliding columns */}
                        <div
                          className={cn(
                            'h-10 grid items-center transition-all duration-300 ease-in-out',
                            showDetailCard
                              ? 'grid-cols-[180px,120px,100px,80px,0,0,0,0] ml-[480px]'
                              : 'grid-cols-[180px,120px,100px,80px,80px,120px,100px,120px] gap-6 px-4'
                          )}
                        >
                          {/* Placeholder empty cells for fixed columns */}
                          <div></div>
                          <div></div>
                          <div></div>
                          <div></div>

                          {/* Animated columns */}
                          <div
                            className={cn(
                              'transition-all duration-300',
                              !showDetailCard
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 translate-x-10'
                            )}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                <button
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                                    getPriorityColor(guest.priority)
                                  )}
                                >
                                  {guest.priority}
                                  <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-32">
                                {Object.values(GuestPriority).map(priority => (
                                  <DropdownMenuItem
                                    key={priority}
                                    onClick={e => {
                                      e.stopPropagation();
                                      handlePriorityChange(guest.id, priority);
                                    }}
                                    className={cn(
                                      'text-xs cursor-pointer transition-colors',
                                      getPriorityColor(priority),
                                      'focus:bg-transparent focus:text-current'
                                    )}
                                  >
                                    {priority}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div
                            className={cn(
                              'transition-all duration-300',
                              !showDetailCard
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 translate-x-10'
                            )}
                          >
                            <p className="text-xs text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">
                              {guest.table ?? '-'}
                            </p>
                          </div>
                          <div
                            className={cn(
                              'transition-all duration-300',
                              !showDetailCard
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 translate-x-10'
                            )}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                <button
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                                    getStatusColor(guest.status)
                                  )}
                                >
                                  {guest.status.charAt(0) + guest.status.slice(1).toLowerCase()}
                                  <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleRsvpStatusChange(guest.id, GuestStatus.CONFIRMED);
                                  }}
                                  className="text-emerald-600"
                                >
                                  <Check className="h-3.5 w-3.5 mr-2" />
                                  <span className="text-xs">{t('guests.status.confirmed')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleRsvpStatusChange(guest.id, GuestStatus.PENDING);
                                  }}
                                  className="text-amber-600"
                                >
                                  <Clock className="h-3.5 w-3.5 mr-2" />
                                  <span className="text-xs">{t('guests.status.pending')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleRsvpStatusChange(guest.id, GuestStatus.DECLINED);
                                  }}
                                  className="text-rose-600"
                                >
                                  <X className="h-3.5 w-3.5 mr-2" />
                                  <span className="text-xs">{t('guests.status.declined')}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>

                      {/* Related guests rows - shown when expanded */}
                      {guest.isPrimaryGuest &&
                        guest.hasMultipleGuests &&
                        guest.guestGroup?.id /* Ensure guestGroup and id exist */ &&
                        expandedGroups[guest.guestGroup.id] && (
                          <RelatedGuestsList
                            groupId={guest.guestGroup.id}
                            selectedGuestId={selectedGuestId}
                            onRelatedGuestClick={handleRelatedGuestClick}
                            getCategoryColor={getCategoryColor}
                            getPriorityColor={getPriorityColor}
                            getStatusColor={getStatusColor}
                            showDetailCard={showDetailCard}
                          />
                        )}
                    </React.Fragment>
                  ))}

                  {/* Pagination */}
                  {
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <Button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          variant="outline"
                        >
                          {t('guests.pagination.previous')}
                        </Button>
                        <Button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === data.meta.totalPages}
                          variant="outline"
                        >
                          {t('guests.pagination.next')}
                        </Button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <p className="text-sm text-gray-700">
                            {t('guests.pagination.showing')}{' '}
                            <span className="font-medium">
                              {(currentPage - 1) * itemsPerPage + 1}
                            </span>{' '}
                            {t('guests.pagination.to')}{' '}
                            <span className="font-medium">
                              {Math.min(currentPage * itemsPerPage, data.stats.total)}
                            </span>{' '}
                            {t('guests.pagination.of')} <span className="font-medium">{data.stats.total}</span>{' '}
                            {t('guests.pagination.guests')}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{t('guests.pagination.show')}:</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-8 px-2 text-xs">
                                  {itemsPerPage} {t('guests.pagination.items')}
                                  <ChevronDown className="ml-1 h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {ITEMS_PER_PAGE_OPTIONS.map(option => (
                                  <DropdownMenuItem
                                    key={option}
                                    onClick={() => handleItemsPerPageChange(option.toString())}
                                    className="text-xs cursor-pointer"
                                  >
                                    {option === 'all' ? t('guests.pagination.all') : t('guests.pagination.items', { count: Number(option) })}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            <Button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              variant="outline"
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                            >
                              {t('guests.pagination.previous')}
                            </Button>
                            <Button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === data.meta.totalPages}
                              variant="outline"
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                            >
                              {t('guests.pagination.next')}
                            </Button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  }
                </>
              )}
            </div>
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
            {selectedGuestId && selectedGuest && (
              <GuestForm
                eventId={eventId}
                initialData={selectedGuest}
                isViewMode={false}
                isLocalUpdate
                onSave={handleUpdateGuest}
                onCancel={handleCloseDetailCard}
                handleDelete={handleDelete}
              />
            )}
          </div>
        </div>

        {/* Guest Modal - Used for both new guests and editing on mobile */}
        <GuestModal
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          selectedGuest={selectedGuest}
          handleSaveGuest={handleSaveGuest}
          handleCloseModal={handleCloseModal}
          eventId={eventId}
          handleDelete={handleDelete}
        />
        {/* Bulk Upload Modal */}
        <BulkUploadModal
          eventId={eventId}
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          onSuccess={() => {
            void refetch();
            setIsBulkUploadOpen(false);
          }}
        />
      </div>
    </AdminLayout>
  );
}
