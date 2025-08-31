import { useState, useRef, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { FiChevronRight, FiUpload } from 'react-icons/fi';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { cn, fromCamelCaseToReadable, fromJsTypeToReadable } from '@/lib/utils';
import { Label, Spinner, Textarea, Switch } from '@/components/ui';
import { Combobox } from '@/components/ui/combobox';
import { motion } from 'framer-motion';
import { Template } from '../../page';
import { RefreshCcw, Trash2, MoreVertical, ChevronDown, ChevronUp, FileImage } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TWILIO_TEMPLATE_SUGGESTIONS } from '@/lib/constants';
import { WhatsAppPreview } from '../whatsapp-preview';
import { MediaUploadDialog } from '@/components/admin/MediaUploadDialog';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

interface TemplateFormData {
  name: string;
  category: string;
  language: string;
  content: string;
  sample: string;
  attachments: {
    file: File;
    fileKey: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    fileId?: string;
  }[];
  includeMedia: boolean;
  mediaFileType: string;
}

const ALLOW_IMAGE_UPLOAD = true;

interface TemplateSelectionProps {
  selectedTemplate: Template | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<Template | null>>;
  templateVariables: Record<string, string>;
  setTemplateVariables: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  lastChangedVariable: string | null;
  setLastChangedVariable: React.Dispatch<React.SetStateAction<string | null>>;
  eventId: string;
  handlePreviousStep: () => void;
  handleNextStep: () => void;
  isStepComplete: (step: number) => boolean;
  attachments: {
    file: File;
    fileKey: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    fileId?: string;
  }[];
  setAttachments: React.Dispatch<
    React.SetStateAction<
      {
        file: File;
        fileKey: string;
        fileUrl: string;
        fileSize: number;
        fileType: string;
        fileId?: string;
      }[]
    >
  >;
}

