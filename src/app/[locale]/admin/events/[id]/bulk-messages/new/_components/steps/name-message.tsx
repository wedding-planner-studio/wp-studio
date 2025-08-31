'use client';

import { Input, Button } from '@/components/ui';
import { FiChevronRight } from 'react-icons/fi';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

interface NameMessageProps {
  bulkMessageName: string;
  setBulkMessageName: (name: string) => void;
  handleNextStep: () => void;
  isStepComplete: (step: number) => boolean;
}

export const NameMessage = ({
  bulkMessageName,
  setBulkMessageName,
  handleNextStep,
  isStepComplete,
}: NameMessageProps) => {
  const { t } = useClientTranslation('common');

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">{t('bulkMessages.new.nameMessage.title')}</h2>
      <div className="max-w-[500px]">
        <div className="space-y-1">
          <label htmlFor="bulkMessageName" className="sr-only">
            {t('bulkMessages.new.nameMessage.input.label')}
          </label>
          <Input
            id="bulkMessageName"
            placeholder={t('bulkMessages.new.nameMessage.input.placeholder')}
            value={bulkMessageName}
            onChange={e => setBulkMessageName(e.target.value)}
            className="text-sm"
            required
            maxLength={100}
            aria-describedby="message-name-description message-name-count"
            onKeyDown={e => {
              if (e.key === 'Enter' && isStepComplete(1)) {
                handleNextStep();
              }
            }}
          />
          <div className="flex justify-between items-center">
            <p id="message-name-description" className="text-xs text-gray-500">
              {t('bulkMessages.new.nameMessage.input.description')}
            </p>
            <span
              id="message-name-count"
              className={`text-xs ${
                bulkMessageName.length >= 90 ? 'text-amber-600' : 'text-gray-500'
              }`}
            >
              {bulkMessageName.length}/100
            </span>
          </div>
          {bulkMessageName.length > 0 && bulkMessageName.length < 3 && (
            <p className="text-xs text-red-500">{t('bulkMessages.new.nameMessage.input.error')}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <Button
          onClick={handleNextStep}
          disabled={!isStepComplete(1)}
          aria-label={t('bulkMessages.new.nameMessage.continue')}
        >
          {t('bulkMessages.new.nameMessage.continue')}
          <FiChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
