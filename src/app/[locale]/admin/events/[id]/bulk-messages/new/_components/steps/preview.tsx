import { Button } from '@/components/ui';
import { FiChevronRight } from 'react-icons/fi';
import { LucideSendHorizonal } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Template } from '../../page';
import { api } from '@/trpc/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { WhatsAppPreview } from '../whatsapp-preview';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

interface PreviewProps {
  eventId: string;
  selectedGuests: Set<string>;
  selectedTemplate: Template | null;
  bulkMessageName: string;
  setCurrentStep: (step: number) => void;
  templateVariables: Record<string, string>;
  handlePreviousStep: () => void;
  attachments: {
    file: File;
    fileKey: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
  }[];
}

export const Preview = ({
  eventId,
  selectedGuests,
  bulkMessageName,
  selectedTemplate,
  setCurrentStep,
  templateVariables,
  handlePreviousStep,
  attachments,
}: PreviewProps) => {
  const { t } = useClientTranslation();
  const router = useRouter();
  const { data: selectedGuestsData } = api.guests.getByIds.useQuery({
    eventId: eventId,
    guestIds: Array.from(selectedGuests),
  });

  const sendBulkMessageMutation = api.bulkMessages.sendBulkMessage.useMutation({
    onSuccess: data => {
      toast.success(t('preview.success', { count: data?.totalRecipients }));
      router.push(`/admin/events/${eventId}/bulk-messages`);
    },
    onError: error => {
      toast.error(error.message || t('preview.error'));
    },
  });

  const handleSendBulkMessage = async () => {
    if (!selectedTemplate || !selectedGuestsData) return;

    try {
      await sendBulkMessageMutation.mutateAsync({
        eventId,
        name: bulkMessageName,
        templateSid: selectedTemplate.sid,
        templateName: selectedTemplate.name,
        guestIds: Array.from(selectedGuests),
        variables: templateVariables,
        mediaFiles: attachments.map(attachment => ({
          filename: attachment.file.name,
          fileKey: attachment.fileKey,
          fileUrl: attachment.fileUrl,
          fileSize: attachment.fileSize,
          fileType: attachment.fileType,
        })),
      });
    } catch (err) {
      console.error('Error sending bulk message:', err);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">{t('preview.title')}</h2>
      {/* Preview Content */}
      <div className="max-w-[1000px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Message Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h4 className="font-medium text-gray-900">{t('preview.messageDetails')}</h4>
            </div>

            <div className="divide-y divide-gray-100">
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                  <h4 className="text-sm font-medium text-gray-900">
                    {t('preview.messageName')}
                    <span className="ml-2 text-gray-500 text-xs">{t('preview.messageNameNote')}</span>
                  </h4>
                </div>
                <p className="text-[15px] text-gray-900 font-medium">{bulkMessageName}</p>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                  <h4 className="text-sm font-medium text-gray-900">{t('preview.template')}</h4>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-purple-100">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-purple-600"
                    >
                      <path
                        d="M20 4H4C3.45 4 3 4.45 3 5V19C3 19.55 3.45 20 4 20H20C20.55 20 21 19.55 21 19V5C21 4.45 20.55 4 20 4ZM19 18H5V6H19V18Z"
                        fill="currentColor"
                      />
                      <path d="M7 9H17V11H7V9ZM7 12H17V14H7V12Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[15px] text-gray-900 font-medium">
                      {selectedTemplate?.name}
                    </p>
                    <p className="text-sm text-gray-500">{t('preview.whatsappMessageTemplate')}</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                  <h4 className="text-sm font-medium text-gray-900">{t('preview.recipients')}</h4>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-purple-100">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-purple-600"
                      >
                        <path
                          d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V18C1 18.55 1.45 19 2 19H14C14.55 19 15 18.55 15 18V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V18C17 18.35 16.93 18.69 16.82 19H22C22.55 19 23 18.55 23 18V16.5C23 14.17 18.33 13 16 13Z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[15px] text-gray-900 font-medium">
                        {selectedGuests.size} {t('preview.messageRecipients')}
                      </p>
                      <p className="text-sm text-gray-500">{t('preview.messageRecipients')}</p>
                    </div>
                  </div>
                  <button
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    onClick={() => setCurrentStep(3)}
                  >
                    {t('preview.editRecipients')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - WhatsApp Preview */}
          <div className="bg-white overflow-hidden p-4">
            <h4 className="font-medium text-gray-900">{t('preview.messagePreview')}</h4>
            <div className="p-5">
              {/* WhatsApp Phone Frame Container with 3D perspective */}
              <div className="relative w-full h-[500px] flex items-center justify-center perspective-[1200px]">
                {/* Main Card with Stacked Effect */}
                <div className="relative w-full h-full preserve-3d">
                  {selectedGuests.size > 1 && (
                    <>
                      {/* Bottom Card */}
                      {selectedGuests.size > 2 && (
                        <div
                          className="absolute inset-0 rounded-2xl border border-gray-300 bg-[#E7DFD4] shadow-md"
                          style={{
                            transform:
                              'rotateX(5deg) rotateY(-5deg) translateZ(-30px) translateX(15px) translateY(25px)',
                            zIndex: 1,
                          }}
                        >
                          <div className="h-12 bg-[#1E2321] rounded-t-2xl opacity-20"></div>
                          <div className="h-[calc(100%-48px)] bg-[#E7DFD4] rounded-b-2xl opacity-20"></div>
                        </div>
                      )}

                      {/* Middle Card */}
                      <div
                        className="absolute inset-0 rounded-2xl border border-gray-300 bg-[#E7DFD4] shadow-md opacity-80"
                        style={{
                          transform:
                            'rotateX(3deg) rotateY(-3deg) translateZ(-15px) translateX(8px) translateY(12px)',
                          zIndex: 2,
                        }}
                      >
                        <div className="h-12 bg-[#1E2321] rounded-t-2xl opacity-80"></div>
                        <div className="h-[calc(100%-48px)] bg-[#E7DFD4] rounded-b-2xl opacity-80"></div>
                      </div>
                    </>
                  )}

                  {/* Main WhatsApp Card */}
                  <div
                    className="relative w-full h-full rounded-2xl border border-gray-300 bg-white shadow-md overflow-hidden transform-style-3d pb-12"
                    style={{ zIndex: 3 }}
                  >
                    {/* WhatsApp Header */}
                    <div className="bg-[#1E2321] px-4 py-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-medium">
                        {selectedGuestsData?.[0]?.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {selectedGuestsData?.[0]?.name || 'Loading...'}
                        </p>
                        <p className="text-[#8FA0A5] text-xs">
                          {selectedGuestsData?.[0]?.phone || '+1 234 567 8900'}
                        </p>
                      </div>
                    </div>

                    {/* WhatsApp Chat Container */}
                    <WhatsAppPreview
                      className="overflow-y-auto p-4"
                      attachments={attachments}
                      templateVariables={templateVariables}
                      selectedTemplate={selectedTemplate}
                      dataToDisplay={selectedGuestsData?.[0]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={handlePreviousStep} className="text-gray-600">
          <FiChevronRight className="mr-2 h-4 w-4 rotate-180" />
          {t('preview.back')}
        </Button>
        <Button
          onClick={() => void handleSendBulkMessage()}
          disabled={
            !selectedTemplate ||
            selectedGuests.size === 0 ||
            !bulkMessageName ||
            sendBulkMessageMutation.isPending
          }
        >
          {sendBulkMessageMutation.isPending
            ? t('preview.sending')
            : t('preview.sendMessages', { count: selectedGuests.size })}
          <LucideSendHorizonal className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
