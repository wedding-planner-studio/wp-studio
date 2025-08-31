'use client';

import { Button, Textarea } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { api } from '@/trpc/react';
import { QuestionCategory } from '@prisma/client';
import { toast } from 'react-hot-toast';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

const baseQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string(),
  answer: z.string(),
  category: z.nativeEnum(QuestionCategory),
});

type QuestionFormData = z.infer<typeof baseQuestionSchema>;

// Validation schema with translations
const createQuestionSchemaWithValidation = (t: (key: string) => string) => {
  const messages = {
    questionRequired: t('events.questions.validation.questionRequired'),
    questionTooLong: t('events.questions.validation.questionTooLong'),
    answerRequired: t('events.questions.validation.answerRequired'),
    answerTooLong: t('events.questions.validation.answerTooLong'),
  };

  return baseQuestionSchema.extend({
    question: z.string()
      .min(1, messages.questionRequired)
      .max(500, messages.questionTooLong),
    answer: z.string()
      .min(1, messages.answerRequired)
      .max(2000, messages.answerTooLong),
  });
};

type FormErrors = {
  [K in keyof QuestionFormData]?: string[];
};

interface QuestionFormProps {
  eventId: string;
  initialData?: QuestionFormData;
  onSave?: () => void;
  onCancel?: () => void;
}

const defaultFormData: QuestionFormData = {
  question: '',
  answer: '',
  category: QuestionCategory.GENERAL,
};

export default function QuestionForm({
  eventId,
  initialData = defaultFormData,
  onSave,
  onCancel,
}: QuestionFormProps) {
  const { t } = useClientTranslation('common');
  const [formData, setFormData] = useState<QuestionFormData>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const utils = api.useUtils();

  const questionSchema = createQuestionSchemaWithValidation(t);

  // Necessary to update the form data when the initial data changes
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const createMutation = api.eventQuestions.create.useMutation({
    onSuccess: () => {
      void utils.eventQuestions.getAll.invalidate({ eventId });
      toast.success(t('events.questions.createSuccess'));
      onSave?.();
    },
    onError: error => {
      toast.error(error.message || t('events.questions.createError'));
    },
  });

  const updateMutation = api.eventQuestions.update.useMutation({
    onSuccess: () => {
      void utils.eventQuestions.getAll.invalidate({ eventId });
      toast.success(t('events.questions.updateSuccess'));
      onSave?.();
    },
    onError: error => {
      toast.error(error.message || t('events.questions.updateError'));
    },
  });

  const validateField = (name: keyof QuestionFormData, value: unknown) => {
    try {
      const field = questionSchema.shape[name];
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

  const isFormValid = () => {
    try {
      questionSchema.parse(formData);
      return true;
    } catch (_error) {
      return false;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));

    validateField(name as keyof QuestionFormData, newValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = questionSchema.parse(formData);
      if (initialData?.id) {
        await updateMutation.mutateAsync({
          eventId,
          questionId: initialData.id,
          question: validatedData.question,
          answer: validatedData.answer,
          category: validatedData.category,
        });
      } else {
        await createMutation.mutateAsync({
          eventId,
          question: validatedData.question,
          answer: validatedData.answer,
          category: validatedData.category,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            const field = err.path[0].toString() as keyof QuestionFormData;
            if (!newErrors[field]) {
              newErrors[field] = [];
            }
            newErrors[field]?.push(err.message);
          }
        });
        setErrors(newErrors);
      }
    }
  };

  const handleSelectChange = (value: string) => {
    handleInputChange({
      target: { name: 'category', value },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm max-w-3xl">
      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-2 font-medium">{t('events.questions.category')}*</div>
          <Select name="category" value={formData.category} onValueChange={handleSelectChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              {Object.entries(QuestionCategory).map(([value]) => (
                <SelectItem key={value} value={value}>
                  {t(`events.questions.categories.${value.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="mb-2 font-medium">{t('events.questions.question')}</div>
          <Textarea
            name="question"
            value={formData.question}
            onChange={handleInputChange}
            placeholder={t('events.questions.questionPlaceholder')}
            rows={3}
            required
            aria-invalid={!!errors.question}
          />
          {errors.question && <p className="text-sm text-destructive mt-1">{errors.question[0]}</p>}
        </div>

        <div>
          <div className="mb-2 font-medium">{t('events.questions.answer')}</div>
          <Textarea
            name="answer"
            value={formData.answer}
            onChange={handleInputChange}
            placeholder={t('events.questions.answerPlaceholder')}
            rows={6}
            required
            aria-invalid={!!errors.answer}
          />
          {errors.answer && <p className="text-sm text-destructive mt-1">{errors.answer[0]}</p>}
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('events.questions.cancel')}
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || !isFormValid()}>
            {createMutation.isPending || updateMutation.isPending
              ? t('events.questions.saving')
              : t('events.questions.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}
