'use client';

import { useRouter, useParams } from 'next/navigation';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { FiArrowLeft, FiRefreshCw, FiSend, FiCalendar } from 'react-icons/fi';
import AdminLayout from '@/components/layouts/AdminLayout';
import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Guest, GuestLanguage, GuestStatus, MessageDirection } from '@prisma/client';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

dayjs.extend(utc);
dayjs.extend(timezone);

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  direction: MessageDirection;
  metadata?: {
    toolCalls?: Array<{
      id: string;
      name: string;
      input: Record<string, any>;
      result: any;
    }>;
  };
}

export default function ChatbotPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useClientTranslation();

  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isResettingConversation, setIsResettingConversation] = useState(false);
  const [isChatbotEnabled, setIsChatbotEnabled] = useState(true);
  const [isTogglingChatbot, setIsTogglingChatbot] = useState(false);

  // Add typing indicator to show when AI is responding
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Fetch event data
  const { data: eventData } = api.events.getById.useQuery({ id: eventId });

  // Set initial chatbot enabled state when event data is loaded
  useEffect(() => {
    if (eventData && typeof eventData.hasChatbotEnabled === 'boolean') {
      setIsChatbotEnabled(eventData.hasChatbotEnabled);
    }
  }, [eventData]);

  // Fetch guests for this event
  const { data: guests, isLoading: isLoadingGuests } = api.guests.getAll.useQuery({
    eventId,
    page: 1,
    limit: 50,
  });

  // Mutation for toggling chatbot status
  const toggleChatbotMutation = api.whatsapp.toggleChatbotEnabled.useMutation({
    onMutate: () => {
      setIsTogglingChatbot(true);
    },
    onSuccess: data => {
      setIsChatbotEnabled(data.hasChatbotEnabled);
      toast.success(t(data.hasChatbotEnabled ? 'chatbot.toast.enabled' : 'chatbot.toast.disabled'));
    },
    onError: error => {
      toast.error(t('chatbot.toast.updateError', { message: error.message }));
      // Revert to the previous state if there was an error
      if (eventData) {
        setIsChatbotEnabled(eventData.hasChatbotEnabled);
      }
    },
    onSettled: () => {
      setIsTogglingChatbot(false);
    },
  });

  // Handle toggling chatbot status
  const handleToggleChatbot = () => {
    toggleChatbotMutation.mutate({
      eventId,
      enabled: !isChatbotEnabled,
    });
  };

  // Create a mutation for sending messages
  const sendMessageMutation = api.whatsapp.testChatbot.useMutation({
    onMutate: () => {
      // Set AI typing state to true when sending a message
      setIsAiTyping(true);
    },
    onSuccess: data => {
      console.log('data', data.metadata);
      // Add the response to chat history
      setChatHistory(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          content: data.message,
          direction: 'OUTBOUND' as MessageDirection,
          timestamp: new Date(),
          metadata: data.metadata,
        },
      ]);
      // Reset AI typing state
      setIsAiTyping(false);
    },
    onError: () => {
      // Reset AI typing state in case of error
      setIsAiTyping(false);
    },
  });

  const closeSessionForUserMutation = api.whatsapp.closeSessionForUser.useMutation({
    onSuccess: () => {
      setChatHistory([]);
    },
  });

  // Scroll to bottom of chat whenever history changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Update selected guest object when ID changes
  useEffect(() => {
    if (selectedGuestId && selectedGuestId === 'unknown') {
      // Handle the "New Guest" special case
      setSelectedGuest({
        id: 'unknown',
        name: 'Unknown Phone Number',
        phone: 'Unknown phone number',
        status: GuestStatus.PENDING,
        hasPlusOne: false,
        plusOneName: null,
        table: null,
        dietaryRestrictions: null,
        notes: null,
        category: 'FRIEND' as any,
        priority: 'P2' as any,
        inviter: 'Test user',
        eventId,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferredLanguage: GuestLanguage.ENGLISH,
        hasMultipleGuests: false,
        isPrimaryGuest: true,
        guestGroupId: null,
      });
    } else if (selectedGuestId && guests?.guests) {
      const guest = guests.guests.find(g => g.id === selectedGuestId);
      if (guest) {
        setSelectedGuest(guest);
      }
    } else {
      setSelectedGuest(null);
    }
  }, [selectedGuestId, guests?.guests, eventId]);

  const handleGuestChange = (guestId: string) => {
    setSelectedGuestId(guestId);
    setChatHistory([]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedGuestId) return;

    // Add the user message to chat history
    setChatHistory(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        content: message,
        direction: 'INBOUND' as MessageDirection,
        timestamp: new Date(),
      },
    ]);

    // Send message to API for a registered guest
    sendMessageMutation.mutate({
      guestId: selectedGuestId,
      eventId,
      message,
    });

    // Clear input
    setMessage('');
  };

  // Function to format guest name with status indicator
  const formatGuestOption = (guest: Guest) => {
    // Special case for the Unknown Phone Number option
    if (guest.id === 'unknown') {
      return `${guest.name} 👤`;
    }

    const statusText = {
      [GuestStatus.CONFIRMED]: '✅',
      [GuestStatus.PENDING]: '⏳',
      [GuestStatus.DECLINED]: '❌',
      [GuestStatus.INACTIVE]: '⚪',
    };

    return `${guest.name} ${statusText[guest.status]}`;
  };

  // Reset conversation
  const handleResetConversation = async () => {
    setIsResettingConversation(true);
    await closeSessionForUserMutation
      .mutateAsync({ phoneNumber: selectedGuest?.phone as string })
      .finally(() => {
        setIsResettingConversation(false);
      });
  };

  // Add typing indicator component
  const TypingIndicator = () => (
    <div className="flex justify-end mb-4">
      <div className="bg-[#E7FFDB] text-[#111B21] rounded-lg p-3 rounded-tr-none relative shadow-sm max-w-[85%]">
        <div className="flex space-x-2">
          <div
            className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
            style={{ animationDelay: '0ms' }}
          ></div>
          <div
            className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
            style={{ animationDelay: '150ms' }}
          ></div>
          <div
            className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
            style={{ animationDelay: '300ms' }}
          ></div>
        </div>

        {/* Message triangle */}
        <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-4 h-4">
          <div className="absolute transform rotate-45 w-1 h-2 bg-[#E7FFDB]" />
          <div className="absolute transform w-1 h-1.5 bg-[#E7DFD4] translate-x-1" />
        </div>
      </div>
    </div>
  );

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
            <span className="text-xs">{t('chatbot.backToEvent')}</span>
          </Button>
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-start mb-4">
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

          {/* Chatbot Enable/Disable Toggle */}
          <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm border">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-gray-700">
                {isChatbotEnabled ? t('chatbot.isActive') : t('chatbot.isDisabled')}
              </p>
              <p className="text-xs text-gray-500">
                {isChatbotEnabled
                  ? t('chatbot.activeDesc')
                  : t('chatbot.disabledDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={isChatbotEnabled}
                onCheckedChange={handleToggleChatbot}
                disabled={isTogglingChatbot}
                className={cn(isTogglingChatbot && 'opacity-50 cursor-not-allowed')}
              />
              {isTogglingChatbot && <FiRefreshCw className="h-3 w-3 animate-spin text-gray-400" />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Knowledge Base Panel */}
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            {/* Event Details Section */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                <FiCalendar className="h-3.5 w-3.5 text-purple-600" />
                <h2 className="font-medium text-sm">{t('chatbot.eventDetails')}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/events/${eventId}`)}
                  className="ml-auto h-6 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100/50"
                >
                  {t('chatbot.editEvent')}
                  <svg className="w-3 h-3 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
              </div>
              <div className="p-4">
                <ul className="text-sm space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{t('chatbot.dateTimeLocation')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span>{t('chatbot.venueDetails')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Guest Information Section */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                <svg
                  className="h-3.5 w-3.5 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <h2 className="font-medium text-sm">{t('chatbot.guestInformation')}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/events/${eventId}/guests`)}
                  className="ml-auto h-6 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100/50"
                >
                  {t('chatbot.manageGuests')}
                  <svg className="w-3 h-3 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
              </div>
              <div className="p-4">
                {selectedGuest ? (
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-purple-500 mr-2 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <div className="text-sm text-gray-600">
                        <p className="font-medium text-gray-900">{selectedGuest.name}</p>
                        <p>{selectedGuest.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-purple-500 mr-2 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              selectedGuest.status === 'CONFIRMED' &&
                                'bg-emerald-100 text-emerald-700',
                              selectedGuest.status === 'PENDING' && 'bg-yellow-100 text-yellow-700',
                              selectedGuest.status === 'DECLINED' && 'bg-red-100 text-red-700',
                              selectedGuest.status === 'INACTIVE' && 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {selectedGuest.status.charAt(0) +
                              selectedGuest.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                        {selectedGuest.hasPlusOne && (
                          <p className="mt-1 text-gray-600">
                            {t('chatbot.guest.plusOne')}: {selectedGuest.plusOneName || 'Name not specified'}
                          </p>
                        )}
                        {selectedGuest.table && (
                          <p className="mt-1 text-gray-600">
                            {t('chatbot.guest.tableAssignment')}: {selectedGuest.table}
                          </p>
                        )}
                        {selectedGuest.dietaryRestrictions && (
                          <p className="mt-1 text-gray-600">
                            {t('chatbot.guest.dietaryNeeds')}: {selectedGuest.dietaryRestrictions}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 text-center">
                    <p>{t('chatbot.selectGuestInfo')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Event Questions Section */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                <svg
                  className="h-3.5 w-3.5 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="font-medium text-sm">{t('chatbot.eventQuestions')}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/events/${eventId}/questions`)}
                  className="ml-auto h-6 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100/50"
                >
                  {t('chatbot.editQuestions')}
                  <svg className="w-3 h-3 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
              </div>
              <div className="p-4">
                <ul className="text-sm space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{t('chatbot.configuredFAQs')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <span>{t('chatbot.customInstructions')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-purple-50/50 rounded-lg p-4 border border-purple-100">
              <p className="text-xs text-purple-700 leading-relaxed">
                {t('chatbot.disclaimer')}
              </p>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="col-span-1 lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col h-[650px]">
              {/* WhatsApp-style header */}
              <div className="flex items-center bg-[#1E2321] text-white p-3 shadow-sm">
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      {t('chatbot.chattingAs')}
                    </span>
                    <Select value={selectedGuestId} onValueChange={handleGuestChange}>
                      <SelectTrigger className="w-[250px] border-0 bg-white/10 text-white h-8 focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder={t('chatbot.selectGuest')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {isLoadingGuests ? (
                          <SelectItem value="loading" disabled>
                            {t('chatbot.loadingGuests')}
                          </SelectItem>
                        ) : (
                          [
                            {
                              id: 'unknown',
                              name: 'Unknown Phone Number',
                              phone: 'Unknown phone number',
                            } as Guest,
                          ]
                            .concat(guests?.guests ?? [])
                            .map(guest => (
                              <SelectItem key={guest.id} value={guest.id}>
                                {formatGuestOption(guest)}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {chatHistory.length > 0 && (
                    <Button
                      onClick={handleResetConversation}
                      size="sm"
                      variant="ghost"
                      className="text-white hover:text-white hover:bg-white/10"
                      disabled={isResettingConversation}
                    >
                      <FiRefreshCw
                        className={cn('h-4 w-4', isResettingConversation && 'animate-spin')}
                      />
                    </Button>
                  )}
                  <Image
                    src="/evana_logo_blanco.png"
                    alt="WhatsApp Logo"
                    width={64}
                    height={64}
                    className="ml-2"
                  />
                </div>
              </div>

              {/* Chat messages area with WhatsApp background */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#E7DFD4] bg-opacity-90 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                {selectedGuestId ? (
                  <>
                    {!isChatbotEnabled && (
                      <div className="mx-auto max-w-md my-4 bg-white/90 rounded-lg p-4 text-center shadow-sm border border-amber-100">
                        <div className="text-amber-600 mb-1 font-medium">
                          {t('chatbot.chatbotDisabled')}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {t('chatbot.chatbotDisabledDesc')}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleToggleChatbot}
                          disabled={isTogglingChatbot}
                          className="text-xs"
                        >
                          {isTogglingChatbot ? (
                            <>
                              <FiRefreshCw className="h-3 w-3 animate-spin mr-1" />
                              {t('chatbot.enabling')}
                            </>
                          ) : (
                            t('chatbot.enableChatbot')
                          )}
                        </Button>
                      </div>
                    )}
                    {chatHistory.length > 0 ? (
                      <div className="space-y-4">
                        {chatHistory.map(msg => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.direction === 'INBOUND' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={cn(
                                'max-w-[85%] rounded-lg p-3 relative shadow-sm',
                                msg.direction === 'INBOUND'
                                  ? 'bg-white text-[#111B21] rounded-tl-none'
                                  : 'bg-[#E7FFDB] text-[#111B21] rounded-tr-none'
                              )}
                            >
                              <p className="text-[15px] leading-[20px] whitespace-pre-wrap break-words font-[system-ui]">
                                {msg.content}
                              </p>

                              {/* Show actions that would've been executed in a real scenario */}
                              {msg.metadata?.toolCalls && msg.metadata.toolCalls.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200/40">
                                  <button
                                    onClick={e => {
                                      e.preventDefault();
                                      const target = e.currentTarget
                                        .nextElementSibling as HTMLElement;
                                      if (target) {
                                        target.style.display =
                                          target.style.display === 'none' ? 'block' : 'none';
                                        // Toggle the rotation of the chevron icon
                                        const chevron = e.currentTarget.querySelector(
                                          '.chevron'
                                        ) as HTMLElement;
                                        if (chevron) {
                                          chevron.style.transform =
                                            target.style.display === 'none'
                                              ? 'rotate(0deg)'
                                              : 'rotate(180deg)';
                                        }
                                      }
                                    }}
                                    className="w-full text-left flex items-center justify-between p-1 hover:bg-black/5 rounded transition-colors"
                                  >
                                    <span className="text-[12px] text-gray-600 font-medium flex items-center">
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-3.5 w-3.5 mr-1 text-gray-500"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                        />
                                      </svg>
                                      {t('chatbot.systemAction')} ({msg.metadata.toolCalls.length})
                                    </span>
                                    <svg
                                      className="chevron h-4 w-4 text-gray-500 transition-transform duration-200"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                      />
                                    </svg>
                                  </button>
                                  <div style={{ display: 'none' }} className="space-y-1.5 mt-1">
                                    {msg.metadata.toolCalls.map(tool => {
                                      // Get a friendly name for common actions
                                      const getFriendlyActionName = (name: string) => {
                                        const actionMap: Record<string, string> = {
                                          update_rsvp: 'Update RSVP Status',
                                          log_unknown_user: 'Log Unknown Contact',
                                          track_dietary_restriction: 'Record Dietary Needs',
                                          send_reminder: 'Send Reminder',
                                          update_plus_one: 'Update Plus One',
                                          add_to_table: 'Assign Table',
                                        };
                                        return (
                                          actionMap[name] ||
                                          name
                                            .split('_')
                                            .map(
                                              word => word.charAt(0).toUpperCase() + word.slice(1)
                                            )
                                            .join(' ')
                                        );
                                      };

                                      // Get a friendly representation of input values
                                      const getFriendlyInputText = (input: Record<string, any>) => {
                                        if (tool.name === 'update_rsvp' && 'status' in input) {
                                          return input.status === 'CONFIRMED'
                                            ? 'Guest will attend'
                                            : input.status === 'DECLINED'
                                              ? 'Guest will not attend'
                                              : `Status: ${input.status}`;
                                        }

                                        // For other common cases
                                        const inputText = Object.entries(input)
                                          .map(([key, value]) => {
                                            // Format key to be more readable
                                            const readableKey = key
                                              .split('_')
                                              .map(
                                                word => word.charAt(0).toUpperCase() + word.slice(1)
                                              )
                                              .join(' ');

                                            // Format value to be more readable
                                            let readableValue = value;
                                            if (typeof value === 'boolean') {
                                              readableValue = value ? 'Yes' : 'No';
                                            } else if (
                                              typeof value === 'object' &&
                                              value !== null
                                            ) {
                                              readableValue = JSON.stringify(value, null, 2);
                                            }

                                            return `${readableKey}: ${readableValue}`;
                                          })
                                          .join(', ');

                                        return inputText || 'No additional details';
                                      };

                                      // Simplify result messages and handle JSON output
                                      const getFriendlyResult = (result: string) => {
                                        return <span className="text-gray-700">{result}</span>;
                                      };

                                      return (
                                        <div
                                          key={tool.id}
                                          className="bg-white/70 border border-gray-200 rounded-md p-2 text-[12px]"
                                        >
                                          <div className="flex items-center mb-1">
                                            <span className="font-medium text-gray-700 flex items-center">
                                              <svg
                                                viewBox="0 0 24 24"
                                                className="h-3.5 w-3.5 mr-1 text-gray-500"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  d="M5 13l4 4L19 7"
                                                />
                                              </svg>
                                              {getFriendlyActionName(tool.name)}
                                            </span>
                                            <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                              {t('chatbot.simulation')}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-gray-600 pl-4.5">
                                            {getFriendlyInputText(tool.input)}
                                          </p>
                                          {tool.result && (
                                            <div className="text-[11px] text-green-600 mt-1 pl-4.5">
                                              <div className="flex items-center mb-1">
                                                <svg
                                                  viewBox="0 0 24 24"
                                                  className="h-3 w-3 mr-1"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                  />
                                                </svg>
                                                Result:
                                              </div>
                                              {getFriendlyResult(tool.result)}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="mt-1.5 px-1">
                                    <p className="text-[10px] text-gray-500 italic">
                                      {t('chatbot.simulationNote')}
                                    </p>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-end mt-1 gap-1">
                                <span className="text-[#667781] text-[11px] text-right">
                                  {format(new Date(msg.timestamp), 'HH:mm')}
                                </span>
                                {msg.direction === 'OUTBOUND' && (
                                  <div className="text-[#53BDEB]">
                                    <svg
                                      width="16"
                                      height="11"
                                      viewBox="0 0 16 11"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M11.5 1L5.75 6.75L4 5"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M15 1L9.25 6.75L7.5 5"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Show typing indicator when AI is responding */}
                        {isAiTyping && <TypingIndicator />}

                        <div ref={messagesEndRef} />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center p-6 bg-white/80 rounded-lg shadow-sm">
                          <p className="text-gray-700 mb-2">{t('chatbot.startChatting')}</p>
                          <p className="text-xs text-gray-500">
                            {t('chatbot.aiProcessing')}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center p-6 bg-white/80 rounded-lg shadow-sm">
                      <p className="text-gray-700 mb-2">{t('chatbot.selectGuestToStart')}</p>
                      <p className="text-xs text-gray-500">
                        {t('chatbot.selectGuestDesc')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message input area */}
              <form
                onSubmit={handleSendMessage}
                className="flex items-center p-3 bg-[#F0F2F5] gap-2"
              >
                <Input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={
                    selectedGuestId
                      ? t('chatbot.typeMessage', { name: selectedGuest?.name ?? selectedGuest?.phone })
                      : t('chatbot.selectGuestFirst')
                  }
                  disabled={!selectedGuestId || isAiTyping}
                  className="flex-1 rounded-full bg-white border-none"
                />
                <Button
                  type="submit"
                  disabled={!selectedGuestId || !message.trim() || isAiTyping}
                  size="icon"
                  className={cn(
                    'rounded-full h-10 w-10 transition-colors',
                    isAiTyping
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#075E54] hover:bg-[#128C7E]'
                  )}
                >
                  <FiSend className="h-5 w-5" />
                </Button>
              </form>
            </div>
            <p className="text-[11px] text-gray-400 mt-2 text-center italic">
              {t('chatbot.appearanceNote')}
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
