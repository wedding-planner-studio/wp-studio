'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

export default function Waitlist() {
  const { t } = useClientTranslation('common');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
  });
  const joinWaitlist = api.user.joinWaitlist.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success("Thank you for your interest! We'll be in touch soon.");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    joinWaitlist.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="w-full max-w-lg bg-white/50 backdrop-blur-sm rounded-2xl p-8 ">
      {isSubmitted ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('waitlist.form.successTitle')}
          </h2>
          <p className="text-gray-600">{t('waitlist.form.successMessage')}</p>
        </div>
      ) : (
        <>
          <div className="text-left mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('waitlist.form.getStarted')}</h2>
            <p className="mt-2 text-sm text-gray-600">{t('waitlist.form.getStartedDescription')}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {t('waitlist.form.nameLabel')}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder={t('waitlist.form.namePlaceholder')}
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                {t('waitlist.form.phoneLabel')}
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder={t('waitlist.form.phonePlaceholder')}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('waitlist.form.emailLabel')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder={t('waitlist.form.emailPlaceholder')}
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={joinWaitlist.status === 'pending'}
            >
              {joinWaitlist.status === 'pending'
                ? t('waitlist.form.processing')
                : t('waitlist.form.submit')}
            </Button>
          </form>
          <p className="mt-4 text-xs text-center text-gray-500">
            {t('waitlist.form.terms1')}{' '}
            <Link href="#" className="text-purple-600 hover:text-purple-700">
              {t('waitlist.form.terms2')}
            </Link>{' '}
            {t('waitlist.form.terms3')}{' '}
            <Link
              href="/privacy-policy"
              target="_blank"
              className="text-purple-600 hover:text-purple-700"
            >
              {t('waitlist.form.privacyPolicy')}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
