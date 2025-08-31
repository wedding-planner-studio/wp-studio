'use client';

import { useParams } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import { Sidebar, type SidebarNavAreas, type NavItemType } from './Sidebar';
import {
  Home,
  Users,
  Info,
  MessageSquareMore,
  Image,
  ShieldUser,
  Bot,
  Map,
  SquareStack,
  MessagesSquare,
  LucideUser2,
  Flag,
  BotIcon,
} from 'lucide-react';
import { useRouterStuff } from '@/hooks/useRouterStuff';
import { usePathname } from 'next/navigation';
import { api } from '@/trpc/react';
import { User } from '@prisma/client';
import { Usage } from './Usage';
import { useRoleBasedPermission } from '@/hooks/useRoleBasedPermission';
import { Gear, LinesY } from '../ui';
import { CreditCard } from 'lucide-react';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Define the structure without hooks
const createNavAreas = (
  pathname: string | null,
  params: any,
  t: (key: string) => string,
  user: User | null
): SidebarNavAreas => {
  // Extract the path without the locale prefix if it exists
  const pathWithoutLocale = pathname?.replace(/^\/[a-z]{2}(?=\/|$)/, '') || null;
  const eventId = pathWithoutLocale?.includes('/admin/events/')
    ? (params?.id as string)
    : undefined;

  // Create immutable content structures that don't change with re-render
  const mainSection = {
    name: t('sidebar.main.title'),
    items: [
      {
        name: t('sidebar.main.allEvents'),
        icon: Home,
        href: '/admin/events',
        exact: true,
        permission: 'events',
      },
      {
        name: t('sidebar.main.settings'),
        icon: Gear,
        href: '/admin/settings',
        permission: 'settings',
      },
    ] as NavItemType[],
  };

  const EventOverviewSection = {
    name: t('sidebar.eventOverview.title'),
    items: [
      {
        name: t('sidebar.eventOverview.event'),
        icon: Home,
        href: `/admin/events/${eventId}`,
        exact: true,
        permission: 'events',
      },
      {
        name: t('sidebar.eventOverview.guests'),
        icon: Users,
        href: `/admin/events/${eventId}/guests`,
        permission: 'guests',
      },
      {
        name: t('sidebar.eventOverview.seatmapLayout'),
        icon: Map,
        href: `/admin/events/${eventId}/seatmap`,
        permission: 'seatMap',
        feature: 'seatAssignment',
      },
      {
        name: t('sidebar.eventOverview.seatAssignment'),
        icon: SquareStack,
        href: `/admin/events/${eventId}/seat-assignment`,
        permission: 'seatAssignment',
        feature: 'seatAssignment',
      },
      {
        name: t('sidebar.eventOverview.eventQuestions'),
        icon: Info,
        href: `/admin/events/${eventId}/questions`,
        permission: 'eventQuestions',
      },
      {
        name: t('sidebar.eventOverview.media'),
        icon: Image,
        href: `/admin/events/${eventId}/media`,
        permission: 'media',
      },
      {
        name: t('sidebar.eventOverview.guestRequests'),
        icon: MessagesSquare,
        href: `/admin/events/${eventId}/guest-requests`,
        permission: 'guestRequests',
      },
    ] as NavItemType[],
  };

  const CommunicationSection = {
    name: t('sidebar.communication.title'),
    items: [
      {
        name: t('sidebar.communication.bulkMessages'),
        icon: MessageSquareMore,
        href: `/admin/events/${eventId}/bulk-messages`,
        permission: 'bulkMessages',
        feature: 'bulkMessages',
      },
      {
        name: t('sidebar.communication.chatbot'),
        icon: Bot,
        href: `/admin/events/${eventId}/chatbot`,
        permission: 'chatbot',
        feature: 'chatbotTesting',
      },
    ] as NavItemType[],
  };

  const AdminSection = {
    name: t('sidebar.admin.title'),
    items: [
      {
        name: t('sidebar.admin.coupleAccount'),
        icon: ShieldUser,
        href: `/admin/events/${eventId}/couple-account`,
        permission: 'coupleAccount',
        feature: 'coupleAccount',
      },
    ] as NavItemType[],
  };

  const AdminSettingsSection = {
    name: t('sidebar.settings.title'),
    items: [
      {
        name: t('sidebar.settings.settings'),
        icon: Gear,
        href: '/admin/settings',
        permission: 'settings',
        exact: true,
      },
      {
        name: t('sidebar.settings.usage'),
        icon: LinesY,
        href: '/admin/settings/usage',
        permission: 'orgMsgUsage',
      },
      {
        name: t('sidebar.settings.billing'),
        icon: CreditCard,
        href: '/admin/settings/billing',
        permission: 'billing',
      },
      {
        name: t('sidebar.settings.purchaseMessages'),
        icon: MessageSquareMore,
        href: '/admin/settings/campaign-messages',
        permission: 'campaignMessages',
      },
      {
        name: t('sidebar.settings.members'),
        icon: LucideUser2,
        href: '/admin/settings/members',
        permission: 'members',
      },
    ] as NavItemType[],
  };

  return {
    // Top-level
    orgDefault: () => {
      return {
        showSwitcher: true,
        direction: 'left',
        content: [mainSection],
      };
    },
    eventDefault: () => {
      return {
        showSwitcher: true,
        direction: 'left',
        content: [EventOverviewSection, CommunicationSection, AdminSection],
      };
    },
    eventManagerDefault: () => {
      return {
        showSwitcher: true,
        direction: 'left',
        content: [EventOverviewSection, CommunicationSection],
      };
    },
    orgSettings: () => {
      return {
        showSwitcher: true,
        direction: 'left',
        title: t('sidebar.settings.title'),
        backHref: '/admin/events',
        content: [AdminSettingsSection],
      };
    },
    managerDefault: () => {
      return {
        showSwitcher: true,
        direction: 'left',
        content: [mainSection],
      };
    },
    sudo: () => {
      return {
        showSwitcher: true,
        direction: 'left',
        title: 'Admin',
        content: [
          {
            name: `Admin`,
            items: [
              {
                name: 'Organization Config',
                icon: Users,
                href: '/sudo',
                permission: 'sudo',
                exact: true,
              },
              {
                name: 'Feature Flags',
                icon: Flag,
                href: '/sudo/feature-flags',
                permission: 'sudo',
                exact: true,
              },
              {
                name: 'Agent Debugger',
                icon: BotIcon,
                href: '/sudo/agent-debugger',
                permission: 'sudo',
                exact: true,
              },
            ] as NavItemType[],
          },
        ],
      };
    },
  };
};

