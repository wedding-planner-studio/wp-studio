'use client';

import {
  Button,
  Input,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FiSearch,
  FiMoreVertical,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUsers,
  FiHelpCircle,
  FiCalendar,
  FiCopy,
  FiLock,
} from 'react-icons/fi';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '@/trpc/react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useRoleBasedPermission } from '@/hooks/useRoleBasedPermission';
import { useOrganization } from '@/hooks/useOrganization';
import Link from 'next/link';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone for Mexico City
dayjs.tz.setDefault('America/Mexico_City');

// Debounce function
const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Add this helper function at the top level
const getRSVPColor = (percentage: number) => {
  if (percentage >= 75) return 'bg-emerald-50 text-green-500 border-green-200';
  if (percentage >= 50) return 'bg-blue-50 text-blue-500 border-blue-200';
  return 'bg-gray-50 text-gray-500 border-gray-200';
};

// Throttle function for scroll/resize events
const throttle = <T extends (...args: any[]) => void>(func: T, limit: number) => {
  let inThrottle = false;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  } as T;
};

export default function EventsPage() {
  const { t } = useClientTranslation('common');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [venueTooltipPosition, setVenueTooltipPosition] = useState<{
    top: number;
    left: number;
    isLeftPositioned?: boolean;
    isTopPositioned?: boolean;
  } | null>(null);
  const [activeVenues, setActiveVenues] = useState<any[]>([]);
  const venueTooltipRef = useRef<HTMLDivElement>(null);
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const { hasPermission: hasPermissionToCreateEvent } = useRoleBasedPermission('events', 'create');
  const { events } = useOrganization();

  const canCreateEvent = useMemo(() => {
    const eventCount = events?.current ?? 0;
    const eventLimit = events?.limit ?? 0;
    return hasPermissionToCreateEvent && eventCount < eventLimit;
  }, [hasPermissionToCreateEvent, events]);

  const utils = api.useUtils();
  useEffect(() => {
    void utils.invalidate();
  }, []);

  // Create a debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setActiveSearch(value);
      setPage(1);
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  // Fetch events with pagination and search
  const { data, isLoading } = api.events.getAll.useQuery({
    page,
    limit: 10,
    search: activeSearch.trim(),
    includeInactive,
  });

  // Set event as inactive mutation
  const setInactiveMutation = api.events.setInactive.useMutation({
    onSuccess: () => {
      toast.success(t('events.toast.deleteSuccess'));
      void utils.events.invalidate(); // Refresh the events list
      void utils.usage.invalidate();
      void utils.organization.invalidate();
    },
    onError: error => {
      toast.error(error.message || t('events.toast.deleteError'));
    },
  });

  const handleView = (eventId: string) => {
    router.push(`/admin/events/${eventId}`);
  };

  const handleEdit = (eventId: string) => {
    router.push(`/admin/events/${eventId}?edit=true`);
  };

  const handleDelete = (eventId: string) => {
    if (window.confirm(t('events.deleteConfirm'))) {
      void setInactiveMutation.mutate({ id: eventId });
    }
  };

  // Function to handle showing venue details tooltip
  const handleVenueHover = (e: React.MouseEvent, venues: any[]) => {
    if (!venues || venues.length === 0) return;

    const targetElement = e.currentTarget as HTMLElement;
    setActiveElement(targetElement);

    updateTooltipPosition(targetElement, venues);
  };

  // Function to update tooltip position
  const updateTooltipPosition = (targetElement: HTMLElement, venues?: any[]) => {
    if (!targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();

    // Check boundaries
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 280; // Width of tooltip + some margin
    const tooltipHeight = Math.min(activeVenues?.length * 60 || 200, 240); // Dynamic height based on venue count
    const minTopPosition = 10; // Minimum distance from top of screen

    // Horizontal positioning
    let leftPosition;
    let isLeftPositioned = false;

    if (targetRect.right + tooltipWidth > viewportWidth) {
      // If right positioning would go off-screen, position to the left
      leftPosition = targetRect.left - tooltipWidth + 10;
      isLeftPositioned = true;
    } else {
      // Otherwise position to the right
      leftPosition = targetRect.right + 10;
      isLeftPositioned = false;
    }

    // Vertical positioning
    let topPosition;
    let isTopPositioned = true;

    if (targetRect.top + tooltipHeight > viewportHeight) {
      // If standard positioning would go off-screen at bottom, position above the element
      topPosition = targetRect.top - tooltipHeight + 70;
      isTopPositioned = false;
    } else {
      // Position at element's top
      topPosition = targetRect.top;
      isTopPositioned = true;
    }

    // Make sure it's not too close to the top of the screen
    if (topPosition < minTopPosition) {
      topPosition = minTopPosition;
    }

    setVenueTooltipPosition({
      top: topPosition,
      left: leftPosition,
      isLeftPositioned: isLeftPositioned,
      isTopPositioned: isTopPositioned,
    });

    if (venues) {
      setActiveVenues(venues);
    }
  };

  // Clear tooltip position when mouse leaves
  const handleVenueLeave = () => {
    setActiveElement(null);
    setVenueTooltipPosition(null);
    setActiveVenues([]);
  };

  // Add scroll and resize event listeners to update tooltip position
  useEffect(() => {
    // Throttled version of the update function
    const throttledUpdate = throttle(() => {
      if (activeElement && activeVenues.length > 0) {
        updateTooltipPosition(activeElement);
      }
    }, 50); // Throttle to 50ms

    window.addEventListener('scroll', throttledUpdate);
    window.addEventListener('resize', throttledUpdate);

    return () => {
      window.removeEventListener('scroll', throttledUpdate);
      window.removeEventListener('resize', throttledUpdate);
    };
  }, [activeElement, activeVenues]);

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto px-6 py-10 min-h-[calc(100vh-10px)]">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">{t('events.welcome')}</h1>
            <p className="text-sm text-gray-500">{t('events.manageUpcoming')}</p>
          </div>
          {hasPermissionToCreateEvent && (
            <DropdownMenu
              open={openDropdownId === 'create-event'}
              onOpenChange={open => {
                setOpenDropdownId(open ? 'create-event' : null);
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <FiPlus className="w-4 h-4 mr-2" />
                  {t('events.createEvent')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <Link href="/admin/events/new">
                  <DropdownMenuItem disabled={!canCreateEvent}>
                    <FiPlus className="w-4 h-4 mr-2" />
                    {t('events.createNew')}
                  </DropdownMenuItem>
                </Link>
                <Link href="/admin/events/new?creationType=duplicate">
                  <DropdownMenuItem disabled={!canCreateEvent}>
                    <FiCopy className="w-4 h-4 mr-2" />
                    {t('events.cloneExisting')}
                  </DropdownMenuItem>
                </Link>
                {!canCreateEvent && (
                  <DropdownMenuItem>
                    <FiLock className="w-4 h-4 mr-2" />
                    {t('events.upgradeToCreate')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {/* Actions Section */}
        <div className="flex justify-between mb-8 items-center">
          <div>
            <h2 className="text-base font-medium text-gray-900">{t('events.upcomingEvents')}</h2>
            {!isLoading && data?.meta && (
              <p className="text-xs text-gray-500 mt-0.5">
                {t('events.totalEvents', { count: data.meta.total })}
                {activeSearch && ` (${t('events.filtered')})`}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-6">
            <div className="hidden items-center space-x-2">
              <Switch
                checked={includeInactive}
                onCheckedChange={checked => setIncludeInactive(checked)}
                className="data-[state=checked]:bg-gray-900"
              />
              <span className="text-sm text-gray-600">{t('events.showDeleted')}</span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Input
                  placeholder={t('events.searchPlaceholder')}
                  className="w-[240px] h-9 text-sm bg-gray-50 border-gray-200 focus:border-gray-300 focus:ring-0 rounded-md pl-9"
                  value={searchInput}
                  onChange={handleSearchChange}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <FiSearch className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              {activeSearch && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchInput('');
                    setActiveSearch('');
                    setPage(1);
                  }}
                  size="sm"
                  className="h-9 text-gray-500 hover:text-gray-700"
                >
                  {t('events.clear')}
                </Button>
              )}
            </div>
          </div>
        </div>
        {/* Events Table */}
        <div className="bg-white rounded-lg h-auto flex-shrink-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-100">
                <TableHead className="w-[25%] text-xs font-medium text-gray-500 rounded-tl-lg">
                  {t('events.table.eventName')}
                </TableHead>
                <TableHead className="w-[15%] text-xs font-medium text-gray-500">
                  {t('events.table.person1')}
                </TableHead>
                <TableHead className="w-[15%] text-xs font-medium text-gray-500">
                  {t('events.table.person2')}
                </TableHead>
                <TableHead className="w-[15%] text-xs font-medium text-gray-500">
                  {t('events.table.date')}
                </TableHead>
                <TableHead className="w-[15%] text-xs font-medium text-gray-500">
                  {t('events.table.location')}
                </TableHead>
                <TableHead className="w-[10%] text-xs font-medium text-gray-500 ">
                  {t('events.table.rsvps')}
                </TableHead>
                <TableHead className="w-[5%] rounded-tr-lg"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index} className="animate-pulse">
                      <TableCell>
                        <div className="h-4 w-3/4 bg-gray-100 rounded"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-2/3 bg-gray-100 rounded"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-2/3 bg-gray-100 rounded"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 bg-gray-100 rounded"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-full bg-gray-100 rounded"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-12 bg-gray-100 rounded"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-8 w-8 bg-gray-100 rounded"></div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ) : !data?.events || data.events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <FiCalendar className="w-12 h-12 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-600">
                        {activeSearch ? t('events.noEventsMatch') : t('events.noEvents')}
                      </h3>
                      <p className="text-sm text-gray-500 max-w-sm">
                        {activeSearch
                          ? t('events.adjustSearch')
                          : t('events.getStarted')}
                      </p>
                      {!activeSearch && canCreateEvent && (
                        <Button
                          size="sm"
                          onClick={() => router.push('/admin/events/new?creationType=new')}
                        >
                          <FiPlus className="w-4 h-4 mr-2" />
                          {t('events.createNew')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.events.map(event => (
                  <TableRow
                    key={event.id}
                    className={cn(
                      'h-10 items-center hover:bg-gray-50/50 transition-colors cursor-pointer relative border-b border-gray-200',
                      'group'
                    )}
                    onClick={() => handleView(event.id)}
                  >
                    <TableCell className="py-0">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 truncate max-w-[250px]">
                          {event.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-0">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 truncate max-w-[200px]">
                          {event.person1}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-0">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 truncate max-w-[200px]">
                          {event.person2}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-0">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 truncate max-w-[140px]">
                          {dayjs(event.date).tz().format('MMM DD, YYYY')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-0">
                      <div
                        className={cn(
                          'flex flex-col gap-0.5 relative',
                          event.venues && event.venues.length > 0 && 'cursor-pointer'
                        )}
                        onMouseEnter={
                          event.venues && event.venues.length > 0
                            ? e => handleVenueHover(e, event.venues || [])
                            : undefined
                        }
                        onMouseLeave={
                          event.venues && event.venues.length > 0 ? handleVenueLeave : undefined
                        }
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-gray-900 truncate max-w-[200px]">
                            {event.venues && event.venues.length > 0
                              ? event.venues.find(v => v.purpose === 'MAIN')?.name ||
                                event.venues[0]?.name
                              : 'No venue set'}
                          </span>
                          {event.venues && event.venues.length > 1 && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-600">
                              +{event.venues.length - 1}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-0">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'px-2 py-1 border rounded-full text-xs',
                          getRSVPColor(event.rsvpPercentage)
                        )}
                      >
                        {event.rsvpPercentage}%
                      </Badge>
                    </TableCell>
                    <TableCell className="py-0">
                      <div
                        className={
                          openDropdownId === event.id
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100 transition-opacity'
                        }
                      >
                        <DropdownMenu
                          onOpenChange={open => {
                            if (open) {
                              setOpenDropdownId(event.id);
                            } else {
                              setOpenDropdownId(null);
                            }
                          }}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              onClick={e => e.stopPropagation()}
                            >
                              <FiMoreVertical className="h-4 w-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px] py-1.5">
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation();
                                router.push(`/admin/events/${event.id}/questions`);
                              }}
                              className="cursor-pointer text-sm text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                            >
                              <FiHelpCircle className="mr-2 h-4 w-4 text-gray-400" />
                              {t('events.dropdown.questions')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation();
                                router.push(`/admin/events/${event.id}/guests`);
                              }}
                              className="cursor-pointer text-sm text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                            >
                              <FiUsers className="mr-2 h-4 w-4 text-gray-400" />
                              {t('events.dropdown.viewGuests')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation();
                                handleEdit(event.id);
                              }}
                              className="cursor-pointer text-sm text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                            >
                              <FiEdit2 className="mr-2 h-4 w-4 text-gray-400" />
                              {t('events.dropdown.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation();
                                handleDelete(event.id);
                              }}
                              className="cursor-pointer text-sm text-red-600 focus:text-red-700 focus:bg-red-50"
                            >
                              <FiTrash2 className="mr-2 h-4 w-4 text-red-600" />
                              {t('events.dropdown.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {/* Pagination */}
        {typeof data?.meta?.totalPages === 'number' && data.meta.totalPages > 1 && (
          <div className="flex justify-center mt-8 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="h-8 w-8 p-0 text-gray-500"
            >
              {'<<'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="h-8 w-8 p-0 text-gray-500"
            >
              {'<'}
            </Button>
            {Array.from({ length: data.meta.totalPages }, (_, i) => i + 1).map(pageNum => (
              <Button
                key={pageNum}
                variant={pageNum === page ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPage(pageNum)}
                className={cn(
                  'h-8 w-8 p-0',
                  pageNum === page
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : 'text-gray-500'
                )}
              >
                {pageNum}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === data.meta.totalPages}
              className="h-8 w-8 p-0 text-gray-500"
            >
              {'>'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(data.meta.totalPages)}
              disabled={page === data.meta.totalPages}
              className="h-8 w-8 p-0 text-gray-500"
            >
              {'>>'}
            </Button>
          </div>
        )}
      </div>

      {/* Venue Details Tooltip */}
      {venueTooltipPosition && activeVenues.length > 0 && (
        <div
          ref={venueTooltipRef}
          className={cn(
            'fixed z-50 w-64 bg-white rounded-md shadow-xl shadow-gray-200/50 border border-gray-200 animate-in fade-in duration-200',
            venueTooltipPosition.isLeftPositioned
              ? 'slide-in-from-right-4'
              : 'slide-in-from-left-4',
            venueTooltipPosition.isTopPositioned ? 'slide-in-from-top-2' : 'slide-in-from-bottom-2'
          )}
          style={{
            top: `${venueTooltipPosition.top}px`,
            left: `${venueTooltipPosition.left}px`,
            transition: 'top 0.1s ease-out, left 0.1s ease-out',
            animationDuration: '200ms',
            opacity: 1,
          }}
        >
          <div className="p-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-t-md border-b border-gray-200">
            {t('events.venues.allVenues', { count: activeVenues.length })}
          </div>
          <div className="p-2 space-y-2 max-h-52 overflow-y-auto">
            {activeVenues.map((venue, idx) => (
              <div
                key={idx}
                className="p-2 bg-gray-50/70 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm text-gray-900">{venue.name}</div>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      venue.purpose === 'MAIN'
                        ? 'bg-blue-50 text-blue-700'
                        : venue.purpose === 'RELIGIOUS'
                          ? 'bg-purple-50 text-purple-700'
                          : venue.purpose === 'RECEPTION'
                            ? 'bg-emerald-50 text-emerald-700'
                            : venue.purpose === 'AFTER_PARTY'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {t(`events.venues.purpose.${venue.purpose.toLowerCase()}`)}
                  </span>
                </div>
                <div className="text-xs text-gray-600">{venue.address}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
