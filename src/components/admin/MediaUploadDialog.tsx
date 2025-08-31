import { useUploadThing } from '@/lib/uploadthing';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FiUpload } from 'react-icons/fi';
import { Spinner } from '@/components/ui/spinner';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Add MediaUploadDialog component
export const MediaUploadDialog = ({
  eventId,
  onUploadComplete,
  expectedFileType,
}: {
  eventId: string;
  onUploadComplete: () => void;
  expectedFileType?: string | null;
}) => {
  const { t } = useClientTranslation();
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing('messageMedia', {
    onClientUploadComplete: () => {
      toast.success(t('mediaUpload.success'));
      onUploadComplete();
      setOpen(false);
    },
    onUploadError: error => {
      toast.error(error.message);
    },
  });

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t('mediaUpload.uploadMedia')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('mediaUpload.title')}</DialogTitle>
          <DialogDescription>
            {t('mediaUpload.description')}{' '}
            {expectedFileType
              ? t('mediaUpload.supportedFileType', { type: expectedFileType })
              : t('mediaUpload.allFileTypes')}
          </DialogDescription>
        </DialogHeader>
        <div
          className="space-y-4"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="relative">
            {isDragging && (
              <div className="absolute inset-0 bg-purple-50/90 border-2 border-dashed border-purple-300 rounded-xl z-10 flex items-center justify-center">
                <div className="text-center">
                  <FiUpload className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-purple-700">{t('mediaUpload.dropFiles')}</p>
                </div>
              </div>
            )}
            <label className="cursor-pointer block">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={e => e.target.files && handleFiles(e.target.files)}
                accept={expectedFileType || '*/*'}
              />
              <div className="group relative aspect-[3/2] rounded-lg overflow-hidden bg-gray-50 border border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors flex flex-col items-center justify-center text-center p-4">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
