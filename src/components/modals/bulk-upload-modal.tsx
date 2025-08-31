import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button, Badge, LoadingDots } from '@/components/ui';
import { FiUpload, FiX, FiEdit2, FiTrash2, FiFileText } from 'react-icons/fi';
import Link from 'next/link';
import { GuestLanguage, GuestPriority, GuestStatus } from '@prisma/client';
import { toast } from 'react-hot-toast';
import { api } from '@/trpc/react';
import Papa from 'papaparse';
import GuestForm, { GuestFormData } from '@/components/guests/GuestForm';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Type definitions for bulk upload
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface GuestUploadData {
  id: string;
  name: string;
  phone: string;
  category: string;
  numberOfGuests: number; // 1 = only guest, 2 = guest + 1 additional guest
  additionalGuestNames: string; // comma separated list of names
  inviter: string;
  dietaryRestrictions?: string;
  notes?: string;
  status: GuestStatus;
  table?: string;
  preferredLanguage?: GuestLanguage;
  priority: GuestPriority;
  // These columns are not part of the guest model
  validation: ValidationResult;
  formData?: GuestFormData;
}

// These should match exactly the columns from the CSV file
interface RawGuestData {
  Nombre: string;
  'Telefono (con lada)': string;
  Categoría: string;
  'Número de boletos': number;
  'Nombres de invitados adicionales (separados por commas)': string;
  'Invitado por': string;
  'Restricciones alimenticias': string;
  Notas: string;
  RSVP: string;
  Mesa: string;
  Idioma: string;
  Prioridad: string;
}

// Required columns constant
const REQUIRED_COLUMNS = [
  'Nombre',
  'Telefono (con lada)',
  'Categoría',
  'Invitado por',
  'Número de boletos',
  'RSVP',
  'Prioridad',
] as const;

