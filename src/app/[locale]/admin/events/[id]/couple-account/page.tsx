'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  Eye,
  EyeOff,
  Key,
  Shield,
  AlertTriangle,
  UserPlus2,
  Share2,
  QrCode,
  Share,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { FiArrowLeft } from 'react-icons/fi';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/trpc/react';
import { Skeleton } from '@/components/ui/skeleton';
import { QRCodeSVG } from 'qrcode.react';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

const MAXIMUM_EVENT_MANAGERS = 3;

type ActivityType = 'login' | 'guest_added' | 'message_sent' | 'event_updated';

interface BaseActivity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
}

interface LoginActivity extends BaseActivity {
  type: 'login';
  ipAddress: string;
  device: string;
}

interface GuestAddedActivity extends BaseActivity {
  type: 'guest_added';
  details: {
    guestName: string;
    phone: string;
  };
}

interface MessageSentActivity extends BaseActivity {
  type: 'message_sent';
  details: {
    messageType: string;
    recipients: number;
  };
}

interface EventUpdatedActivity extends BaseActivity {
  type: 'event_updated';
  details: {
    fields: string[];
  };
}

type Activity = LoginActivity | GuestAddedActivity | MessageSentActivity | EventUpdatedActivity;

// Hardcoded activity data - will be replaced with actual API data
const activityLog: Activity[] = [
  {
    id: '1',
    type: 'login',
    description: 'Logged in successfully',
    timestamp: '2024-03-25T15:30:00Z',
    ipAddress: '192.168.1.1',
    device: 'iPhone 14 Pro - Safari',
  },
  {
    id: '2',
    type: 'guest_added',
    description: 'Added guest "John Smith"',
    timestamp: '2024-03-24T10:15:00Z',
    details: {
      guestName: 'John Smith',
      phone: '+1234567890',
    },
  },
  {
    id: '3',
    type: 'message_sent',
    description: 'Sent bulk message to 25 guests',
    timestamp: '2024-03-23T18:45:00Z',
    details: {
      messageType: 'Save the Date',
      recipients: 25,
    },
  },
  {
    id: '4',
    type: 'event_updated',
    description: 'Updated event details',
    timestamp: '2024-03-22T14:20:00Z',
    details: {
      fields: ['venue', 'time'],
    },
  },
  {
    id: '5',
    type: 'login',
    description: 'Logged in successfully',
    timestamp: '2024-03-22T09:10:00Z',
    ipAddress: '192.168.1.1',
    device: 'MacBook Pro - Chrome',
  },
];

interface ShareCredentialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
  } | null;
  action: 'created' | 'reset';
}

function ShareCredentialsDialog({
  isOpen,
  onClose,
  credentials,
  action,
}: ShareCredentialsDialogProps) {
  const [showPassword, setShowPassword] = useState(true);
  const params = useParams();
  const eventId = params.id as string;
  const { t } = useClientTranslation();

  if (!credentials) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('coupleAccount.clipboard.copied', { item: label }));
  };

  const shareData = {
    title: t('coupleAccount.share.title'),
    text: t('coupleAccount.share.text', { username: credentials.username, password: credentials.password }),
    url: window.location.origin,
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        copyToClipboard(shareData.text, t('coupleAccount.credentials'));
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const credentialsQRData = JSON.stringify({
    username: credentials.username,
    password: credentials.password,
    url: `${window.location.origin}/admin/events/${eventId}`,
  });

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-900">
            <Share2 className="h-5 w-5 text-purple-600" />
            {t('coupleAccount.shareCredentials')}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {action === 'created' ? (
              t('coupleAccount.accountCreatedFor', {
                firstName: credentials.firstName,
                lastName: credentials.lastName,
              })
            ) : (
              t('coupleAccount.passwordResetFor', {
                firstName: credentials.firstName,
                lastName: credentials.lastName,
              })
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-gray-500">{t('coupleAccount.username')}</Label>
              <div className="flex gap-2 mt-1.5">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-2.5">
                    <Key className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    value={credentials.username}
                    className="pl-9 bg-gray-50 border-gray-200 font-mono text-sm"
                    readOnly
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(credentials.username, t('coupleAccount.username'))}
                  className="border-gray-200 hover:bg-gray-100 transition-colors hover:border-gray-300"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-500">{t('coupleAccount.password')}</Label>
              <div className="flex gap-2 mt-1.5">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-2.5">
                    <Shield className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    className="pl-9 bg-gray-50 border-gray-200 font-mono text-sm"
                    readOnly
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="border-gray-200 hover:bg-gray-100 transition-colors hover:border-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(credentials.password, t('coupleAccount.password'))}
                  className="border-gray-200 hover:bg-gray-100 transition-colors hover:border-gray-300"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Share Actions */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => copyToClipboard(shareData.text, t('coupleAccount.credentials'))}
              >
                <Copy className="h-4 w-4" />
                {t('coupleAccount.copyAll')}
              </Button>
              <Button className="gap-2" onClick={handleShare}>
                <Share className="h-4 w-4" />
                {t('coupleAccount.share')}
              </Button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="h-4 w-4 text-purple-600" />
              <h4 className="text-sm font-medium text-gray-900">{t('coupleAccount.quickLoginAccess')}</h4>
            </div>
            <div className="flex flex-col items-center bg-gray-50/80 rounded-lg p-4 border border-gray-100">
              <QRCodeSVG
                value={credentialsQRData}
                size={160}
                level="H"
                includeMargin
                className="rounded-lg bg-white p-2"
              />
              <p className="text-sm text-gray-600 text-center mt-3">
                {t('coupleAccount.scanQRCode')}
              </p>
            </div>
          </div>
        </div>
        <Alert className="bg-amber-50/50 border-amber-200 text-amber-800 p-2 mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm ml-2">
            {t('coupleAccount.securityNote')}
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}

