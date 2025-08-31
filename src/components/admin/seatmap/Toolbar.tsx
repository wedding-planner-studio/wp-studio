'use client';

import { Button } from '@/components/ui/button';
import ExpandingArrow from '@/components/ui/expanding-arrow';
import { ElementCornerStyle, LayoutElementType, TableShape } from '@prisma/client';
import {
  Circle,
  RectangleHorizontal,
  Music,
  DoorOpen,
  SquareDashedBottom,
  MicVocal,
  GalleryVerticalEnd,
  GlassWater,
  Puzzle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MediaUploadDialog } from '@/components/admin/MediaUploadDialog';
import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Define the structure for toolbar items
export interface ToolbarItem {
  type: LayoutElementType;
  label: string;
  icon: React.ReactNode;
  defaultProps: {
    width: number;
    height: number;
    shape?: TableShape | null; // Only for TABLE
    numberOfSeats?: number | null; // Only for TABLE
    opacity?: number | null; // Only for TABLE
    color?: string | null; // Only for TABLE
    cornerStyle?: ElementCornerStyle | null; // Only for TABLE
  };
}

// Define the items available in the toolbar
const getToolbarItems = (t: (key: string) => string): ToolbarItem[] => [
  {
    type: LayoutElementType.TABLE,
    label: t('toolbar.rectTable'),
    icon: <RectangleHorizontal className="h-4 w-4" />,
    defaultProps: {
      width: 120,
      height: 50,
      shape: TableShape.RECTANGLE,
      numberOfSeats: 8,
      color: '#f5f5f5',
      cornerStyle: ElementCornerStyle.ROUNDED,
    },
  },
  {
    type: LayoutElementType.TABLE,
    label: t('toolbar.roundTable'),
    icon: <Circle className="h-4 w-4" />,
    defaultProps: {
      width: 100,
      height: 100,
      shape: TableShape.CIRCLE,
      numberOfSeats: 10,
      color: '#f5f5f5',
    },
  },
  {
    type: LayoutElementType.DANCEFLOOR,
    label: t('toolbar.danceFloor'),
    icon: <SquareDashedBottom className="h-4 w-4" />,
    defaultProps: {
      width: 200,
      height: 200,
    },
  },
  {
    type: LayoutElementType.DJ_BOOTH,
    label: t('toolbar.djBooth'),
    icon: <Music className="h-4 w-4" />,
    defaultProps: {
      width: 100,
      height: 60,
    },
  },
  {
    type: LayoutElementType.ENTRANCE,
    label: t('toolbar.entrance'),
    icon: <DoorOpen className="h-4 w-4" />,
    defaultProps: {
      width: 80,
      height: 20,
    },
  },
  {
    type: LayoutElementType.STAGE,
    label: t('toolbar.stage'),
    icon: <MicVocal className="h-4 w-4" />,
    defaultProps: {
      width: 200,
      height: 100,
    },
  },
  {
    type: LayoutElementType.WALL,
    label: t('toolbar.wall'),
    icon: <GalleryVerticalEnd className="h-4 w-4" />,
    defaultProps: {
      width: 200,
      height: 10,
    },
  },
  {
    type: LayoutElementType.BAR,
    label: t('toolbar.bar'),
    icon: <GlassWater className="h-4 w-4" />,
    defaultProps: {
      width: 180,
      height: 60,
    },
  },
  {
    type: LayoutElementType.OTHER,
    label: t('toolbar.other'),
    icon: <Puzzle className="h-4 w-4" />,
    defaultProps: {
      width: 80,
      height: 80,
    },
  },
];

interface ToolbarProps {
  eventId: string;
  onAddElement: (item: ToolbarItem) => void;
  onSelectMedia: (url: string) => void;
  mediaFiles:
    | { id: string; fileUrl: string; filename: string; fileSize: number; fileType: string }[]
    | undefined;
  isLoadingMediaFiles: boolean;
  selectedBackgroundUrl: string;
}

export function Toolbar({
  eventId,
  onAddElement,
  onSelectMedia,
  mediaFiles,
  isLoadingMediaFiles,
  selectedBackgroundUrl,
}: ToolbarProps) {
  const { t } = useClientTranslation();
  const [showImageAsBackground, setShowImageAsBackground] = useState(false);
  const toolbarItems = getToolbarItems(t);

  useEffect(() => {
    if (selectedBackgroundUrl) {
      setShowImageAsBackground(true);
    }
  }, [selectedBackgroundUrl]);

  useEffect(() => {
    if (!showImageAsBackground) {
      onSelectMedia('');
    }
  }, [showImageAsBackground]);

  return (
    <div className="w-56 p-3 flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="includeMedia" className="text-xs text-gray-500 mb-1 px-1 font-normal">
          {t('toolbar.useImageAsBackground')}
        </Label>
        <Switch
          id="includeMedia"
          checked={showImageAsBackground}
          onCheckedChange={checked => setShowImageAsBackground(checked)}
        />
      </div>

      {showImageAsBackground && (
        <div className="flex flex-col space-y-1">
          {isLoadingMediaFiles ? (
            <div className="flex items-center justify-center h-9 text-xs text-gray-500">
              {t('toolbar.loadingBackgrounds')}
            </div>
          ) : (
            <Select
              value={selectedBackgroundUrl || 'none'}
              onValueChange={value => {
                if (value === 'none') {
                  onSelectMedia('');
                } else {
                  const selectedMedia = mediaFiles?.find(file => file.fileUrl === value);
                  if (selectedMedia?.fileUrl) {
                    onSelectMedia(selectedMedia.fileUrl);
                  }
                }
              }}
            >
              <SelectTrigger className="w-full h-9 px-2 flex items-center justify-between text-gray-700 hover:bg-purple-50 hover:text-purple-700 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 rounded-md group">
                <div className="flex items-center gap-2 flex-grow">
                  <SelectValue placeholder={t('toolbar.selectBackground')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-medium italic">{t('toolbar.none')}</span>
                  </div>
                </SelectItem>
                {mediaFiles?.map(file => (
                  <SelectItem key={file.id} value={file.fileUrl} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate max-w-[120px]" title={file.filename}>
                        {file.filename}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {mediaFiles?.length === 0 && (
                  <div className="p-2 text-sm text-gray-500 text-center italic">
                    {t('toolbar.noBackgrounds')}
                  </div>
                )}
              </SelectContent>
            </Select>
          )}
          <MediaUploadDialog
            eventId={eventId}
            onUploadComplete={() => {
              // Refresh media files
            }}
          />
        </div>
      )}
      <p className="text-xs text-gray-500 mb-1 px-1">{t('toolbar.elements')}:</p>
      <div className="flex flex-col space-y-1">
        {toolbarItems.map(item => (
          <Button
            key={item.label}
            variant="ghost"
            className="w-full h-9 px-2 justify-start text-gray-700 hover:bg-purple-50 hover:text-purple-700 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 rounded-md group"
            onClick={() => onAddElement(item)}
          >
            <span className="mr-2.5 w-4 flex items-center justify-center text-gray-500 group-hover:text-purple-600 transition-colors duration-150">
              {item.icon}
            </span>
            <span className="text-sm font-medium">{item.label}</span>
            <ExpandingArrow className="ml-auto w-4 h-4 text-gray-500 group-hover:text-purple-600 transition-colors duration-150" />
          </Button>
        ))}
      </div>
    </div>
  );
}
