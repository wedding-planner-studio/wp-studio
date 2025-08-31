'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiArrowLeft, FiChevronDown, FiMessageCircle } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QuestionForm from '@/components/events/QuestionForm';
import { QuestionCategory } from '@prisma/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function EventInfoPage() {
  const { t } = useClientTranslation();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  // Fetch event details and questions
  const utils = api.useUtils();
  const { data: eventData } = api.events.getById.useQuery({ id: eventId });
  const { data: questions } = api.eventQuestions.getAll.useQuery({
    eventId,
  });

  const setInactiveMutation = api.eventQuestions.setInactive.useMutation({
    onSuccess: () => {
      void utils.eventQuestions.getAll.invalidate({ eventId });
    },
  });
  const updateMutation = api.eventQuestions.update.useMutation({
    onSuccess: () => {
      void utils.eventQuestions.getAll.invalidate({ eventId });
    },
  });

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetailCard, setShowDetailCard] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const tableBodyRef = useRef<HTMLDivElement>(null);

  const categoryOptions = [
    { value: 'GENERAL', label: t('events.questions.categories.general') },
    { value: 'VENUE', label: t('events.questions.categories.venue') },
    { value: 'DRESS_CODE', label: t('events.questions.categories.dress_code') },
    { value: 'FOOD', label: t('events.questions.categories.food') },
    { value: 'SCHEDULE', label: t('events.questions.categories.schedule') },
    { value: 'GIFTS', label: t('events.questions.categories.gifts') },
    { value: 'OTHER', label: t('events.questions.categories.other') },
  ];

  const getCategoryColor = (category: string) => {
    const colors = {
      GENERAL: 'bg-gray-100 text-gray-700',
      VENUE: 'bg-blue-50 text-blue-700',
      DRESS_CODE: 'bg-purple-50 text-purple-700',
      FOOD: 'bg-orange-50 text-orange-700',
      SCHEDULE: 'bg-emerald-50 text-emerald-700',
      GIFTS: 'bg-pink-50 text-pink-700',
      OTHER: 'bg-gray-100 text-gray-700',
    };
    return colors[category as keyof typeof colors] || colors.OTHER;
  };

  const getCategoryLabel = (category: string) => {
    const option = categoryOptions.find(opt => opt.value === category);
    return option?.label || category;
  };

  // Handle scroll indicator visibility
  const handleScroll = () => {
    if (!tableBodyRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = tableBodyRef.current;
    const isNotAtBottom = scrollTop + clientHeight < scrollHeight - 10; // 10px threshold
    const hasOverflow = scrollHeight > clientHeight;

    setShowScrollIndicator(isNotAtBottom && hasOverflow);
  };

  // Check initial scroll state
  useEffect(() => {
    handleScroll();
  }, [questions]);

  const handleDelete = async (questionId: string) => {
    if (window.confirm(t('questions.deleteConfirm'))) {
      try {
        await setInactiveMutation.mutateAsync({ questionId });
        toast.success(t('questions.deleteSuccess'));
      } catch (_error) {
        toast.error(t('questions.deleteError'));
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCloseDetailCard = () => {
    setShowDetailCard(false);
    setSelectedQuestionId(null);
  };

  const handleRowClick = (questionId: string) => {
    const question = questions?.find(q => q.id === questionId);
    if (question) {
      if (selectedQuestionId === questionId) {
        // Toggle off if clicking the same row
        setSelectedQuestionId(null);
        setSelectedQuestion(null);
        setShowDetailCard(false);
      } else {
        // If clicking a different question, update the selection
        // regardless of whether the card is shown or not
        setSelectedQuestionId(questionId);
        setSelectedQuestion(question);
        setShowDetailCard(true);
      }
    }
  };

  const handleUpdateCategory = (questionId: string, category: QuestionCategory) => {
    void updateMutation.mutateAsync({ questionId, category });
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
            <span className="text-xs">{t('questions.backToEvent')}</span>
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
                    .locale('es')
                    .format('dddd, D [de] MMMM [de] YYYY')}
                {' • '}
                {eventData?.startTime}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium text-gray-900">{t('questions.title')}</h2>
            <div className="h-4 w-[1px] bg-gray-200"></div>
            <p className="text-sm text-gray-500">{t('questions.count', { count: questions?.length || 0 })}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/events/${eventId}/chatbot`)}
              className="flex items-center"
            >
              <FiMessageCircle className="h-4 w-4 mr-1.5" />
              <span>{t('questions.testInChatbot')}</span>
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <FiPlus className="h-4 w-4 mr-1.5" />
              <span>{t('questions.newQuestion')}</span>
            </Button>
          </div>
        </div>

        {/* Questions Table with Detail Card */}
        <div className="flex h-[calc(100vh-280px)]">
          {/* Main table container - shrinks when detail card is shown */}
          <div
            className={cn(
              'bg-white rounded-xl transition-all duration-300 ease-in-out flex flex-col relative',
              showDetailCard ? 'w-[60%]' : 'w-full'
            )}
          >
            {/* Table Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
              <div className="px-6 py-4">
                <div className="grid grid-cols-[140px,2fr,2fr,80px] gap-6">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('questions.table.category')}
                  </div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('questions.table.question')}
                  </div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('questions.table.answer')}
                  </div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                    {t('questions.table.actions')}
                  </div>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div ref={tableBodyRef} onScroll={handleScroll} className="overflow-y-auto flex-1">
              {questions?.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => handleRowClick(item.id)}
                  className={cn(
                    'grid grid-cols-[140px,2fr,2fr,80px] gap-6 px-6 py-1 items-center cursor-pointer transition-all duration-200',
                    'hover:bg-purple-50/40',
                    selectedQuestionId === item.id && 'bg-purple-50/50',
                    index !== questions.length - 1 && 'border-b border-gray-50'
                  )}
                >
                  <div className="flex items-center" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                            getCategoryColor(item.category)
                          )}
                        >
                          {getCategoryLabel(item.category)}
                          <FiChevronDown className="h-3 w-3 ml-0.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-32">
                        {categoryOptions.map(option => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() =>
                              handleUpdateCategory(item.id, option.value as QuestionCategory)
                            }
                            className={cn('text-xs', getCategoryColor(option.value))}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="text-sm text-gray-900 font-medium line-clamp-2">
                    {item.question}
                  </div>
                  <div
                    className={cn(
                      'text-xs font-normal line-clamp-2',
                      item.answer
                        ? 'text-gray-600'
                        : 'bg-amber-50/50 text-amber-700 px-2 py-1 rounded-md inline-flex items-center gap-1'
                    )}
                  >
                    {item.answer || (
                      <>
                        <div className="size-1 rounded-full bg-amber-500/40" />
                        <span>{t('questions.pendingAnswer')}</span>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={e => {
                        e.stopPropagation();
                        void handleDelete(item.id);
                      }}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {(!questions || questions.length === 0) && (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-gray-500">{t('questions.noQuestions')}</p>
                </div>
              )}
            </div>

            {/* Scroll Indicator */}
            {showScrollIndicator && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                <div className="bg-white/90 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm flex items-center gap-1 border border-gray-100/50 transition-opacity duration-200 hover:opacity-100 opacity-70">
                  <FiChevronDown className="h-3 w-3" />
                  <span>{t('questions.more')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Detail Card */}
          <div
            className={cn(
              'ml-4 bg-white rounded-xl border border-gray-100 h-fit transition-all duration-300 ease-in-out sticky top-4',
              showDetailCard
                ? 'w-[40%] opacity-100 translate-x-0'
                : 'w-0 opacity-0 translate-x-10 hidden'
            )}
          >
            {selectedQuestionId && selectedQuestion && (
              <QuestionForm
                eventId={eventId}
                initialData={selectedQuestion}
                onSave={handleCloseDetailCard}
                onCancel={handleCloseDetailCard}
              />
            )}
          </div>
        </div>

        {/* New Question Form Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl p-0">
            <DialogHeader className="px-8 pt-6">
              <DialogTitle>{t('questions.addNewQuestion')}</DialogTitle>
            </DialogHeader>
            <QuestionForm eventId={eventId} onCancel={handleCloseModal} onSave={handleCloseModal} />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