export function AppSidebarNav({
  toolContent,
  newsContent,
}: {
  toolContent?: ReactNode;
  newsContent?: ReactNode;
}) {
  const { id } = useParams<{ id: string }>() ?? { id: '' };
  const { getQueryString } = useRouterStuff();
  const { data: org } = api.organization.get.useQuery();
  const { hasPermission: hasOrgMsgUsagePermission } = useRoleBasedPermission('orgMsgUsage', 'read');
  const { t } = useClientTranslation('common');

  // Call hooks at the component top level
  const pathname = usePathname();
  const params = useParams();
  const { data: user } = api.user.get.useQuery();

  // Create the nav areas using the hook values
  const NavAreas = useMemo(() => {
    return createNavAreas(pathname, params, t, user ?? null);
  }, [pathname, params, t, user]);

  const currentArea = useMemo(() => {
    // Extract the path without the locale prefix if it exists
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');

    if (pathWithoutLocale.startsWith('/admin/settings')) {
      return 'orgSettings';
    }
    if (pathWithoutLocale.startsWith('/sudo')) {
      return 'sudo';
    }
    // If the user is an event manager, show the manager default
    if (user?.role === 'EVENT_MANAGER') {
      // If there is an event id, show the event default
      if (id) {
        return 'eventManagerDefault';
      }
      return 'managerDefault';
    }
    // If there is an event id, show the event default
    if (id) {
      return 'eventDefault';
    }
    // If there is no event id and the user is not an event manager, show the org default
    return 'orgDefault';
  }, [org, pathname, user, id]);

  return (
    <Sidebar
      areas={NavAreas}
      currentArea={currentArea}
      data={{
        queryString: getQueryString(undefined, {
          ignore: ['sortBy', 'sortOrder'],
        }),
        session: undefined,
        showNews: false,
      }}
      toolContent={toolContent}
      newsContent={newsContent}
      bottom={<Usage />}
    />
  );
}
