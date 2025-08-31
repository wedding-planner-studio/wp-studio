'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import Link from 'next/link';
import { FiArrowLeft, FiLock } from 'react-icons/fi';
import { api } from '@/trpc/react';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { formatPhoneNumber } from '@/lib/utils/utils';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

export default function SettingsPage() {
  const { t } = useClientTranslation('common');
  const { data: orgData, refetch: refetchOrg } = api.organization.get.useQuery();
  // Phone number will be fetched or managed separately later
  // const phoneNumber = orgData?.organization?.phoneNumber || null;

  const updateOrg = api.organization.updateOrganization.useMutation({
    onSuccess: () => {
      toast.success(t('settings.toast.organizationNameUpdated'));
      refetchOrg();
      setIsEditingName(false);
    },
    onError: error => {
      toast.error(t('settings.toast.organizationNameUpdateError', { message: error.message }));
    },
  });

  const [orgName, setOrgName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    if (orgData?.organization?.name) {
      setOrgName(orgData.organization.name);
    }
  }, [orgData]);

  const handleUpdateOrgName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || orgName === orgData?.organization?.name) {
      setIsEditingName(false);
      setOrgName(orgData?.organization?.name || '');
      return;
    }
    await updateOrg.mutate({ name: orgName });
  };

  // TODO: Implement phone number connection logic
  // TODO: Update toast component to use the locale translation
  const handleConnectPhoneNumber = () => {
    // This will trigger the Meta linking flow
    toast('Phone number connection flow not yet implemented.'); // Changed from toast.info
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-12 md:px-6 lg:py-8">
        <div className="mb-6 shrink-0">
          <Link href="/admin/events">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 h-8 px-2 -ml-2">
              <FiArrowLeft className="mr-1.5 h-4 w-4" />
              <span className="text-xs">{t('settings.backToDashboard')}</span>
            </Button>
          </Link>
        </div>
        <div className="mb-8 shrink-0">
          <h1 className="text-2xl font-medium text-gray-900 mb-1">{t('settings.title')}</h1>
          <p className="text-gray-600">{t('settings.subtitle')}</p>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('settings.organizationName.title')}</h2>
            </div>
            <div className="p-6">
              {isEditingName ? (
                <form onSubmit={handleUpdateOrgName} className="space-y-4">
                  <Field label={t('settings.organizationName.title')} required>
                    <Input
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      placeholder={t('settings.organizationName.placeholder')}
                      autoFocus
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={
                        updateOrg.isPending ||
                        !orgName.trim() ||
                        orgName === orgData?.organization?.name
                      }
                    >
                      {t('settings.organizationName.saveChanges')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditingName(false);
                        setOrgName(orgData?.organization?.name || '');
                      }}
                      disabled={updateOrg.isPending}
                    >
                      {t('settings.organizationName.cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{orgData?.organization?.name || t('settings.organizationName.notSet')}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingName(true)}
                  >
                    {t('settings.organizationName.edit')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('settings.phoneNumber.title')}</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">
                  {orgData?.organization?.phoneNumber
                    ? formatPhoneNumber(orgData?.organization?.phoneNumber)
                    : t('settings.organizationName.notSet')}
                </span>
              </div>
            </div>
          </div>

          {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center">
              <FiLock className="h-5 w-5 text-gray-500 mr-2.5" />
              <h2 className="text-lg font-medium text-gray-900">WhatsApp Business Phone Number</h2>
            </div>
            <div className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Connect your WhatsApp Business phone number to send messages and notifications
                  directly to attendees.
                </p>
                <Button type="button" onClick={handleConnectPhoneNumber}>
                  Connect Phone Number
                </Button>
                <p className="mt-3 text-xs text-gray-500">
                  Connecting your number requires setup and approval through{' '}
                  <a
                    href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started#set-up-developer-assets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline"
                  >
                    Meta
                  </a>
                  .
                </p>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </AdminLayout>
  );
}
