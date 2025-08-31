'use client';
import { Suspense } from 'react';
import { AgentDebuggerContainer } from '@/components/admin/agent-debugger/AgentDebuggerContainer';
import { StatusIndicator } from '@/components/admin/agent-debugger/StatusIndicator';
import { AgentDebuggerSkeleton } from '@/components/admin/agent-debugger/AgentDebuggerSkeleton';

export default function AgentDebuggerPage() {
  return (
    <div className="h-[calc(100vh-8px)] flex flex-col rounded-tl-xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200/60 bg-white/80 backdrop-blur-sm rounded-tl-xl flex-shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-gray-900 tracking-tight">Agent Debugger</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Debug AI agent conversations and execution flows
            </p>
          </div>
          <div className="flex items-center gap-2">{<StatusIndicator />}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<AgentDebuggerSkeleton />}>
          <AgentDebuggerContainer />
        </Suspense>
      </div>
    </div>
  );
}
