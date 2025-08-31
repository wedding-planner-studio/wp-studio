'use client';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { FiList, FiPlus, FiCheck, FiX } from 'react-icons/fi';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpCircle, X } from 'lucide-react';
import { withPermission } from '@/components/hoc/withPermission';
import { useRoleBasedPermission } from '@/hooks/useRoleBasedPermission';

interface AdditionalConfirmationsProps {
  eventId: string;
}

const AdditionalConfirmationsInner = ({ eventId }: AdditionalConfirmationsProps) => {
  // Get permission for the Add button specifically
  const { hasPermission: canUpdateEvent } = useRoleBasedPermission('events', 'update');

  // State for adding new required confirmations
  const [isAddingConfirmation, setIsAddingConfirmation] = useState(false);
  const [newConfirmationLabel, setNewConfirmationLabel] = useState('');
  const [newConfirmationBestWayToAsk, setNewConfirmationBestWayToAsk] = useState('');
  const [newOptionInput, setNewOptionInput] = useState('');
  const [confirmationOptions, setConfirmationOptions] = useState<string[]>(['Yes', 'No', 'Maybe']);

  const utils = api.useUtils();
  // Get the event data to access requiredGuestConfirmation
  const { data: eventData } = api.events.getById.useQuery({ id: eventId });

  // Mutation for creating a new required confirmation
  const createRequiredConfirmationMutation = api.events.createRequiredGuestConfirmation.useMutation(
    {
      onSuccess: () => {
        toast.success('Required confirmation added successfully');
        setNewConfirmationLabel('');
        setNewConfirmationBestWayToAsk('');
        setIsAddingConfirmation(false);
        // Reset options to defaults
        setConfirmationOptions(['Yes', 'No', 'Maybe']);
        // Refetch the event data to update the list
        void utils.events.getById.invalidate({ id: eventId });
      },
      onError: error => {
        toast.error(`Failed to add confirmation: ${error.message}`);
      },
    }
  );

  const handleAddConfirmation = () => {
    if (!newConfirmationLabel.trim()) {
      toast.error('Please enter a confirmation label');
      return;
    }

    // Ensure we have at least one option
    if (confirmationOptions.length === 0) {
      toast.error('Please add at least one response option');
      return;
    }

    createRequiredConfirmationMutation.mutate({
      eventId,
      label: newConfirmationLabel.trim(),
      bestWayToAsk: newConfirmationBestWayToAsk.trim(),
      options: confirmationOptions,
    });
  };

  const handleAddOption = () => {
    if (!newOptionInput.trim()) return;

    // Check for duplicate
    if (confirmationOptions.includes(newOptionInput.trim())) {
      toast.error('This option already exists');
      return;
    }

    setConfirmationOptions(prev => [...prev, newOptionInput.trim()]);
    setNewOptionInput('');
  };

  const handleRemoveOption = (option: string) => {
    setConfirmationOptions(prev => prev.filter(o => o !== option));
  };

  return (
    <div className="mt-6 pt-5 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiList className="h-3.5 w-3.5 text-purple-600" />
          <h3 className="text-sm font-medium text-gray-700">Additional Guest Confirmations</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Add additional confirmation requirements that guests need to approve beyond their
                  RSVP. Examples: &quot;Requires transportation&quot;, &quot;Attending rehearsal
                  dinner&quot;, etc.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {!isAddingConfirmation && canUpdateEvent && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsAddingConfirmation(true)}
          >
            <FiPlus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Form to add new confirmation */}
      {isAddingConfirmation && (
        <div className="mb-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center">
              <label className="text-xs text-gray-600 font-medium">Confirmation label</label>
            </div>
            <Input
              placeholder="e.g. Requires transportation"
              value={newConfirmationLabel}
              onChange={e => setNewConfirmationLabel(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center">
              <label className="text-xs text-gray-600 font-medium">Best way to ask</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-gray-400 cursor-help ml-1.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">
                      Provides a hint to the AI chatbot on how to phrase the question to guests.
                      Example: &quot;Will you need transportation to the venue?&quot;
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              placeholder="e.g. Will you need transportation to the venue?"
              value={newConfirmationBestWayToAsk}
              onChange={e => setNewConfirmationBestWayToAsk(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Response Options */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <label className="text-xs text-gray-600 font-medium">Response options</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-gray-400 cursor-help ml-1.5" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        Specify the available response options for this confirmation. These will be
                        shown as dropdown options when guests respond.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Options list */}
            <div className="flex flex-wrap gap-2 mb-2">
              {confirmationOptions.map(option => (
                <div
                  key={option}
                  className="bg-purple-50 text-xs text-purple-800 py-1 px-2 rounded-full flex items-center gap-1"
                >
                  <span>{option}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(option)}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new option */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a new option..."
                value={newOptionInput}
                onChange={e => setNewOptionInput(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={handleAddOption}
              >
                Add option
                <FiPlus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex gap-1 pt-1">
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs"
              onClick={handleAddConfirmation}
              disabled={
                confirmationOptions.length === 0 || createRequiredConfirmationMutation.isPending
              }
            >
              <FiCheck className="h-3 w-3 mr-1" />
              Save {confirmationOptions.length} options
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setIsAddingConfirmation(false);
                setNewConfirmationLabel('');
                setNewConfirmationBestWayToAsk('');
                setConfirmationOptions(['Yes', 'No', 'Maybe']);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* List of required confirmations */}
      <div className="space-y-2">
        {/* Additional required confirmations */}
        {eventData?.requiredGuestConfirmation && eventData.requiredGuestConfirmation.length > 0
          ? eventData.requiredGuestConfirmation.map(confirmation => {
              // Get options if available
              const options = 'options' in confirmation ? (confirmation as any).options || [] : [];

              return (
                <div key={confirmation.id} className="bg-gray-50 rounded-md px-3 py-2">
                  <div className="text-sm text-gray-700 font-medium">{confirmation.label}</div>
                  {confirmation.bestWayToAsk && (
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Best way to ask:</span>{' '}
                      {confirmation.bestWayToAsk}
                    </div>
                  )}

                  {/* Display options in a subtle, minimalistic way */}
                  {options.length > 0 && (
                    <div className="mt-1.5">
                      <div className="flex items-center flex-wrap gap-1 text-[10px] text-gray-400">
                        <span>Options:</span>
                        {options.map((option: any, idx: number) => (
                          <span key={idx} className="text-gray-500">
                            {typeof option === 'string' ? option : option.label}
                            {idx < options.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          : !isAddingConfirmation && (
              <div className="text-sm text-gray-500 italic">
                No additional confirmations required
              </div>
            )}
      </div>
    </div>
  );
};

// Apply the HOC outside the component definition
export const AdditionalConfirmations = withPermission(AdditionalConfirmationsInner, {
  feature: 'additionalGuestConfirmations',
});
