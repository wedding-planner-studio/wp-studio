'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

export default function MembersPage() {
  const { t } = useClientTranslation('common');
  const { data: members } = api.organization.listMembers.useQuery();
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-12 md:px-6 lg:py-8">
        {/* Navigation & Header */}
        <div className="mb-2 shrink-0">
          <Link href="/admin/events">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 h-8 px-2 -ml-2">
              <FiArrowLeft className="mr-1.5 h-4 w-4" />
              <span className="text-xs">{t('members.backToDashboard')}</span>
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">{t('members.title')}</h1>
            <p className="text-gray-600">{t('members.subtitle')}</p>
          </div>
        </div>
        {/* Regular Members List */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('members.organizationMembers.title')}</h2>
          <div className="overflow-x-auto ring-1 ring-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('members.table.name')}
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('members.table.email')}
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('members.table.role')}
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('members.table.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members
                  ?.filter(member => member.role !== 'EVENT_MANAGER')
                  .map((member, index, filteredMembers) => (
                    <tr
                      key={member.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        index === filteredMembers.length - 1 ? '' : 'border-b border-gray-200'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-700">
                              {member.firstName && member.lastName 
                                ? `${member.firstName[0]}${member.lastName[0]}`
                                : member.firstName 
                                  ? member.firstName[0]
                                  : member.lastName 
                                    ? member.lastName[0]
                                    : ''}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{member.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium capitalize text-gray-700">
                          {member.role.toLowerCase()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full ${
                            member.status === 'ACTIVE'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {member.status === 'ACTIVE' ? t('members.status.active') : t('members.status.inactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Couple's Accounts List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('members.couplesAccounts.title')}</h2>
          <div className="overflow-x-auto ring-1 ring-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('members.table.name')}
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('members.table.email')}
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('members.table.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members
                  ?.filter(member => member.role === 'EVENT_MANAGER')
                  .map((member, index, filteredMembers) => (
                    <tr
                      key={member.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        index === filteredMembers.length - 1 ? '' : 'border-b border-gray-200'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-pink-700">
                              {member.firstName && member.lastName 
                                ? `${member.firstName[0]}${member.lastName[0]}`
                                : member.firstName 
                                  ? member.firstName[0]
                                  : member.lastName 
                                    ? member.lastName[0]
                                    : ''}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{member.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full ${
                            member.status === 'ACTIVE'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {member.status === 'ACTIVE' ? t('members.status.active') : t('members.status.inactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
