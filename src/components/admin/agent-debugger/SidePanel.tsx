'use client';

import { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Bot,
  Copy,
  Check,
  Zap,
  Clock,
  MessageSquare,
  Settings,
  Activity,
  Wrench,
  BarChart3,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentExecution, ChatbotApiCall, AgentLoopIteration, Agent } from '@prisma/client';
import { AnthropicModels } from '@/lib/anthropic-models';

interface DetailedExecution extends AgentExecution {
  agent: Agent;
  loopIterations: (AgentLoopIteration & {
    apiCalls: ChatbotApiCall[];
  })[];
  subExecutions: DetailedExecution[];
}

export type SidebarTab = 'system' | 'execution' | 'analytics';

// Enhanced content interface for structured debug data
export interface DebugData {
  messageId: string;
  agentExecution?: DetailedExecution; // The full agent execution object
  systemPrompt?: string;
  metadata?: {
    agentName?: string;
    agentType?: string;
    timestamp?: Date;
    tokens?: number;
    executionTime?: number;
  };
}

interface SidePanelProps {
  onClose: () => void;
  debugData?: DebugData | null;
}

const tabs: Array<{
  id: SidebarTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'system', label: 'System', icon: Settings },
  { id: 'execution', label: 'Execution', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function SidePanel({ onClose, debugData }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('execution');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Reset to execution tab when new debug data is loaded
  useEffect(() => {
    if (debugData) {
      setActiveTab('execution');
    }
  }, [debugData?.messageId]);

  const handleCopy = async (textToCopy: string) => {
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
  };

  // If no debug data, show empty state
  if (!debugData) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a message to view debug information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const hasContent = getTabHasContent(tab.id, debugData);

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!hasContent}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                      : hasContent
                        ? 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        : 'border-transparent text-gray-300 cursor-not-allowed'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors mr-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <TabContent tab={activeTab} debugData={debugData} onCopy={handleCopy} copied={copied} />
      </div>
    </div>
  );
}

// Helper function to check if a tab has content
function getTabHasContent(tab: SidebarTab, debugData: DebugData): boolean {
  switch (tab) {
    case 'system':
      return !!debugData.systemPrompt || !!debugData.agentExecution;
    case 'execution':
      return !!debugData.agentExecution;
    case 'analytics':
      return !!debugData.agentExecution;
    default:
      return false;
  }
}

// Tab content component
interface TabContentProps {
  tab: SidebarTab;
  debugData: DebugData;
  onCopy: (text: string) => void;
  copied: boolean;
}

function TabContent({ tab, debugData, onCopy, copied }: TabContentProps) {
  switch (tab) {
    case 'system':
      return <SystemTab debugData={debugData} onCopy={onCopy} copied={copied} />;
    case 'execution':
      return <ExecutionTab debugData={debugData} onCopy={onCopy} copied={copied} />;
    case 'analytics':
      return <AnalyticsTab debugData={debugData} onCopy={onCopy} copied={copied} />;
    default:
      return <div className="p-6 text-gray-500">Tab content not available</div>;
  }
}

