import { useEffect } from 'react';

const STUDENT_RESULT_ITEMS = [
  { label: 'View Test 1 Results', path: '/student/results/test' },
  { label: 'View Test 2 Results', path: '/student/results/test-2' },
  { label: 'View CA Results', path: '/student/results/ca' },
  { label: 'View Exam Results', path: '/student/results/exam' },
  { label: 'View CBT Results', path: '/student/results/cbt' },
  { label: 'Result Summary', path: '/student/results/summary' },
];

const isStudentRoute = () => window.location.pathname.startsWith('/student/');

const isStudentResultRoute = () => window.location.pathname.startsWith('/student/results/');

const navigateTo = (path: string) => {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const createSubmenu = (host: HTMLElement) => {
  if (host.querySelector('[data-student-results-submenu="true"]')) return;

  const submenu = document.createElement('div');
  submenu.setAttribute('data-student-results-submenu', 'true');
  submenu.style.display = isStudentResultRoute() ? 'block' : 'none';
  submenu.className = 'ml-8 mt-1 mb-2 space-y-0.5 border-l border-blue-200/70 dark:border-blue-800/60 pl-2';

  STUDENT_RESULT_ITEMS.forEach(({ label, path }) => {
    const link = document.createElement('a');
    link.href = path;
    link.dataset.studentResultLink = 'true';
    link.dataset.resultPath = path;
    link.className = 'flex items-center rounded-lg px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-gray-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300';
    link.textContent = label;
    if (window.location.pathname === path) {
      link.className += ' bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
    }
    submenu.appendChild(link);
  });

  host.appendChild(submenu);
};

const syncResultMenus = () => {
  if (!isStudentRoute()) return;

  const resultLinks = Array.from(document.querySelectorAll('a[href="#"]')).filter(
    (element) => element.textContent?.trim() === 'Results',
  ) as HTMLAnchorElement[];

  resultLinks.forEach((link) => {
    const host = link.parentElement;
    if (!host) return;
    createSubmenu(host);

    const submenu = host.querySelector('[data-student-results-submenu="true"]') as HTMLElement | null;
    if (!submenu) return;

    submenu.style.display = isStudentResultRoute() ? 'block' : submenu.style.display || 'none';

    submenu.querySelectorAll<HTMLAnchorElement>('[data-student-result-link="true"]').forEach((child) => {
      const active = window.location.pathname === child.dataset.resultPath;
      child.classList.toggle('bg-blue-50', active);
      child.classList.toggle('text-blue-700', active);
      child.classList.toggle('dark:bg-blue-950/40', active);
      child.classList.toggle('dark:text-blue-300', active);
    });
  });
};

/**
 * Adds the complete student Results submenu to the existing compact sidebar.
 * The main layout currently renders the Results parent as href="#", so this
 * bridge provides the missing Test 2 and CA links without changing the shared
 * navigation implementation used by other roles.
 */
export const useResultsSidebarFix = () => {
  useEffect(() => {
    let observer: MutationObserver | null = null;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const resultChild = target.closest('[data-student-result-link="true"]') as HTMLAnchorElement | null;
      if (resultChild && isStudentRoute()) {
        const path = resultChild.dataset.resultPath;
        if (!path) return;
        event.preventDefault();
        event.stopPropagation();
        navigateTo(path);
        return;
      }

      const resultParent = target.closest('a[href="#"]') as HTMLAnchorElement | null;
      if (!resultParent || resultParent.textContent?.trim() !== 'Results' || !isStudentRoute()) return;

      event.preventDefault();
      event.stopPropagation();

      const host = resultParent.parentElement;
      if (!host) return;
      createSubmenu(host);
      const submenu = host.querySelector('[data-student-results-submenu="true"]') as HTMLElement | null;
      if (!submenu) return;

      const shouldOpen = submenu.style.display !== 'block';
      submenu.style.display = shouldOpen ? 'block' : 'none';
    };

    document.addEventListener('click', onClick, true);

    observer = new MutationObserver(() => {
      syncResultMenus();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    syncResultMenus();

    return () => {
      document.removeEventListener('click', onClick, true);
      observer?.disconnect();
    };
  }, []);
};
