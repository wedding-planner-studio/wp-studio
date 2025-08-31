import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { FolderX } from 'lucide-react';

interface NotFoundProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
  backButtonLabel?: string;
  backButtonHref?: string;
}

export function NotFound({
  title = 'Not Found',
  description = 'The resource you are looking for does not exist or you do not have permission to access it.',
  showBackButton = true,
  backButtonLabel = 'Go Back',
  backButtonHref = '/',
}: NotFoundProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <FolderX className="h-8 w-8 text-gray-500" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 max-w-md mb-6">{description}</p>
      {showBackButton && (
        <Button
          variant="outline"
          onClick={() => router.push(backButtonHref)}
          className="min-w-[120px]"
        >
          {backButtonLabel}
        </Button>
      )}
    </div>
  );
}
