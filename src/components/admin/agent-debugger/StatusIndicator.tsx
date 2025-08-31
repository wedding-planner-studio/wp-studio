'use client';

import { useState, useEffect } from 'react';
import { Circle, AlertCircle, CheckCircle } from 'lucide-react';

interface AnthropicStatus {
  page: {
    id: string;
    name: string;
    url: string;
    time_zone: string;
    updated_at: string;
  };
  status: {
    indicator: string;
    description: string;
  };
}
export function StatusIndicator() {
  const [status, setStatus] = useState<AnthropicStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('https://status.anthropic.com/api/v2/status.json');
        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh every 5 minutes
    const interval = setInterval(
      () => {
        fetchStatus();
      },
      5 * 60 * 1000
    );
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (loading) return <Circle className="h-3 w-3 text-gray-400 animate-pulse" />;
    if (error) return <AlertCircle className="h-3 w-3 text-red-500" />;
    if (status?.status.indicator === 'none')
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    return <AlertCircle className="h-3 w-3 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    if (error) return 'Status Error';
    return status?.status.description || 'Unknown';
  };

  const getStatusColor = () => {
    if (loading) return 'text-gray-500';
    if (error) return 'text-red-600';
    if (status?.status.indicator === 'none') return 'text-green-600';
    return 'text-yellow-600';
  };

  return (
    <a
      href="https://status.anthropic.com/"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
    >
      {getStatusIcon()}
      <span className={`text-[10px] font-medium ${getStatusColor()}`}>{getStatusText()}</span>
    </a>
  );
}
