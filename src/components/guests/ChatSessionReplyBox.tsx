'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, Clock } from 'lucide-react';
import { ChatSession } from '@prisma/client';
import dayjs from 'dayjs';
import { api } from '@/trpc/react';
import toast from 'react-hot-toast';

interface ChatSessionReplyBoxProps {
  session?: ChatSession | null;
}

export const ChatSessionReplyBox = ({ session }: ChatSessionReplyBoxProps) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  // trpc
  const utils = api.useUtils();
  const { mutate: sendMessage } = api.whatsapp.replyToSession.useMutation({
    onSuccess: () => {
      toast.success('Message sent successfully');
      setMessage('');
      void utils.whatsapp.getMessagesForGuest.invalidate();
      void utils.agentDebugger.getSessionDetails.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to send message');
    },
  });

  const onSendMessage = (msg?: string | null) => {
    if (!msg) return;
    if (!session?.id) {
      toast.error('Session not found');
      return;
    }
    sendMessage({ sessionId: session.id, message: msg });
  };

  const placeholder = 'Type a message...';
  const replyWindowExpiresAt = useMemo(() => {
    if (!session) return null;
    return dayjs(session.lastMessageAt).add(23, 'hours').add(55, 'minutes').toDate();
  }, [session?.lastMessageAt]);

  const disabled = useMemo(() => {
    if (!session) return true;

    return (
      (session.nextReplyAt && session.nextReplyAt > new Date()) ||
      (replyWindowExpiresAt && replyWindowExpiresAt < new Date())
    );
  }, [session]);

  // Calculate time remaining until reply window expires
  useEffect(() => {
    if (!replyWindowExpiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(replyWindowExpiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }

      setIsExpired(false);

      // Calculate time components
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [replyWindowExpiresAt]);

  const handleSend = async () => {
    if (!message.trim() || isSending || disabled || isExpired) return;

    setIsSending(true);
    try {
      await onSendMessage(message.trim());
      setMessage(''); // Clear the input after sending
    } catch (error) {
      toast.error((error as Error).message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const isInputDisabled = disabled || isSending || isExpired;

  if (!session) return null;

  return (
    <div className="bg-white">
      {/* Reply Window Timer */}
      {replyWindowExpiresAt && (
        <div
          className={cn(
            'px-4 py-1 flex items-center justify-start gap-2 text-xs',
            isExpired
              ? 'text-red-700'
              : timeLeft.includes('s') && !timeLeft.includes('m') && !timeLeft.includes('h')
                ? 'bg-orange-50 text-orange-700' // Last minute warning
                : 'bg-transparent text-blue-700'
          )}
        >
          <Clock className="h-3 w-3" />
          <span className="font-medium">
            {isExpired
              ? 'Reply window has expired - messages can no longer be sent'
              : `Reply window expires in ${timeLeft}`}
          </span>
        </div>
      )}

      {/* Input Area */}
      <div className="py-1">
        <div className="flex items-end gap-3">
          {/* Message input container */}
          <div className="flex w-full relative">
            <textarea
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={isExpired ? 'Reply window has expired' : placeholder}
              disabled={isInputDisabled}
              className={cn(
                'w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12 text-sm',
                'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                'placeholder:text-gray-500',
                'min-h-[44px] max-h-[120px]',
                isInputDisabled && 'bg-gray-50 cursor-not-allowed',
                isExpired && 'border-red-200 placeholder:text-red-400',
                'transition-colors duration-200'
              )}
              rows={1}
              style={{ height: '44px' }}
            />

            {/* Send button inside textarea */}
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={!message.trim() || isInputDisabled}
              className={cn(
                'absolute right-2 bottom-1.5 h-8 w-8 p-0 rounded-full',
                'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300',
                'transition-colors duration-200',
                'flex items-center justify-center',
                'shadow-sm hover:shadow-md'
              )}
              title="Send message"
            >
              {isSending ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-3.5 w-3.5 text-white " />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