interface BulkUploadModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BulkUploadModal({
  eventId,
  isOpen,
  onClose,
  onSuccess,
}: BulkUploadModalProps) {
  const { t } = useClientTranslation('common');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<GuestUploadData | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guests, setGuests] = useState<GuestUploadData[]>([]);
  const [editedGuests, setEditedGuests] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [guestsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'invalid'>('all');

  const utils = api.useUtils();

  // Check phone numbers mutation
  const checkPhoneNumbersMutation = api.guests.checkPhoneNumbers.useMutation();

  // Bulk upload mutation
  const bulkUploadMutation = api.guests.bulkUpload.useMutation({
    onSuccess: result => {
      if (result.isAsync && 'batchId' in result) {
        // Handle asynchronous upload - close modal immediately
        const estimatedSeconds = calculateProcessingTime(result.totalGuests);
        const toastId = toast.loading(
          t('bulkUpload.toast.processing')
        );

        new Promise(resolve => setTimeout(resolve, estimatedSeconds * 1000)).then(() => {
          toast.dismiss(toastId);
          toast.success(t('bulkUpload.toast.completed', { count: result.totalGuests }));
          void utils.guests.getAll.invalidate();
        });
        handleCancel(); // Close modal immediately
        if (onSuccess) {
          onSuccess();
        }
      } else if (!result.isAsync && 'count' in result) {
        // Handle synchronous upload
        toast.success(t('bulkUpload.toast.importSuccess', { count: result.count as number }));
        handleCancel();
        if (onSuccess) {
          onSuccess();
        }
      }
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  // Validation utilities
  const validateGuest = (guest: GuestUploadData): ValidationResult => {
    const errors: string[] = [];

    // Required fields validation
    if (!guest.name?.trim()) errors.push(t('bulkUpload.validation.nameRequired'));
    if (!guest.phone?.trim()) errors.push(t('bulkUpload.validation.phoneRequired'));
    if (!guest.category?.trim()) errors.push(t('bulkUpload.validation.categoryRequired'));
    if (!guest.inviter?.trim()) errors.push(t('bulkUpload.validation.inviterRequired'));
    if (!guest.numberOfGuests) errors.push(t('bulkUpload.validation.numberOfGuestsRequired'));

    // Phone format validation
    const phoneRegex = /^\+[1-9]\d{10,12}$/;
    if (guest.phone && !phoneRegex.test(guest.phone)) {
      errors.push(t('bulkUpload.validation.phoneFormat'));
    }

    // Priority validation
    if (!Object.values(GuestPriority).includes(guest.priority)) {
      errors.push(t('bulkUpload.validation.invalidPriority', { 
        options: Object.values(GuestPriority).join(', ') 
      }));
    }

    // Language validation
    if (
      guest.preferredLanguage &&
      !Object.values(GuestLanguage).includes(guest.preferredLanguage)
    ) {
      errors.push(t('bulkUpload.validation.invalidLanguage', { 
        options: Object.values(GuestLanguage).join(', ') 
      }));
    }

    // Status validation
    if (!Object.values(GuestStatus).includes(guest.status)) {
      errors.push(t('bulkUpload.validation.invalidStatus', { 
        options: Object.values(GuestStatus).join(', ') 
      }));
    }

    // Length validations
    if (guest.name && guest.name.length > 100) {
      errors.push(t('bulkUpload.validation.nameTooLong'));
    }

    if (guest.phone && guest.phone.length > 13) {
      errors.push(t('bulkUpload.validation.phoneTooLong'));
    }

    if (guest.notes && guest.notes.length > 500) {
      errors.push(t('bulkUpload.validation.notesTooLong'));
    }

    if (guest.dietaryRestrictions && guest.dietaryRestrictions.length > 200) {
      errors.push(t('bulkUpload.validation.dietaryRestrictionsTooLong'));
    }

    if (guest.table && guest.table.length > 50) {
      errors.push(t('bulkUpload.validation.tableTooLong'));
    }

    if (guest.numberOfGuests && guest.numberOfGuests < 1) {
      errors.push(t('bulkUpload.validation.numberOfGuestsTooLow'));
    }

    // Additional guest names validation
    if (
      guest.numberOfGuests > 1 &&
      (!guest.additionalGuestNames || !guest.additionalGuestNames.trim())
    ) {
      errors.push(t('bulkUpload.validation.additionalGuestNamesRequired'));
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined,
    };
  };

  // CSV validation function
  const validateCSVStructure = (results: Papa.ParseResult<RawGuestData>): void => {
    // Check if we have any data
    if (!results.data || results.data.length === 0) {
      throw new Error(t('bulkUpload.validation.csvEmpty'));
    }

    const firstRow = results.data[0];
    if (!firstRow) {
      throw new Error(t('bulkUpload.validation.csvNoValidData'));
    }

    // Get headers from the first row
    const headers = Object.keys(firstRow as object);
    // Check for missing required columns
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(t('bulkUpload.validation.missingColumns', { columns: missingColumns.join(', ') }));
    }

    // Check if all rows have the same structure
    const headerCount = headers.length;
    results.data.forEach((row, index) => {
      if (!row || Object.keys(row as object).length !== headerCount) {
        throw new Error(
          t('bulkUpload.validation.invalidStructure', { row: index + 1 })
        );
      }
    });
  };

  // Parse CSV function
  const parseCSV = async (file: File): Promise<RawGuestData[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse<RawGuestData>(file, {
        header: true,
        skipEmptyLines: true,
        complete: results => {
          try {
            validateCSVStructure(results);
            resolve(results.data);
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        },
        error: error => {
          reject(new Error(t('bulkUpload.validation.csvParseFailed', { message: error.message })));
        },
      });
    });
  };

  const cleanPhoneNumber = (phone: string | undefined): string => {
    if (!phone) return '';
    // Remove spaces, parentheses, and hyphens
    const cleaned = phone.trim().replace(/[\s()\-]/g, '');
    // Add + if it doesn't exist
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  };

  const convertToGuestUploadData = (row: RawGuestData): GuestUploadData => {
    const guest: GuestUploadData = {
      id: crypto.randomUUID(),
      name: row['Nombre']?.trim() ?? '',
      phone: cleanPhoneNumber(row['Telefono (con lada)']),
      category: row['Categoría']?.trim() ?? '',
      numberOfGuests: row['Número de boletos'],
      additionalGuestNames:
        row['Nombres de invitados adicionales (separados por commas)']?.trim() ?? '',
      priority: (row['Prioridad']?.trim().toUpperCase() as GuestPriority) ?? GuestPriority.P2,
      inviter: row['Invitado por']?.trim() ?? '',
      dietaryRestrictions: row['Restricciones alimenticias']?.trim(),
      notes: row['Notas']?.trim(),
      status: (row['RSVP']?.trim().toUpperCase() as GuestStatus) ?? GuestStatus.PENDING,
      table: row['Mesa']?.trim(),
      preferredLanguage: row['Idioma']?.trim()
        ? (row['Idioma'].trim().toUpperCase() as GuestLanguage)
        : GuestLanguage.SPANISH,
      validation: { isValid: true },
    };
    return guest;
  };

  // Sorting function
  const sortGuestsByValidity = (guests: GuestUploadData[]): GuestUploadData[] => {
    return [...guests].sort((a, b) => {
      // Invalid entries first
      if (!a.validation.isValid && b.validation.isValid) return -1;
      if (a.validation.isValid && !b.validation.isValid) return 1;
      // If both have same validity, sort by name
      return a.name.localeCompare(b.name);
    });
  };

  const validateAllGuests = (guestsToValidate: GuestUploadData[]) => {
    return guestsToValidate.map(guest => ({
      ...guest,
      validation: validateGuest(guest),
    }));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // Reset all states to initial values first
    setSelectedFile(null);
    setSelectedGuest(null);
    setIsGuestModalOpen(false);
    setGuests([]);
    setEditedGuests(new Set());

    if (!file) return;

    try {
      if (!file.name.endsWith('.csv')) {
        throw new Error(t('bulkUpload.validation.csvFileRequired'));
      }

      const parsedData = await parseCSV(file);
      const guestData = parsedData
        .filter(row => (row['Nombre'] ?? '') !== '' || (row['Telefono (con lada)'] ?? '') !== '')
        .map(convertToGuestUploadData);

      if (guestData.length === 0) {
        throw new Error(t('bulkUpload.validation.noValidGuestData'));
      }

      // Check for existing phone numbers in the database
      const phoneNumbers = guestData.map(guest => guest.phone);

      const existingPhones = await checkPhoneNumbersMutation.mutateAsync({
        eventId,
        phoneNumbers,
      });

      const validatedGuests = validateAllGuests(guestData);

      // Add existing phone validation to the guests
      const guestsWithPhoneValidation = validatedGuests.map(guest => {
        if (existingPhones.phones.includes(guest.phone)) {
          return {
            ...guest,
            validation: {
              isValid: false,
              error: guest.validation.error
                ? `${guest.validation.error}, ${t('bulkUpload.validation.phoneExists')}`
                : t('bulkUpload.validation.phoneExists'),
            },
          };
        }
        return guest;
      });

      const sortedGuests = sortGuestsByValidity(guestsWithPhoneValidation);
      setGuests(sortedGuests);
      setSelectedFile(file);
    } catch (error) {
      console.error('Error parsing file:', error);
      // Show error in the UI
      setGuests([]);
      toast.error(error instanceof Error ? error.message : t('bulkUpload.validation.csvParseFailed', { message: 'Unknown error' }));
    }
  };

  const handleEditGuest = (guest: GuestUploadData) => {
    const formData: GuestFormData = {
      id: guest.id,
      name: guest.name,
      phone: guest.phone,
      numberOfGuests: guest.numberOfGuests ? Number(guest.numberOfGuests) : 1,
      additionalGuestNames: guest.additionalGuestNames,
      status: guest.status,
      table: guest.table ?? undefined,
      dietaryRestrictions: guest.dietaryRestrictions ?? undefined,
      notes: guest.notes ?? undefined,
      category: guest.category,
      priority: guest.priority,
      inviter: guest.inviter,
      preferredLanguage: guest.preferredLanguage ?? GuestLanguage.SPANISH,
    };
    setSelectedGuest({
      ...guest,
      formData,
    });
    setIsGuestModalOpen(true);
  };

  const handleGuestUpdate = async (updatedData: GuestFormData) => {
    // Check if the updated phone number exists in the database
    if (!updatedData.phone) {
      toast.error(t('bulkUpload.validation.phoneRequired'));
      return;
    }

    const existingPhones = await checkPhoneNumbersMutation.mutateAsync({
      eventId,
      phoneNumbers: [updatedData.phone],
    });

    setGuests(currentGuests => {
      const updatedGuests = currentGuests.map(guest => {
        if (guest.id === updatedData.id) {
          const updatedGuest: GuestUploadData = {
            ...guest,
            name: updatedData.name,
            phone: updatedData.phone ?? '',
            numberOfGuests: updatedData.numberOfGuests,
            additionalGuestNames: updatedData.additionalGuestNames ?? '',
            status: updatedData.status,
            table: updatedData.table ?? undefined,
            dietaryRestrictions: updatedData.dietaryRestrictions ?? undefined,
            notes: updatedData.notes ?? undefined,
            category: updatedData.category ?? '',
            priority: updatedData.priority,
            inviter: updatedData.inviter,
            preferredLanguage: updatedData.preferredLanguage,
          };
          // Validate the updated guest
          const validation = validateGuest(updatedGuest);
          // Add phone number validation if needed
          if (existingPhones.phones.length > 0) {
            return {
              ...updatedGuest,
              validation: {
                isValid: false,
                error: validation.error
                  ? `${validation.error}, ${t('bulkUpload.validation.phoneExists')}`
                  : t('bulkUpload.validation.phoneExists'),
              },
            };
          }
          return {
            ...updatedGuest,
            validation,
          };
        }
        return guest;
      });

      // Re-sort the guests after update
      return sortGuestsByValidity(updatedGuests);
    });

    setEditedGuests(current => {
      const updated = new Set(current);
      updated.add(updatedData.id);
      return updated;
    });

    setIsGuestModalOpen(false);
    setSelectedGuest(null);
  };

  const handleImportGuests = async () => {
    const invalidGuests = guests.filter(guest => !guest.validation.isValid);
    if (invalidGuests.length > 0) {
      toast.error(t('bulkUpload.validation.fixInvalidGuests', { count: invalidGuests.length }));
      return;
    }

    try {
      await bulkUploadMutation.mutateAsync({
        eventId,
        guests: guests.map(guest => ({
          name: guest.name,
          phone: guest.phone,
          category: guest.category,
          priority: guest.priority,
          numberOfGuests: guest.numberOfGuests ? Number(guest.numberOfGuests) : 1,
          additionalGuestNames: guest.additionalGuestNames,
          status: guest.status === GuestStatus.INACTIVE ? GuestStatus.PENDING : guest.status,
          table: guest.table,
          dietaryRestrictions: guest.dietaryRestrictions,
          notes: guest.notes,
          inviter: guest.inviter,
          preferredLanguage: guest.preferredLanguage ?? GuestLanguage.SPANISH,
        })),
      });
    } catch (error) {
      console.error('Error importing guests:', error);
    }
  };

  const handleCancel = () => {
    // Reset all states to initial values
    setSelectedFile(null);
    setSelectedGuest(null);
    setIsGuestModalOpen(false);
    setGuests([]);
    setEditedGuests(new Set());

    // Reset the file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }

    onClose();
  };

  const handleDeleteGuest = (guestId: string) => {
    if (window.confirm(t('bulkUpload.confirmRemoveGuest'))) {
      setGuests(currentGuests => currentGuests.filter(g => g.id !== guestId));
      setEditedGuests(current => {
        const updated = new Set(current);
        updated.delete(guestId);
        return updated;
      });

      toast.success(t('bulkUpload.toast.guestRemoved'));
    }
  };

  // Update pagination calculation function with filtering
  const getFilteredGuests = () => {
    let filteredList = [...guests];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filteredList = filteredList.filter(
        guest =>
          guest.name.toLowerCase().includes(term) ||
          guest.phone.toLowerCase().includes(term) ||
          guest.category.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filterStatus === 'valid') {
      filteredList = filteredList.filter(guest => guest.validation.isValid);
    } else if (filterStatus === 'invalid') {
      filteredList = filteredList.filter(guest => !guest.validation.isValid);
    }

    return filteredList;
  };

  const getPaginatedGuests = () => {
    const filteredGuests = getFilteredGuests();
    const indexOfLastGuest = currentPage * guestsPerPage;
    const indexOfFirstGuest = indexOfLastGuest - guestsPerPage;
    return filteredGuests.slice(indexOfFirstGuest, indexOfLastGuest);
  };

  const totalFilteredGuests = getFilteredGuests().length;
  const totalPages = Math.ceil(totalFilteredGuests / guestsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (value: 'all' | 'valid' | 'invalid') => {
    setFilterStatus(value);
  };

  // Calculate estimated processing time based on batch logic
  const calculateProcessingTime = (totalGuests: number) => {
    const batchSize = 20; // Match your server batch size
    const staggerDelay = 2; // 1 second between batches
    const processingTimePerBatch = 2; // Estimated 3 seconds per batch to process

    const numberOfBatches = Math.ceil(totalGuests / batchSize);
    const lastBatchStartTime = (numberOfBatches - 1) * staggerDelay;
    const totalProcessingTime = lastBatchStartTime + processingTimePerBatch;

    // Add 20% buffer for safety
    return Math.ceil(totalProcessingTime * 1.2);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => !open && handleCancel()}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="px-8 pt-6 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-normal">{t('bulkUpload.title')}</DialogTitle>
              <DialogDescription className="text-gray-500 text-sm">
                {t('bulkUpload.description')}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="px-8 pb-6">
            {!selectedFile ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-8 mt-4">
                <div className="flex flex-col items-center justify-center">
                  <FiUpload className="h-8 w-8 text-gray-400 mb-4" />
                  <div className="flex flex-col items-center mb-4 gap-2">
                    <p className="text-lg font-medium">{t('bulkUpload.uploadCsvFile')}</p>
                    <p className="text-gray-500">{t('bulkUpload.csvFilesOnly')}</p>
                    <p className="text-gray-500">{t('bulkUpload.maxFileSize')}</p>
                  </div>

                  <div className="w-full max-w-sm">
                    <div className="relative border-2 border-gray-200 rounded-lg mb-4 hover:border-purple-300 transition-colors group">
                      <input
                        type="file"
                        id="file-upload"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleFileChange}
                        accept=".csv"
                      />
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center">
                          <FiFileText className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-500">{t('bulkUpload.chooseCsvFile')}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="pointer-events-none group-hover:bg-gray-50"
                        >
                          {t('bulkUpload.browse')}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="https://docs.google.com/spreadsheets/d/13zcT0_A6oJISvHBS9KBbPM8_3_46YT1BK26nBqzt0uI/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline"
                  >
                    <Button variant="outline" size="lg" className="gap-2">
                      <FiFileText className="h-4 w-4" />
                      {t('bulkUpload.downloadTemplate')}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">
                    {t('bulkUpload.templateFileName', { fileName: selectedFile.name })}
                  </h3>
                  <p className="text-gray-500 text-sm font-medium">
                    {t('bulkUpload.validGuestsCount', { 
                      valid: guests.filter(g => g.validation.isValid).length,
                      total: guests.length 
                    })}
                  </p>
                </div>

                <div className="flex justify-end gap-3 mb-4">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="h-10 gap-2 font-medium"
                    size="lg"
                  >
                    <FiX className="h-4 w-4" />
                    {t('bulkUpload.cancel')}
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleImportGuests}
                    disabled={
                      bulkUploadMutation.isPending ||
                      guests.some(g => !g.validation.isValid) ||
                      guests.length === 0
                    }
                    size="lg"
                  >
                    <FiUpload className="h-4 w-4" />
                    {bulkUploadMutation.isPending ? (
                      <LoadingDots />
                    ) : (
                      t('bulkUpload.importGuests', { 
                        count: guests.length,
                        plural: guests.length === 1 ? '' : 's'
                      })
                    )}
                  </Button>
                </div>

                {/* Guest Grid */}
                <div className="mb-4 flex flex-col space-y-3">
                  <div className="flex gap-3 items-center">
                    <div className="relative flex-grow">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder={t('bulkUpload.searchGuests')}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm pr-8"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFilterChange('all')}
                        className={`px-3 py-1.5 text-xs rounded-md ${
                          filterStatus === 'all'
                            ? 'bg-gray-100 font-medium'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        {t('bulkUpload.filters.all')}
                      </button>
                      <button
                        onClick={() => handleFilterChange('valid')}
                        className={`px-3 py-1.5 text-xs rounded-md ${
                          filterStatus === 'valid'
                            ? 'bg-green-50 text-green-700 font-medium'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        {t('bulkUpload.filters.valid')}
                      </button>
                      <button
                        onClick={() => handleFilterChange('invalid')}
                        className={`px-3 py-1.5 text-xs rounded-md ${
                          filterStatus === 'invalid'
                            ? 'bg-red-50 text-red-700 font-medium'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        {t('bulkUpload.filters.invalid')}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      {totalFilteredGuests === 0
                        ? t('bulkUpload.noGuestsMatch')
                        : t('bulkUpload.showingGuests', {
                            showing: Math.min(currentPage * guestsPerPage, totalFilteredGuests) - (currentPage - 1) * guestsPerPage,
                            total: totalFilteredGuests,
                            filtered: searchTerm || filterStatus !== 'all' ? t('bulkUpload.filtered') + ' ' : '',
                            totalGuests: guests.length
                          })}
                    </p>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => handlePageChange(1)}
                          className="h-8 w-8 p-0"
                          title={t('bulkUpload.pagination.firstPage')}
                        >
                          &laquo;
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => handlePageChange(currentPage - 1)}
                          className="h-8 w-8 p-0"
                          title={t('bulkUpload.pagination.previousPage')}
                        >
                          &lsaquo;
                        </Button>

                        <div className="flex items-center mx-1">
                          <span className="text-xs text-gray-600 mr-1">{t('bulkUpload.pagination.goTo')}:</span>
                          <select
                            value={currentPage}
                            onChange={e => handlePageChange(Number(e.target.value))}
                            className="h-8 text-sm rounded-md border border-gray-200 px-1"
                            style={{ width: totalPages > 99 ? '4rem' : '3rem' }}
                          >
                            {Array.from({ length: totalPages }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1}
                              </option>
                            ))}
                          </select>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => handlePageChange(currentPage + 1)}
                          className="h-8 w-8 p-0"
                          title={t('bulkUpload.pagination.nextPage')}
                        >
                          &rsaquo;
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => handlePageChange(totalPages)}
                          className="h-8 w-8 p-0"
                          title={t('bulkUpload.pagination.lastPage')}
                        >
                          &raquo;
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="max-h-[50vh] overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                  <div className="grid grid-cols-1 gap-2">
                    {getPaginatedGuests().map(guest => (
                      <div
                        key={guest.id}
                        className="p-2 rounded-lg border border-gray-200 bg-white"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm truncate">{guest.name}</h4>
                            <p className="text-xs text-gray-500 -mt-0.5">{guest.phone}</p>

                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge className="px-1.5 py-0 bg-yellow-100/80 text-yellow-800 border border-yellow-200 rounded-full text-[10px] font-normal">
                                {guest.category}
                              </Badge>
                              <Badge className="px-1.5 py-0 bg-gray-100/80 text-gray-800 border border-gray-200 rounded-full text-[10px] font-normal">
                                {guest.priority}
                              </Badge>
                              {guest.numberOfGuests > 1 && (
                                <Badge className="px-1.5 py-0 bg-blue-100/80 text-blue-700 border border-blue-200 rounded-full text-[10px] font-normal">
                                  {guest.numberOfGuests === 2
                                    ? t('bulkUpload.plusOneGuest')
                                    : t('bulkUpload.plusMultipleGuests', { count: guest.numberOfGuests - 1 })}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-1 shrink-0">
                            {guest.validation.isValid ? (
                              <Badge className="px-1.5 py-0 bg-green-50 text-green-700 border border-green-200 rounded-full text-[10px]">
                                {t('bulkUpload.status.valid')}
                              </Badge>
                            ) : (
                              <Badge className="px-1.5 py-0 bg-red-50 text-red-700 border border-red-200 rounded-full text-[10px]">
                                {t('bulkUpload.status.invalid')}
                              </Badge>
                            )}

                            <button
                              onClick={() => handleEditGuest(guest)}
                              className="p-1 hover:bg-gray-50 rounded-full transition-colors"
                              aria-label={t('bulkUpload.editGuest')}
                            >
                              <FiEdit2 className="h-3.5 w-3.5 text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteGuest(guest.id)}
                              className="p-1 hover:bg-gray-50 rounded-full transition-colors"
                              aria-label={t('bulkUpload.deleteGuest')}
                            >
                              <FiTrash2 className="h-3.5 w-3.5 text-gray-400" />
                            </button>
                          </div>
                        </div>

                        {!guest.validation.isValid && (
                          <div className="mt-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded text-[10px] text-red-600">
                            {guest.validation.error}
                          </div>
                        )}
                      </div>
                    ))}

                    {getPaginatedGuests().length === 0 && (
                      <div className="p-4 text-center text-gray-500">
                        {t('bulkUpload.noGuestsToDisplay')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Guest Dialog */}
      <Dialog
        open={isGuestModalOpen}
        onOpenChange={open => {
          if (!open) setIsGuestModalOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogHeader className="px-8 pt-6 flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-normal">{t('bulkUpload.editGuestTitle')}</DialogTitle>
          </DialogHeader>
          <div className="px-8 pb-6">
            {selectedGuest?.formData && (
              <GuestForm
                eventId={eventId}
                initialData={selectedGuest.formData}
                onSave={handleGuestUpdate}
                onCancel={() => setIsGuestModalOpen(false)}
                isLocalUpdate
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
