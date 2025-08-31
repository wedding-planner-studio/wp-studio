'use client';

import { format } from 'date-fns';
import { Bot, User, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { ChatSessionReplyBox } from '@/components/guests/ChatSessionReplyBox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useRef } from 'react';
import type { DebugData } from './SidePanel';

interface ChatInterfaceProps {
  sessionId: string;
  onShowDebugData: (debugData: DebugData) => void;
}

export function ChatInterface({ sessionId, onShowDebugData }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessionData, isLoading } = api.agentDebugger.getSessionDetails.useQuery(
    {
      sessionId,
    },
    {
      refetchInterval: 3000,
    }
  );

  // Get guest information for the session's phone number
  const { data: guests } = api.agentDebugger.getGuestsByPhoneNumbers.useQuery({
    phoneNumber: sessionData?.phoneNumber ? [sessionData.phoneNumber] : [],
  });

  const messages = sessionData?.messages || [];
  const session = sessionData;

  // Create optimized mappings for guest matching (same logic as ChatSessionList)
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

  // Helper function to get guest name and details for the session
  const getGuestInfo = () => {
    if (!sessionData?.phoneNumber || !sessionData?.organization?.id) return null;

    // Strategy 1: Match by phone + organizationId (may return multiple for different events)
    const phoneOrgGuests =
      guestsByPhoneAndOrg.get(`${sessionData.phoneNumber}:${sessionData.organization.id}`) || [];

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
      if (sessionData.event?.name) {
        const eventMatch = phoneOrgGuests.find(
          guest => guest.eventName === sessionData.event!.name
        );
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
    const allPhoneGuests = guestsByPhone.get(sessionData.phoneNumber) || [];
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

  const guestInfo = getGuestInfo();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-gray-500 font-medium">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50/30 min-h-0">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Bot className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-base font-medium mb-1 text-gray-700">No conversation yet</p>
            <p className="text-sm text-gray-500">This session doesn&apos;t have any messages.</p>
          </div>
        </div>

        {/* Reply Box */}
        <div className="border-t border-gray-200 bg-white flex-shrink-0 py-4">
          <div className="max-w-3xl mx-auto px-4">
            <ChatSessionReplyBox session={session} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50/30 min-h-0">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        <div className="flex-1" />
        <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
          {messages.map(message => (
            <ChatMessage
              key={message.id}
              message={message}
              onShowDebugData={onShowDebugData}
              guestInfo={guestInfo}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply Box */}
      <div className="border-t border-gray-200 bg-white flex-shrink-0 py-4">
        <div className="max-w-3xl mx-auto px-4">
          <ChatSessionReplyBox session={session} />
        </div>
      </div>
    </div>
  );
}

interface ChatMessageProps {
  message: any;
  onShowDebugData: (debugData: DebugData) => void;
  guestInfo: {
    displayName: string;
    hasMultiple: boolean;
    allGuests: any[];
  } | null;
}

function ChatMessage({ message, onShowDebugData, guestInfo }: ChatMessageProps) {
  const handleShowDebugData = () => {
    if (message.agentExecution) {
      onShowDebugData({
        messageId: message.id,
        agentExecution: message.agentExecution,
        systemPrompt: message.agentExecution.systemPrompt,
        metadata: {
          agentName: message.agentExecution.agent?.name,
          agentType: message.agentExecution.agent?.type,
          timestamp: new Date(message.createdAt),
          tokens: message.agentExecution.totalTokensUsed,
          executionTime: message.agentExecution.executionTimeMs,
        },
      });
    }
  };

  const isUser = message.direction === 'INBOUND';
  const hasAgentExecution = message.agentExecution && !isUser;

  return (
    <div className="group relative">
      <div className={cn('flex gap-3', isUser ? 'justify-start' : 'justify-end')}>
        {/* Avatar for assistant messages */}
        {!isUser && (
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Message Content */}
        <div className={cn('max-w-[75%] min-w-0', isUser ? '' : 'order-first')}>
          {/* Message Header */}
          <div
            className={cn('flex items-center gap-2 mb-1', isUser ? 'justify-start' : 'justify-end')}
          >
            {isUser && guestInfo ? (
              <TooltipProvider>
                {guestInfo.hasMultiple ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs font-medium text-gray-600 cursor-help">
                        {guestInfo.displayName}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
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
                  <span className="text-xs font-medium text-gray-600">{guestInfo.displayName}</span>
                )}
              </TooltipProvider>
            ) : (
              <span className="text-xs font-medium text-gray-600">
                {isUser
                  ? 'User'
                  : message.sentBy
                    ? message.sentBy?.firstName + ' ' + message.sentBy?.lastName
                    : 'Assistant'}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {format(new Date(message.createdAt), 'MMM d, yyyy h:mm a')}
            </span>
          </div>

          {/* Message Bubble */}
          <div
            className={cn(
              'relative rounded-2xl px-4 py-3 shadow-sm border transition-all duration-200',
              isUser
                ? 'bg-white text-gray-900 border-gray-200 hover:border-gray-300'
                : 'bg-blue-500 text-white border-blue-500'
            )}
          >
            {/* Message Text */}
            <div
              className={cn(
                'text-sm leading-relaxed whitespace-pre-wrap',
                isUser ? 'text-gray-900' : 'text-white'
              )}
            >
              {message.content}
            </div>

            {/* Action Buttons */}
            <div
              className={cn(
                'absolute top-2 transition-opacity duration-200',
                isUser ? '-left-10' : '-right-10',
                'opacity-0 group-hover:opacity-100'
              )}
            >
              <div className="flex flex-col gap-1">
                {hasAgentExecution && (
                  <button
                    onClick={handleShowDebugData}
                    className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                    title="View debug information"
                  >
                    <Bug className="h-3 w-3 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Avatar for user messages */}
        {isUser && (
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
