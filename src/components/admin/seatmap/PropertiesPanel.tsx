'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LayoutElementType, TableShape, ElementCornerStyle } from '@prisma/client';
import { Trash2, Square as SquareIcon, SquareDot } from 'lucide-react';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Assuming EditableLayoutElement is defined similarly in the parent
// Re-define or import if necessary
type EditableLayoutElement = {
  clientId: string;
  id?: string;
  type: LayoutElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number | null;
  label: string | null;
  shape: TableShape | null;
  numberOfSeats: number | null;
  color?: string | null;
  cornerStyle?: ElementCornerStyle | null;
};

interface PropertiesPanelProps {
  selectedElement: EditableLayoutElement | null;
  onUpdateElement: (clientId: string, updates: Partial<EditableLayoutElement>) => void;
  onDeleteElement: (clientId: string) => void;
  existingLabels: string[]; // Add this prop to check for duplicates
}

export function PropertiesPanel({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  existingLabels,
}: PropertiesPanelProps) {
  const { t } = useClientTranslation();
  // Local state for input fields to avoid updating main state on every keystroke
  const [label, setLabel] = useState('');
  const [numberOfSeats, setNumberOfSeats] = useState<string>('');
  const [color, setColor] = useState('#e0e0e0'); // Add state for color, default to grey
  // Add state for corner style, default to STRAIGHT
  const [cornerStyle, setCornerStyle] = useState<ElementCornerStyle>(ElementCornerStyle.STRAIGHT);
  const [labelError, setLabelError] = useState<string | null>(null);

  // Update local state when selected element changes
  useEffect(() => {
    if (selectedElement) {
      setLabel(selectedElement.label ?? '');
      setNumberOfSeats(selectedElement.numberOfSeats?.toString() ?? '');
      setColor(selectedElement.color ?? '#e0e0e0');
      // Update corner style state
      setCornerStyle(selectedElement.cornerStyle ?? ElementCornerStyle.STRAIGHT);
      setLabelError(null); // Clear any previous errors
    } else {
      // Reset fields when nothing is selected
      setLabel('');
      setNumberOfSeats('');
      setColor('#e0e0e0');
      setLabelError(null);
    }
  }, [selectedElement]);

  const handleUpdate = (field: keyof EditableLayoutElement, value: any) => {
    if (selectedElement) {
      onUpdateElement(selectedElement.clientId, { [field]: value });
    }
  };

  const handleLabelBlur = () => {
    if (!selectedElement || label === (selectedElement.label ?? '')) return;

    // Check if this label already exists (excluding the current element's label)
    const isDuplicate = existingLabels.some(
      existingLabel => existingLabel === label && existingLabel !== selectedElement.label
    );

    if (isDuplicate) {
      setLabelError(t('propertiesPanel.labelError'));
      // Revert to previous valid label
      setLabel(selectedElement.label ?? '');
      return;
    }

    setLabelError(null);
    handleUpdate('label', label);
  };

  const handleSeatsBlur = () => {
    const currentSeats = selectedElement?.numberOfSeats?.toString() ?? '';
    if (selectedElement && numberOfSeats !== currentSeats) {
      const num = parseInt(numberOfSeats, 10);
      // Update only if it's a valid number or empty string (to clear)
      if (!isNaN(num) || numberOfSeats === '') {
        handleUpdate('numberOfSeats', isNaN(num) ? null : num);
      } else {
        // Revert if invalid input
        setNumberOfSeats(currentSeats);
      }
    }
  };

  // Handler for color change
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor); // Update local state for immediate feedback
    handleUpdate('color', newColor); // Update parent state
  };

  // Handler for corner style change
  const handleCornerStyleChange = (style: ElementCornerStyle) => {
    setCornerStyle(style); // Update local state for UI feedback
    handleUpdate('cornerStyle', style); // Update parent state
  };

  const handleDelete = () => {
    if (selectedElement) {
      onDeleteElement(selectedElement.clientId);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, blurHandler: () => void) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent default form submission/newline
      blurHandler(); // Trigger the existing blur logic to update the state
      event.currentTarget.blur(); // Optionally blur the input
    }
  };

  // The component now assumes selectedElement is always provided
  const isTable = selectedElement!.type === LayoutElementType.TABLE;
  // Corner style is not applicable to circles
  const showCornerStyle = selectedElement!.shape !== TableShape.CIRCLE;

  return (
    <div className="w-64 p-3 flex flex-col space-y-2 overflow-y-auto shrink-0">
      <h2 className="text-lg text-gray-700">
        {t('propertiesPanel.editElement', { type: selectedElement!.type.toLowerCase() })}
      </h2>

      {/* Common Fields */}
      <div className="flex flex-col space-y-1">
        <Label htmlFor="elem-label" className="text-xs text-gray-500 px-1 font-normal">
          {t('propertiesPanel.label')}
          {labelError && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id="elem-label"
          value={label}
          onChange={e => {
            setLabel(e.target.value);
            setLabelError(null); // Clear error when user types
          }}
          onBlur={handleLabelBlur}
          onKeyDown={e => handleKeyDown(e, handleLabelBlur)}
          placeholder={t('propertiesPanel.labelPlaceholder')}
          className={`h-9 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 ${
            labelError ? 'border-red-500 focus-visible:ring-red-400' : ''
          }`}
        />
        {labelError && <span className="text-xs text-red-500 px-1">{labelError}</span>}
      </div>

      {/* Color Picker */}
      <div className="flex flex-col space-y-1">
        <Label htmlFor="elem-color" className="text-xs text-gray-500 px-1 font-normal">
          {t('propertiesPanel.color')}
        </Label>
        <Input
          id="elem-color"
          type="color"
          value={color}
          onChange={handleColorChange}
          className="h-9 w-full p-1 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1"
        />
      </div>

      {/* Corner Style Buttons */}
      {showCornerStyle && (
        <div className="flex flex-col space-y-1">
          <Label className="text-xs text-gray-500 px-1 font-normal">{t('propertiesPanel.corners')}</Label>
          <div className="flex space-x-2">
            <Button
              variant={cornerStyle === ElementCornerStyle.STRAIGHT ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => handleCornerStyleChange(ElementCornerStyle.STRAIGHT)}
              title={t('propertiesPanel.straightCorners')}
              className="h-9 w-9 hover:bg-purple-50 hover:text-purple-700 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1"
            >
              <SquareIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={cornerStyle === ElementCornerStyle.ROUNDED ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => handleCornerStyleChange(ElementCornerStyle.ROUNDED)}
              title={t('propertiesPanel.roundedCorners')}
              className="h-9 w-9 hover:bg-purple-50 hover:text-purple-700 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1"
            >
              <SquareDot className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Table Specific Fields */}
      {isTable && (
        <>
          <div className="flex flex-col space-y-1">
            <Label htmlFor="elem-seats" className="text-xs text-gray-500 px-1 font-normal">
              {t('propertiesPanel.numberOfSeats')}
            </Label>
            <Input
              id="elem-seats"
              type="number"
              value={numberOfSeats}
              onChange={e => setNumberOfSeats(e.target.value)}
              onBlur={handleSeatsBlur}
              onKeyDown={e => handleKeyDown(e, handleSeatsBlur)}
              placeholder={t('propertiesPanel.seatsPlaceholder')}
              min="0"
              className="h-9 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1"
            />
          </div>
        </>
      )}

      {/* Actions */}
      <div className="pt-2 border-t mt-auto">
        <Button
          variant="destructive"
          onClick={handleDelete}
          className="w-full h-9 mt-2 hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
        >
          <Trash2 className="mr-2 h-4 w-4" /> {t('propertiesPanel.deleteElement')}
        </Button>
      </div>
    </div>
  );
}
