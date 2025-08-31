'use client';

import { api } from '@/trpc/react';
import { Phone, Calendar, Building } from 'lucide-react';

interface ChatHeaderProps {
  sessionId: string;
}

export function ChatHeader({ sessionId }: ChatHeaderProps) {
  const { data: sessionData, isLoading } = api.agentDebugger.getSessionDetails.useQuery({
    sessionId,
  });

  if (isLoading) {
    return (
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-500">Session not found</div>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">
            {sessionData.phoneNumber || 'Unknown Number'}
          </span>
        </div>

        {sessionData.event && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{sessionData.event.name}</span>
          </div>
        )}

        {sessionData.organization && (
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{sessionData.organization.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
