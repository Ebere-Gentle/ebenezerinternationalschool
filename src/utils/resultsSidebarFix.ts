import { useEffect } from 'react';

const resultRoutes = (pathname: string) => {
  if (pathname.startsWith('/student/')) return '/student/results/test';
  if (pathname.startsWith('/parent/')) return '/parent/results/test';
  return null;
};

/**
 * Fixes the legacy Results parent navigation item which still renders as
 * href="#" in the compact student/parent sidebar. The actual child result
 * routes are real React Router routes; this bridge makes the parent item
 * open the first result page instead of doing nothing.
 */
export const useResultsSidebarFix = () => {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[href="#"]') as HTMLAnchorElement | null;
      if (!link) return;
      if (link.textContent?.trim() !== 'Results') return;

      const route = resultRoutes(window.location.pathname);
      if (!route) return;

      event.preventDefault();
      window.history.pushState({}, '', route);
      window.dispatchEvent(new PopStateEvent('popstate'));
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
};
