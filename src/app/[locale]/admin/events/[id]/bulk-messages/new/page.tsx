'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { FiArrowLeft, FiCheck, FiChevronRight } from 'react-icons/fi';
import AdminLayout from '@/components/layouts/AdminLayout';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { TemplateSelection } from './_components/steps/template-selection';
import { NameMessage } from './_components/steps/name-message';
import { SelectGuests } from './_components/steps/select-guests';
import { Preview } from './_components/steps/preview';
import { withPermission } from '@/components/hoc/withPermission';
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

export interface Template {
  sid: string;
  name: string;
  description?: string;
  variables: string[];
  approvalStatus?: string;
  rejectionReason?: string;
  category?: string;
  language?: string;
  media?: string[];
}

function NewBulkMessagePageComponent() {
  const { t } = useClientTranslation();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const locale = params.locale as string;
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [attachments, setAttachments] = useState<
    {
      file: File;
      fileKey: string;
      fileUrl: string;
      fileSize: number;
      fileType: string;
      fileId?: string;
    }[]
  >([]);
  const [bulkMessageName, setBulkMessageName] = useState('');
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [direction, setDirection] = useState<number>(0); // -1 for backward, 1 for forward
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const [lastChangedVariable, setLastChangedVariable] = useState<string | null>(null);
  // Fetch event details
  const { data: eventData } = api.events.getById.useQuery({ id: eventId });

  // Set the locale for dayjs
  useEffect(() => {
    dayjs.locale(locale === 'es' ? 'es' : 'en');
  }, [locale]);

  // Function to check if a step is complete
  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return bulkMessageName.trim().length > 0;
      case 2:
        return (
          selectedTemplate !== null &&
          Object.keys(templateVariables).length === (selectedTemplate?.variables.length ?? 0)
        );
      case 3:
        return selectedGuests.size > 0;
      default:
        return false;
    }
  };

  // Update completed steps when dependencies change
  useEffect(() => {
    const newCompletedSteps = new Set(completedSteps);
    [1, 2, 3].forEach(step => {
      if (isStepComplete(step)) {
        newCompletedSteps.add(step);
      } else {
        newCompletedSteps.delete(step);
      }
    });
    setCompletedSteps(newCompletedSteps);
  }, [bulkMessageName, selectedTemplate, templateVariables, selectedGuests]);

  // Function to handle next step with animation direction
  const handleNextStep = () => {
    if (currentStep < 4 && isStepComplete(currentStep)) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  // Function to handle previous step with animation direction
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  // Handle step click from breadcrumb navigation
  const handleStepClick = (step: number) => {
    if (step === currentStep) return;

    if (
      (step === currentStep + 1 && isStepComplete(currentStep)) ||
      step < currentStep ||
      isStepComplete(currentStep)
    ) {
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    }
  };

  // Animation variants for the slide effect
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
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
            <span className="text-xs">{t('bulkMessages.backToMessages')}</span>
          </Button>
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">{t('bulkMessages.newMessage')}</h1>
            <div className="flex flex-col">
              <p className="text-base text-gray-700 mb-1">{eventData?.name}</p>
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
        </div>

        {/* Breadcrumb Navigation */}
        <div className="">
          <div className="flex items-center">
            {[
              { step: 1, label: t('bulkMessages.new.steps.nameMessage') },
              { step: 2, label: t('bulkMessages.new.steps.selectTemplate') },
              { step: 3, label: t('bulkMessages.new.steps.chooseRecipients') },
              { step: 4, label: t('bulkMessages.new.steps.previewAndSend') },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <button
                  onClick={() => handleStepClick(item.step)}
                  className={cn(
                    'flex items-center px-4 py-2 rounded-lg transition-colors',
                    currentStep === item.step && 'bg-purple-50',
                    completedSteps.has(item.step)
                      ? 'text-purple-600 hover:text-purple-700'
                      : item.step <= currentStep
                        ? 'text-gray-900'
                        : 'text-gray-400 cursor-not-allowed'
                  )}
                  disabled={item.step > currentStep && !isStepComplete(currentStep)}
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center mr-2 text-sm',
                      completedSteps.has(item.step)
                        ? 'bg-purple-100 text-purple-600'
                        : item.step === currentStep
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {completedSteps.has(item.step) ? <FiCheck className="w-4 h-4" /> : item.step}
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
                {index < 3 && (
                  <div className="mx-2">
                    <FiChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Steps Container */}
        <div ref={stepsContainerRef} className="relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="w-full"
            >
              {/* Content for each step will go here */}
              {currentStep === 1 && (
                <NameMessage
                  bulkMessageName={bulkMessageName}
                  setBulkMessageName={setBulkMessageName}
                  handleNextStep={handleNextStep}
                  isStepComplete={isStepComplete}
                />
              )}

              {currentStep === 2 && (
                <TemplateSelection
                  selectedTemplate={selectedTemplate}
                  setSelectedTemplate={setSelectedTemplate}
                  templateVariables={templateVariables}
                  setTemplateVariables={setTemplateVariables}
                  lastChangedVariable={lastChangedVariable}
                  setLastChangedVariable={setLastChangedVariable}
                  eventId={eventId}
                  handlePreviousStep={handlePreviousStep}
                  handleNextStep={handleNextStep}
                  isStepComplete={isStepComplete}
                  attachments={attachments}
                  setAttachments={setAttachments}
                />
              )}

              {currentStep === 3 && (
                <SelectGuests
                  selectedGuests={selectedGuests}
                  setSelectedGuests={setSelectedGuests}
                  eventId={eventId}
                  handlePreviousStep={handlePreviousStep}
                  handleNextStep={handleNextStep}
                  isStepComplete={isStepComplete}
                />
              )}

              {currentStep === 4 && (
                <Preview
                  attachments={attachments}
                  eventId={eventId}
                  selectedGuests={selectedGuests}
                  selectedTemplate={selectedTemplate}
                  bulkMessageName={bulkMessageName}
                  setCurrentStep={setCurrentStep}
                  templateVariables={templateVariables}
                  handlePreviousStep={handlePreviousStep}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AdminLayout>
  );
}

export default withPermission(NewBulkMessagePageComponent, {
  resource: 'orgMsgUsage',
  action: 'create',
});
