import { useEffect } from 'react';

const STUDENT_RESULT_ITEMS = [
  { label: 'First Periodic Test', path: '/student/results/test' },
  { label: 'Second Periodic Test', path: '/student/results/test-2' },
  { label: 'CA', path: '/student/results/ca' },
  { label: 'Exam', path: '/student/results/exam' },
  { label: 'CBT', path: '/student/results/cbt' },
  { label: 'Result Summary', path: '/student/results/summary' },
];

const isStudentRoute = () => window.location.pathname.startsWith('/student/');
const isStudentResultRoute = () => window.location.pathname.startsWith('/student/results/');

const navigateTo = (path: string) => {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const findResultsLink = () => Array.from(document.querySelectorAll<HTMLAnchorElement>('a')).find((element) => {
  const text = element.textContent?.replace(/\s+/g, ' ').trim();
  return text === 'Results' && (element.getAttribute('href') === '#' || element.getAttribute('href')?.endsWith('#'));
});

const createSubmenu = (resultsLink: HTMLAnchorElement) => {
  const existing = document.querySelector('[data-student-results-submenu="true"]') as HTMLElement | null;
  if (existing) return existing;

  const submenu = document.createElement('div');
  submenu.setAttribute('data-student-results-submenu', 'true');
  submenu.className = 'ml-7 mt-1 mb-2 space-y-0.5 border-l-2 border-blue-200/70 pl-2 dark:border-blue-800/60';

  STUDENT_RESULT_ITEMS.forEach(({ label, path }) => {
    const link = document.createElement('a');
    link.href = path;
    link.dataset.studentResultLink = 'true';
    link.dataset.resultPath = path;
    link.className = 'flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-gray-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300';
    link.textContent = label;
    submenu.appendChild(link);
  });

  const itemHost = resultsLink.parentElement;
  const listHost = itemHost?.parentElement;
  if (listHost) listHost.insertBefore(submenu, itemHost.nextSibling);
  else itemHost?.appendChild(submenu);

  return submenu;
};

const syncSubmenu = () => {
  if (!isStudentRoute()) return;
  const resultsLink = findResultsLink();
  if (!resultsLink) return;

  const submenu = createSubmenu(resultsLink);
  submenu.style.display = isStudentResultRoute() ? 'block' : 'none';

  submenu.querySelectorAll<HTMLAnchorElement>('[data-student-result-link="true"]').forEach((child) => {
    const active = window.location.pathname === child.dataset.resultPath;
    child.classList.toggle('bg-blue-50', active);
    child.classList.toggle('text-blue-700', active);
    child.classList.toggle('dark:bg-blue-950\/40', active);
    child.classList.toggle('dark:text-blue-300', active);
  });
};

export const useResultsSidebarFix = () => {
  useEffect(() => {
    let observer: MutationObserver | null = null;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !isStudentRoute()) return;

      const resultChild = target.closest('[data-student-result-link="true"]') as HTMLAnchorElement | null;
      if (resultChild) {
        const path = resultChild.dataset.resultPath;
        if (!path) return;
        event.preventDefault();
        event.stopPropagation();
        navigateTo(path);
        return;
      }

      const resultParent = target.closest('a') as HTMLAnchorElement | null;
      if (!resultParent) return;
      const text = resultParent.textContent?.replace(/\s+/g, ' ').trim();
      const href = resultParent.getAttribute('href') || '';
      if (text !== 'Results' || !href.endsWith('#')) return;

      event.preventDefault();
      event.stopPropagation();
      const submenu = createSubmenu(resultParent);
      submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
    };

    document.addEventListener('click', onClick, true);
    observer = new MutationObserver(syncSubmenu);
    observer.observe(document.body, { childList: true, subtree: true });
    syncSubmenu();

    return () => {
      document.removeEventListener('click', onClick, true);
      observer?.disconnect();
      document.querySelector('[data-student-results-submenu="true"]')?.remove();
    };
  }, []);
};
