'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { api } from '@/trpc/react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { FiArrowLeft } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { GuestStatus } from '@prisma/client';

// Define the type for tool calls based on the database schema
interface ToolCall {
  id: string;
  name: string;
  input: Record<string, string | number | boolean>;
  result: string;
}

// Define the type for a log entry
interface LogEntry {
  id: string;
  createdAt: Date;
  toolCalls: any[];
  session?: {
    phoneNumber: string;
    guest: {
      id: string;
      name: string;
      phone: string;
      status: GuestStatus;
    } | null;
  };
}

export default function LogsPage() {
  const params = useParams();
  const eventId = params.id as string;

  // Fetch event details to get name
  const { data: event } = api.events.getById.useQuery({ id: eventId });

  // Fetch all logs for this event
  const { data: logs, isLoading } = api.guests.getEventUpdatesLogs.useQuery(
    { eventId, limit: 500 },
    { refetchOnWindowFocus: false }
  );

  function getActionLabel(toolCallName: string) {
    switch (toolCallName) {
      case 'update_rsvp':
        return 'RSVP Update';
      case 'update_guest':
        return 'Guest Update';
      case 'add_guest':
        return 'Guest Added';
      case 'delete_guest':
        return 'Guest Deleted';
      case 'update_plus_one_name':
        return 'Plus One Update';
      case 'update_dietary_restrictions':
        return 'Dietary Update';
      default:
        return toolCallName
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  }

  function getStatusColor(status: string) {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'DECLINED':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  }

  function getStatusBadge(status: GuestStatus) {
    return (
      <Badge
        variant="outline"
        className={`${getStatusColor(status)} text-xs font-normal px-1.5 py-0`}
      >
        {status}
      </Badge>
    );
  }

  function renderLogItem(log: LogEntry) {
    return (
      <div key={log.id} className="mb-2 relative">
        <div className="absolute top-2 left-[-7px] h-2 w-2 rounded-full bg-white border border-blue-300 z-10"></div>
        <div className="pl-5">
          <Card className="p-2 hover:shadow-sm transition-shadow border border-gray-100">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5 w-full">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-400">
                    {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}
                  </div>

                  {log.session?.guest && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-600">
                        {log.session.guest.name}
                      </span>
                      {getStatusBadge(log.session.guest.status)}
                    </div>
                  )}
                </div>

                {Array.isArray(log.toolCalls) &&
                  log.toolCalls.map((toolCall: any, idx) => {
                    if (!toolCall || typeof toolCall !== 'object') return null;

                    // Type assertion to access the properties safely
                    const typedToolCall = toolCall as {
                      input?: Record<string, unknown>;
                      result?: string;
                      name?: string;
                    };

                    return (
                      <div key={`${log.id}-tool-${idx}`} className="space-y-1.5">
                        <div className="flex items-center">
                          <Badge
                            variant="secondary"
                            className="mr-2 text-xs font-normal px-1.5 py-0 bg-gray-50"
                          >
                            {getActionLabel(typedToolCall.name || '')}
                          </Badge>
                        </div>

                        {/* Result display */}
                        <div className="text-xs text-gray-600">{typedToolCall.result}</div>

                        {/* Details of the update */}
                        {typedToolCall.input && (
                          <div className="text-xs text-gray-500 space-y-0.5">
                            {Object.entries(typedToolCall.input).map(([key, value]) => {
                              // Skip eventId display since it's in the URL
                              if (key === 'eventId') return null;

                              // Special handling for status to add color
                              if (key === 'status') {
                                return (
                                  <div key={key} className="flex items-center">
                                    <span className="font-medium min-w-[70px] text-gray-500">
                                      {key}:{' '}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`${getStatusColor(value as string)} text-xs py-0 px-1`}
                                    >
                                      {value as string}
                                    </Badge>
                                  </div>
                                );
                              }

                              return (
                                <div key={key} className="flex items-start">
                                  <span className="font-medium min-w-[70px] text-gray-500">
                                    {key}:{' '}
                                  </span>
                                  <span>{String(value)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center mb-5">
          <Link href={`/admin/events/${eventId}`} className="mr-3">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <FiArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Guest Updates Log</h1>
            {event && <p className="text-sm text-gray-500">Event: {event.name}</p>}
          </div>
        </div>

        <div className="mb-5">
          <h2 className="text-sm font-medium text-gray-500">Timeline</h2>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Spinner className="h-6 w-6 text-gray-400" />
          </div>
        )}

        {!isLoading && logs && logs.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm">
            No updates found for this event
          </div>
        )}

        {!isLoading && logs && logs.length > 0 && (
          <div className="space-y-0.5">
            <div className="relative pl-5 pb-2">
              <div className="absolute top-0 left-2.5 h-full w-px bg-gray-100"></div>
              {logs.map(log => renderLogItem(log as LogEntry))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
