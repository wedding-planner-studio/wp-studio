'use client';

import { useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/functions';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { WhatsappIcon } from '@/components/ui/icons/whatsapp-icon';
import { MessageSquare } from 'lucide-react';
import { api } from '@/trpc/react';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';
import { Trans } from 'react-i18next';

interface TopUpPackage {
  messages: number;
  price: number;
  currency: string;
  pricePerMessage: number;
}

const topUpPackages: TopUpPackage[] = [
  { messages: 100, price: 150, currency: 'MXN', pricePerMessage: 1.5 },
  { messages: 250, price: 350, currency: 'MXN', pricePerMessage: 1.4 },
  { messages: 500, price: 650, currency: 'MXN', pricePerMessage: 1.3 },
  { messages: 1000, price: 1200, currency: 'MXN', pricePerMessage: 1.2 },
  { messages: 5000, price: 5500, currency: 'MXN', pricePerMessage: 1.1 },
];

export default function CampaignMessagesPage() {
  const { t } = useClientTranslation('common');
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<TopUpPackage | null>(null);

  const utils = api.useUtils();
  // Placeholder mutation - update with actual mutation when available
  const { mutate: purchaseMessages } = api.subscription.update.useMutation({
    onSuccess: () => {
      void utils.organization.invalidate();
    },
  });

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-12 md:px-6 lg:py-8">
        {/* Navigation */}
        <div className="mb-2 shrink-0">
          <Button
            variant="ghost"
            onClick={() => router.push(`/admin/settings`)}
            className="text-gray-600 hover:text-gray-900 h-8 px-2 -ml-2"
          >
            <FiArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="text-xs">{t('campaignMessages.backToSettings')}</span>
          </Button>
        </div>

        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">
              <Trans
                i18nKey="campaignMessages.title"
                components={{
                  purple: <span className="text-purple-600 italic" />
                }}
              />
            </h1>
            <p className="text-gray-600">{t('campaignMessages.subtitle')}</p>
          </div>
        </div>

        {/* Message Packages Section */}
        <section className="mb-16">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Table Section */}
            <div className="lg:w-2/3">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {t('campaignMessages.table.package')}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {t('campaignMessages.table.price')}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {t('campaignMessages.table.pricePerMessage')}
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {t('campaignMessages.table.select')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {topUpPackages.map(pkg => {
                      const isSelected = selectedPackage?.messages === pkg.messages;
                      return (
                        <tr
                          key={pkg.messages}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-purple-50 dark:bg-purple-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          } cursor-pointer`}
                          onClick={() => setSelectedPackage(pkg)}
                        >
                          <td className="px-6 py-5 text-sm font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <WhatsappIcon className="h-5 w-5 fill-purple-600 dark:fill-purple-400" />
                              {t('campaignMessages.table.messages', { count: pkg.messages })}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-sm text-gray-500 dark:text-gray-300">
                            {formatCurrency(pkg.price, pkg.currency)}
                          </td>
                          <td className="px-6 py-5 text-sm text-gray-500 dark:text-gray-300">
                            {formatCurrency(pkg.pricePerMessage, pkg.currency)}
                          </td>
                          <td className="px-6 py-5 text-sm">
                            {isSelected ? (
                              <div className="h-5 w-5 rounded-full bg-purple-600 flex items-center justify-center">
                                <FiCheck className="h-3 w-3 text-white" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selection Display */}
            <div className="lg:w-1/3">
              {selectedPackage ? (
                <Card className="overflow-hidden border border-gray-200 shadow-sm dark:border-gray-800">
                  <CardHeader className="p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <WhatsappIcon className="h-5 w-5 fill-purple-600 dark:fill-purple-400" />
                      </div>
                      <CardTitle className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                        {t('campaignMessages.selection.title', { count: selectedPackage.messages })}
                      </CardTitle>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                          {formatCurrency(selectedPackage.price, selectedPackage.currency).replace(
                            /MX\$/,
                            ''
                          )}
                        </span>
                        <span className="ml-1 text-xl font-medium text-gray-500 dark:text-gray-400">
                          MXN
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{t('campaignMessages.selection.pricesInMXN')}</p>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 pt-5 bg-white dark:bg-gray-900">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      {t('campaignMessages.selection.packageDetails')}
                    </h4>
                    <ul
                      role="list"
                      className="space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300"
                    >
                      <li className="flex items-center gap-x-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                          <MessageSquare className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-gray-800 dark:text-gray-200">
                          {t('campaignMessages.selection.pricePerMessage', { 
                            price: formatCurrency(selectedPackage.pricePerMessage, selectedPackage.currency)
                          })}
                        </span>
                      </li>
                    </ul>
                  </CardContent>

                  <CardFooter className="p-6 flex flex-col gap-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <Button
                      disabled
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-md transition-colors shadow-sm"
                      onClick={() => {
                        // This is a placeholder - replace with actual API call parameter
                      }}
                    >
                      {t('campaignMessages.selection.purchase', { count: selectedPackage.messages })}
                    </Button>
                    <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                      {t('campaignMessages.selection.securePayment')}
                    </p>
                  </CardFooter>
                </Card> 
              ) : (
                <Card className="border border-gray-200 shadow-sm dark:border-gray-800">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center bg-white dark:bg-gray-900">
                    <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-5">
                      <WhatsappIcon className="h-6 w-6 fill-purple-600 dark:fill-purple-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {t('campaignMessages.empty.title')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('campaignMessages.empty.description')}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
