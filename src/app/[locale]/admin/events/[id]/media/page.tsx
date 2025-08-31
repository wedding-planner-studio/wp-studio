'use client';

import { useParams, useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { FiTrash2, FiArrowLeft, FiUpload } from 'react-icons/fi';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useUploadThing } from '@/lib/uploadthing';
import { useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function MediaPage() {
  const { t } = useClientTranslation();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [isDragging, setIsDragging] = useState(false);

  const { data: eventData } = api.events.getById.useQuery({ id: eventId });
  const {
    data: mediaFiles,
    isLoading,
    refetch,
  } = api.mediaFiles.getOrganizationMediaFiles.useQuery(
    {
      eventId,
    },
    {
      enabled: !!eventId,
    }
  );

  const deleteMutation = api.mediaFiles.deleteMediaFile.useMutation({
    onSuccess: () => {
      toast.success(t('mediaUpload.deleteSuccess'));
      refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const { startUpload, isUploading } = useUploadThing('messageMedia', {
    onClientUploadComplete: () => {
      toast.success(t('mediaUpload.success'));
      refetch();
    },
    onUploadError: error => {
      toast.error(error.message);
    },
  });

  const handleDelete = async (id: string) => {
    if (window.confirm(t('mediaUpload.deleteConfirm'))) {
      deleteMutation.mutate({ id });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFiles = async (files: FileList) => {
    if (isUploading) {
      toast.error(t('mediaUpload.error'));
      return;
    }

    const validFiles = Array.from(files);
    if (validFiles.length > 0) {
      try {
        await startUpload(validFiles, {
          eventId,
        });
      } catch (error) {
        console.error('Upload error:', error);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner className="h-8 w-8" />
        </div>
      </AdminLayout>
    );
  }

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
            <span className="text-xs">{t('events.backToEvents')}</span>
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
            <h2 className="text-lg font-medium text-gray-900">{t('mediaUpload.title')}</h2>
            <div className="h-4 w-[1px] bg-gray-200"></div>
            <p className="text-sm text-gray-500">{t('mediaUpload.fileCount', { count: mediaFiles?.length || 0 })}</p>
          </div>
        </div>

        {/* Media Files Grid */}
        <div
          className="bg-white rounded-xl p-6 relative"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-purple-50/90 border-2 border-dashed border-purple-300 rounded-xl z-10 flex items-center justify-center">
              <div className="text-center">
                <FiUpload className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-purple-700">{t('mediaUpload.dropFiles')}</p>
              </div>
            </div>
          )}

          {mediaFiles ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Upload Card */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={e => e.target.files && handleFiles(e.target.files)}
                  accept="image/*,.pdf,.doc,.docx,.pptx,.xlsx"
                />
                <div className="group relative aspect-square rounded-lg overflow-hidden bg-gray-50 border border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors flex flex-col items-center justify-center text-center p-4">
                  {isUploading ? (
                    <>
                      <Spinner className="h-8 w-8 mb-3 text-purple-500" />
                      <p className="text-sm font-medium text-gray-900">{t('mediaUpload.uploading')}</p>
                      <p className="text-sm text-gray-500 mt-1">{t('mediaUpload.pleaseWait')}</p>
                    </>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                        <FiUpload className="h-6 w-6 text-purple-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">{t('mediaUpload.uploadFiles')}</p>
                      <p className="text-sm text-gray-500 mt-1">{t('mediaUpload.clickOrDrag')}</p>
                    </>
                  )}
                </div>
              </label>

              {mediaFiles.map(file => (
                <div
                  key={file.id}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  {file.fileType.startsWith('image/') ? (
                    <img
                      src={file.fileUrl}
                      alt={file.filename}
                      className="w-full h-full object-contain"
                    />
                  ) : file.fileType === 'application/pdf' ? (
                    <iframe src={file.fileUrl} title={file.filename} className="w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <svg
                        className="h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Overlay with details - visible on hover */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-4 flex flex-col justify-between">
                    <div className="text-white">
                      <h3 className="font-medium truncate" title={file.filename}>
                        {file.filename}
                      </h3>
                      <div className="mt-1 text-sm text-gray-300 space-y-1">
                        <p>{t('mediaUpload.type')}: {file.fileType?.split('/')[1]?.toUpperCase() || 'UNKNOWN'}</p>
                        <p>{t('mediaUpload.size')}: {formatFileSize(file.fileSize)}</p>
                        <p>{t('mediaUpload.added')}: {formatDistanceToNow(new Date(file.createdAt))} {t('mediaUpload.ago')}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file.id)}
                      className="w-full text-white hover:text-red-400 hover:bg-red-900/50 border border-white/20 hover:border-red-400/50"
                    >
                      <FiTrash2 className="h-4 w-4 mr-2" />
                      {t('mediaUpload.delete')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-semibold text-gray-900">{t('mediaUpload.noFiles')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('mediaUpload.noFilesDescription')}
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
