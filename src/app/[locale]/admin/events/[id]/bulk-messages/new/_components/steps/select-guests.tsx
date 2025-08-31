import { Button, Input } from '@/components/ui';
import { useEffect, useState } from 'react';
import { FiSearch, FiCheck, FiChevronRight } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui';
import { api } from '@/trpc/react';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

interface SelectGuestsProps {
  selectedGuests: Set<string>;
  setSelectedGuests: React.Dispatch<React.SetStateAction<Set<string>>>;
  eventId: string;
  handlePreviousStep: () => void;
  handleNextStep: () => void;
  isStepComplete: (step: number) => boolean;
}

const ITEMS_PER_PAGE = 15;

export const SelectGuests = ({
  selectedGuests,
  setSelectedGuests,
  eventId,
  handlePreviousStep,
  handleNextStep,
  isStepComplete,
}: SelectGuestsProps) => {
  const { t } = useClientTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSearch, setActiveSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'DECLINED'>('ALL');

  // Fetch guests with filters
  const { data: guestsData, isLoading: isLoadingGuests } = api.guests.getAll.useQuery({
    eventId,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: activeSearch,
    rsvpStatus: rsvpFilter === 'ALL' ? undefined : rsvpFilter,
  });

  // Check if current page is fully selected
  const isCurrentPageSelected = !!guestsData?.guests.every(guest => selectedGuests.has(guest.id));

  const handleApplyFilter = () => {
    setActiveSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleClearFilter = () => {
    setSearchInput('');
    setActiveSearch('');
    setCurrentPage(1);
  };

  const handleSelectGuest = (guestId: string) => {
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId);
    } else {
      newSelected.add(guestId);
    }
    setSelectedGuests(newSelected);
  };

  const handleSelectAll = () => {
    if (isCurrentPageSelected) {
      // Deselect all guests from current page
      const newSelected = new Set(selectedGuests);
      guestsData?.guests.forEach(guest => {
        newSelected.delete(guest.id);
      });
      setSelectedGuests(newSelected);
    } else {
      // Select all guests from current page
      const newSelected = new Set(selectedGuests);
      guestsData?.guests.forEach(guest => {
        newSelected.add(guest.id);
      });
      setSelectedGuests(newSelected);
    }
  };

  const totalPages = guestsData ? Math.ceil(guestsData.stats.total / ITEMS_PER_PAGE) : 0;

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleRsvpFilterChange = (value: string) => {
    setRsvpFilter(value as typeof rsvpFilter);
    setCurrentPage(1);
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">{t('selectGuests.title')}</h2>
      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder={t('selectGuests.searchPlaceholder')}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-9 text-sm h-8"
              onKeyDown={e => e.key === 'Enter' && handleApplyFilter()}
            />
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <Button onClick={handleApplyFilter} className="text-sm font-medium">
            {t('selectGuests.apply')}
          </Button>
          {activeSearch && (
            <Button
              variant="ghost"
              onClick={handleClearFilter}
              className="text-sm font-medium text-gray-600"
            >
              {t('selectGuests.clear')}
            </Button>
          )}
        </div>

        {/* RSVP Filter */}
        <div className="flex gap-2">
          {['ALL', 'CONFIRMED', 'PENDING', 'DECLINED'].map(status => (
            <Button
              key={status}
              variant={rsvpFilter === status ? 'default' : 'outline'}
              onClick={() => handleRsvpFilterChange(status)}
              className={cn(
                'text-xs font-medium h-6',
                rsvpFilter === status
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'text-gray-600'
              )}
            >
              {t(`selectGuests.rsvpFilter.${status.toLowerCase()}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Guest Selection Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left w-10">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isCurrentPageSelected}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-1 h-4 w-4"
                    />
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[280px]">
                  {t('selectGuests.table.name')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[180px]">
                  {t('selectGuests.table.phone')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                  {t('selectGuests.table.category')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[90px]">
                  {t('selectGuests.table.rsvp')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {/* Selection Stats */}
              <tr className="bg-gray-50/50">
                <td colSpan={5} className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {t('selectGuests.stats.selected', { count: selectedGuests.size })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        {isCurrentPageSelected
                          ? t('selectGuests.actions.deselectPage')
                          : t('selectGuests.actions.selectPage')}
                      </Button>
                      {selectedGuests.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedGuests(new Set())}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          {t('selectGuests.actions.clearAll')}
                        </Button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>

              {isLoadingGuests ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center">
                    <div className="flex justify-center">
                      <Spinner className="h-5 w-5 text-purple-600" />
                    </div>
                  </td>
                </tr>
              ) : guestsData?.guests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                    {t('selectGuests.noGuests')}
                  </td>
                </tr>
              ) : (
                guestsData?.guests.map(guest => (
                  <tr
                    key={guest.id}
                    className={cn(
                      'transition-colors cursor-pointer',
                      selectedGuests.has(guest.id)
                        ? 'bg-purple-50/50 hover:bg-purple-50'
                        : 'hover:bg-gray-50/50'
                    )}
                    onClick={() => handleSelectGuest(guest.id)}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedGuests.has(guest.id)}
                          onChange={() => handleSelectGuest(guest.id)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-1 h-4 w-4"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {selectedGuests.has(guest.id) && (
                          <FiCheck className="h-4 w-4 text-purple-600" />
                        )}
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {guest.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-gray-500 truncate">{guest.phone}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-gray-900 truncate">{guest.category || '-'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium leading-4',
                          guest.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : guest.status === 'DECLINED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                        )}
                      >
                        {guest.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {guestsData && guestsData.stats.total > ITEMS_PER_PAGE && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
              >
                {t('selectGuests.pagination.previous')}
              </Button>
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
              >
                {t('selectGuests.pagination.next')}
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t('selectGuests.pagination.showing', {
                    start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                    end: Math.min(currentPage * ITEMS_PER_PAGE, guestsData.stats.total),
                    total: guestsData.stats.total,
                  })}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    {t('selectGuests.pagination.previous')}
                  </Button>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    {t('selectGuests.pagination.next')}
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={handlePreviousStep} className="text-gray-600">
          <FiChevronRight className="mr-2 h-4 w-4 rotate-180" />
          {t('selectGuests.navigation.back')}
        </Button>
        <Button
          onClick={() => {
            handleNextStep();
          }}
          disabled={!isStepComplete(3)}
        >
          {t('selectGuests.navigation.continue')}
          <FiChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
