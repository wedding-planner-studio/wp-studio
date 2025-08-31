'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, MessageCircle, Phone, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import type { ChatSessionWithDetails } from './AgentDebuggerContainer';

interface ChatSessionListProps {
  onSelectSession: (sessionId: string) => void;
}

export function ChatSessionList({ onSelectSession }: ChatSessionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search query to avoid excessive API calls

  const [actualSearchQuery, setActualSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setActualSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.agentDebugger.getChatSessions.useInfiniteQuery(
      {
        limit: 20,
        search: actualSearchQuery || undefined,
      },
      {
        getNextPageParam: lastPage => lastPage.nextCursor,
      }
    );

  // Get the list of guests by phone numbers
  const { data: guests, isLoading: isLoadingGuests } =
    api.agentDebugger.getGuestsByPhoneNumbers.useQuery({
      phoneNumber: data
        ? data.pages
            .flatMap(page => page.sessions)
            .map(session => session.phoneNumber)
            .filter(phoneNumber => phoneNumber !== null)
        : [],
    });

  // Create optimized mappings for guest matching
  const guestsByPhoneAndOrg = new Map<string, any[]>();
  const guestsByPhone = new Map<string, any[]>();

  // Build maps for different matching strategies
  guests?.forEach(guest => {
    if (!guest.phone || !guest.organizationId) return;

    // Group guests by phone + organization (can have multiple due to different events)
    const phoneOrgKey = `${guest.phone}:${guest.organizationId}`;
    if (!guestsByPhoneAndOrg.has(phoneOrgKey)) {
      guestsByPhoneAndOrg.set(phoneOrgKey, []);
    }
    guestsByPhoneAndOrg.get(phoneOrgKey)!.push(guest);

    // Group guests by phone number to handle multiple organizations
    if (!guestsByPhone.has(guest.phone)) {
      guestsByPhone.set(guest.phone, []);
    }
    guestsByPhone.get(guest.phone)!.push(guest);
  });

  // Helper function to get guest name and details for a session
  const getGuestInfo = (session: ChatSessionWithDetails) => {
    if (!session.phoneNumber || !session.organization?.id) return null;

    // Strategy 1: Match by phone + organizationId (may return multiple for different events)
    const phoneOrgGuests =
      guestsByPhoneAndOrg.get(`${session.phoneNumber}:${session.organization.id}`) || [];

    if (phoneOrgGuests.length === 1) {
      // Perfect match - one guest in this org with this phone
      return {
        displayName: phoneOrgGuests[0].name,
        hasMultiple: false,
        allGuests: phoneOrgGuests,
      };
    } else if (phoneOrgGuests.length > 1) {
      // Multiple guests with same phone in same org (different events)
      // Try to match by event name if available
      if (session.event?.name) {
        const eventMatch = phoneOrgGuests.find(guest => guest.eventName === session.event!.name);
        if (eventMatch) {
          return {
            displayName: eventMatch.name,
            hasMultiple: false,
            allGuests: [eventMatch],
          };
        }
      }

      // If no event match, show first name + indicator of multiple
      const uniqueNames = [...new Set(phoneOrgGuests.map(g => g.name))];
      if (uniqueNames.length === 1) {
        // Same name across events - just show the name
        return {
          displayName: uniqueNames[0],
          hasMultiple: false,
          allGuests: phoneOrgGuests,
        };
      } else {
        // Different names - show first + count
        return {
          displayName: `${phoneOrgGuests[0].name} (+${phoneOrgGuests.length - 1})`,
          hasMultiple: true,
          allGuests: phoneOrgGuests,
        };
      }
    }

    // Strategy 2: Fallback to all guests with this phone number across all orgs
    const allPhoneGuests = guestsByPhone.get(session.phoneNumber) || [];
    if (allPhoneGuests.length === 1) {
      return {
        displayName: allPhoneGuests[0].name,
        hasMultiple: false,
        allGuests: allPhoneGuests,
      };
    } else if (allPhoneGuests.length > 1) {
      // Multiple guests across different orgs - show first name + count
      return {
        displayName: `${allPhoneGuests[0].name} (+${allPhoneGuests.length - 1})`,
        hasMultiple: true,
        allGuests: allPhoneGuests,
      };
    }

    return null;
  };

  // Helper function to get guest name for backward compatibility
  const getGuestName = (session: ChatSessionWithDetails) => {
    const guestInfo = getGuestInfo(session);
    return guestInfo?.displayName || null;
  };

  // Flatten all pages into a single array of sessions
  const sessions = data?.pages.flatMap(page => page.sessions) || [];

  const filteredSessions = sessions.filter(session => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const guestName = getGuestName(session);
    return (
      session.phoneNumber?.toLowerCase().includes(query) ||
      session.organization?.name.toLowerCase().includes(query) ||
      session.event?.name.toLowerCase().includes(query) ||
      guestName?.toLowerCase().includes(query)
    );
  });

  // Auto-load more sessions when scrolling to bottom
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold

      if (isNearBottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    onSelectSession(sessionId);
  };

  // Only show skeleton loading on initial load (no search, no data)
  if (isLoading && !actualSearchQuery && sessions.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Sessions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Select a session to debug</p>
        </div>
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Sessions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Select a session to debug</p>
        </div>
        <div className="flex-1 flex items-center justify-center text-red-500">
          <p className="text-xs">Error loading sessions: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-900">Sessions</h2>
        <p className="text-xs text-gray-500 mt-0.5">Select a session to debug</p>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          {searchQuery !== actualSearchQuery ? (
            <Loader2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          )}
          <Input
            placeholder="Search sessions, guests, messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs border-gray-200 bg-white/80 focus:bg-white"
          />
        </div>
      </div>

      {/* Session List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No sessions found</p>
          </div>
        ) : (
          <>
            {filteredSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                isSelected={session.id === selectedSessionId}
                onSelect={() => handleSessionSelect(session.id)}
                getGuestInfo={getGuestInfo}
              />
            ))}

            {/* Loading indicator at bottom */}
            {isFetchingNextPage && (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="ml-2 text-xs text-gray-500">Loading more sessions...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: ChatSessionWithDetails;
  isSelected: boolean;
  onSelect: () => void;
  getGuestInfo: (session: ChatSessionWithDetails) => {
    displayName: string;
    hasMultiple: boolean;
    allGuests: any[];
  } | null;
}

function SessionCard({ session, isSelected, onSelect, getGuestInfo }: SessionCardProps) {
  const guestInfo = getGuestInfo(session);
  return (
    <button
      className={cn(
        'w-full p-3 text-left border-b border-gray-100 transition-all duration-150 hover:bg-gray-50',
        isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'bg-white hover:bg-gray-50'
      )}
      onClick={onSelect}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-xs text-gray-900 truncate">
              {session.phoneNumber || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {session.isTestSession && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto">
                Test
              </Badge>
            )}
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                session.isActive ? 'bg-green-400' : 'bg-gray-300'
              )}
            />
          </div>
        </div>

        {/* Guest Name */}
        {guestInfo && (
          <TooltipProvider>
            {guestInfo.hasMultiple ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-[11px] text-blue-600 truncate font-medium cursor-help">
                    {guestInfo.displayName}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-1">
                    <div className="font-medium text-xs mb-2">All guests with this phone:</div>
                    {guestInfo.allGuests.map((guest, index) => (
                      <div
                        key={guest.id}
                        className="text-xs border-b border-gray-100 pb-1 last:border-b-0"
                      >
                        <div className="font-medium">{guest.name}</div>
                        <div className="text-gray-500">{guest.eventName}</div>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="text-[11px] text-blue-600 truncate font-medium">
                {guestInfo.displayName}
              </div>
            )}
          </TooltipProvider>
        )}

        {/* Event Info */}
        {session.event && (
          <div className="text-[11px] text-gray-600 truncate font-medium">{session.event.name}</div>
        )}

        {/* Organization */}
        {session.organization && (
          <div className="text-[10px] text-gray-500 truncate">{session.organization.name}</div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-2.5 w-2.5" />
              {session._count.messages}
            </span>
          </div>
          <span className="text-[10px]">
            {formatDistanceToNow(session.lastMessageAt, { addSuffix: true })}
          </span>
        </div>
      </div>
    </button>
  );
}
