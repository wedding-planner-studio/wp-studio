'use client';

import { useParams, useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import {
  FiArrowLeft,
  FiCheck,
  FiMessageSquare,
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiRotateCcw,
  FiX,
} from 'react-icons/fi';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useState, useRef, useEffect } from 'react';
import { RequestStatus } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

dayjs.extend(utc);
dayjs.extend(timezone);

const RequestCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
          <div className="h-3 w-24 bg-gray-100 rounded"></div>
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-gray-200 rounded"></div>
        <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
      </div>
      <div className="flex gap-2 mt-4 items-center justify-between">
        <div className="h-8 w-[48%] bg-gray-200 rounded"></div>
        <div className="h-8 w-[48%] bg-gray-200 rounded"></div>
      </div>
      <div className="h-8 w-full bg-gray-200 rounded mt-2"></div>
    </div>
  </div>
);

const EventHeaderSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex flex-col">
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-100 rounded w-1/2"></div>
    </div>
  </div>
);

export default function GuestRequestsPage() {
  const { t } = useClientTranslation();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const locale = params.locale as string;
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [dismissNote, setDismissNote] = useState('');
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [showMoreIndicators, setShowMoreIndicators] = useState<Record<string, boolean>>({});
  const [resolvingRequests, setResolvingRequests] = useState<Record<string, boolean>>({});
  const [reopeningRequests, setReopeningRequests] = useState<Record<string, boolean>>({});
  const [dismissingRequests, setDismissingRequests] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const notesContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: guestRequests, isLoading: isLoadingRequests } =
    api.guestRequests.listByEvent.useQuery({
      eventId,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    });
  const { data: eventData, isLoading: isLoadingEvent } = api.events.getById.useQuery({
    id: eventId,
  });

  const utils = api.useUtils();
  const addNoteMutation = api.guestRequests.createNote.useMutation({
    onSuccess: () => {
      toast.success(t('guestRequests.noteAdded'));
      setNewNote('');
      utils.guestRequests.listByEvent.invalidate({ eventId });
    },
  });

  const updateStatusMutation = api.guestRequests.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t('guestRequests.markedResolved'));
      utils.guestRequests.listByEvent.invalidate({ eventId });
    },
  });

  const reopenRequestMutation = api.guestRequests.reopenRequest.useMutation({
    onSuccess: () => {
      toast.success(t('guestRequests.reopened'));
      utils.guestRequests.listByEvent.invalidate({ eventId });
    },
  });

  const dismissRequestMutation = api.guestRequests.dismissRequest.useMutation({
    onSuccess: () => {
      toast.success(t('guestRequests.requestDismissed'));
      setDismissDialogOpen(false);
      setDismissNote('');
      utils.guestRequests.listByEvent.invalidate({ eventId });
    },
  });

  const handleAddNote = (requestId: string) => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate({ requestId, note: newNote });
  };

  const handleResolveRequest = (requestId: string) => {
    setResolvingRequests(prev => ({ ...prev, [requestId]: true }));
    updateStatusMutation.mutate(
      { requestId },
      {
        onSuccess: () => {
          // Keep the animation state for a moment
          setTimeout(() => {
            setResolvingRequests(prev => ({ ...prev, [requestId]: false }));
          }, 1000);
        },
        onError: () => {
          setResolvingRequests(prev => ({ ...prev, [requestId]: false }));
        },
      }
    );
  };

  const handleReopenRequest = (requestId: string) => {
    setReopeningRequests(prev => ({ ...prev, [requestId]: true }));
    reopenRequestMutation.mutate(
      { requestId },
      {
        onSuccess: () => {
          setTimeout(() => {
            setReopeningRequests(prev => ({ ...prev, [requestId]: false }));
          }, 1000);
        },
        onError: () => {
          setReopeningRequests(prev => ({ ...prev, [requestId]: false }));
        },
      }
    );
  };

  const handleDismissRequest = (requestId: string) => {
    if (!dismissNote.trim()) {
      toast.error(t('guestRequests.provideReason'));
      return;
    }

    setDismissingRequests(prev => ({ ...prev, [requestId]: true }));
    dismissRequestMutation.mutate(
      { requestId, note: dismissNote },
      {
        onSuccess: () => {
          setTimeout(() => {
            setDismissingRequests(prev => ({ ...prev, [requestId]: false }));
          }, 1000);
        },
        onError: () => {
          setDismissingRequests(prev => ({ ...prev, [requestId]: false }));
        },
      }
    );
  };

  const toggleNotes = (requestId: string) => {
    setExpandedNotes(prev => ({
      ...prev,
      [requestId]: !prev[requestId],
    }));
  };

  const handleScroll = (requestId: string) => {
    const container = notesContainerRefs.current[requestId];
    if (container) {
      const hasMoreContent =
        container.scrollHeight - container.scrollTop - container.clientHeight > 10;
      setShowMoreIndicators(prev => ({
        ...prev,
        [requestId]: hasMoreContent,
      }));
    }
  };

  // Check for scrollable content when notes are expanded
  useEffect(() => {
    Object.entries(expandedNotes).forEach(([requestId, isExpanded]) => {
      if (isExpanded) {
        const container = notesContainerRefs.current[requestId];
        if (container) {
          const hasMoreContent = container.scrollHeight > container.clientHeight;
          setShowMoreIndicators(prev => ({
            ...prev,
            [requestId]: hasMoreContent,
          }));
        }
      }
    });
  }, [expandedNotes]);

  const isLoading = isLoadingRequests || isLoadingEvent;

  const filteredRequests = guestRequests || [];
  const statusCounts = {
    ALL: filteredRequests.length,
    PENDING: filteredRequests.filter(r => r.status === 'PENDING').length,
    RESOLVED: filteredRequests.filter(r => r.status === 'RESOLVED').length,
    IGNORED: filteredRequests.filter(r => r.status === 'IGNORED').length,
  };

  if (isLoading) {
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
          <EventHeaderSkeleton />

          <div className="flex items-center justify-between my-6">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium text-gray-900">{t('guestRequests.title')}</h2>
              <div className="h-4 w-[1px] bg-gray-200"></div>
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Status Filter Buttons Skeleton */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['ALL', 'PENDING', 'RESOLVED', 'IGNORED'].map(status => (
              <div key={status} className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>

          {/* Requests Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <RequestCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <style jsx>{`
        @keyframes successCheck {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .success-check {
          animation: successCheck 0.6s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
      `}</style>

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
        <div>
          <div className="flex flex-col">
            <p className="text-base text-gray-700 mb-1">
              {eventData?.person1} <span className="text-gray-400">&</span> {eventData?.person2}
            </p>
            <p className="text-sm text-gray-500">
              {eventData?.date && dayjs(eventData.date)
                .utc()
                .tz(eventData.timezone || 'America/Mexico_City')
                .locale(locale)
                .format('dddd, D [de] MMMM [de] YYYY [•] h:mm a')}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between my-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium text-gray-900">{t('guestRequests.title')}</h2>
            <div className="h-4 w-[1px] bg-gray-200"></div>
            <p className="text-sm text-gray-500">{t('guestRequests.count', { count: guestRequests?.length || 0 })}</p>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={statusFilter === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ALL')}
            className="text-xs"
          >
            {t('guestRequests.all')} ({statusCounts.ALL})
          </Button>
          <Button
            variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('PENDING')}
            className="text-xs"
          >
            <FiClock className="w-3 h-3 mr-1" />
            {t('guestRequests.pending')} ({statusCounts.PENDING})
          </Button>
          <Button
            variant={statusFilter === 'RESOLVED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('RESOLVED')}
            className="text-xs"
          >
            <FiCheck className="w-3 h-3 mr-1" />
            {t('guestRequests.resolved')} ({statusCounts.RESOLVED})
          </Button>
          <Button
            variant={statusFilter === 'IGNORED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('IGNORED')}
            className="text-xs"
          >
            <FiX className="w-3 h-3 mr-1" />
            {t('guestRequests.dismissed')} ({statusCounts.IGNORED})
          </Button>
        </div>

        {/* Requests Grid */}
        {guestRequests && guestRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guestRequests.map(request => (
              <div
                key={request.id}
                className={`bg-white rounded-lg shadow-sm border ${
                  request.status === 'RESOLVED' ? 'border-green-200' : 'border-gray-200'
                } overflow-hidden`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-800">{request.guest.name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t('guestRequests.requested')}{' '}
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {request.status === 'RESOLVED' ? (
                      <div className="flex flex-col items-end">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <FiCheck className="w-3 h-3 mr-1" />
                          {t('guestRequests.resolved')}
                        </span>
                        {request.resolvedByUser && (
                          <p className="text-xs text-gray-400 mt-1.5">
                            {t('guestRequests.by')} {request.resolvedByUser.firstName} {request.resolvedByUser.lastName}
                          </p>
                        )}
                      </div>
                    ) : request.status === 'IGNORED' ? (
                      <div className="flex flex-col items-end">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                          <FiX className="w-3 h-3 mr-1" />
                          {t('guestRequests.dismissed')}
                        </span>
                        {request.resolvedByUser && (
                          <p className="text-xs text-gray-400 mt-1.5">
                            {t('guestRequests.by')} {request.resolvedByUser.firstName} {request.resolvedByUser.lastName}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <FiClock className="w-3 h-3 mr-1" />
                        {t('guestRequests.pending')}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{request.requestText}</p>

                  {/* Notes Section */}
                  {request.notes && request.notes.length > 0 && (
                    <div className="mb-4">
                      <button
                        onClick={() => toggleNotes(request.id)}
                        className="flex items-center justify-between w-full text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <span className="flex items-center gap-1">
                          <FiMessageSquare className="w-3 h-3" />
                          {t('guestRequests.notes', { count: request.notes.length })}
                        </span>
                        {expandedNotes[request.id] ? (
                          <FiChevronUp className="w-3 h-3" />
                        ) : (
                          <FiChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {expandedNotes[request.id] && (
                        <div className="relative">
                          <div
                            ref={el => {
                              notesContainerRefs.current[request.id] = el;
                            }}
                            onScroll={() => handleScroll(request.id)}
                            className="mt-2 space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50"
                          >
                            {request.notes.map(note => (
                              <div key={note.id} className="bg-gray-50 rounded p-2 text-sm">
                                <p className="text-gray-600">{note.note}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {t('guestRequests.by')} {note.createdByUser?.firstName || t('guestRequests.unknown')}{' '}
                                  {note.createdByUser?.lastName || ''}
                                </p>
                              </div>
                            ))}
                          </div>
                          {showMoreIndicators[request.id] && (
                            <div className="absolute bottom-0 right-2 transform translate-y-1/2 text-neutral-600 text-xs px-2 py-0.5 rounded-full opacity-90 hover:opacity-100 transition-opacity flex items-center gap-1 border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 animate-bounce">
                              {t('guestRequests.more')}
                              <FiChevronDown className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 items-center justify-between">
                    {request.status === 'RESOLVED' || request.status === 'IGNORED' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'text-xs text-neutral-400 hover:text-neutral-600 transition-colors'
                        )}
                        onClick={() => handleReopenRequest(request.id)}
                        disabled={reopeningRequests[request.id]}
                      >
                        <span
                          className={cn('flex items-center gap-1', reopeningRequests[request.id])}
                        >
                          <FiRotateCcw
                            className={cn(reopeningRequests[request.id] && 'animate-pulse')}
                          />
                          <span className="hidden sm:inline">{t('guestRequests.reopen')}</span>
                        </span>
                      </Button>
                    ) : (
                      <>
                        <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-neutral-400 hover:text-neutral-600 w-[50%]"
                            >
                              <FiX className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">{t('guestRequests.dismiss')}</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t('guestRequests.dismissRequest')}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <p className="text-sm text-gray-600">
                                {t('guestRequests.dismissReason')}
                              </p>
                              <Textarea
                                placeholder={t('guestRequests.dismissPlaceholder')}
                                value={dismissNote}
                                onChange={e => setDismissNote(e.target.value)}
                                className="min-h-[100px]"
                              />
                              <Button
                                onClick={() => handleDismissRequest(request.id)}
                                className="w-full"
                                disabled={!dismissNote.trim() || dismissingRequests[request.id]}
                              >
                                {dismissingRequests[request.id]
                                  ? t('guestRequests.dismissing')
                                  : t('guestRequests.dismissRequest')}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'text-xs relative transition-all duration-200 w-[50%] border-green-500',
                            resolvingRequests[request.id] &&
                              'border-green-500 bg-green-50 text-green-600'
                          )}
                          onClick={() => handleResolveRequest(request.id)}
                          disabled={resolvingRequests[request.id]}
                        >
                          <span
                            className={cn(
                              'flex items-center gap-1 transition-opacity duration-200',
                              resolvingRequests[request.id] ? 'opacity-0' : 'opacity-100'
                            )}
                          >
                            <FiCheck className="w-3 h-3 mr-1" />
                            {t('guestRequests.markResolved')}
                          </span>
                          {resolvingRequests[request.id] && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <FiCheck className="w-4 h-4 text-green-500 success-check" />
                            </span>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs w-full mt-2"
                        onClick={() => setSelectedRequestId(request.id)}
                      >
                        <FiMessageSquare className="w-3 h-3 mr-1" />
                        {t('guestRequests.addNote')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('guestRequests.addNote')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Textarea
                          placeholder={t('guestRequests.notePlaceholder')}
                          value={newNote}
                          onChange={e => setNewNote(e.target.value)}
                          className="min-h-[100px]"
                        />
                        <Button
                          onClick={() => {
                            if (selectedRequestId) {
                              handleAddNote(selectedRequestId);
                              setExpandedNotes(prev => ({
                                ...prev,
                                [selectedRequestId]: true,
                              }));
                            }
                          }}
                          className="w-full"
                        >
                          {t('guestRequests.saveNote')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-green-200 rounded-lg bg-green-50">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-green-100 p-3">
                <FiCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-green-800 font-medium mb-1">{t('guestRequests.allSet')}</p>
                <p className="text-green-600 text-sm">
                  {t('guestRequests.noRequests')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
