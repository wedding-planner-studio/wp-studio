'use client';

import { useState, useEffect } from 'react';
import DuplicateEventFlow, { DuplicateOptions } from '@/components/events/DuplicateEventFlow';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useRouterStuff } from '@/hooks/useRouterStuff';
import NewEventFlow from '@/components/events/NewEventFlow';
type CreationType = 'new' | 'duplicate';

export default function NewEventPage() {
  const { searchParams } = useRouterStuff();
  const [useDuplicationFlow, setUseDuplicationFlow] = useState(false);

  useEffect(() => {
    const creationType = searchParams.get('creationType') as CreationType;
    setUseDuplicationFlow(creationType === 'duplicate');
  }, [searchParams]);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold sr-only">Create New Event</h1>
      <p className="sr-only">Form to create a new event or duplicate an existing one</p>

      <div className="space-y-6">
        {useDuplicationFlow && <DuplicateEventFlow />}
        {!useDuplicationFlow && <NewEventFlow />}
      </div>
    </AdminLayout>
  );
}
