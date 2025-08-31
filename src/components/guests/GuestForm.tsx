'use client';

import { Button, Input } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '@/trpc/react';
import { GuestPriority, GuestStatus, GuestLanguage, MessageDirection } from '@prisma/client';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { FiX, FiPlusCircle, FiChevronDown, FiMinus, FiPlus } from 'react-icons/fi';
import { format } from 'date-fns';
import Link from 'next/link';
import { ExternalLinkIcon, Search, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import toast from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRoleBasedPermission } from '@/hooks/useRoleBasedPermission';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatSessionReplyBox } from './ChatSessionReplyBox';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

// Default hex colors for preset categories
const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  family: '#4299e1', // blue
  friend: '#9f7aea', // purple
  friends: '#9f7aea', // purple
  work: '#ed8936', // orange
  'plus one': '#ed64a6', // pink
  other: '#718096', // gray
};

// Get category color function - returns style object for direct application
const getCategoryColor = (category?: string | null, customColor?: string | null) => {
  if (!category) return { color: '', backgroundColor: '' };
  // If a custom color is provided, use it
  const color =
    customColor ||
    (() => {
      // Check for default colors for common categories
      const lowerCaseCategory = category.toLowerCase();
      return DEFAULT_CATEGORY_COLORS[lowerCaseCategory] || '#718096'; // Gray default
    })();

  return {
    color: color,
    backgroundColor: `${color}20`, // 20% opacity
  };
};

// Format category name with first letter capitalized
const formatCategoryName = (category?: string | null) => {
  if (!category) return '';
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
};

// Base schema without refinements
const baseGuestSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(E164_REGEX, 'Phone number must be in international format (e.g., +523311223344)')
    .nullable(),
  numberOfGuests: z.number().int().min(1, 'At least one guest is required').default(1),
  additionalGuestNames: z.string().optional().nullable(),
  status: z.nativeEnum(GuestStatus),
  table: z.string().optional().nullable(),
  dietaryRestrictions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  priority: z.nativeEnum(GuestPriority),
  inviter: z.string().min(1, 'Inviter is required'),
  preferredLanguage: z.nativeEnum(GuestLanguage),
});

// Final schema with refinements
const guestSchema = baseGuestSchema.superRefine((data, ctx) => {
  if (data.numberOfGuests <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Number of guests must be at least 1.',
      path: ['numberOfGuests'],
    });
  }
});

type FormErrors = {
  [K in keyof z.infer<typeof baseGuestSchema>]?: string[];
} & {
  [key: string]: string[] | undefined;
};

export type GuestFormData = z.infer<typeof baseGuestSchema> & {
  [key: string]: any; // Allow for dynamic confirmation fields
};

interface GuestFormProps {
  eventId: string;
  initialData?: GuestFormData;
  isViewMode?: boolean;
  isLocalUpdate?: boolean;
  onSave?: (data: GuestFormData) => Promise<void> | void;
  onCancel?: () => void;
  handleDelete?: (id: string) => void;
}

const defaultFormData: GuestFormData = {
  id: '',
  name: '',
  phone: '',
  numberOfGuests: 1,
  additionalGuestNames: '',
  status: GuestStatus.PENDING,
  table: '',
  dietaryRestrictions: '',
  notes: '',
  category: 'Friend',
  priority: GuestPriority.P2,
  inviter: '',
  preferredLanguage: GuestLanguage.SPANISH,
  isPrimaryGuest: true,
  hasMultipleGuests: false,
};

// Tabs for the guest form
type Tab = 'details' | 'messages';

// URL regex pattern for detecting links in messages
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