export default function CoupleAccountPage() {
  const { t } = useClientTranslation();
  const params = useParams();
  const eventId = params.id as string;
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isDeletingIndex, setIsDeletingIndex] = useState<number | null>(null);

  const [shareCredentials, setShareCredentials] = useState<{
    credentials: { username: string; password: string; firstName: string; lastName: string } | null;
    action: 'created' | 'reset';
  }>({
    credentials: null,
    action: 'created',
  });
  const [newAccountData, setNewAccountData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const router = useRouter();
  const utils = api.useUtils();
  const {
    data: eventManagers,
    isLoading,
    error,
  } = api.organization.listEventManagers.useQuery(
    {
      eventId,
    },
    {
      enabled: !!eventId,
      retry: false,
    }
  );
  const { mutateAsync: addEventManager, isPending: isAdding } =
    api.organization.addEventManager.useMutation({
      onSuccess: (_, variables) => {
        void utils.organization.listEventManagers.invalidate();
        setNewAccountData({ username: '', password: '', firstName: '', lastName: '' });
        setIsAddingNew(false);
        setShareCredentials({
          credentials: {
            username: variables.username,
            password: variables.password,
            firstName: variables.firstName,
            lastName: variables.lastName,
          },
          action: 'created',
        });
        toast.success(t('coupleAccount.accountCreatedSuccess'));
      },
    });

  const { data: event, isLoading: eventLoading } = api.events.getById.useQuery(
    { id: eventId },
    {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      staleTime: 30000,
    }
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('coupleAccount.clipboard.copied', { item: label }));
  };

  const hasAccounts = eventManagers && eventManagers.length > 0;
  const currentManager = hasAccounts ? eventManagers[0] : null;

  useEffect(() => {
    let referencePerson = event?.person1;
    if (!referencePerson || eventManagers?.length === 1) {
      referencePerson = event?.person2;
    }
    if (referencePerson) {
      const [firstName = '', ...lastNameParts] = referencePerson.trim().split(' ');
      const lastName = lastNameParts.join(' ');

      setNewAccountData(prev => ({
        ...prev,
        firstName,
        lastName,
        username: `${firstName.toLowerCase()}${lastName ? `_${lastName.toLowerCase().replace(/\s+/g, '')}` : ''}`,
      }));
    }
  }, [event]);

  const handleCreateAccount = async () => {
    try {
      await addEventManager({
        eventId,
        username: newAccountData.username,
        password: newAccountData.password,
        firstName: newAccountData.firstName,
        lastName: newAccountData.lastName,
      });
      setNewAccountData({ username: '', password: '', firstName: '', lastName: '' });
      setIsAddingNew(false);
    } catch (error: any) {
      // Handle validation errors
      if (error.errors) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(
          (err: { code: string; message: string; meta?: { paramName: string } }) => {
            if (err.meta?.paramName) {
              newErrors[err.meta.paramName] = err.message;
            }
          }
        );
        toast.error(t('coupleAccount.fixFormErrors'));
      } else {
        toast.error(t('coupleAccount.errorCreatingAccount', { error: error.message || t('coupleAccount.unknownError') }));
      }
    }
  };

  const { mutateAsync: resetPassword, isPending: isResetting } =
    api.organization.resetEventManagerPassword.useMutation({
      onSuccess: (_, variables) => {
        const manager = eventManagers?.find(m => m.id === variables.eventManagerId);
        if (manager) {
          setShareCredentials({
            credentials: {
              username: manager.username ?? '',
              password: variables.newPassword,
              firstName: manager.firstName ?? '',
              lastName: manager.lastName ?? '',
            },
            action: 'reset',
          });
        }
        setIsResettingPassword(null);
        setNewPassword('');
        toast.success(t('coupleAccount.passwordResetSuccess'));
      },
    });

  const handleResetPassword = async (eventManagerId: string) => {
    try {
      await resetPassword({
        eventManagerId,
        newPassword,
      });
    } catch (error: any) {
      toast.error(error.message || t('coupleAccount.failedToResetPassword'));
    }
  };

  const { mutateAsync: softDeleteEventManager, isPending: isDeleting } =
    api.organization.softDeleteEventManager.useMutation({
      onSuccess: () => {
        void utils.organization.listEventManagers.invalidate();
        toast.success(t('coupleAccount.accountDeletedSuccess'));
        setIsDeletingIndex(null);
      },
      onError: (error: any) => {
        setIsDeletingIndex(null);
        toast.error(error.message || t('coupleAccount.failedToDeleteAccount'));
      },
    });

  const handleDeleteAccount = async (eventManagerId: string) => {
    try {
      setIsDeletingIndex(eventManagers?.findIndex(m => m.id === eventManagerId) ?? null);
      await softDeleteEventManager({ eventManagerId });
    } catch (error: any) {
      toast.error(error.message || t('coupleAccount.failedToDeleteAccount'));
    }
  };

  const handleCloseShareDialog = () => {
    setShareCredentials({
      credentials: null,
      action: 'created',
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Navigation */}
        <div className="mb-2">
          <Button
            variant="ghost"
            onClick={() => router.push(`/admin/events/${eventId}`)}
            className="text-gray-600 hover:text-gray-900 h-8 px-2 -ml-2"
          >
            <FiArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="text-xs">{t('coupleAccount.backToEvent')}</span>
          </Button>
        </div>

        {/* Event Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">
              {eventLoading ? (
                <Skeleton className="h-8 w-64" />
              ) : (
                event?.name || 'Couple Account Access'
              )}
            </h1>
            <div className="flex flex-col">
              {eventLoading ? (
                <>
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : event ? (
                <>
                  <p className="text-base text-gray-700 mb-1">
                    {event.person1} <span className="text-gray-400">&</span> {event.person2}
                  </p>
                  <p className="text-sm text-gray-500">
                    {event.date && event.startTime && (
                      <>
                        {dayjs(event.date)
                          .utc()
                          .tz(event.timezone || 'America/Mexico_City')
                          .format('dddd, MMMM D, YYYY')}
                        {' • '}
                        {event.startTime}
                      </>
                    )}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200 text-red-800">
            <AlertTriangle className="h-4 w-4 text-red-800 mr-2" />
            <AlertDescription className="text-sm">
              {error.message ||
                "You don't have permission to manage couple accounts for this event."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,480px] gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {!error ? (
              isLoading ? (
                /* Skeleton Loading State */
                <>
                  {/* Status Card Skeleton */}
                  <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-purple-50/50">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Skeleton className="h-3 w-24 mb-2" />
                          <Skeleton className="h-5 w-32" />
                        </div>
                        <div>
                          <Skeleton className="h-3 w-24 mb-2" />
                          <Skeleton className="h-5 w-32" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Credentials Card Skeleton */}
                  <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-purple-50/50">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-7 w-28 ml-auto" />
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <Skeleton className="h-3 w-16 mb-2" />
                        <div className="flex gap-2 mt-1.5">
                          <Skeleton className="h-10 flex-1" />
                          <Skeleton className="h-10 w-10" />
                        </div>
                      </div>
                      <div>
                        <Skeleton className="h-3 w-16 mb-2" />
                        <div className="flex gap-2 mt-1.5">
                          <Skeleton className="h-10 flex-1" />
                          <Skeleton className="h-10 w-10" />
                          <Skeleton className="h-10 w-10" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alert Skeleton */}
                  <Skeleton className="h-16 w-full rounded-md" />
                </>
              ) : (
                <>
                  {/* Status Card */}
                  <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                      <Shield className="h-3.5 w-3.5 text-purple-600" />
                      <h2 className="font-medium text-sm">{t('coupleAccount.status')}</h2>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-600">{t('coupleAccount.status')}</span>
                        <Badge
                          variant={hasAccounts ? 'default' : 'destructive'}
                          className="font-medium"
                        >
                          {t(hasAccounts ? 'coupleAccount.active' : 'coupleAccount.notCreated')}
                        </Badge>
                      </div>
                      {hasAccounts && currentManager && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">{t('coupleAccount.createdOn')}</p>
                            <p className="font-medium text-gray-900">
                              {dayjs(currentManager.createdAt).format('MMM D, YYYY')}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">{t('coupleAccount.lastAccess')}</p>
                            <p className="font-medium text-gray-900">{t('coupleAccount.unknown')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Credentials Card */}
                  <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                      <Key className="h-3.5 w-3.5 text-purple-600" />
                      <h2 className="font-medium text-sm">{t('coupleAccount.accessCredentials')}</h2>
                      {hasAccounts &&
                        !isAddingNew &&
                        eventManagers.length < MAXIMUM_EVENT_MANAGERS && (
                          <Button
                            variant="outline"
                            onClick={() => setIsAddingNew(true)}
                            className="gap-1 ml-auto h-7 text-xs"
                          >
                            <UserPlus2 className="h-3 w-3" />
                            {t('coupleAccount.addAdditionalAccount')}
                          </Button>
                        )}
                      {hasAccounts &&
                        !isAddingNew &&
                        eventManagers.length >= MAXIMUM_EVENT_MANAGERS && (
                          <div className="ml-auto flex items-center">
                            <Badge variant="secondary" className="text-xs">
                              {t('coupleAccount.maximumAccounts', { count: MAXIMUM_EVENT_MANAGERS })}
                            </Badge>
                          </div>
                        )}
                    </div>
                    <div className="p-4">
                      {hasAccounts && !isAddingNew ? (
                        <div className="space-y-6">
                          {eventManagers.map((manager, index) => (
                            <div
                              key={manager.id}
                              className={cn(
                                'rounded-lg border border-gray-100 p-4',
                                index !== eventManagers.length - 1 && 'mb-4'
                              )}
                            >
                              {/* Account Header */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="bg-purple-100 p-1.5 rounded-full">
                                    <UserPlus2 className="h-4 w-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-medium text-gray-900">
                                      {manager.firstName} {manager.lastName}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                      {t('coupleAccount.account', { number: index + 1 })}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {t('coupleAccount.active')}
                                </Badge>
                              </div>

                              {/* Username Section */}
                              <div>
                                <Label
                                  htmlFor={`username-${manager.id}`}
                                  className="text-xs font-medium text-gray-500"
                                >
                                  {t('coupleAccount.username')}
                                </Label>
                                <div className="flex gap-2 mt-1.5">
                                  <div className="relative flex-1">
                                    <div className="absolute left-3 top-2.5">
                                      <Key className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <Input
                                      id={`username-${manager.id}`}
                                      value={manager.username ?? ''}
                                      className="pl-9 bg-gray-50 border-gray-200 font-mono text-sm"
                                      readOnly
                                    />
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                      manager.username &&
                                      copyToClipboard(manager.username, t('coupleAccount.username'))
                                    }
                                    className="border-gray-200 hover:bg-gray-100 transition-colors hover:border-gray-300"
                                    disabled={!manager.username}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5">
                                  {t('coupleAccount.createdAt', {
                                    date: dayjs(manager.createdAt).format('MMM D, YYYY'),
                                  })}
                                </p>
                              </div>

                              {/* Reset Password Section */}
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                {isResettingPassword === manager.id ? (
                                  <div className="space-y-3">
                                    <Label
                                      htmlFor={`new-password-${manager.id}`}
                                      className="text-xs font-medium text-gray-500"
                                    >
                                      {t('coupleAccount.newPassword')}
                                    </Label>
                                    <div className="flex gap-2">
                                      <div className="relative flex-1">
                                        <div className="absolute left-3 top-2.5">
                                          <Shield className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <Input
                                          id={`new-password-${manager.id}`}
                                          type="password"
                                          value={newPassword}
                                          onChange={e => setNewPassword(e.target.value)}
                                          className="pl-9"
                                          placeholder={t('coupleAccount.enterNewPassword')}
                                        />
                                      </div>
                                      <Button
                                        onClick={() => handleResetPassword(manager.id)}
                                        disabled={
                                          isResetting || !newPassword || newPassword.length < 8
                                        }
                                        className="whitespace-nowrap"
                                      >
                                        {isResetting ? t('coupleAccount.resetting') : t('coupleAccount.resetPassword')}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        onClick={() => {
                                          setIsResettingPassword(null);
                                          setNewPassword('');
                                        }}
                                      >
                                        {t('coupleAccount.cancel')}
                                      </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      {t('coupleAccount.passwordRequirement')}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => setIsResettingPassword(manager.id)}
                                      className="text-sm"
                                    >
                                      <Shield className="h-4 w-4 mr-2" />
                                      {t('coupleAccount.resetPassword')}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => handleDeleteAccount(manager.id)}
                                      className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                                      disabled={isDeleting && isDeletingIndex === index}
                                    >
                                      {isDeleting && isDeletingIndex === index ? (
                                        t('coupleAccount.deleting')
                                      ) : (
                                        <>
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          {t('coupleAccount.deleteAccount')}
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200">
                          <div className="bg-purple-100 p-3 rounded-full mb-4">
                            <UserPlus2 className="h-6 w-6 text-purple-600" />
                          </div>
                          <h3 className="text-base font-medium text-gray-900 mb-1">
                            {isAddingNew ? t('coupleAccount.addAdditionalAccount') : t('coupleAccount.noAccountCreated')}
                          </h3>
                          <p className="text-sm text-gray-500 mb-6 max-w-sm">
                            {isAddingNew
                              ? t('coupleAccount.addCredentialsDesc')
                              : t('coupleAccount.createCredentialsDesc')}
                          </p>
                          <div className="w-full max-w-md space-y-4 bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                            {eventManagers && eventManagers.length >= MAXIMUM_EVENT_MANAGERS ? (
                              <div className="text-center p-4">
                                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">
                                  {t('coupleAccount.maxAccountsReached', { count: MAXIMUM_EVENT_MANAGERS })}
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label
                                      htmlFor="new-firstName"
                                      className="text-xs font-medium text-gray-700"
                                    >
                                      {t('coupleAccount.firstName')}
                                    </Label>
                                    <Input
                                      id="new-firstName"
                                      value={newAccountData.firstName}
                                      onChange={e =>
                                        setNewAccountData({
                                          ...newAccountData,
                                          firstName: e.target.value,
                                        })
                                      }
                                      className="w-full"
                                      placeholder={t('coupleAccount.enterFirstName')}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label
                                      htmlFor="new-lastName"
                                      className="text-xs font-medium text-gray-700"
                                    >
                                      {t('coupleAccount.lastName')}
                                    </Label>
                                    <Input
                                      id="new-lastName"
                                      value={newAccountData.lastName}
                                      onChange={e =>
                                        setNewAccountData({
                                          ...newAccountData,
                                          lastName: e.target.value,
                                        })
                                      }
                                      className="w-full"
                                      placeholder={t('coupleAccount.enterLastName')}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label
                                    htmlFor="new-username"
                                    className="text-xs font-medium text-gray-700"
                                  >
                                    {t('coupleAccount.username')}
                                  </Label>
                                  <div className="relative">
                                    <div className="absolute left-3 top-2.5">
                                      <Key className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <Input
                                      id="new-username"
                                      value={newAccountData.username}
                                      onChange={e =>
                                        setNewAccountData({
                                          ...newAccountData,
                                          username: e.target.value,
                                        })
                                      }
                                      className="pl-9"
                                      placeholder={t('coupleAccount.enterUsername')}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label
                                    htmlFor="new-password"
                                    className="text-xs font-medium text-gray-700"
                                  >
                                    {t('coupleAccount.newPassword')}
                                  </Label>
                                  <div className="relative">
                                    <div className="absolute left-3 top-2.5">
                                      <Shield className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <Input
                                      id="new-password"
                                      type="password"
                                      value={newAccountData.password}
                                      onChange={e =>
                                        setNewAccountData({
                                          ...newAccountData,
                                          password: e.target.value,
                                        })
                                      }
                                      className="pl-9"
                                      placeholder={t('coupleAccount.enterPassword')}
                                    />
                                  </div>
                                </div>
                                <Button
                                  onClick={handleCreateAccount}
                                  disabled={
                                    isAdding ||
                                    !newAccountData.username ||
                                    !newAccountData.password ||
                                    !newAccountData.firstName ||
                                    !newAccountData.lastName
                                  }
                                  className="w-full"
                                >
                                  {isAdding ? (
                                    <span className="mr-2 animate-pulse">{t('coupleAccount.creating')}</span>
                                  ) : (
                                    <>
                                      <span className="mr-2">{t('coupleAccount.createAccount')}</span>
                                      <UserPlus2 className="h-4 w-4" />
                                    </>
                                  )}
                                </Button>
                                {isAddingNew && (
                                  <Button
                                    variant="ghost"
                                    onClick={() => {
                                      setIsAddingNew(false);
                                      setNewAccountData({
                                        username: '',
                                        password: '',
                                        firstName: '',
                                        lastName: '',
                                      });
                                    }}
                                    className="w-full text-gray-600"
                                  >
                                    {t('coupleAccount.cancel')}
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )
            ) : (
              // When there's an error, show a placeholder that matches the height of the activity timeline
              <div className="lg:min-h-[600px]" />
            )}
          </div>

          {/* Activity Log Side Section */}
          <div className="lg:border-l lg:pl-6 hidden">
            <div className="sticky top-6 p-6 border border-gray-200 rounded-lg bg-white">
              <h2 className="text-sm font-medium mb-4">Recent Activity</h2>
              {isLoading ? (
                /* Activity Log Skeleton */
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="w-1.5 h-1.5 rounded-full mt-2" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {activityLog.map((activity, i) => {
                    const isRecent = dayjs().diff(activity.timestamp, 'minute') < 5;

                    return (
                      <div key={activity.id} className="flex items-start gap-3 group relative">
                        <div
                          className={`w-1.5 h-1.5 rounded-full mt-2 relative before:absolute before:inset-0 before:rounded-full before:animate-pulse before:blur-sm
                          ${isRecent ? 'bg-green-500/60 before:bg-green-500' : 'bg-primary/60 before:bg-primary'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-900 pr-4">
                              {activity.type === 'login' && (
                                <>
                                  <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors hover:border-gray-300 font-mono">
                                    {activity.ipAddress}
                                  </span>
                                  <span className="ml-1">logged in from {activity.device}</span>
                                </>
                              )}
                              {activity.type === 'guest_added' && (
                                <>
                                  Added guest
                                  <span className="ml-1 inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors hover:border-gray-300">
                                    {activity.details.guestName}
                                  </span>
                                </>
                              )}
                              {activity.type === 'message_sent' && (
                                <>
                                  Sent {activity.details.messageType}
                                  <span className="ml-1 inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors hover:border-gray-300">
                                    {activity.details.recipients} recipients
                                  </span>
                                </>
                              )}
                              {activity.type === 'event_updated' && (
                                <>
                                  Updated
                                  {activity.details.fields.map((field, index) => (
                                    <span
                                      key={field}
                                      className="ml-1 inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors hover:border-gray-300"
                                    >
                                      {field}
                                    </span>
                                  ))}
                                </>
                              )}
                            </p>
                            <div className="hidden group-hover:block text-xs text-gray-400 flex-shrink-0">
                              {dayjs(activity.timestamp).format('MMM D HH:mm')}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {dayjs(activity.timestamp).fromNow()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ShareCredentialsDialog
        isOpen={!!shareCredentials.credentials}
        onClose={handleCloseShareDialog}
        credentials={shareCredentials.credentials}
        action={shareCredentials.action}
      />
    </AdminLayout>
  );
}
