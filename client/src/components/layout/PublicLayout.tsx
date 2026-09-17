import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { AnnouncementBar } from './AnnouncementBar';
import { track } from '../../lib/analytics';
import { useConfig } from '../../context/ConfigContext';

export function PublicLayout() {
  const { pathname, hash } = useLocation();
  const { config } = useConfig();

  useEffect(() => {
    track('page_view', { path: pathname });
    if (!hash) window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  useEffect(() => {
    if (config?.site.libraryName) document.title = config.site.libraryName;
  }, [config?.site.libraryName]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        تخطي إلى المحتوى
      </a>
      <SiteHeader />
      <AnnouncementBar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