// Add this helper function
const HighlightedText = ({ text }: { text: string }) => {
  const parts = text.split(/(\{\{[1-9]\}\})/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.match(/\{\{[1-9]\}\}/)) {
          return (
            <code
              key={i}
              className="font-mono text-purple-600 bg-purple-50/50 px-1.5 py-0.5 rounded"
            >
              {part}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

// Add this helper function at the top level
const getExpectedFileType = (mediaUrl: string): string | null => {
  const extension = mediaUrl.split('.').pop()?.toLowerCase();
  if (!extension) return null;

  // Map common extensions to MIME types
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    webp: 'image/webp',
  };

  return mimeMap[extension] || null;
};

const isFileTypeCompatible = (fileType: string, expectedType: string | null): boolean => {
  if (!expectedType) return true;

  // Handle special cases
  if (expectedType === 'image/jpeg' && fileType === 'image/jpg') return true;
  if (expectedType === 'image/jpg' && fileType === 'image/jpeg') return true;

  return fileType === expectedType;
};

export const TemplateSelection = ({
  selectedTemplate,
  setSelectedTemplate,
  templateVariables,
  setTemplateVariables,
  lastChangedVariable,
  setLastChangedVariable,
  eventId,
  handlePreviousStep,
  handleNextStep,
  isStepComplete,
  attachments,
  setAttachments,
}: TemplateSelectionProps) => {
  const { t } = useClientTranslation();
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const [templateFormData, setTemplateFormData] = useState<TemplateFormData>({
    name: '',
    category: 'MARKETING',
    language: 'es_MX',
    content:
      '¡Hola {{1}}! Nos complace invitarte a la boda de {{2}}. La ceremonia comienza a las {{3}} - por favor llega 15 minutos antes. Responde "sí" para confirmar tu asistencia.',
    sample: 'Familia García, Carlos & María, 17:00 el sábado',
    attachments: [],
    includeMedia: false,
    mediaFileType: '',
  });

  // Fetch WhatsApp templates
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    isRefetching: isRefetchingTemplates,
    refetch: refetchTemplates,
  } = api.whatsapp.getTemplates.useQuery();

  const { data: selectedGuestsData } = api.guests.getAll.useQuery({
    eventId,
    page: 1,
    limit: 1,
  });
  const { mutateAsync: createTemplate } = api.whatsapp.createTemplate.useMutation();

  // Add query for organization media files
  const {
    data: mediaFiles,
    isLoading: isLoadingMediaFiles,
    refetch: refetchMediaFiles,
  } = api.mediaFiles.getOrganizationMediaFiles.useQuery(
    { eventId },
    {
      enabled:
        (!!eventId && mode === 'create') ||
        (mode === 'select' && selectedTemplate?.media && selectedTemplate.media.length > 0),
    }
  );

  const handleTemplateSelect = (templateSid: string) => {
    const template = templates?.find(t => t.sid === templateSid);
    if (template && template.sid && template.name) {
      // Get all variables in order of appearance
      const contentMatches = (template.description || '').match(/\{\{(\d+)\}\}/g) || [];
      const mediaMatches =
        template.media
          ?.map(url => {
            const match = url.match(/\{\{(\d+)\}\}/);
            return match ? match[0] : null;
          })
          .filter(Boolean) || [];

      // Create a mapping of old variable numbers to new sequential numbers
      const variableMap = new Map<string, string>();
      let nextNumber = 1;

      // Process content variables first
      contentMatches.forEach(match => {
        const oldNumber = match.slice(2, -2);
        if (!variableMap.has(oldNumber)) {
          variableMap.set(oldNumber, String(nextNumber++));
        }
      });

      // Then process media variables
      mediaMatches.forEach(match => {
        if (match) {
          const oldNumber = match.slice(2, -2);
          if (!variableMap.has(oldNumber)) {
            variableMap.set(oldNumber, String(nextNumber++));
          }
        }
      });

      // Create the final array of sequential variables
      const allVariables = Array.from(variableMap.values());

      // Create new description with remapped variables
      let newDescription = template.description || '';
      variableMap.forEach((newNum, oldNum) => {
        newDescription = newDescription.replace(
          new RegExp(`\\{\\{${oldNum}\\}\\}`, 'g'),
          `{{${newNum}}}`
        );
      });

      // Create new media array with remapped variables
      const newMedia =
        template.media?.map(url => {
          let newUrl = url;
          variableMap.forEach((newNum, oldNum) => {
            newUrl = newUrl.replace(`{{${oldNum}}}`, `{{${newNum}}}`);
          });
          return newUrl;
        }) || [];

      setSelectedTemplate({
        sid: template.sid,
        name: template.name,
        description: newDescription,
        variables: allVariables,
        approvalStatus: template.approvalStatus || 'pending',
        rejectionReason: template.rejectionReason || '',
        category: 'MARKETING',
        language: template.language || 'es_MX',
        media: newMedia,
      });
      // Reset variables when template changes
      setTemplateVariables({});
    }
  };

  const handleVariableChange = (variableName: string, value: string) => {
    setLastChangedVariable(variableName);
    setTimeout(() => setLastChangedVariable(null), 1500); // Reset after animation

    if (value.startsWith('guest.')) {
      setTemplateVariables(prev => ({
        ...prev,
        [variableName]: `{{${value}}}`,
      }));
    } else {
      setTemplateVariables(prev => ({
        ...prev,
        [variableName]: value,
      }));
    }
  };

  const validateTemplateName = (name: string) => {
    // Check if the name contains only lowercase letters, numbers, and underscores
    const validFormat = /^[a-z0-9_]+$/.test(name);
    return validFormat;
  };

  const handleTemplateFormChange = (field: keyof TemplateFormData, value: any) => {
    if (field === 'name') {
      // Only allow lowercase, numbers, and underscores in the name field
      if (value === '' || validateTemplateName(value)) {
        setTemplateFormData(prev => ({
          ...prev,
          [field]: value,
        }));
      }
    } else if (field === 'attachments') {
      setTemplateFormData(prev => ({
        ...prev,
        attachments: value,
      }));
    } else {
      setTemplateFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTemplate(true);

    try {
      await createTemplate({
        name: templateFormData.name,
        category: templateFormData.category,
        language: templateFormData.language,
        content: templateFormData.content,
        sample: templateFormData.sample,
        includeMedia: !!templateFormData.includeMedia,
        mediaFileType: templateFormData.mediaFileType || undefined,
      });
      // Show success animation
      setShowSuccessAnimation(true);

      // Reset form
      setTemplateFormData({
        name: '',
        category: 'MARKETING',
        language: 'es_MX',
        content: '',
        sample: '',
        attachments: [],
        includeMedia: false,
        mediaFileType: '',
      });

      toast.success('Template submitted for approval');

      // Switch back to select mode after a delay
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setMode('select');
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit template');
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  // Add a ref for the variables container and state for scroll indicator
  const variablesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Add this function to check if scrolling is needed
  const checkForScrollIndicator = useCallback(() => {
    if (variablesContainerRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = variablesContainerRef.current;
      // Show indicator if we're not at the bottom and there's content to scroll
      setShowScrollIndicator(
        scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 20
      );
    }
  }, []);

  // Add useEffect to add scroll listener
  useEffect(() => {
    const container = variablesContainerRef.current;
    if (container && selectedTemplate?.variables && selectedTemplate.variables.length > 2) {
      // Initial check
      checkForScrollIndicator();

      // Add scroll listener
      container.addEventListener('scroll', checkForScrollIndicator);

      // Clean up
      return () => {
        container.removeEventListener('scroll', checkForScrollIndicator);
      };
    } else {
      setShowScrollIndicator(false);
    }
  }, [selectedTemplate, checkForScrollIndicator]);

  const { mutateAsync: deleteTemplate } = api.whatsapp.deleteTemplate.useMutation();

  const handleDeleteConfirm = async (templateSid: string) => {
    try {
      const confirmed = await window.confirm('Are you sure you want to delete this template?');
      if (confirmed) {
        await deleteTemplate({
          contentSid: templateSid,
        });
        toast.success('Template deleted successfully');
        refetchTemplates();
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const getGuestVariables = () => {
    return (
      Object.keys(selectedGuestsData?.guests?.at(0) || {}).map(propertyName => ({
        key: propertyName,
        type: typeof selectedGuestsData?.guests?.at(0)?.[propertyName],
        label: fromCamelCaseToReadable(propertyName),
        path: propertyName,
      })) || []
    ).filter(
      variable =>
        ['string', 'number'].includes(variable.type) &&
        !variable.key.toLocaleLowerCase().includes('id')
    );
  };

  useEffect(() => {
    if (!templateFormData.includeMedia) {
      setTemplateFormData(prev => ({
        ...prev,
        mediaFileType: '',
      }));
      setAttachments([]);
    }
  }, [templateFormData.includeMedia]);

  useEffect(() => {
    if (templateFormData.mediaFileType) {
      setAttachments([
        {
          file: new File([], 'sample'),
          fileKey: 'sample',
          fileUrl: `/sample.${templateFormData.mediaFileType.split('/')[1]}`,
          fileSize: 100,
          fileType: templateFormData.mediaFileType,
        },
      ]);
    }
  }, [templateFormData.mediaFileType]);

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">{t('templateSelection.title')}</h2>
      {/* Mode Toggle */}
      <div className="flex space-x-4 mb-6">
        <Button
          variant={mode === 'select' ? 'default' : 'outline'}
          onClick={() => {
            setMode('select');
            setSelectedTemplate(null);
            setTemplateVariables({});
          }}
          className="flex-1"
        >
          {t('templateSelection.useExisting')}
        </Button>
        <Button
          variant={mode === 'create' ? 'default' : 'outline'}
          onClick={() => {
            setMode('create');
            setSelectedTemplate(null);
            setTemplateVariables({});
          }}
          className="flex-1"
        >
          {t('templateSelection.createNew')}
        </Button>
      </div>
      {mode === 'select' ? (
        <div className="space-y-6">
          <div>
            <label
              htmlFor="template"
              className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2"
            >
              {t('templateSelection.chooseTemplate')}
              <span className="ml-1 text-xs text-gray-500">
                <button
                  className="p-0 text-xs bg-transparent flex items-center gap-1"
                  onClick={() => refetchTemplates()}
                >
                  <RefreshCcw className="w-3 h-3" />
                  {t('templateSelection.refresh')}
                </button>
              </span>
            </label>
            {isLoadingTemplates || isRefetchingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 h-9 p-2 border border-gray-300 rounded-md">
                <Spinner className="h-4 w-4" />
                <span className="text-xs">{t('templateSelection.loadingTemplates')}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <Combobox
                  options={
                    templates?.map(template => ({
                      value: template.sid,
                      label: `${template.name} ${
                        template.media && template.media.length > 0
                          ? ` (includes ${template.media.at(0)?.split('/').pop()?.split('.').pop()} 📷)`
                          : ''
                      }`,
                      extra: `${template.approvalStatus || 'unknown'} • ${template.language || 'unknown'} • ${template.category || ''}`,
                    })) || []
                  }
                  value={selectedTemplate?.sid || ''}
                  onValueChange={handleTemplateSelect}
                  placeholder={t('templateSelection.selectPlaceholder')}
                  emptyText={t('templateSelection.noTemplates')}
                  emptyCTAComponent={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMode('create');
                        setSelectedTemplate(null);
                        setTemplateVariables({});
                      }}
                    >
                      {t('templateSelection.createNewTemplate')}
                    </Button>
                  }
                  searchPlaceholder={t('templateSelection.searchPlaceholder')}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {selectedTemplate && (
            <div className="space-y-6">
              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Variables Configuration */}
                <div className="space-y-6">
                  {/* Template Status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {selectedTemplate.approvalStatus === 'approved' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {t('templateSelection.approved')}
                        </span>
                      ) : selectedTemplate.approvalStatus === 'rejected' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {t('templateSelection.rejected')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {selectedTemplate.approvalStatus || t('templateSelection.pending')}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {selectedTemplate.language} •{' '}
                        {selectedTemplate.category || t('templateSelection.unknown')}
                      </span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDeleteConfirm(selectedTemplate.sid)}
                          disabled={isLoadingTemplates || isRefetchingTemplates}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>{t('templateSelection.deleteTemplate')}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {selectedTemplate?.approvalStatus === 'rejected' &&
                    selectedTemplate?.rejectionReason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-md">
                        <p className="text-xs text-red-600 flex items-start">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>
                            <strong>{t('templateSelection.rejectionReason')}:</strong> {selectedTemplate.rejectionReason}
                          </span>
                        </p>
                      </div>
                    )}

                  {/* Variables Configuration */}
                  <div
                    className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-4 -mr-4 relative"
                    ref={variablesContainerRef}
                  >
                    {selectedTemplate?.approvalStatus === 'approved' &&
                      selectedTemplate.variables.map((variable, index) => {
                        const isMediaVariable = selectedTemplate.media?.some(url =>
                          url.includes(`{{${variable}}}`)
                        );

                        return (
                          <div
                            key={variable}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                          >
                            {/* Variable Header */}
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {t('templateSelection.variable')} {index + 1}:{' '}
                                    <code className="font-mono text-purple-600 bg-purple-50/50 px-1.5 py-0.5 rounded">
                                      {variable}
                                    </code>
                                    {isMediaVariable && (
                                      <span className="ml-2 text-xs text-gray-500">
                                        {t('templateSelection.mediaVariable')}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                {isMediaVariable && (
                                  <a
                                    href={`/admin/events/${eventId}/media`}
                                    className="text-xs flex items-center gap-1.5 text-purple-600 hover:text-purple-700 transition-colors"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                      className="w-3.5 h-3.5"
                                    >
                                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                    </svg>
                                    {t('templateSelection.manageEventMedia')}
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Variable Content */}
                            <div className="p-4">
                              {isMediaVariable ? (
                                // Media Selection
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                    {t('templateSelection.selectMediaFile')}
                                    {selectedTemplate?.media && selectedTemplate.media[0] && (
                                      <span className="ml-2 text-xs text-gray-500">
                                        ({t('templateSelection.expectedType')}{' '}
                                        {getExpectedFileType(selectedTemplate.media[0])?.split(
                                          '/'
                                        )[1] || t('templateSelection.any')}
                                        )
                                      </span>
                                    )}
                                  </label>
                                  <div className="flex items-start gap-2">
                                    {isLoadingMediaFiles ? (
                                      <div className="flex items-center gap-2 text-sm text-gray-500 h-9 p-2 border border-gray-300 rounded-md flex-1">
                                        <Spinner className="h-4 w-4" />
                                        <span className="text-xs">{t('templateSelection.loadingMediaFiles')}</span>
                                      </div>
                                    ) : (
                                      <Select
                                        value={templateVariables[variable] || ''}
                                        onValueChange={value =>
                                          handleVariableChange(variable, value)
                                        }
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder={t('templateSelection.chooseMediaFile')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {mediaFiles?.map(file => {
                                            const expectedType = selectedTemplate?.media?.[0]
                                              ? getExpectedFileType(selectedTemplate.media[0])
                                              : null;
                                            const isCompatible = isFileTypeCompatible(
                                              file.fileType,
                                              expectedType
                                            );

                                            return (
                                              <SelectItem
                                                key={file.id}
                                                value={file.id}
                                                disabled={!isCompatible}
                                                className={cn(
                                                  !isCompatible && 'opacity-50 cursor-not-allowed'
                                                )}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium">
                                                    {file.filename}
                                                  </span>
                                                  <div className="flex items-center gap-1.5">
                                                    <span
                                                      className={cn(
                                                        'text-xs px-1.5 py-0.5 rounded',
                                                        isCompatible
                                                          ? 'bg-purple-100 text-purple-700'
                                                          : 'bg-gray-100 text-gray-500'
                                                      )}
                                                    >
                                                      {file.fileType.split('/')[1]}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                      ({(file.fileSize / 1024 / 1024).toFixed(2)}{' '}
                                                      MB)
                                                    </span>
                                                  </div>
                                                </div>
                                              </SelectItem>
                                            );
                                          })}
                                          {mediaFiles?.length === 0 && (
                                            <div className="p-2 text-sm text-gray-500 text-center">
                                              {t('templateSelection.noMediaFiles')}
                                            </div>
                                          )}
                                        </SelectContent>
                                      </Select>
                                    )}
                                    <MediaUploadDialog
                                      eventId={eventId}
                                      onUploadComplete={() => refetchMediaFiles()}
                                      expectedFileType={
                                        selectedTemplate?.media?.[0]
                                          ? getExpectedFileType(selectedTemplate.media[0])
                                          : null
                                      }
                                    />
                                  </div>
                                </div>
                              ) : (
                                // Regular Variable Selection
                                <>
                                  {/* Guest Variable Selection */}
                                  <div className="mb-4">
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                      {t('templateSelection.selectFromGuest')}
                                    </label>
                                    <Select
                                      value={
                                        templateVariables[variable]?.startsWith('{{')
                                          ? templateVariables[variable].slice(2, -2)
                                          : ''
                                      }
                                      onValueChange={value => handleVariableChange(variable, value)}
                                    >
                                      <SelectTrigger
                                        className={cn(
                                          'w-full bg-white font-mono text-sm',
                                          templateVariables[variable]?.startsWith('{{') &&
                                            'border-purple-200 ring-1 ring-purple-100'
                                        )}
                                      >
                                        <SelectValue placeholder={t('templateSelection.chooseGuestVariable')} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {getGuestVariables().map(guestVar => (
                                          <SelectItem
                                            key={guestVar.key}
                                            value={`guest.${guestVar.path}`}
                                            className="cursor-pointer"
                                          >
                                            <div className="flex items-center gap-2">
                                              <code className="font-mono text-xs text-purple-600">
                                                {fromJsTypeToReadable(guestVar.type)}
                                              </code>
                                              <span className="text-gray-600">•</span>
                                              <span className="font-medium">{guestVar.label}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Custom Value Input */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                      {t('templateSelection.customValue')}
                                    </label>
                                    <Input
                                      placeholder={t('templateSelection.typeCustomValue')}
                                      value={
                                        templateVariables[variable]?.startsWith('{{')
                                          ? ''
                                          : templateVariables[variable] || ''
                                      }
                                      onChange={e => handleVariableChange(variable, e.target.value)}
                                      className={cn(
                                        'text-sm bg-white font-mono',
                                        !templateVariables[variable]?.startsWith('{{') &&
                                          templateVariables[variable] &&
                                          'border-purple-200 ring-1 ring-purple-100'
                                      )}
                                      disabled={templateVariables[variable]?.startsWith('{{')}
                                    />
                                  </div>
                                </>
                              )}

                              {/* Current Selection Indicator */}
                              <div className="mt-3 flex items-center gap-2">
                                {templateVariables[variable] ? (
                                  <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                    <span className="text-xs text-gray-600">
                                      {isMediaVariable ? (
                                        <>
                                          {t('templateSelection.usingMediaFile')}{' '}
                                          <code className="font-mono text-purple-600 bg-purple-50/50 px-1.5 py-0.5 rounded">
                                            {mediaFiles?.find(
                                              f => f.id === templateVariables[variable]
                                            )?.filename || templateVariables[variable]}
                                          </code>
                                        </>
                                      ) : templateVariables[variable]?.startsWith('{{') ? (
                                        <>{t('templateSelection.usingGuestVariable')}</>
                                      ) : (
                                        <>
                                          {t('templateSelection.usingCustomValue')}{' '}
                                          <code className="font-mono text-purple-600 bg-purple-50/50 px-1.5 py-0.5 rounded">
                                            &quot;{templateVariables[variable]}&quot;
                                          </code>
                                        </>
                                      )}
                                    </span>
                                    <button
                                      onClick={() => handleVariableChange(variable, '')}
                                      className="ml-auto text-xs text-gray-500 hover:text-gray-700"
                                    >
                                      {t('templateSelection.clear')}
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    {isMediaVariable
                                      ? t('templateSelection.chooseMediaFile')
                                      : t('templateSelection.chooseGuestVariable')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Floating scroll indicator */}
                  {showScrollIndicator && (
                    <div className="sticky bottom-0 pb-2 flex justify-center w-full pointer-events-none">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{
                          opacity: 0.8,
                          y: 0,
                          translateY: [0, -4, 0],
                        }}
                        transition={{
                          duration: 0.3,
                          translateY: {
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            repeatType: 'reverse',
                          },
                        }}
                        whileHover={{
                          opacity: 1,
                          scale: 1.05,
                          transition: { duration: 0.2 },
                        }}
                        className="bg-purple-600/90 text-white rounded-full shadow-lg px-3 py-1 flex items-center gap-1.5 text-xs font-medium pointer-events-auto cursor-pointer opacity-80 hover:opacity-100"
                        onClick={() => {
                          variablesContainerRef.current?.scrollBy({
                            top: 200,
                            behavior: 'smooth',
                          });
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {t('templateSelection.moreVariables')}
                      </motion.div>
                    </div>
                  )}
                </div>
                {/* Right Column - Live Preview */}
                <div className="lg:sticky lg:top-6">
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden relative">
                    {selectedTemplate?.approvalStatus === 'pending' && (
                      <div className="absolute inset-0 z-10 pointer-events-none">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,244,199,0.1),rgba(255,244,199,0.1)_10px,rgba(255,244,199,0.3)_10px,rgba(255,244,199,0.3)_20px)]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 shadow-sm">
                            <div className="flex items-center gap-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-5 h-5 text-yellow-600"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="text-sm font-medium text-yellow-800">
                                {t('templateSelection.templatePendingApproval')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {t('templateSelection.livePreview')}
                          {selectedGuestsData && selectedGuestsData?.guests?.[0] ? (
                            <span className="ml-2 text-xs text-gray-500">
                              {t('templateSelection.language') === 'en' ? (
                                `(${t('templateSelection.using')} ${selectedGuestsData?.guests?.[0].name}'s ${t('templateSelection.data')})`
                              ) : (
                                `(${t('templateSelection.using')} ${t('templateSelection.data')} ${selectedGuestsData?.guests?.[0].name})`
                              )}{' '}
                            </span>
                          ) : (
                            <span className="ml-2 text-xs text-gray-500">({t('templateSelection.exampleData')})</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="p-0">
                      <WhatsAppPreview
                        attachments={attachments}
                        templateVariables={templateVariables}
                        lastChangedVariable={lastChangedVariable}
                        selectedTemplate={selectedTemplate}
                        dataToDisplay={selectedGuestsData?.guests?.[0]}
                        className=" p-4"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <form onSubmit={handleTemplateSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="templateName" className="block text-sm font-medium text-gray-700">
                  {t('templateSelection.templateName')}
                </Label>
                <Input
                  type="text"
                  id="templateName"
                  maxLength={512}
                  value={templateFormData.name}
                  onChange={e => handleTemplateFormChange('name', e.target.value)}
                  className={cn(
                    'mt-1 block w-full rounded-md shadow-sm sm:text-sm',
                    templateFormData.name && !validateTemplateName(templateFormData.name)
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  )}
                  placeholder={t('templateSelection.namePlaceholder')}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('templateSelection.nameHelp')}
                </p>
                {templateFormData.name && !validateTemplateName(templateFormData.name) && (
                  <p className="mt-1 text-xs text-red-500">
                    {t('templateSelection.nameError')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="language" className="block text-sm font-medium text-gray-700">
                  {t('templateSelection.language')}
                </Label>
                <Select
                  value={templateFormData.language}
                  onValueChange={value => handleTemplateFormChange('language', value)}
                >
                  <SelectTrigger id="language">
                    <SelectValue placeholder={t('templateSelection.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es_MX">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  {t('templateSelection.messageContent')}
                </Label>
                <div className="relative">
                  <Textarea
                    id="content"
                    value={templateFormData.content}
                    onChange={e => handleTemplateFormChange('content', e.target.value)}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono bg-neutral-50"
                    placeholder={t('templateSelection.contentPlaceholder')}
                  />
                  <div className="pointer-events-none absolute inset-0 mt-1 p-2 opacity-0">
                    <HighlightedText text={templateFormData.content || ''} />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('templateSelection.contentExample')}{' '}
                  <HighlightedText text={t('templateSelection.helloEvent')} />
                </p>
              </div>

              <div>
                <Label htmlFor="sample" className="block text-sm font-medium text-gray-700">
                  {t('templateSelection.sampleValues')}
                  <span className="ml-1 text-xs text-gray-500">{t('templateSelection.commaSeparated')}</span>
                </Label>
                <Textarea
                  id="sample"
                  value={templateFormData.sample}
                  onChange={e => handleTemplateFormChange('sample', e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-neutral-50"
                  placeholder={t('templateSelection.samplePlaceholder')}
                  required={
                    templateFormData.content.includes('{{') &&
                    templateFormData.content.includes('}}')
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('templateSelection.sampleExample')}
                </p>
              </div>

              {/* Add Media Upload Section */}
              {ALLOW_IMAGE_UPLOAD && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeMedia" className="text-sm font-medium text-gray-700">
                      {t('templateSelection.includeMedia')}
                    </Label>
                    <Switch
                      id="includeMedia"
                      checked={templateFormData.includeMedia}
                      onCheckedChange={checked => handleTemplateFormChange('includeMedia', checked)}
                    />
                  </div>

                  {templateFormData.includeMedia && (
                    <div className="">
                      {/* Media Selection */}
                      <Select
                        value={templateFormData.mediaFileType}
                        onValueChange={value => {
                          handleTemplateFormChange('mediaFileType', value);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('templateSelection.chooseMediaType')} />
                        </SelectTrigger>
                        <SelectContent>
                          {['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].map(file => (
                            <SelectItem key={file} value={file} className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{file.split('/')[0]}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                    {file.split('/')[1]}
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                          {mediaFiles?.length === 0 && (
                            <div className="p-2 text-sm text-gray-500 text-center space-y-2">
                              <p>{t('templateSelection.noMediaFiles')}</p>
                              <a
                                href={`/admin/events/${eventId}/media`}
                                className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 transition-colors"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  className="w-3.5 h-3.5"
                                >
                                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                </svg>
                                {t('templateSelection.manageEventMedia')}
                              </a>
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full justify-center"
                  disabled={isSubmittingTemplate || showSuccessAnimation}
                >
                  {isSubmittingTemplate ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      {t('templateSelection.submitting')}
                    </>
                  ) : showSuccessAnimation ? (
                    <>
                      <svg
                        className="animate-check mr-2 h-5 w-5 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, ease: 'easeInOut' }}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {t('templateSelection.templateSubmitted')}
                    </>
                  ) : (
                    t('templateSelection.submitTemplate')
                  )}
                </Button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  {t('templateSelection.approvalNote')}{' '}
                  <a
                    href="https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/#template-review"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline"
                  >
                    {t('templateSelection.meta')}
                  </a>{' '}
                  {t('templateSelection.beforeUse')}
                </p>
              </div>
            </div>

            {/* Live Preview Column */}
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Template Suggestions */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between cursor-pointer"
                  onClick={() => setIsSuggestionsOpen(prev => !prev)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {t('templateSelection.templateSuggestions')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    onClick={e => {
                      e.stopPropagation();
                      setIsSuggestionsOpen(prev => !prev);
                    }}
                  >
                    {isSuggestionsOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {isSuggestionsOpen && (
                  <motion.div
                    className="p-4 space-y-3 max-h-[300px] overflow-y-auto"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {TWILIO_TEMPLATE_SUGGESTIONS.map((template, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:bg-purple-50/30 transition-colors cursor-pointer"
                        onClick={() => {
                          handleTemplateFormChange('content', template.content);
                          handleTemplateFormChange('sample', template.sample);
                        }}
                      >
                        <h3 className="text-sm font-medium mb-2">{template.title}</h3>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                          <HighlightedText text={template.content} />
                        </p>
                        <div className="mt-1.5 text-xs text-gray-500">
                          Sample: <span className="italic">{template.sample}</span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Live Preview */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {t('templateSelection.livePreview')}
                      <span className="ml-2 text-xs text-gray-500">{t('templateSelection.asYouType')}</span>
                    </span>
                  </div>
                </div>
                <div className="p-0">
                  <div className="bg-[#E7DFD4] p-4">
                    <div className="max-w-[85%] ml-auto">
                      <div className="bg-[#E7FFDB] rounded-lg p-3 relative shadow-sm">
                        {attachments.length > 0 && (
                          <div className="mb-3 -mt-1 -mx-1">
                            <div
                              className={cn(
                                'grid gap-1',
                                attachments.length === 1
                                  ? 'grid-cols-1'
                                  : attachments.length === 2
                                    ? 'grid-cols-2'
                                    : 'grid-cols-2'
                              )}
                            >
                              {attachments.slice(0, 4).map((file, index) => (
                                <div
                                  key={index}
                                  className={cn(
                                    'relative rounded-lg overflow-hidden bg-black/5',
                                    attachments.length === 3 && index === 0 ? 'col-span-2' : '',
                                    attachments.length === 1 ? 'aspect-video' : 'aspect-square'
                                  )}
                                >
                                  {file.fileType === 'application/pdf' ? (
                                    <div className="flex flex-col items-center justify-center w-full h-full bg-white p-3">
                                      <div className="flex items-center justify-center w-full gap-3">
                                        <div className="flex-shrink-0">
                                          <svg
                                            width="32"
                                            height="32"
                                            viewBox="0 0 32 32"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <rect width="32" height="32" rx="6" fill="#F40F02" />
                                            <path
                                              d="M9 10.5V21.5C9 22.0523 9.44772 22.5 10 22.5H22C22.5523 22.5 23 22.0523 23 21.5V13.5L19 9.5H10C9.44772 9.5 9 9.94772 9 10.5Z"
                                              fill="white"
                                            />
                                            <path d="M19 9.5V13.5H23L19 9.5Z" fill="#FFD1D1" />
                                          </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {file.fileKey || 'document.pdf'}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {Math.round(file.fileSize / 1024)} KB • PDF
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <img
                                      src={file.fileUrl}
                                      alt={`Preview ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  {attachments.length > 4 && index === 3 && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                      <span className="text-white text-sm font-medium">
                                        +{attachments.length - 3}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-[#111B21] text-[15px] leading-[20px] whitespace-pre-wrap break-words font-[system-ui]">
                          {templateFormData.content?.split(/{{(\d+)}}/).map((part, index) => {
                            // Even indices are regular text
                            if (index % 2 === 0) return part;

                            // Odd indices are variables
                            const variableNum = parseInt(part);
                            const sampleValues = templateFormData.sample
                              ? templateFormData.sample.split(',')
                              : [];
                            const sampleValue =
                              sampleValues[variableNum - 1]?.trim() || `{{${part}}}`;

                            return (
                              <motion.span
                                key={`var-${variableNum}-${sampleValue}`}
                                initial={{ backgroundColor: 'rgba(168, 85, 247, 0.2)' }}
                                animate={{ backgroundColor: 'rgba(168, 85, 247, 0)' }}
                                transition={{ duration: 1.5 }}
                                style={{
                                  borderRadius: '2px',
                                  padding: '0 2px',
                                  margin: '0 -2px',
                                }}
                              >
                                {sampleValue}
                              </motion.span>
                            );
                          })}
                        </p>
                        <div className="flex items-center justify-end mt-1 gap-1">
                          <span className="text-[#667781] text-[11px] min-w-[55px] text-right">
                            {format(new Date(), 'HH:mm')}
                          </span>
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
                        </div>
                        <div className="absolute top-0 right-0 w-4 h-4 transform translate-x-1/3 -translate-y-1/3">
                          <div className="absolute transform rotate-45 w-1 h-2 bg-[#E7FFDB]" />
                          <div className="absolute transform w-1 h-1.5 bg-[#E7DFD4] translate-x-1" />
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-3 text-center italic">
                      {t('templateSelection.note')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={handlePreviousStep} className="text-gray-600">
          <FiChevronRight className="mr-2 h-4 w-4 rotate-180" />
          {t('templateSelection.back')}
        </Button>
        {mode === 'select' && (
          <Button onClick={handleNextStep} disabled={!isStepComplete(2)}>
            {t('templateSelection.continueToRecipients')}
            <FiChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