// Add GuestFormSkeleton component before the main GuestForm component
function GuestFormSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-100">
        {/* Tab Navigation Skeleton */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-8 pt-6">
            <div className="flex gap-6">
              <div className="pb-4">
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="pb-4">
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>

        {/* Form Content Skeleton */}
        <div className="px-8 py-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <Skeleton className="h-3 w-20 mb-1.5" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-3 gap-6">
              <div>
                <Skeleton className="h-3 w-16 mb-1.5" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 mb-1.5" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 mb-1.5" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          </div>

          {/* Party Size Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-32 mb-1" /> {/* Section Title */}
            <div className="space-y-3">
              {/* Total Guests Stepper Skeleton */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-32" /> {/* Label + Icon */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8" /> {/* Minus button */}
                  <Skeleton className="h-8 w-12 flex-grow" /> {/* Number display */}
                  <Skeleton className="h-8 w-8" /> {/* Plus button */}
                </div>
              </div>
              {/* Conditional "Add Guest Names" Button Skeleton (if numberOfGuests > 1) */}
              {/* This part of skeleton might need to assume numberOfGuests > 1 for structure */}
              <Skeleton className="h-5 w-48" /> {/* "Add Guest Names" button skeleton */}
            </div>
          </div>

          {/* RSVP & Table */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-3 w-20 mb-1.5" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div>
                <Skeleton className="h-3 w-24 mb-1.5" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <div className="space-y-4">
              <div>
                <Skeleton className="h-3 w-32 mb-1.5" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div>
                <Skeleton className="h-3 w-28 mb-1.5" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions Skeleton */}
        <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-100 rounded-b-lg">
          <div className="flex justify-end gap-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuestForm({
  eventId,
  initialData = defaultFormData,
  isViewMode = false,
  isLocalUpdate,
  onSave,
  onCancel,
  handleDelete,
}: GuestFormProps) {
  const { t } = useClientTranslation('common');
  const [formData, setFormData] = useState<GuestFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [categoryInputValue, setCategoryInputValue] = useState<string>('');
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
  const [additionalNamesInputVisible, setAdditionalNamesInputVisible] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Permissions
  const { hasPermission: hasPermissionToUpdateGuest } = useRoleBasedPermission('guests', 'update');

  const utils = api.useUtils();

  const { data: eventData, isLoading: eventLoading } = api.events.getById.useQuery(
    {
      id: eventId,
    },
    {
      enabled: !!eventId,
    }
  );
  const {
    data: relatedGuests,
    isLoading: relatedGuestsLoading,
    isFetched: relatedGuestsFetched,
  } = api.guests.getPartyDetails.useQuery(
    { groupId: formData?.guestGroup?.id },
    { enabled: !!formData?.guestGroup?.id && !!formData?.isPrimaryGuest }
  );

  // Update form data when initialData or isViewMode changes
  useEffect(() => {
    // Start with the default form data and override with initialData
    const updatedFormData = {
      ...defaultFormData,
      ...(initialData ? initialData : {}),
    };

    // If we have event data with required confirmations, initialize them
    if (eventData?.requiredGuestConfirmation) {
      eventData.requiredGuestConfirmation.forEach(confirmation => {
        const confirmationKey = `confirmation_${confirmation.id}`;
        const customResponseKey = `confirmation_${confirmation.id}_custom`;

        // Check if we have an existing response for this confirmation
        const existingResponse = initialData?.guestConfirmationResponses?.find(
          response => response.eventRequiredGuestConfirmationId === confirmation.id
        );

        if (existingResponse) {
          // Get predefined options for this confirmation
          const options = 'options' in confirmation ? (confirmation as any).options || [] : [];
          const baseOptions =
            options.length > 0
              ? options
              : [
                  { id: 'yes', label: 'Yes', value: 'yes' },
                  { id: 'no', label: 'No', value: 'no' },
                  { id: 'pending', label: 'Undecided', value: 'pending' },
                ];

          if (existingResponse.selectedOptionId) {
            // Check if the selected option exists in our predefined options
            const matchingOption = baseOptions.find(
              (option: any) => option.id === existingResponse.selectedOptionId
            );

            if (matchingOption) {
              // Use the predefined option
              updatedFormData[confirmationKey] = existingResponse.selectedOptionId;
            } else {
              // Selected option doesn't exist in predefined options, treat as custom
              updatedFormData[confirmationKey] = 'other';
              updatedFormData[customResponseKey] = existingResponse.customResponse || '';
            }
          } else if (existingResponse.customResponse) {
            // No selected option but has custom response
            updatedFormData[confirmationKey] = 'other';
            updatedFormData[customResponseKey] = existingResponse.customResponse;
          } else {
            // Neither selected option nor custom response, default to pending
            updatedFormData[confirmationKey] = 'pending';
          }
        } else if (!(confirmationKey in updatedFormData)) {
          // No existing response and no value in form data, default to pending
          updatedFormData[confirmationKey] = 'pending';
        }
      });
    }

    setFormData(updatedFormData);
    setErrors({}); // Reset errors when initialData or isViewMode changes
  }, [initialData, isViewMode, eventData?.requiredGuestConfirmation]);

  useEffect(() => {
    if (relatedGuests) {
      setFormData(prev => ({
        ...prev,
        numberOfGuests: relatedGuests.length,
        additionalGuestNames: relatedGuests
          .filter(g => !g.isPrimaryGuest)
          .map(g => g.name)
          .join(', '),
      }));
    }
  }, [relatedGuests, initialData]);

  // Fetch custom categories for the event
  const { data: customCategories = [], isLoading: categoriesLoading } =
    api.events.getCustomGuestCategories.useQuery({ eventId }, { enabled: !!eventId });

  // Create a new custom category
  const createCustomCategory = api.events.createCustomGuestCategory.useMutation({
    onSuccess: () => {
      // Invalidate the query to refresh the categories list
      utils.events.getCustomGuestCategories.invalidate({ eventId });
    },
  });

  // Update guest status mutation
  const updateMutation = api.guests.update.useMutation({
    onSuccess: () => {
      void utils.guests.getById.invalidate({ id: formData.id });
      console.log('invalidating party details', formData.guestGroup?.id);
      void utils.guests.getPartyDetails.invalidate({ groupId: formData.guestGroup?.id });
      void utils.guests.getAll.invalidate();
    },
    onError: e => {
      toast.error(e.message || t('guestForm.errors.updateFailed'));
    },
  });

  // Filtered categories based on input
  const filteredCategories = useMemo(() => {
    if (!categoryInputValue) return customCategories;
    return customCategories.filter(category =>
      category.name.toLowerCase().includes(categoryInputValue.toLowerCase())
    );
  }, [customCategories, categoryInputValue]);

  // Function to handle creating a new category
  const handleCreateCategory = async (categoryName: string) => {
    setIsCreatingCategory(true);
    try {
      // Determine a color for the new category using our defaults
      const lowerCaseName = categoryName.toLowerCase();
      const colorValue =
        DEFAULT_CATEGORY_COLORS[lowerCaseName] || getDefaultColorForCategory(categoryName);

      const newCategory = await createCustomCategory.mutateAsync({
        eventId,
        name: categoryName,
        color: colorValue,
      });

      // Update the form data with the new category
      setFormData(prev => ({
        ...prev,
        category: newCategory.name,
      }));

      // Reset the input
      setCategoryInputValue('');
      setIsCategoryOpen(false);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Helper to get a default color based on category name
  const getDefaultColorForCategory = (name: string): string => {
    // Use a simple hash of the name to select from available colors
    const colors = Object.values(DEFAULT_CATEGORY_COLORS);
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex] || '#718096';
  };

  // Function to handle selecting a category
  const handleSelectCategory = async (categoryName: string) => {
    // Update local form state first
    setFormData(prev => ({
      ...prev,
      category: categoryName,
    }));

    // If we have an ID and want immediate API updates
    if (formData.id && !isLocalUpdate) {
      try {
        // Make the actual API call
        await updateMutation.mutateAsync({
          id: formData.id,
          category: categoryName,
        });
      } catch (error) {
        // If API update fails, show error but keep local state updated
        console.error('Failed to update category:', error);
      }
    }

    setCategoryInputValue('');
    setIsCategoryOpen(false);
  };

  // Initialize visibility of additional names input based on initial data
  useEffect(() => {
    if (formData && formData.additionalGuestNames) {
      setAdditionalNamesInputVisible(true);
    } else {
      setAdditionalNamesInputVisible(false); // Default to hidden if no initial names
    }
    // We only want this to run when initialData itself changes, or specifically when additionalGuestNames part of it might change.
    // formData is too broad here and can cause loops if not careful.
  }, [formData?.additionalGuestNames]);

  // Return skeleton while loading initial data
  if (eventLoading) {
    return <GuestFormSkeleton />;
  }

  // Fetch messages for the selected guest
  const { data: messages, isLoading: messagesLoading } = api.whatsapp.getMessagesForGuest.useQuery(
    {
      guestId: formData.id,
      eventId,
    },
    {
      enabled: !!formData.id && activeTab === 'messages',
      refetchOnWindowFocus: false,
    }
  );

  const createGuest = api.guests.create.useMutation({
    onSuccess: async () => {
      // Invalidate both list and detail queries
      await Promise.all([utils.guests.getAll.invalidate(), utils.guests.getById.invalidate()]);
    },
    onError: error => {
      if (error.data?.code === 'CONFLICT') {
        setErrors(prev => ({
          ...prev,
          phone: [t('guestForm.errors.duplicatePhone')],
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          form: [t('guestForm.errors.saveFailed')],
        }));
      }
      setIsSubmitting(false);
    },
  });

  const updateGuest = api.guests.update.useMutation({
    onSuccess: async () => {
      // Invalidate both list and detail queries
      await Promise.all([utils.guests.getAll.invalidate(), utils.guests.getById.invalidate()]);
    },
    onError: error => {
      if (error.data?.code === 'CONFLICT') {
        setErrors(prev => ({
          ...prev,
          phone: [t('guestForm.errors.duplicatePhone')],
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          form: [t('guestForm.errors.saveFailed')],
        }));
      }
      setIsSubmitting(false);
    },
  });

  const validateField = (name: keyof GuestFormData, value: unknown) => {
    try {
      const field = baseGuestSchema.shape[name];
      field.parse(value);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({
          ...prev,
          [name]: error.errors.map(err => err.message),
        }));
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (isViewMode) return;

    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : type === 'number'
          ? parseInt(value, 10)
          : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));

    validateField(name as keyof GuestFormData, newValue);
  };

  const handleSelectChange = (field: keyof GuestFormData, value: string) => {
    if (isViewMode) return;

    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    validateField(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    try {
      // Include all form data including custom response fields for validation
      const allFormData = { ...formData };

      // Ensure custom response fields are included
      if (eventData?.requiredGuestConfirmation) {
        eventData.requiredGuestConfirmation.forEach(confirmation => {
          const customKey = `confirmation_${confirmation.id}_custom`;
          if (customKey in formData) {
            allFormData[customKey] = formData[customKey];
          }
        });
      }

      const validatedData = guestSchema.parse(allFormData);
      setIsSubmitting(true);

      // Extract confirmation fields to include them in the API call
      const confirmationFields: Record<string, any> = {};
      if (eventData?.requiredGuestConfirmation) {
        eventData.requiredGuestConfirmation.forEach(confirmation => {
          const key = `confirmation_${confirmation.id}`;
          const customKey = `confirmation_${confirmation.id}_custom`;

          if (key in allFormData) {
            confirmationFields[key] = allFormData[key];
          }

          // Include custom response if it exists
          if (customKey in allFormData && allFormData[customKey]) {
            confirmationFields[customKey] = allFormData[customKey];
          }
        });
      }

      if (isLocalUpdate && onSave) {
        try {
          // Include confirmation fields in the save data
          await onSave({
            ...validatedData,
            ...confirmationFields,
          });
        } catch (error: any) {
          if (error.message?.includes('phone number already exists')) {
            setErrors(prev => ({
              ...prev,
              phone: [t('guestForm.errors.duplicatePhone')],
            }));
          } else {
            setErrors(prev => ({
              ...prev,
              form: [t('guestForm.errors.saveFailed')],
            }));
          }
          setIsSubmitting(false);
          return;
        }
      } else {
        // Handle backend update
        const guestId = formData.id;
        if (guestId) {
          const { id: _id, ...updateData } = validatedData;
          await updateGuest.mutateAsync({
            id: guestId,
            ...updateData,
            ...confirmationFields,
          });
        } else {
          await createGuest.mutateAsync({
            ...validatedData,
            ...confirmationFields,
            eventId,
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            const field = err.path[0].toString() as keyof GuestFormData;
            if (!newErrors[field]) {
              newErrors[field] = [];
            }
            newErrors[field]?.push(err.message);
          }
        });
        setErrors(newErrors);
      }
      setIsSubmitting(false);
    }
  };

  // Tab navigation
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  // Simple message display component
  const MessagesTab = () => {
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollIndicator, setShowScrollIndicator] = useState(false);

    // Handle scroll event to show/hide scroll indicator
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        // Show indicator when we're at or near the bottom
        const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 20;
        setShowScrollIndicator(isAtBottom);
      }
    };

    // Scroll to bottom on initial load and when messages change
    useEffect(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, [messages]);

    // Add scroll event listener
    useEffect(() => {
      const container = messagesContainerRef.current;
      if (container) {
        container.addEventListener('scroll', handleScroll);
        // Trigger initial check
        handleScroll();
      }
      return () => {
        if (container) {
          container.removeEventListener('scroll', handleScroll);
        }
      };
    }, []);

    if (messagesLoading) {
      return (
        <div className="py-4 bg-[#E7DFD4] bg-opacity-90 h-[500px] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat rounded-lg p-4 overflow-y-auto max-h-[500px] border border-gray-200">
          <div className="flex items-center justify-center ">
            <div className="w-full h-full bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      );
    }

    if (!messages?.messages || messages?.messages.length === 0) {
      return (
        <div className="bg-[#E7DFD4] bg-opacity-90 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px] border border-gray-200 space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-gray-700 font-medium">{t('guestForm.messages.noMessages')}</h3>
            <p className="text-gray-500 text-sm mt-1">
              {t('guestForm.messages.noMessagesDesc')}
            </p>
          </div>
        </div>
      );
    }

    // Sort messages in reverse chronological order (newest last)
    const sortedMessages = [...messages?.messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return (
      <div className="space-y-4 p-2">
        {/* WhatsApp style chat container */}
        <div className="relative">
          <div
            ref={messagesContainerRef}
            className="bg-[#E7DFD4] bg-opacity-90 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat rounded-lg p-4 overflow-y-auto max-h-[500px] border border-gray-200 flex flex-col"
          >
            <div className="space-y-4 min-h-full">
              {sortedMessages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === MessageDirection.INBOUND ? 'justify-start' : 'justify-end'} pb-2`}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg p-3 relative shadow-sm',
                      message.direction === MessageDirection.INBOUND
                        ? 'bg-white text-[#111B21] rounded-tl-none'
                        : 'bg-[#E7FFDB] text-[#111B21] rounded-tr-none'
                    )}
                  >
                    {/* Content type label for non-text messages */}
                    {'contentType' in message &&
                      message.contentType &&
                      message.contentType !== 'text' && (
                        <div className="mb-2 text-xs text-purple-500 font-medium">
                          {message.contentType === 'template'
                            ? 'Template Message'
                            : message.contentType.split('/')[0]}
                        </div>
                      )}

                    {/* Label for Manually sent messages */}
                    {'sentBy' in message && message.sentBy && (
                      <div className="mb-2 text-xs text-purple-500 font-medium">
                        {message.sentBy}
                      </div>
                    )}

                    {/* If media is available, show it */}
                    {'hasMedia' in message &&
                      message.hasMedia &&
                      'mediaUrls' in message &&
                      message.mediaUrls &&
                      message.mediaUrls.length > 0 && (
                        <div className="mb-2">
                          {message.mediaUrls.map((url, idx) => {
                            // Extract media ID and extension from the URL if it's a CDN URL
                            const cdnMatch = url.match(/\/api\/cdn\/(.+?)\.(.+)$/);
                            let mediaId = cdnMatch ? cdnMatch[1] : null;

                            // Handle variable placeholders in mediaId
                            if (mediaId?.startsWith('{{') && mediaId?.endsWith('}}')) {
                              const varNumber = mediaId.slice(2, -2);
                              const variables = message.templateVariables as Record<string, string>;

                              if (variables?.[varNumber]) {
                                mediaId = variables[varNumber];
                              }
                            }

                            const extension = cdnMatch
                              ? cdnMatch[2]?.toLowerCase()
                              : url.split('.').pop()?.toLowerCase();

                            // Check if it's an image based on extension
                            const isImage =
                              extension && /^(jpg|jpeg|png|gif|webp)$/i.test(extension);

                            // Construct full CDN URL if we have a media ID
                            const cdnUrl = mediaId
                              ? new URL(
                                  `/api/cdn/${mediaId}.${extension}`,
                                  window.location.origin
                                ).toString()
                              : url;

                            return isImage ? (
                              <div
                                key={idx}
                                className="rounded-lg overflow-hidden mb-2 bg-gray-100"
                              >
                                <img
                                  src={cdnUrl}
                                  alt="Message media"
                                  className="w-full h-auto object-contain max-h-48"
                                  onError={e => {
                                    e.currentTarget.src =
                                      'https://via.placeholder.com/300x200?text=Media+Unavailable';
                                  }}
                                />
                              </div>
                            ) : extension?.toLowerCase() === 'pdf' ? (
                              <a
                                key={idx}
                                href={cdnUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block mb-2 no-underline"
                              >
                                <div className="bg-[#1F2937] rounded-lg overflow-hidden">
                                  {/* PDF Preview */}
                                  <div className="bg-white">
                                    <iframe
                                      src={cdnUrl}
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
                                        {'fileSize' in message &&
                                          typeof message.fileSize === 'number' && (
                                            <>
                                              <span className="text-gray-500">•</span>
                                              <span>{Math.round(message.fileSize / 1024)} KB</span>
                                            </>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </a>
                            ) : (
                              <div
                                key={idx}
                                className="bg-gray-100 rounded-lg p-2 mb-2 flex items-center gap-2"
                              >
                                <svg
                                  className="w-5 h-5 text-gray-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                <a
                                  href={cdnUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline truncate"
                                >
                                  Download {(extension ?? 'FILE').toUpperCase()} file
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    {/* Message content with template variable handling */}
                    {message.type === 'template' &&
                    'templateContent' in message &&
                    message.templateContent ? (
                      <p className="text-[15px] leading-[20px] whitespace-pre-wrap break-words font-[system-ui]">
                        {message.templateContent.split(/{{(\d+)}}/).map((part, index) => {
                          // Even indices are regular text
                          if (index % 2 === 0) {
                            return typeof part === 'string' ? linkifyText(part) : part;
                          }

                          // Odd indices are variables
                          const variable = part;
                          const variables = message.templateVariables as Record<string, string>;
                          const varValue = variables?.[variable];

                          if (!varValue) return `{{${variable}}}`;

                          // Handle guest variable pattern
                          if (varValue.startsWith('{{')) {
                            const path = varValue.slice(2, -2).split('.')[1];
                            if (path && formData) {
                              return formData[path as keyof GuestFormData] || `{{${variable}}}`;
                            }
                            return `{{${variable}}}`;
                          }

                          return varValue;
                        })}
                      </p>
                    ) : (
                      <p className="text-[15px] leading-[20px] whitespace-pre-wrap break-words font-[system-ui]">
                        {linkifyText(message.content)}
                      </p>
                    )}

                    {/* Message timestamp and status */}
                    <div className="flex items-center justify-end mt-1 gap-1">
                      <span className="text-[#667781] text-[11px] text-right">
                        {format(new Date(message.timestamp), 'HH:mm')}
                      </span>
                      {message.direction === MessageDirection.OUTBOUND && (
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
            </div>
          </div>

          {/* Scroll Indicator */}
          {showScrollIndicator && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="bg-purple-600 text-white px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm flex items-center gap-1 border border-purple-100/50 transition-opacity duration-200 hover:opacity-100 opacity-80">
                <FiChevronDown className="h-3 w-3 rotate-180" />
                <span>{t('guestForm.messages.more')}</span>
              </div>
            </div>
          )}
        </div>
        {/* Message info */}
        <div className="text-xs text-gray-500 text-center mt-2">
        Showing {messages?.messages.length} message{messages?.messages.length !== 1 ? 's' : ''}{' '}
        for this guest
        </div>
        <ChatSessionReplyBox session={messages?.session} />
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="relative bg-white rounded-lg border border-gray-100">
        {/* Tab Navigation - Sticky */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-8 pt-6">
            <div className="flex gap-6 ">
              <button
                onClick={() => handleTabChange('details')}
                className={cn(
                  'pb-4 text-sm font-medium border-b-2 -mb-px',
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {t('guestForm.tabs.details')}
              </button>
              <button
                onClick={() => handleTabChange('messages')}
                className={cn(
                  'pb-4 text-sm font-medium border-b-2 -mb-px',
                  activeTab === 'messages'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {t('guestForm.tabs.messages')}
              </button>
            </div>
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 absolute right-4 top-4"
                onClick={e => {
                  e.preventDefault();
                  onCancel();
                }}
              >
                <FiX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Group Status Banner */}
        {formData && (
          <>
            {!formData.isPrimaryGuest && (
              <div className="bg-purple-50 px-8 py-2 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-purple-100 p-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-purple-600"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M22 21v-2a4 4 0 0 0-2-3.5"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <span className="text-xs text-purple-700 font-medium">
                    {t('guestForm.fields.includedInInvitation', { name: formData.guestGroup?.leadGuest.name })}
                  </span>
                </div>
              </div>
            )}
            {formData.hasMultipleGuests && formData.isPrimaryGuest && (
              <div className="bg-blue-50 px-8 py-2 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-blue-100 p-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-blue-600"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <span className="text-xs text-blue-700 font-medium">
                    {t('guestForm.inviteIncludes', { name: formData.name, count: formData.guestGroup?._count.guests - 1 })}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab Content */}
        {activeTab === 'details' ? (
          <form onSubmit={handleSubmit}>
            {/* Form Content */}
            <div className="px-8 py-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium text-gray-900 uppercase tracking-wider">
                      {t('guestForm.sections.basicInfo')}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-600">
                        {t('guestForm.fields.fullName')} {!isViewMode && <span className="text-gray-400">*</span>}
                      </label>
                    </div>
                    <Input
                      name="name"
                      value={formData.name ?? ''}
                      onChange={handleInputChange}
                      placeholder={t('guestForm.fields.fullName')}
                      className={cn(
                        'h-8 text-sm',
                        isViewMode && 'bg-gray-50/50',
                        errors.name && 'border-rose-500'
                      )}
                      readOnly={isViewMode}
                      required
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && (
                      <p className="mt-1.5 text-[11px] text-rose-500">{errors.name[0]}</p>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    'grid grid-cols-2 gap-6',
                    !formData.isPrimaryGuest && 'grid-cols-1'
                  )}
                >
                  {formData.isPrimaryGuest && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-600">
                          {t('guestForm.fields.phone')} {!isViewMode && <span className="text-gray-400">*</span>}
                        </label>
                      </div>
                      <Input
                        name="phone"
                        value={formData.phone ?? ''}
                        onChange={handleInputChange}
                        placeholder="+523311223344"
                        className={cn(
                          'h-8 text-sm',
                          isViewMode && 'bg-gray-50/50',
                          errors.phone && 'border-rose-500'
                        )}
                        readOnly={isViewMode}
                        required={formData.isPrimaryGuest}
                        aria-invalid={!!errors.phone}
                      />
                      {errors.phone && (
                        <p className="mt-1.5 text-[11px] text-rose-500">{errors.phone[0]}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-600">
                        {t('guestForm.fields.preferredLanguage')} {!isViewMode && <span className="text-gray-400">*</span>}
                      </label>
                    </div>
                    <Select
                      name="preferredLanguage"
                      value={formData.preferredLanguage}
                      onValueChange={value => handleSelectChange('preferredLanguage', value)}
                      disabled={isViewMode}
                    >
                      <SelectTrigger
                        className={cn(
                          'h-8 text-sm w-full',
                          isViewMode && 'bg-gray-50/50',
                          errors.preferredLanguage && 'border-rose-500'
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value={GuestLanguage.SPANISH}>Spanish</SelectItem>
                        <SelectItem value={GuestLanguage.ENGLISH}>English</SelectItem>
                        <SelectItem value={GuestLanguage.GERMAN}>German</SelectItem>
                        <SelectItem value={GuestLanguage.FRENCH}>French</SelectItem>
                        <SelectItem value={GuestLanguage.ITALIAN}>Italian</SelectItem>
                        <SelectItem value={GuestLanguage.PORTUGUESE}>Portuguese</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.preferredLanguage && (
                      <p className="mt-1.5 text-[11px] text-rose-500">
                        {errors.preferredLanguage[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {/* Classification */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-medium text-gray-900 uppercase tracking-wider">
                    {t('guestForm.fields.classification')}
                  </div>
                  {!isViewMode && <div className="text-[10px] text-gray-400">{t('guestForm.fields.required')}</div>}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="">
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">
                      {t('guestForm.fields.category')} {!isViewMode && <span className="text-gray-400">*</span>}
                    </label>
                    {isViewMode ? (
                      <div className="h-8 flex items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                              style={{
                                color: getCategoryColor(formData.category).color,
                                backgroundColor: getCategoryColor(formData.category)
                                  .backgroundColor,
                              }}
                            >
                              {formatCategoryName(formData.category)}
                              <FiChevronDown className="h-2.5 w-2.5 ml-0.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 p-1">
                            {filteredCategories.map(category => (
                              <DropdownMenuItem
                                key={category.name}
                                className="focus:bg-transparent focus:text-current p-1"
                              >
                                <div
                                  className="w-full rounded-md px-2 py-1 text-xs"
                                  style={{
                                    color: getCategoryColor(category.name, category.color).color,
                                    backgroundColor: getCategoryColor(category.name, category.color)
                                      .backgroundColor,
                                  }}
                                >
                                  {formatCategoryName(category.name)}
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : (
                      <Popover open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between h-8 text-sm border-none rounded-full px-0',
                              errors.category && 'border-rose-500',
                              !formData.category && 'text-muted-foreground'
                            )}
                            style={{
                              color: getCategoryColor(
                                formData.category,
                                customCategories.find(c => c.name === formData.category)?.color
                              ).color,
                              backgroundColor: getCategoryColor(
                                formData.category,
                                customCategories.find(c => c.name === formData.category)?.color
                              ).backgroundColor,
                            }}
                          >
                            <span className="flex items-center gap-0 truncate">
                              {formData.category ? (
                                <span className="px-0 py-0.5 text-xs font-medium">
                                  {formatCategoryName(formData.category)}
                                </span>
                              ) : (
                                t('guestForm.category.select')
                              )}
                            </span>
                            <FiChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-full" side="bottom" align="start">
                          <Command className="w-full">
                            <div className="flex items-center border-b px-3 sticky top-0 bg-white">
                              <Search className="mr-2 h-3 w-3 shrink-0 text-purple-500" />
                              <CommandInput
                                placeholder={t('guestForm.category.searchOrCreate')}
                                value={categoryInputValue}
                                onValueChange={setCategoryInputValue}
                              />
                            </div>
                            <CommandList>
                              <CommandGroup heading={t('guestForm.category.eventCategories')}>
                                <CommandEmpty className="p-2">
                                  <div className="py-3 px-2 text-xs text-gray-500 text-center">
                                    {t('guestForm.category.startTyping')}
                                  </div>
                                </CommandEmpty>
                                {filteredCategories.map(category => (
                                  <CommandItem
                                    key={category.name}
                                    onSelect={() => handleSelectCategory(category.name)}
                                    className="flex items-center text-sm p-1.5 hover:bg-transparent aria-selected:bg-transparent"
                                    value={category.name}
                                  >
                                    <div
                                      className="w-full rounded-md px-2 py-1"
                                      style={{
                                        color: getCategoryColor(category.name, category.color)
                                          .color,
                                        backgroundColor: getCategoryColor(
                                          category.name,
                                          category.color
                                        ).backgroundColor,
                                      }}
                                    >
                                      {formatCategoryName(category.name)}
                                    </div>
                                  </CommandItem>
                                ))}
                                {categoryInputValue && (
                                  <CommandItem
                                    onSelect={() => handleCreateCategory(categoryInputValue)}
                                    onClick={() => handleCreateCategory(categoryInputValue)}
                                    className="flex items-center gap-2 text-sm p-1.5"
                                  >
                                    <div className="flex items-center gap-2 w-full border border-dashed border-gray-300 rounded-md px-2 py-1">
                                      <FiPlusCircle className="h-4 w-4" />
                                      <span>{t('guestForm.category.createNew', { name: categoryInputValue })}</span>
                                    </div>
                                  </CommandItem>
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                    {errors.category && (
                      <p className="mt-1.5 text-[11px] text-rose-500">{errors.category[0]}</p>
                    )}
                  </div>

                  <div className="">
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">
                      {t('guestForm.fields.priority')} {!isViewMode && <span className="text-gray-400">*</span>}
                    </label>
                    <Select
                      name="priority"
                      value={formData.priority}
                      onValueChange={value => handleSelectChange('priority', value)}
                      disabled={isViewMode}
                    >
                      <SelectTrigger
                        className={cn(
                          'text-sm w-full',
                          isViewMode && 'bg-gray-50/50',
                          errors.priority && 'border-rose-500'
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value={GuestPriority.P1}>P1</SelectItem>
                        <SelectItem value={GuestPriority.P2}>P2</SelectItem>
                        <SelectItem value={GuestPriority.P3}>P3</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.priority && (
                      <p className="mt-1.5 text-[11px] text-rose-500">{errors.priority[0]}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">
                      {t('guestForm.fields.inviter')} {!isViewMode && <span className="text-gray-400">*</span>}
                    </label>
                    <div className="relative">
                      <Input
                        name="inviter"
                        value={formData.inviter ?? ''}
                        onChange={handleInputChange}
                        placeholder={t('guestForm.fields.inviter')}
                        className={cn(
                          'h-9 text-sm pr-10',
                          isViewMode && 'bg-gray-50/50',
                          errors.inviter && 'border-rose-500'
                        )}
                        readOnly={isViewMode}
                        required
                      />
                      {!isViewMode && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-2"
                          onClick={e => {
                            e.preventDefault();
                            const select = document.getElementById('inviter-select');
                            if (select) {
                              select.style.display =
                                select.style.display === 'block' ? 'none' : 'block';
                            }
                          }}
                        >
                          <FiChevronDown className="h-4 w-4" />
                        </Button>
                      )}
                      {!isViewMode && (
                        <div
                          id="inviter-select"
                          className="absolute z-50 mt-1 w-full rounded-md bg-white shadow-lg hidden"
                          style={{ display: 'none' }}
                        >
                          <ul className="max-h-60 overflow-auto rounded-md py-1 text-base sm:text-sm">
                            {[
                              eventData?.person1 ?? 'Inviter 1',
                              eventData?.person2 ?? 'Inviter 2',
                            ].map(inviter => (
                              <li
                                key={inviter}
                                className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-gray-100"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    inviter,
                                  }));
                                  validateField('inviter', inviter);
                                  const select = document.getElementById('inviter-select');
                                  if (select) select.style.display = 'none';
                                }}
                              >
                                {inviter}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {errors.inviter && (
                      <p className="mt-1.5 text-[11px] text-rose-500">{errors.inviter[0]}</p>
                    )}
                  </div>
                </div>
              </div>
              {/* Plus One / Party Size */}
              {((formData && formData.isPrimaryGuest) || !formData) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium text-gray-900 uppercase tracking-wider">
                      {t('guestForm.sections.partySize')}
                    </div>
                    {!isViewMode && <div className="text-[10px] text-gray-400">{t('guestForm.fields.required')}</div>}
                  </div>
                  {/* Wrapper for all fields within Party Size for better grouping and rhythm */}
                  <div className="space-y-3">
                    {/* Field 1: Number of Guests + Stepper + Its Error */}
                    <div>
                      {' '}
                      {/* Wrapper for the field and its specific error */}
                      <div className="flex items-center justify-between">
                        {' '}
                        {/* User's preferred layout for label + stepper */}
                        {/* Label + Tooltip */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {' '}
                          {/* mb-1.5 removed, parent space-y handles it */}
                          <label
                            htmlFor="numberOfGuests"
                            className="text-xs font-medium text-gray-600"
                          >
                            {t('guestForm.fields.numberOfGuests')} {!isViewMode && <span className="text-gray-400">*</span>}
                          </label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger type="button">
                                <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-center z-[70]">
                                <p className="text-xs">
                                  {t('guestForm.partySize.tooltip')}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {/* Stepper Controls */}
                        <div className="flex flex-col items-center justify-start translate-y-2">
                          <div className="flex items-center gap-2">
                            {/* Minus Button */}
                            {relatedGuestsFetched &&
                            relatedGuests &&
                            formData.numberOfGuests <= relatedGuests.length ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger
                                    type="button"
                                    className="border border-gray-300 rounded-md h-8 w-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-default text-gray-400"
                                  >
                                    <FiMinus className="h-4 w-4" />
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-xs text-center z-[70]"
                                  >
                                    <p className="text-xs">
                                      {t('guestForm.partySize.otherGuestsTooltip')}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (isViewMode) return;
                                  const newCount = Math.max(1, (formData.numberOfGuests ?? 1) - 1);
                                  setFormData(prev => ({ ...prev, numberOfGuests: newCount }));
                                  validateField('numberOfGuests', newCount);
                                }}
                                disabled={
                                  relatedGuestsLoading ||
                                  (relatedGuests &&
                                    formData.numberOfGuests <= relatedGuests.length) ||
                                  isViewMode ||
                                  (formData.numberOfGuests ?? 1) <= 1
                                }
                              >
                                <FiMinus className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Input (only for display) */}
                            <Input
                              type="text"
                              readOnly
                              value={formData.numberOfGuests ?? 1}
                              className={cn(
                                'h-8 text-sm text-center w-12 flex-grow',
                                isViewMode && 'bg-gray-50/50',
                                errors.numberOfGuests && 'border-rose-500',
                                'hover:cursor-default'
                              )}
                              aria-label="Total guests in party"
                            />
                            {/* Plus Button */}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                if (isViewMode) return;
                                const newCount = (formData.numberOfGuests ?? 0) + 1;
                                setFormData(prev => ({ ...prev, numberOfGuests: newCount }));
                                validateField('numberOfGuests', newCount);
                              }}
                              disabled={isViewMode}
                            >
                              <FiPlus className="h-4 w-4" />
                            </Button>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            (
                            {formData.numberOfGuests === 1
                              ? t('guestForm.partySize.onlyMainGuest')
                              : formData.numberOfGuests === 2
                                ? t('guestForm.partySize.mainGuestPlusOne')
                                : t('guestForm.partySize.additionalGuests', { count: formData.numberOfGuests - 1 })}
                            )
                          </span>
                        </div>
                      </div>
                      {errors.numberOfGuests && (
                        <p className="mt-1 text-[11px] text-rose-500">{errors.numberOfGuests[0]}</p> // Reduced top margin
                      )}
                    </div>

                    {/* Field 2 (Conditional): Names of Guests */}
                    {(formData.numberOfGuests ?? 1) > 1 && (
                      // mt-3 removed, parent div "space-y-3" will handle spacing from the element above
                      <div className="space-y-2">
                        {' '}
                        {/* Inner spacing for toggle and input */}
                        {!isViewMode && (
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto text-xs text-blue-600 hover:text-blue-700"
                            onClick={() => {
                              setAdditionalNamesInputVisible(!additionalNamesInputVisible);
                            }}
                          >
                            {additionalNamesInputVisible
                              ? t('guestForm.fields.hideGuestNames')
                              : t('guestForm.fields.addGuestNames')}
                          </Button>
                        )}
                        {additionalNamesInputVisible && !isViewMode && (
                          <div className="mt-1">
                            {' '}
                            {/* Small gap between toggle and this input block */}
                            <label
                              htmlFor="additionalGuestNames"
                              className="text-xs font-medium text-gray-600 block mb-1.5 flex items-center gap-1"
                            >
                              {t('guestForm.fields.additionalGuests')}
                              <span className="text-[10px] text-gray-400">(Optional)</span>
                              {!isViewMode && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger type="button">
                                      <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="max-w-xs text-center z-[70]"
                                    >
                                      <p className="text-xs">
                                        {t('guestForm.additionalGuests.tooltip')}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </label>
                            <Input
                              type="text"
                              id="additionalGuestNames"
                              name="additionalGuestNames"
                              value={formData.additionalGuestNames ?? ''}
                              onChange={handleInputChange}
                              placeholder={t('guestForm.fields.additionalGuestsPlaceholder')}
                              className={cn(
                                'h-8 text-sm',
                                errors.additionalGuestNames && 'border-rose-500'
                              )}
                              aria-invalid={!!errors.additionalGuestNames}
                            />
                            {errors.additionalGuestNames && (
                              <p className="mt-1.5 text-[11px] text-rose-500">
                                {errors.additionalGuestNames[0]}
                              </p>
                            )}
                          </div>
                        )}
                        {isViewMode &&
                          formData.additionalGuestNames &&
                          formData.additionalGuestNames.trim() !== '' && (
                            <div className="mt-1">
                              <label className="text-xs font-medium text-gray-600 block mb-1.5">
                                {t('guestForm.fields.additionalGuests')}
                              </label>
                              <p className="text-sm text-gray-700 bg-gray-50/50 p-2 rounded-md break-words">
                                {formData.additionalGuestNames}
                              </p>
                            </div>
                          )}
                      </div>
                    )}
                  </div>{' '}
                  {/* End of wrapper for all fields */}
                </div>
              )}
              {/* RSVP & Table */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-medium text-gray-900 uppercase tracking-wider">
                    {t('guestForm.sections.rsvpTable')}
                  </div>
                  {!isViewMode && <div className="text-[10px] text-gray-400">{t('guestForm.fields.required')}</div>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="w-full">
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">
                      {t('guestForm.fields.rsvpStatus')} {!isViewMode && <span className="text-gray-400">*</span>}
                    </label>
                    <Select
                      name="status"
                      value={formData.status}
                      onValueChange={value => handleSelectChange('status', value)}
                      disabled={isViewMode}
                    >
                      <SelectTrigger
                        className={cn(
                          'h-8 text-sm',
                          isViewMode && 'bg-gray-50/50',
                          errors.status && 'border-rose-500',
                          'w-full'
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value={GuestStatus.PENDING}>{t('guestForm.rsvpStatus.pending')}</SelectItem>
                        <SelectItem value={GuestStatus.CONFIRMED}>{t('guestForm.rsvpStatus.confirmed')}</SelectItem>
                        <SelectItem value={GuestStatus.DECLINED}>{t('guestForm.rsvpStatus.declined')}</SelectItem>
                        <SelectItem value={GuestStatus.INACTIVE}>{t('guestForm.rsvpStatus.inactive')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.status && (
                      <p className="mt-1.5 text-[11px] text-rose-500">{errors.status[0]}</p>
                    )}
                  </div>

                  <div className="group">
                    <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1 justify-between">
                      <span>{t('guestForm.fields.tableAssignment')}</span>
                      <Link
                        href={`/admin/events/${eventId}/seat-assignment`}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 opacity-50 group-hover:opacity-100 transition-opacity border border-gray-300 rounded-full px-1.5 py-0"
                      >
                        {t('guestForm.fields.edit')}
                        <ExternalLinkIcon className="w-2.5 h-2.5" />
                      </Link>
                    </label>
                    <Input
                      name="table"
                      disabled
                      value={formData.table ?? ''}
                      onChange={handleInputChange}
                      placeholder={t('guestForm.fields.noTableAssigned')}
                      className={cn(
                        'h-8 text-xs border-none px-0 bg-transparent read-only:focus:ring-0 read-only:focus:ring-offset-0 read-only:cursor-default placeholder:text-xs',
                        isViewMode && 'bg-gray-50/50',
                        errors.table && 'border-rose-500'
                      )}
                      readOnly={isViewMode}
                    />
                    {errors.table && (
                      <p className="mt-1.5 text-[11px] text-rose-500">{errors.table[0]}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Confirmations */}
              {eventData?.requiredGuestConfirmation &&
                eventData.requiredGuestConfirmation.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('guestForm.additionalConfirmations')}
                      </div>
                      {!isViewMode && <div className="text-[10px] text-gray-400">{t('guestForm.fields.required')}</div>}
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      {eventData?.requiredGuestConfirmation.map(confirmation => {
                        // Get options for this confirmation
                        const options =
                          'options' in confirmation ? (confirmation as any).options || [] : [];

                        // Default options if none are specified
                        const baseOptions =
                          options.length > 0
                            ? options
                            : [
                                { id: 'yes', label: 'Yes', value: 'yes' },
                                { id: 'no', label: 'No', value: 'no' },
                                { id: 'pending', label: 'Undecided', value: 'pending' },
                              ];

                        // Always add "Other" option
                        const displayOptions = [
                          ...baseOptions,
                          { id: 'other', label: 'Other', value: 'other' },
                        ];

                        // Get the current form value for this confirmation
                        const currentValue =
                          formData[`confirmation_${confirmation.id}`] || 'pending';

                        // Find the existing response for this confirmation
                        const existingResponse = initialData?.guestConfirmationResponses?.find(
                          response => response.eventRequiredGuestConfirmationId === confirmation.id
                        );

                        // Determine the display value and selected option
                        let selectedOptionId = currentValue;
                        let customResponse = '';

                        // Check if current value matches any predefined option
                        const matchingOption = baseOptions.find(
                          (option: any) =>
                            option.id === currentValue || option.value === currentValue
                        );

                        if (!matchingOption && existingResponse?.customResponse) {
                          // If no predefined option matches and we have a custom response, select "Other"
                          selectedOptionId = 'other';
                          customResponse = existingResponse.customResponse;
                        } else if (!matchingOption && currentValue !== 'pending') {
                          // If no predefined option matches and it's not pending, treat as custom
                          selectedOptionId = 'other';
                          customResponse = currentValue;
                        }

                        // Handle custom response field
                        const customResponseKey = `confirmation_${confirmation.id}_custom`;
                        const currentCustomResponse = formData[customResponseKey] || customResponse;

                        return (
                          <div key={confirmation.id} className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-gray-600 block">
                                {confirmation.label}
                              </label>
                              <Select
                                value={selectedOptionId}
                                onValueChange={value => {
                                  setFormData(prev => ({
                                    ...prev,
                                    [`confirmation_${confirmation.id}`]: value,
                                    // Clear custom response if not selecting "Other"
                                    ...(value !== 'other' && {
                                      [`confirmation_${confirmation.id}_custom`]: '',
                                    }),
                                  }));
                                }}
                                disabled={isViewMode}
                              >
                                <SelectTrigger
                                  className={cn('h-8 text-sm', isViewMode && 'bg-gray-50/50')}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[60]">
                                  {displayOptions.map((option: any) => (
                                    <SelectItem
                                      key={option.id || option.value}
                                      value={option.id || option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Custom response field - show when "Other" is selected or when there's an existing custom response */}
                            {(selectedOptionId === 'other' || currentCustomResponse) && (
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 block">
                                  {t('guestForm.customResponse')}
                                  {selectedOptionId === 'other' && !isViewMode && (
                                    <span className="text-gray-400">*</span>
                                  )}
                                </label>
                                <Input
                                  value={currentCustomResponse}
                                  onChange={e => {
                                    const value = e.target.value;
                                    setFormData(prev => ({
                                      ...prev,
                                      [customResponseKey]: value,
                                      // Update the main confirmation field with the custom value
                                      [`confirmation_${confirmation.id}`]: value || 'other',
                                    }));
                                  }}
                                  placeholder="Enter your custom response..."
                                  className={cn('h-8 text-sm', isViewMode && 'bg-gray-50/50')}
                                  readOnly={isViewMode}
                                />
                                {isViewMode && existingResponse?.customResponse && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Original response: &quot;{existingResponse.customResponse}&quot;
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              {/* Additional Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-medium text-gray-900 uppercase tracking-wider">
                    {t('guestForm.sections.additionalInfo')}
                  </div>
                  {!isViewMode && <div className="text-[10px] text-gray-400">{t('guestForm.fields.optional')}</div>}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">
                      {t('guestForm.fields.dietaryRestrictions')}
                    </label>
                    <Input
                      name="dietaryRestrictions"
                      value={formData.dietaryRestrictions ?? ''}
                      onChange={handleInputChange}
                      placeholder={t('guestForm.fields.dietaryRestrictionsPlaceholder')}
                      className={cn('h-8 text-sm', isViewMode && 'bg-gray-50/50')}
                      readOnly={isViewMode}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">
                      {t('guestForm.fields.additionalNotes')}
                    </label>
                    <Input
                      name="notes"
                      value={formData.notes ?? ''}
                      onChange={handleInputChange}
                      placeholder={t('guestForm.fields.additionalNotesPlaceholder')}
                      className={cn('h-8 text-sm', isViewMode && 'bg-gray-50/50')}
                      readOnly={isViewMode}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            {!isViewMode && (
              <div className="sticky bottom-0 left-0 right-0 px-8 py-4 bg-gray-50/50 border-t border-gray-100 rounded-b-lg backdrop-blur-sm z-10 shadow-sm">
                <div className="flex justify-between gap-3">
                  {formData.id && hasPermissionToUpdateGuest && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleDelete?.(formData.id)}
                      disabled={isSubmitting}
                      className="h-8 text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      {t('guestForm.actions.deleteGuest')}
                    </Button>
                  )}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onCancel}
                      disabled={isSubmitting}
                      className="h-8 text-sm"
                    >
                      {t('guestForm.actions.cancel')}
                    </Button>
                    {hasPermissionToUpdateGuest && (
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? t('guestForm.actions.saving') : t('guestForm.actions.saveGuest')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
        ) : (
          <MessagesTab />
        )}
      </div>
    </div>
  );
}
