'use client';

import { MainNav } from './MainNavigation';
import { AppSidebarNav } from './AppSidebar';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { redirect } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  if (isLoaded && !user) {
    redirect(`/sign-in?redirect_url=${pathname}`);
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <MainNav sidebar={AppSidebarNav}>
        <div className="overflow-x-auto h-[calc(100vh-10px)] overflow-y-scroll">
          {children}
          <div className="fixed bottom-6 right-6 z-50 shadow-md rounded-full">
            <LanguageSwitcher />
          </div>
        </div>
      </MainNav>
    </div>
  );
};

export default AdminLayout;
