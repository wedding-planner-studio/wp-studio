import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { type ReactNode, useMemo, useState } from 'react';
import Image from 'next/image';
import { Permission } from '@/lib/permissions';
import { useRoleBasedPermission } from '@/hooks/useRoleBasedPermission';
import { FeatureName } from '@/lib/types/features';
import { useOrganizationFeature } from '@/hooks/useOrganizationFeatures';

// Import UserButton using dynamic import with ssr: false
const UserButton = dynamic(() => import('@clerk/nextjs').then(mod => mod.UserButton), {
  ssr: false,
  loading: () => <div className="w-8 h-8 rounded-full bg-gray-100"></div>,
});

export type NavItemCommon = {
  name: string;
  href: string;
  exact?: boolean;
  permission?: Permission;
  feature?: FeatureName;
};

export type NavSubItemType = NavItemCommon;

export type NavItemType = NavItemCommon & {
  icon: LucideIcon;
  items?: NavSubItemType[];
  permission?: Permission;
  feature?: FeatureName;
};

export type SidebarNavAreas = Record<
  string,
  () => {
    title?: string;
    backHref?: string;
    showSwitcher?: boolean;
    direction?: 'left' | 'right';
    content: {
      name?: string;
      items: NavItemType[];
    }[];
  }
>;

export function Sidebar<T extends Record<string, string | boolean | undefined>>({
  areas,
  currentArea,
  data,
  toolContent,
  newsContent,
  switcher,
  bottom,
}: {
  areas: SidebarNavAreas;
  currentArea: string;
  data: T;
  toolContent?: ReactNode;
  newsContent?: ReactNode;
  switcher?: ReactNode;
  bottom?: ReactNode;
}) {
  // Get the area config directly without using hooks inside a hook
  const areaConfig = areas[currentArea];
  const currentAreaConfig = areaConfig ? areaConfig() : null;

  // Early return if no config
  if (!currentAreaConfig) return null;

  const { content, showSwitcher, title, backHref } = currentAreaConfig;
  return (
    <div className="scrollbar-hide relative flex h-full w-full flex-col overflow-y-auto overflow-x-hidden">
      <nav className="relative flex grow flex-col p-3 text-gray-500">
        <div className="relative flex justify-between gap-1 items-center">
          <Link
            href={backHref ?? '/admin/events'}
            className={cn('rounded-md px-1 outline-none', (!title || !backHref) && 'mb-1')}
          >
            {title && backHref ? (
              <div className="py group -my-1 -ml-1 flex items-center gap-2 py-2 pr-1 text-sm font-medium text-neutral-900">
                <ChevronLeft className="size-4 text-neutral-500" />
                {title}
              </div>
            ) : (
              <Image
                src="/evana_logo.png"
                alt="WP Studio"
                width={80}
                height={20}
                className="object-contain mt-1 -translate-x-2"
                priority
              />
            )}
          </Link>
          <UserButton />
        </div>

        {/* Main content area */}
        <div className="relative w-full grow">
          {showSwitcher && switcher && <div className="pt-2">{switcher}</div>}

          <div className="flex flex-col gap-4 pt-4">
            {content.map(({ name, items }, idx) => (
              <div key={idx} className="flex flex-col gap-0.5">
                {name && <div className="mb-2 pl-1 text-sm text-neutral-500">{name}</div>}
                {items?.map(item => <NavItem key={item.name} item={item} />)}
              </div>
            ))}
          </div>

          {newsContent && <div className="-mx-3 flex grow flex-col justify-end">{newsContent}</div>}
        </div>
      </nav>

      {!!bottom && <div className="relative flex flex-col justify-end">{bottom}</div>}
    </div>
  );
}

function NavItem({ item }: { item: NavItemType | NavSubItemType }) {
  const { name, href, exact, permission, feature } = item;
  const { hasAccessToSection } = useRoleBasedPermission(permission, 'view');
  const { hasAccess: hasFeatureAccess } = useOrganizationFeature(feature);

  const Icon = 'icon' in item ? item.icon : undefined;
  const items = 'items' in item ? item.items : undefined;

  const [hovered, setHovered] = useState(false);

  const pathname = usePathname();

  const isActive = useMemo(() => {
    const hrefWithoutQuery = href.split('?')[0];
    // Remove locale prefix from pathname if it exists
    const pathWithoutLocale = pathname?.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '';

    return exact
      ? pathWithoutLocale === hrefWithoutQuery
      : pathWithoutLocale?.startsWith(hrefWithoutQuery ?? '');
  }, [pathname, href, exact]);

  if (!hasAccessToSection || !hasFeatureAccess) return null;

  return (
    <div>
      <Link
        href={href}
        data-active={isActive}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className={cn(
          'group flex items-center gap-2.5 rounded-md p-2 text-sm leading-none text-neutral-600 hover:bg-neutral-200/50 active:bg-neutral-200/80',
          'outline-none focus-visible:ring-2 focus-visible:ring-black/50',
          isActive &&
            !items &&
            'bg-purple-100/50 font-medium text-purple-600 hover:bg-purple-100/80 active:bg-purple-100'
        )}
      >
        {Icon && (
          <Icon
            className={cn('size-4 text-neutral-500', !items && isActive && 'text-purple-600')}
            data-hovered={hovered}
          />
        )}
        {name}
        {items && (
          <div className="flex grow justify-end">
            {items ? (
              <ChevronDown className={cn('size-3.5 text-neutral-500', isActive && 'rotate-180')} />
            ) : null}
          </div>
        )}
      </Link>
      {items && (
        <div className={cn(isActive ? 'h-auto opacity-100' : 'h-0 overflow-hidden opacity-0')}>
          <div className="pl-px pt-1">
            <div className="pl-3.5">
              <div className="flex flex-col gap-0.5 border-l border-neutral-200 pl-2">
                {items.map(item => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