// System Tab Component
function SystemTab({
  debugData,
  onCopy,
  copied,
}: {
  debugData: DebugData;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const systemPrompt =
    debugData.systemPrompt ||
    debugData.agentExecution?.systemPrompt ||
    'No system prompt available';

  return (
    <div className="h-full flex flex-col">
      {/* Header with copy button */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">System Prompt</h3>
          <button
            onClick={() => onCopy(systemPrompt)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Copy system prompt"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {debugData.metadata && (
          <div className="mt-2 text-xs text-gray-500">
            {debugData.metadata.agentName} • {debugData.metadata.agentType}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 bg-gray-50/50 rounded-lg p-4 border border-gray-100">
          {systemPrompt}
        </pre>
      </div>
    </div>
  );
}

// Helper function to calculate tokens and cost from API calls
function calculateTokensAndCost(
  apiCalls: {
    id: string;
    messageId: string;
    model: string;
    inputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    outputTokens: number;
    estimatedCost: number | null;
    responseTimeMs: number | null;
    createdAt: Date;
  }[] = []
) {
  const totals = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 0,
    totalCost: 0,
  };

  apiCalls.forEach(call => {
    totals.inputTokens += call.inputTokens || 0;
    totals.outputTokens += call.outputTokens || 0;
    totals.cacheCreationTokens += call.cacheCreationTokens || 0;
    totals.cacheReadTokens += call.cacheReadTokens || 0;

    const modelInfo = AnthropicModels[call.model as keyof typeof AnthropicModels];

    if (modelInfo && modelInfo.pricing) {
      const { pricing } = modelInfo;
      const inputCost = ((call.inputTokens || 0) * (pricing.input || 0)) / 1000000;
      const outputCost = ((call.outputTokens || 0) * (pricing.output || 0)) / 1000000;
      const cacheCreationCost =
        ((call.cacheCreationTokens || 0) * (pricing.cache_5m_write || 0)) / 1000000;
      const cacheReadCost = ((call.cacheReadTokens || 0) * (pricing.cache_hit || 0)) / 1000000;
      totals.totalCost += inputCost + outputCost + cacheCreationCost + cacheReadCost;
    }
  });

  totals.totalTokens =
    totals.inputTokens + totals.outputTokens + totals.cacheCreationTokens + totals.cacheReadTokens;

  return totals;
}

// Helper function to calculate total execution cost across all nested executions
function getExecutionCost(exec: DetailedExecution) {
  let totalCost = 0;
  const executionsToProcess = [exec];

  // Use iterative approach with a stack to traverse all nested executions
  while (executionsToProcess.length > 0) {
    const currentExecution = executionsToProcess.pop()!;

    // Calculate cost for all API calls in this execution's loop iterations
    const apiCalls = currentExecution.loopIterations.flatMap(iteration => iteration.apiCalls);
    const totals = calculateTokensAndCost(apiCalls);
    totalCost += totals.totalCost;

    // Add any sub-executions to the stack for processing
    if (currentExecution.subExecutions && currentExecution.subExecutions.length > 0) {
      executionsToProcess.push(...currentExecution.subExecutions);
    }
  }

  return totalCost;
}

// Execution Tab Component (merged with iterations)
function ExecutionTab({
  debugData,
  onCopy,
  copied,
}: {
  debugData: DebugData;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const [expandedIterations, setExpandedIterations] = useState<Set<string>>(new Set());
  const execution = debugData.agentExecution as AgentExecution;

  if (!execution) {
    return <div className="p-6 text-gray-500 text-sm">No execution data available</div>;
  }

  // Get all iterations from main execution and sub-executions, ordered chronologically
  const getAllIterations = () => {
    const allIterations: any[] = [];

    // Helper function to add sub-execution iterations for a specific parent loop iteration
    const addSubExecutionIterations = (
      parentLoopIterationId: string,
      parentIterationIndex: number
    ) => {
      if (!debugData.agentExecution?.subExecutions) return;

      debugData.agentExecution.subExecutions.forEach((subExecution: any, subIndex: number) => {
        // Only include sub-executions that belong to this specific parent loop iteration
        if (
          subExecution.parentLoopIterationId === parentLoopIterationId &&
          subExecution.loopIterations
        ) {
          subExecution.loopIterations.forEach((iteration: any, iterIndex: number) => {
            // Calculate tokens and cost for this specific iteration
            const iterationTotals = calculateTokensAndCost(iteration.apiCalls || []);
            allIterations.push({
              ...iteration,
              executionType: 'sub',
              executionName: subExecution.agent?.name || `Sub Agent ${subIndex + 1}`,
              displayId: `sub-${subIndex}-${iterIndex}`,
              iterationNumber: iterIndex + 1,
              subExecutionIndex: subIndex,
              parentIterationIndex: parentIterationIndex,
              parentLoopIterationId: parentLoopIterationId,
              indentLevel: 1,
              subExecution,
              // Add calculated totals for this iteration
              calculatedTotals: iterationTotals,
            });
          });
        }
      });
    };

    // Add main execution iterations and their sub-execution iterations in order
    if (debugData.agentExecution?.loopIterations) {
      debugData.agentExecution.loopIterations.forEach((iteration: any, index: number) => {
        // Calculate tokens and cost for this main iteration
        const iterationTotals = calculateTokensAndCost(iteration.apiCalls || []);

        // Add the main iteration
        allIterations.push({
          ...iteration,
          executionType: 'main',
          executionName: debugData.agentExecution?.agent?.name || 'Main Agent',
          displayId: `main-${index}`,
          iterationNumber: index + 1,
          indentLevel: 0,
          execution: debugData.agentExecution, // Include full execution data
          // Add calculated totals for this iteration
          calculatedTotals: iterationTotals,
        });

        // Add any sub-execution iterations that belong to this main iteration
        addSubExecutionIterations(iteration.id, index + 1);
      });
    }

    // Add any orphaned sub-execution iterations (those without a parentLoopIterationId)
    if (debugData.agentExecution?.subExecutions) {
      debugData.agentExecution.subExecutions.forEach((subExecution: any, subIndex: number) => {
        // Only include sub-executions that don't have a parentLoopIterationId
        if (!subExecution.parentLoopIterationId && subExecution.loopIterations) {
          subExecution.loopIterations.forEach((iteration: any, iterIndex: number) => {
            // Calculate tokens and cost for this specific iteration
            const iterationTotals = calculateTokensAndCost(iteration.apiCalls || []);

            allIterations.push({
              ...iteration,
              executionType: 'sub',
              executionName: subExecution.agent?.name || `Sub Agent ${subIndex + 1}`,
              displayId: `sub-orphaned-${subIndex}-${iterIndex}`,
              iterationNumber: iterIndex + 1,
              subExecutionIndex: subIndex,
              indentLevel: 0,
              isOrphaned: true,
              subExecution,
              // Add calculated totals for this iteration
              calculatedTotals: iterationTotals,
            });
          });
        }
      });
    }

    return allIterations;
  };

  const allIterations = getAllIterations();

  const toggleIteration = (displayId: string) => {
    const newExpanded = new Set(expandedIterations);
    if (newExpanded.has(displayId)) {
      newExpanded.delete(displayId);
    } else {
      newExpanded.add(displayId);
    }
    setExpandedIterations(newExpanded);
  };

  // Helper function to parse tool calls
  const parseToolCalls = (toolCallsString: string | null) => {
    if (!toolCallsString) return [];
    try {
      let parsed = JSON.parse(toolCallsString);
      if (typeof parsed === 'string' && parsed.length) {
        parsed = JSON.parse(parsed);
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse tool calls:', e);
      return [];
    }
  };

  // Helper function to parse tool results
  const parseToolResults = (toolResultsString: string | null) => {
    if (!toolResultsString) return [];
    try {
      let parsed = JSON.parse(toolResultsString);
      if (typeof parsed === 'string' && parsed.length) {
        parsed = JSON.parse(parsed);
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse tool results:', e);
      return [];
    }
  };

  // Calculate duration if both timestamps exist
  const getDuration = () => {
    if (execution.startedAt && execution.completedAt) {
      const start = new Date(execution.startedAt);
      const end = new Date(execution.completedAt);
      return end.getTime() - start.getTime();
    }
    return execution.executionTimeMs || null;
  };

  const duration = getDuration();

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      {/* Iterations Section */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/10">
        <h3 className="text-sm font-medium text-gray-900">Execution Flow</h3>
        <p className="text-xs text-gray-500 mt-1">
          {allIterations.length} iterations in chronological execution order
        </p>
      </div>

      {allIterations.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No iterations found</p>
        </div>
      ) : (
        <div className="relative overflow-x-hidden">
          {allIterations.map((iteration: any, iterationIndex: number) => {
            const isExpanded = expandedIterations.has(iteration.displayId);
            const toolCalls = parseToolCalls(iteration.toolCalls);
            const toolResults = parseToolResults(iteration.toolResults);
            const hasToolCalls = toolCalls.length > 0;
            const hasResponse = iteration.outputContent;
            const currentExecution = iteration.subExecution || iteration.execution;
            const iterationTotals = iteration.calculatedTotals;

            // Determine if this is the last item in its group
            const isLastInGroup =
              iterationIndex === allIterations.length - 1 ||
              (iteration.indentLevel > 0 && allIterations[iterationIndex + 1]?.indentLevel === 0);

            // Determine if there are more items in this sub-execution group
            const hasNextSibling =
              iterationIndex < allIterations.length - 1 &&
              allIterations[iterationIndex + 1]?.indentLevel === iteration.indentLevel &&
              allIterations[iterationIndex + 1]?.parentLoopIterationId ===
                iteration.parentLoopIterationId;

            return (
              <div key={iteration.displayId} className="relative">
                {/* Tree structure lines */}
                <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
                  {iteration.indentLevel > 0 && (
                    <>
                      {/* Vertical line from parent */}
                      <div
                        className="absolute bg-gray-300 hidden sm:block"
                        style={{
                          left: '20px',
                          top: '0px',
                          width: '1px',
                          height: isLastInGroup ? '24px' : '100%',
                        }}
                      />
                      {/* Mobile vertical line */}
                      <div
                        className="absolute bg-gray-300 sm:hidden"
                        style={{
                          left: '14px',
                          top: '0px',
                          width: '1px',
                          height: isLastInGroup ? '20px' : '100%',
                        }}
                      />
                      {/* Horizontal connector line */}
                      <div
                        className="absolute bg-gray-300 hidden sm:block"
                        style={{
                          left: '20px',
                          top: '24px',
                          width: '12px',
                          height: '1px',
                        }}
                      />
                      {/* Mobile horizontal connector */}
                      <div
                        className="absolute bg-gray-300 sm:hidden"
                        style={{
                          left: '14px',
                          top: '20px',
                          width: '10px',
                          height: '1px',
                        }}
                      />
                    </>
                  )}
                </div>

                {/* Iteration Header */}
                <div
                  className={cn(
                    'relative',
                    iteration.indentLevel > 0 ? 'ml-6 sm:ml-8 mr-1 sm:mr-2 my-1' : 'm-0'
                  )}
                >
                  <button
                    onClick={() => toggleIteration(iteration.displayId)}
                    className={cn(
                      'w-full text-left transition-colors relative z-10 px-3 py-2',
                      isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Toggle chevron - moved to left */}
                      <div
                        className={cn(
                          'transition-transform flex-shrink-0',
                          isExpanded && 'rotate-90'
                        )}
                      >
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>

                      {/* Timeline flow indicator for main iterations */}
                      {iteration.indentLevel === 0 && (
                        <div className="hidden sm:flex flex-col items-center">
                          <div
                            className={cn(
                              'w-3 h-3 rounded-full border-2 bg-white',
                              iteration.executionType === 'main'
                                ? 'border-blue-500'
                                : 'border-orange-500'
                            )}
                          />
                          {iterationIndex < allIterations.length - 1 &&
                            allIterations[iterationIndex + 1]?.indentLevel === 0 && (
                              <div className="w-px h-4 bg-gray-300 mt-1" />
                            )}
                        </div>
                      )}

                      {/* Sub-execution indicator */}
                      {iteration.indentLevel > 0 && (
                        <div
                          className={cn('w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full', 'bg-purple-500')}
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">
                            {iteration.executionName}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                          {hasToolCalls && `${toolCalls.length} tool calls`}
                          {hasToolCalls && hasResponse && ' • '}
                          {hasResponse && 'Response generated'}
                        </div>
                        {/* Mobile: Show condensed info */}
                        <div className="text-xs text-gray-500 mt-0.5 sm:hidden">
                          {hasToolCalls && `${toolCalls.length} tools`}
                          {iteration.executionType === 'sub' && (hasToolCalls ? ' • sub' : 'sub')}
                        </div>
                      </div>

                      {/* Right side metrics */}
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {/* Show calculated metrics for iterations with API calls - hide detailed cost on mobile */}
                        {iterationTotals && iterationTotals.totalTokens > 0 && (
                          <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400">
                            {iterationTotals.totalCost > 0 && (
                              <span className="bg-gray-100 px-2 py-1 rounded-full">
                                ${iterationTotals.totalCost.toFixed(4)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
                {/* Iteration Content */}
                {isExpanded && (
                  <div
                    className={cn(
                      'space-y-3 sm:space-y-4 border-l-2 border-gray-200 bg-gray-50/30',
                      iteration.indentLevel > 0
                        ? 'ml-6 sm:ml-8 mr-1 sm:mr-2 px-3 sm:px-6 py-3 sm:py-4'
                        : 'mx-2 sm:mx-4 px-3 sm:px-6 py-3 sm:py-4'
                    )}
                  >
                    {/* Sub-execution system prompt - only show for sub-agents and only once per sub-execution */}
                    {iteration.executionType === 'sub' &&
                      iteration.iterationNumber === 1 &&
                      currentExecution?.systemPrompt && (
                        <SubAgentSystemPrompt
                          systemPrompt={currentExecution.systemPrompt}
                          agentName={iteration.executionName}
                          onCopy={onCopy}
                          copied={copied}
                        />
                      )}

                    {/* API Calls Details */}
                    {iteration.apiCalls && iteration.apiCalls.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Zap className="h-3 w-3" />
                          API Calls ({iteration.apiCalls.length})
                        </h4>
                        <div className="space-y-2">
                          {iteration.apiCalls.map((apiCall: any, callIndex: number) => (
                            <div
                              key={callIndex}
                              className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-900">
                                    {apiCall.model || 'Unknown Model'}
                                  </span>
                                  <span className="text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                                    {apiCall.messageId?.slice(-8) || 'No ID'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => onCopy(JSON.stringify(apiCall, null, 2))}
                                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                  title="Copy API call data"
                                >
                                  {copied ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>

                              {/* Token breakdown */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-500">Input:</span>
                                  <span className="text-gray-700 ml-1 font-medium">
                                    {(apiCall.inputTokens ?? 0).toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Output:</span>
                                  <span className="text-gray-700 ml-1 font-medium">
                                    {(apiCall.outputTokens || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Cache Read:</span>
                                  <span className="text-gray-700 ml-1 font-medium">
                                    {(apiCall.cacheReadTokens ?? 0).toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Cache Creation:</span>
                                  <span className="text-gray-700 ml-1 font-medium">
                                    {(apiCall.cacheCreationTokens || 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Calculated cost for this API call */}
                              {(() => {
                                const callTotals = calculateTokensAndCost([apiCall]);
                                return (
                                  <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-xs">
                                    <span className="text-gray-500">
                                      Total: {callTotals.totalTokens.toLocaleString()} tokens
                                    </span>
                                    <span className="text-gray-700 font-medium">
                                      ${callTotals.totalCost.toFixed(4)}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-2">
                      <div className="text-[10px] font-medium text-gray-500 mb-1">Input:</div>
                      <textarea
                        rows={2}
                        readOnly
                        className="text-[10px] text-gray-600 bg-white p-2 rounded border w-full"
                        value={iteration.inputPrompt}
                      />
                    </div>
                    {iteration.outputContent && (
                      <div className="mb-2">
                        <div className="text-[10px] font-medium text-gray-500 mb-1">Output:</div>
                        <textarea
                          rows={2}
                          readOnly
                          className="text-[10px] text-gray-600 bg-white p-2 rounded border w-full"
                          value={iteration.outputContent}
                        />
                      </div>
                    )}

                    {/* Tool Calls */}
                    {hasToolCalls && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Wrench className="h-3 w-3" />
                          Tool Calls ({toolCalls.length})
                        </h4>
                        <div className="space-y-2">
                          {toolCalls.map((toolCall: any, toolIndex: number) => {
                            const toolResult = toolResults.find(
                              (result: any) => result.tool_use_id === toolCall.id
                            );

                            return (
                              <div
                                key={toolIndex}
                                className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-900">
                                      {toolCall.name || 'Unknown Tool'}
                                    </span>
                                    <span className="text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                                      {toolCall.type || 'function'}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => onCopy(JSON.stringify(toolCall, null, 2))}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                    title="Copy tool call"
                                  >
                                    {copied ? (
                                      <Check className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>

                                {/* Tool Input */}
                                {toolCall.input && (
                                  <div className="mb-2">
                                    <div className="text-[10px] font-medium text-gray-500 mb-1">
                                      Input:
                                    </div>
                                    <textarea
                                      readOnly
                                      rows={2}
                                      className="text-[10px] text-gray-600 bg-white p-2 rounded border w-full"
                                      value={JSON.stringify(toolCall.input, null, 2)}
                                    />
                                  </div>
                                )}

                                {/* Tool Result */}
                                {toolResult && (
                                  <div>
                                    <div className="text-[10px] font-medium text-gray-500 mb-1">
                                      Result:
                                    </div>
                                    <textarea
                                      readOnly
                                      rows={2}
                                      className="text-[10px] text-gray-600 bg-white p-2 rounded border w-full"
                                      value={
                                        typeof toolResult.content === 'string'
                                          ? toolResult.content
                                          : JSON.stringify(toolResult.content, null, 2)
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Response */}
                    {hasResponse && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-medium text-gray-700 flex items-center gap-2">
                            <Bot className="h-3 w-3" />
                            Agent Response
                          </h4>
                          <button
                            onClick={() => onCopy(iteration.outputContent)}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Copy response"
                          >
                            {copied ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <div className="p-3 bg-gray-50 border rounded-lg">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {iteration.outputContent}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Execution Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                      {iteration.iterationTimeMs && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {iteration.iterationTimeMs}ms
                        </div>
                      )}
                      {iteration.status && (
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {iteration.status}
                        </div>
                      )}
                      {iterationTotals && iterationTotals.totalCost > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />${iterationTotals.totalCost.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({
  debugData,
  onCopy,
  copied,
}: {
  debugData: DebugData;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const execution = debugData.agentExecution as AgentExecution;

  if (!execution) {
    return (
      <div className="p-4 text-center text-gray-500">
        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No execution data available</p>
      </div>
    );
  }

  // Calculate duration
  const getDuration = () => {
    if (execution.startedAt && execution.completedAt) {
      const start = new Date(execution.startedAt);
      const end = new Date(execution.completedAt);
      return end.getTime() - start.getTime();
    }
    return execution.executionTimeMs || null;
  };

  const duration = getDuration();

  return (
    <div className="h-full overflow-y-auto">
      {/* Execution Overview */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/20">
        {/* Key Metrics - Ultra Compact Layout */}
        <div className="space-y-2 mb-3">
          {/* Top Row - Token Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 px-2 py-1.5 rounded text-center border border-gray-100">
              <div className="text-xs font-semibold text-gray-900">
                {execution.outputTokens.toLocaleString()}
              </div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Output Tokens</div>
            </div>
            <div className="bg-gray-50 px-2 py-1.5 rounded text-center border border-gray-100">
              <div className="text-xs font-semibold text-gray-900">
                {execution.cacheCreationTokens.toLocaleString()} +{' '}
                {execution.cacheReadTokens.toLocaleString()}
              </div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Cache Tokens</div>
              <div className="text-[8px] text-gray-400 leading-tight">write + read</div>
            </div>
            <div className="bg-gray-50 px-2 py-1.5 rounded text-center border border-gray-100">
              <div className="text-xs font-semibold text-gray-900">
                {execution.inputTokens.toLocaleString()}
              </div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Input Tokens</div>
            </div>
          </div>

          {/* Bottom Row - Performance Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 px-2 py-1.5 rounded text-center border border-gray-100">
              <div className="text-xs font-semibold text-gray-900">
                {duration ? `${duration}ms` : '—'}
              </div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Duration</div>
            </div>
            <div className="bg-gray-50 px-2 py-1.5 rounded text-center border border-gray-100">
              <div className="text-xs font-semibold text-gray-900">
                ${(getExecutionCost(execution as DetailedExecution) ?? 0).toFixed(4)}
              </div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Cost</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {(execution.userMessage || execution.finalResponse) && (
          <div className="space-y-3">
            {execution.userMessage && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center justify-between gap-2">
                  User Message
                  <button
                    disabled={!execution.userMessage}
                    onClick={() => onCopy(execution.userMessage ?? '')}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Copy user message"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={2}
                  value={execution.userMessage}
                  className="bg-gray-50 text-xs text-gray-700 leading-relaxed p-3 rounded border border-gray-200 w-full"
                />
              </div>
            )}

            {execution.finalResponse && (
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center justify-between gap-2">
                  Final Response
                  <button
                    disabled={!execution.finalResponse}
                    onClick={() => onCopy(execution.finalResponse ?? '')}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Copy final response"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={2}
                  className="bg-gray-50 text-xs text-gray-700 leading-relaxed p-3 rounded border border-gray-200 w-full"
                  value={execution.finalResponse}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// SubAgentSystemPrompt Component
function SubAgentSystemPrompt({
  systemPrompt,
  agentName,
  onCopy,
  copied,
}: {
  systemPrompt: string;
  agentName: string;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden bg-gray-50">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left cursor-pointer hover:bg-gray-100"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-3 w-3" />
            <span className="text-xs font-medium">{agentName} System Prompt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={e => {
                e.stopPropagation();
                onCopy(systemPrompt);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
              title="Copy system prompt"
            >
              {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            </button>
            <div className={cn('transition-transform text-gray-400', isExpanded && 'rotate-90')}>
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-3 pb-3 bg-gray-50">
          <div className="max-h-40 overflow-y-auto">
            <pre className="text-[9px] text-gray-700 p-3 whitespace-pre-wrap leading-relaxed">
              {systemPrompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
