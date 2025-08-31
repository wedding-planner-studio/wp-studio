'use client';

import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ChatSessionList } from './ChatSessionList';
import { ChatInterface } from './ChatInterface';
import { SidePanel, type DebugData } from './SidePanel';
import Image from 'next/image';
import { api } from '@/trpc/react';
import { ChatHeader } from './ChatHeader';

export interface ChatSessionWithDetails {
  id: string;
  phoneNumber: string | null;
  isActive: boolean;
  isTestSession: boolean;
  startedAt: Date;
  lastMessageAt: Date;
  organization: {
    id: string;
    name: string;
  } | null;
  event: {
    id: string;
    name: string;
  } | null;
  _count: {
    messages: number;
    agentExecutions: number;
  };
}

export function AgentDebuggerContainer() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<DebugData | null>(null);

  const handleShowDebugData = (debugData: DebugData) => {
    setDebugData(debugData);
  };

  const handleCloseSidePanel = () => {
    setDebugData(null);
  };

  // Get session details for the header when a session is selected
  const { data: selectedSessionData } = api.agentDebugger.getSessionDetails.useQuery(
    { sessionId: selectedSessionId! },
    { enabled: !!selectedSessionId }
  );

  return (
    <div className="h-full">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full"
        key={debugData ? 'with-sidepanel' : 'without-sidepanel'}
      >
        {/* Left Panel - Session List */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full border-r border-gray-200 bg-white flex flex-col">
            <ChatSessionList onSelectSession={setSelectedSessionId} />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Content Panel - Chat Interface */}
        <ResizablePanel defaultSize={debugData ? 50 : 75} minSize={30}>
          <div className="h-full bg-gray-50 flex flex-col">
            {selectedSessionId ? (
              <>
                {/* Chat Header */}
                <ChatHeader sessionId={selectedSessionId} />

                {/* Chat Messages */}
                <ChatInterface
                  sessionId={selectedSessionId}
                  onShowDebugData={handleShowDebugData}
                />
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Image
                    src="/evana_logo.png"
                    alt="Logo"
                    width={100}
                    height={100}
                    className="mx-auto mb-4 opacity-30"
                  />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Chat Session</h3>
                  <p className="text-sm text-gray-500">
                    Choose a session from the sidebar to view the conversation and debug agent
                    executions
                  </p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        {/* Right Panel - Side Panel (conditionally rendered) */}
        {debugData && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize={20} maxSize={50}>
              <div className="h-full bg-white border-l border-gray-200">
                <SidePanel onClose={handleCloseSidePanel} debugData={debugData} />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
