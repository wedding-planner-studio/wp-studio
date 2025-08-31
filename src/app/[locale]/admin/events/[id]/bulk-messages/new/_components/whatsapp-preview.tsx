import { cn } from '@/lib/utils';
import { Template } from '../page';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Guest } from '@prisma/client';
import { env } from '@/env';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';
// URL regex pattern for detecting links in text
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Utility function to convert URLs in text to clickable links
const linkifyText = (text: string) => {
  const parts = text.split(URL_REGEX);
  const matches = text.match(URL_REGEX) || [];

  return parts.reduce(
    (arr, part, i) => {
      arr.push(part);
      if (matches[i]) {
        arr.push(
          <a
            key={`link-${i}`}
            href={matches[i]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            {matches[i]}
          </a>
        );
      }
      return arr;
    },
    [] as (string | JSX.Element)[]
  );
};

interface WhatsAppPreviewProps {
  attachments: {
    file: File;
    fileKey: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
  }[];
  templateVariables: Record<string, string>;
  lastChangedVariable?: string | null;
  selectedTemplate: Template | null;
  dataToDisplay?: Guest;
  className?: string;
  displayAs?: 'sent' | 'delivered' | 'read';
  readAt?: Date | null;
  deliveredAt?: Date | null;
  sentAt?: Date | null;
}

export const WhatsAppPreview = ({
  attachments,
  templateVariables,
  lastChangedVariable,
  selectedTemplate,
  dataToDisplay,
  className,
  displayAs = 'read',
  readAt,
  deliveredAt,
  sentAt,
}: WhatsAppPreviewProps) => {
  const { t } = useClientTranslation();

  let media = selectedTemplate?.media
    ? selectedTemplate.media.map(url => {
        if (
          window.location.origin !== 'https://chatboda.vercel.app' &&
          url.includes('chatboda.vercel.app')
        ) {
          url = url.replace(
            'https://chatboda.vercel.app/api/cdn/',
            `${window.location.origin}/api/cdn/`
          );
        } else if (window.location.origin !== 'https://evana.mx' && url.includes('evana.mx')) {
          url = url.replace(`https://evana.mx/api/cdn/`, `${window.location.origin}/api/cdn/`);
        }
        // Check if the URL contains a variable pattern {{n}}
        const match = url.match(/{{(\d+)}}/);
        if (match && match[1]) {
          const variableId = match[1];
          // If we have a selected media file for this variable, use its URL
          if (templateVariables[variableId]) {
            return url.replace(`{{${variableId}}}`, templateVariables[variableId]);
          }
        }
        return url;
      })
    : attachments.map(file => file.fileUrl);

  return (
    <div className={cn('bg-[#E7DFD4] h-full flex flex-col', className)}>
      <div className="flex-grow"></div>
      <div className="max-w-[85%] ml-auto mb-4">
        <div className="bg-[#E7FFDB] rounded-lg p-3 relative shadow-sm">
          {media.length > 0 && (
            <div className="mb-3 -mt-1 -mx-1">
              <div
                className={cn(
                  'grid gap-1',
                  media.length === 1
                    ? 'grid-cols-1'
                    : media.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-2'
                )}
              >
                {media.slice(0, 4).map((file, index) => {
                  const isPdf = file.toLowerCase().endsWith('.pdf');
                  const fileName = file.split('/').pop() || 'document.pdf';
                  return (
                    <div
                      key={index}
                      className={cn(
                        'relative rounded-lg overflow-hidden bg-black/5',
                        media.length === 3 && index === 0 ? 'col-span-2' : '',
                        media.length === 1 ? 'aspect-video' : 'aspect-square'
                      )}
                    >
                      {isPdf ? (
                        <div className="bg-[#1F2937] rounded-lg overflow-hidden">
                          {/* PDF Preview */}
                          <div className="bg-white">
                            <iframe
                              src={file}
                              className="w-full h-[200px] border-0"
                              title="PDF Preview"
                            />
                          </div>
                          {/* File info */}
                          <div className="flex items-center p-3 gap-3">
                            <div className="bg-white/10 rounded p-2">
                              <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-xs flex items-center gap-2">
                                <span>PDF Attachment</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={file}
                          alt={`Please select a media file to be displayed`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {media.length > 4 && index === 3 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="text-white text-sm font-medium">
                            +{media.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <p className="text-[#111B21] text-[15px] leading-[20px] whitespace-pre-wrap break-words font-[system-ui]">
            {selectedTemplate?.description?.split(/{{(\d+)}}/).map((part, index, array) => {
              // Even indices are regular text
              if (index % 2 === 0) {
                // Check for URLs in regular text parts
                return typeof part === 'string' ? linkifyText(part) : part;
              }

              // Odd indices are variables
              const variable = part;
              const varValue = templateVariables[variable];
              const key = `${variable}-${index}-${varValue}`; // Add index to key for unique React keys

              if (!varValue) return `{{${variable}}}`;

              // If using guest variable
              if (varValue.startsWith('{{')) {
                const path = varValue.slice(2, -2).split('.')[1];

                // If we have selected guest data, use it
                if (dataToDisplay) {
                  const value =
                    path && dataToDisplay
                      ? (dataToDisplay[path as keyof Guest] as string) || `{{${variable}}}`
                      : `{{${variable}}}`;
                  return (
                    <motion.span
                      key={key}
                      initial={{
                        backgroundColor:
                          lastChangedVariable === variable
                            ? 'rgba(168, 85, 247, 0.2)'
                            : 'rgba(168, 85, 247, 0)',
                      }}
                      animate={{
                        backgroundColor: 'rgba(168, 85, 247, 0)',
                      }}
                      transition={{ duration: 1.5 }}
                      style={{
                        borderRadius: '2px',
                        padding: '0 2px',
                        margin: '0 -2px',
                      }}
                    >
                      {value}
                    </motion.span>
                  );
                }
                return `{{${variable}}}`;
              }

              // For regular values
              return (
                <motion.span
                  key={key}
                  initial={{
                    backgroundColor:
                      lastChangedVariable === variable
                        ? 'rgba(168, 85, 247, 0.2)'
                        : 'rgba(168, 85, 247, 0)',
                  }}
                  animate={{
                    backgroundColor: 'rgba(168, 85, 247, 0)',
                  }}
                  transition={{ duration: 1.5 }}
                  style={{
                    borderRadius: '2px',
                    padding: '0 2px',
                    margin: '0 -2px',
                  }}
                >
                  {varValue}
                </motion.span>
              );
            })}
          </p>
          <div className="flex items-center justify-end mt-1 gap-1">
            <span className="text-[#667781] text-[11px] min-w-[55px] text-right">
              {displayAs === 'sent'
                ? format(sentAt ?? new Date(), 'HH:mm')
                : displayAs === 'delivered'
                  ? format(deliveredAt ?? sentAt ?? new Date(), 'HH:mm')
                  : format(readAt ?? deliveredAt ?? sentAt ?? new Date(), 'HH:mm')}
            </span>
            <div className={cn(displayAs === 'read' ? 'text-[#53BDEB]' : 'text-[#667781]')}>
              {displayAs === 'sent' ? (
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
                </svg>
              ) : (
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
              )}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-4 h-4 transform translate-x-1/3 -translate-y-1/3">
            <div className="absolute transform rotate-45 w-1 h-2 bg-[#E7FFDB]" />
            <div className="absolute transform w-1 h-1.5 bg-[#E7DFD4] translate-x-1" />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mb-3 text-center italic">
        {t('templateSelection.note')}
      </p>
    </div>
  );
};
